import nacl from "tweetnacl";
import { Router } from "express";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import { JWT_SECRET, TOTAL_DECIMALS, TOTAL_SUBMISSIONS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createTaskInput } from "../types";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { prismaClient } from "../db";

const connection = new Connection(process.env.RPC_URL ?? "");

const PARENT_WALLET_ADDRESS = process.env.PARENT_WALLET_ADDRESS ?? "";

const DEFAULT_TITLE = "Select the most clickable thumbnail";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.ACCESS_SECRET ?? "",
  },
  region: "ap-south-1",
});

const router = Router();

router.get("/task", authMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const taskId: string = req.query.taskId;
    // @ts-ignore
    const userId: string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
      where: {
        user_id: Number(userId),
        id: Number(taskId),
      },
      include: {
        options: true,
      },
    });

    if (!taskDetails) {
      return res.status(411).json({
        message: "You don't have access to this task",
      });
    }

    const responses = await prismaClient.submission.findMany({
      where: {
        task_id: Number(taskId),
      },
      include: {
        option: true,
      },
    });

    const result: Record<
      string,
      {
        count: number;
        option: {
          imageUrl: string;
        };
      }
    > = {};

    taskDetails.options.forEach((option) => {
      result[option.id] = {
        count: 0,
        option: {
          imageUrl: option.image_url,
        },
      };
    });

    responses.forEach((r) => {
      result[r.option_id].count++;
    });

    res.json({
      result,
      taskDetails,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task details" });
  }
});

router.post("/taskList", authMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId: string = req.userId;

    const { limit, offset } = req.body;

    const count = await prismaClient.task.count({
      where: {
        user_id: Number(userId),
      },
    });

    const tasks = await prismaClient.task.findMany({
      where: {
        user_id: Number(userId),
      },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({ tasks, totalCount: count });
  } catch (error) {
    console.error("Error fetching task list:", error);
    res.status(500).json({ message: "Failed to fetch task list" });
  }
});

router.post("/task", authMiddleware, async (req, res) => {
  try {
    //@ts-ignore
    const userId = req.userId;
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    const user = await prismaClient.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!parseData.success) {
      return res.status(411).json({
        message: "You've sent the wrong inputs",
      });
    }

    const transaction = await connection.getTransaction(
      parseData.data.signature,
      {
        maxSupportedTransactionVersion: 1,
      },
    );

    if (
      (transaction?.meta?.postBalances[1] ?? 0) -
        (transaction?.meta?.preBalances[1] ?? 0) !==
      100000000
    ) {
      return res.status(411).json({
        message: "Transaction signature/amount incorrect",
      });
    }

    if (
      transaction?.transaction.message.getAccountKeys().get(1)?.toString() !==
      PARENT_WALLET_ADDRESS
    ) {
      return res.status(411).json({
        message: "Transaction sent to wrong address",
      });
    }

    if (
      transaction?.transaction.message.getAccountKeys().get(0)?.toString() !==
      user?.address
    ) {
      return res.status(411).json({
        message: "Transaction sent to wrong address",
      });
    }

    const response = await prismaClient.$transaction(
      async (tx) => {
        const response = await tx.task.create({
          data: {
            title: parseData.data.title || DEFAULT_TITLE,
            amount: 0.1 * TOTAL_DECIMALS,
            signature: parseData.data.signature,
            user_id: userId,
            remainingSubmissions: 1,
          },
        });

        await tx.option.createMany({
          data: parseData.data.options.map((x) => ({
            image_url: x.imageUrl,
            task_id: response.id,
          })),
        });

        return response;
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    res.json({
      id: response.id,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

router.get("/presignedUrl", authMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: "scalerr",
      Key: `scalerr/${userId}/${Math.random()}/image.jpg`,
      Conditions: [
        ["content-length-range", 0, 5 * 1024 * 1024], // 5 MB max
      ],
      Expires: 3600,
    });

    res.json({
      preSignedUrl: url,
      fields,
    });
  } catch (error) {
    console.error("Error creating presigned URL:", error);
    res.status(500).json({ message: "Failed to create presigned URL" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { publicKey, signature } = req.body;
    const message = new TextEncoder().encode("Sign into mechanical labelify");

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

    const existingUser = await prismaClient.user.findFirst({
      where: {
        address: publicKey,
      },
    });

    if (existingUser) {
      const token = jwt.sign(
        {
          userId: existingUser.id,
        },
        JWT_SECRET,
      );

      res.json({
        token,
      });
    } else {
      const user = await prismaClient.user.create({
        data: {
          address: publicKey,
        },
      });

      const token = jwt.sign(
        {
          userId: user.id,
        },
        JWT_SECRET,
      );

      res.json({
        token,
      });
    }
  } catch (error) {
    console.error("Error during sign in:", error);
    res.status(500).json({ message: "Failed to sign in" });
  }
});

export default router;
