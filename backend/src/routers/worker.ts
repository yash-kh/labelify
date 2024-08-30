import nacl from "tweetnacl";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../middleware";
import {
  TOTAL_DECIMALS,
  TOTAL_SUBMISSIONS,
  WORKER_JWT_SECRET,
} from "../config";
import { getNextTask, prismaClient } from "../db";
import { createSubmissionInput } from "../types";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { privateKey } from "../privateKey";
import { decode } from "bs58";
import { startWorker } from "../worker";

const connection = new Connection(process.env.RPC_URL ?? "");
const router = Router();

router.post("/payout", workerMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId: string = req.userId;
    const worker = await prismaClient.worker.findUnique({
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

    let signature = "";
    try {
      signature = await connection.sendTransaction(transaction, [keypair]);
    } catch (e: any) {
      console.log(e);
      return res.json({
        message: "Transaction failed",
      });
    }

    try {
      await prismaClient.$transaction(
        async (tx) => {
          // Lock the row with a `FOR UPDATE` clause
          await tx.$executeRaw`SELECT * FROM "Worker" WHERE "id" = ${Number(
            userId,
          )} FOR UPDATE`;

          await tx.worker.update({
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
    } catch (e: any) {
      console.log(e);
      return res.json({
        message: "Transaction failed",
      });
    }

    startWorker();

    res.json({
      message: "Processing payout",
    });
  } catch (error) {
    console.error("Error processing payout:", error);
    res.status(500).json({ message: "Failed to process payout" });
  }
});

router.get("/balance", workerMiddleware, async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ message: "Failed to fetch balance" });
  }
});

router.post("/getPayouts", workerMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId: string = req.userId;

    const { limit, offset } = req.body;

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

    const count = await prismaClient.payouts.count({
      where: {
        worker_id: Number(userId),
      },
    });

    const payouts = await prismaClient.payouts.findMany({
      where: {
        worker_id: Number(userId),
      },
      take: Number(limit),
      skip: Number(offset),
    });

    payouts.forEach((payout) => {
      payout.amount = payout.amount / TOTAL_DECIMALS;
    });

    return res.json({
      pendingAmount: worker.pending_amount / TOTAL_DECIMALS,
      lockedAmount: worker.locked_amount / TOTAL_DECIMALS,
      payouts: payouts,
      totalCount: count,
    });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    res.status(500).json({ message: "Failed to fetch payouts" });
  }
});

router.post("/submission", workerMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parsedBody = createSubmissionInput.safeParse(body);

    if (parsedBody.success) {
      try {
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

            const task = await tx.task.update({
              where: {
                id: Number(parsedBody.data.taskId),
              },
              data: {
                remainingSubmissions: {
                  decrement: 1,
                },
              },
            });

            if (task.remainingSubmissions <= 0) {
              await tx.task.update({
                where: {
                  id: Number(parsedBody.data.taskId),
                },
                data: {
                  done: true,
                },
              });
            }

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
      } catch (error) {
        console.error("Error processing submission:", error);
        res.status(500).json({ message: "Failed to process submission" });
      }
    } else {
      res.status(411).json({
        message: "Incorrect inputs",
      });
    }
  } catch (error) {
    console.error("Error in submission route:", error);
    res.status(500).json({ message: "Failed to submit data" });
  }
});

router.get("/nextTask", workerMiddleware, async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching next task:", error);
    res.status(500).json({ message: "Failed to fetch next task" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { publicKey, signature } = req.body;
    const message = new TextEncoder().encode(
      "Sign into mechanical labelify as a worker",
    );

    if (signature.data === undefined) {
      let temp: any = [];
      Object.keys(signature).forEach((key) => {
        temp.push(signature[key]);
      });

      signature.data = temp;
    }

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
  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ message: "Failed to sign in" });
  }
});

export default router;
