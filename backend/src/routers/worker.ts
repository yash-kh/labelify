import nacl from "tweetnacl";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../middleware";
import { TOTAL_DECIMALS, WORKER_JWT_SECRET } from "../config";
import { getNextTask, prismaClient } from "../db";
import { createSubmissionInput } from "../types";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionError,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { privateKey } from "../privateKey";
import { decode } from "bs58";
import { startWorker } from "../worker";
const connection = new Connection(process.env.RPC_URL ?? "");

const TOTAL_SUBMISSIONS = 100;

const router = Router();

router.post("/payout", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: string = req.userId;
  const worker = await prismaClient.worker.findFirst({
    where: { id: Number(userId) },
  });

  if (!worker) {
    return res.status(403).json({
      message: "User not found",
    });
  }

  if (worker.pending_amount === 0) {
    return res.status(411).json({
      message: "No pending amount",
    });
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(process.env.PARENT_WALLET_ADDRESS ?? ""),
      toPubkey: new PublicKey(worker.address),
      lamports: (1000_000_000 * worker.pending_amount) / TOTAL_DECIMALS,
    }),
  );

  const keypair = Keypair.fromSecretKey(decode(privateKey));

  // TODO: There's a double spending problem here
  // The user can request the withdrawal multiple times
  // Can u figure out a way to fix it?
  let signature = "";
  try {
    // signature = await sendAndConfirmTransaction(
    //     connection,
    //     transaction,
    //     [keypair],
    // );

    signature = await connection.sendTransaction(transaction, [keypair]);
  } catch (e: any) {
    console.log(e);
    return res.json({
      message: "Transaction failed",
    });
  }

  let wallet;

  // We should add a lock here
  await prismaClient.$transaction(
    async (tx) => {
      let wallet =await tx.worker.update({
        where: {
          id: Number(userId),
        },
        data: {
          pending_amount: {
            decrement: worker.pending_amount,
          },
          locked_amount: {
            increment: worker.pending_amount,
          },
        },
      });

      await tx.payouts.create({
        data: {
          worker_id: Number(userId),
          amount: worker.pending_amount,
          status: "Processing",
          signature: signature,
        },
      });
    },
    {
      maxWait: 5000, // default: 2000
      timeout: 10000, // default: 5000
    },
  );

  startWorker();

  res.json({
    message: "Processing payout",
    pendingAmount: worker.pending_amount / TOTAL_DECIMALS,
    lockedAmount: worker.locked_amount / TOTAL_DECIMALS,
  });
});

router.get("/balance", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: string = req.userId;

  const worker = await prismaClient.worker.findFirst({
    where: {
      id: Number(userId),
    },
  });

  if (!worker) {
    return res.status(411).json({
      message: "User not found",
    });
  }

  return res.json({
    pendingAmount: worker.pending_amount / TOTAL_DECIMALS,
    lockedAmount: worker.locked_amount / TOTAL_DECIMALS,
  });
});

router.post("/getPayouts", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: string = req.userId;

  const {limit, offset} = req.body;

  const worker = await prismaClient.worker.findFirst({
    where: {
      id: Number(userId),
    },
  });

  const count = await prismaClient.payouts.count({
    where: {
      worker_id: Number(userId),
    },
  });

  if (!worker || count === 0) {
    return res.status(411).json({
      message: "No payouts found",
    });
  }

  const payouts = await prismaClient.payouts.findMany({
    where: {
      worker_id: Number(userId),
    },
    take: Number(limit),
    skip: Number(offset),
  });

  return res.json({
    pendingAmount: worker.pending_amount / TOTAL_DECIMALS,
    lockedAmount: worker.locked_amount / TOTAL_DECIMALS,
    payouts: payouts,
    totalCount: count
  });
});

router.post("/submission", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.userId;
  const body = req.body;
  const parsedBody = createSubmissionInput.safeParse(body);

  if (parsedBody.success) {
    const task = await getNextTask(Number(userId));
    if (!task || task?.id !== Number(parsedBody.data.taskId)) {
      return res.status(411).json({
        message: "Incorrect task id",
      });
    }

    const amount = (Number(task.amount) / TOTAL_SUBMISSIONS).toString();

    const submission = await prismaClient.$transaction(
      async (tx) => {
        const submission = await tx.submission.create({
          data: {
            option_id: Number(parsedBody.data.selection),
            worker_id: userId,
            task_id: Number(parsedBody.data.taskId),
            amount: Number(amount),
          },
        });

        await tx.worker.update({
          where: {
            id: userId,
          },
          data: {
            pending_amount: {
              increment: Number(amount),
            },
          },
        });

        return submission;
      },
      {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      },
    );

    const nextTask = await getNextTask(Number(userId));
    res.json({
      nextTask,
      amount,
    });
  } else {
    res.status(411).json({
      message: "Incorrect inputs",
    });
  }
});

router.get("/nextTask", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const userId: string = req.userId;

  const task = await getNextTask(Number(userId));

  if (!task) {
    res.status(411).json({
      message: "No more tasks left for you to review",
    });
  } else {
    res.json({
      task,
    });
  }
});

router.post("/signin", async (req, res) => {
  const { publicKey, signature } = req.body;
  const message = new TextEncoder().encode(
    "Sign into mechanical labelify as a worker",
  );

  const result = nacl.sign.detached.verify(
    message,
    new Uint8Array(signature.data),
    new PublicKey(publicKey).toBytes(),
  );

  if (!result) {
    return res.status(411).json({
      message: "Incorrect signature",
    });
  }

  const existingUser = await prismaClient.worker.findFirst({
    where: {
      address: publicKey,
    },
  });

  if (existingUser) {
    const token = jwt.sign(
      {
        userId: existingUser.id,
      },
      WORKER_JWT_SECRET,
    );

    res.json({
      token,
      amount: existingUser.pending_amount / TOTAL_DECIMALS,
    });
  } else {
    const user = await prismaClient.worker.create({
      data: {
        address: publicKey,
        pending_amount: 0,
        locked_amount: 0,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
      },
      WORKER_JWT_SECRET,
    );

    res.json({
      token,
      amount: 0,
    });
  }
});

export default router;
