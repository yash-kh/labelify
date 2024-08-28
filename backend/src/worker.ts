import { Connection } from "@solana/web3.js";
import { prismaClient } from "./db";

const connection = new Connection(process.env.RPC_URL ?? "");
let isWorkerRunning = false;

export async function startWorker() {
  if (isWorkerRunning) {
    console.log("Worker is already running. Not starting another instance.");
    return;
  }

  isWorkerRunning = true;
  let noPayoutCount = 0;

  const intervalId = setInterval(async () => {
    const payout = await prismaClient.payouts.findFirst({
      where: {
        status: "Processing",
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!payout) {
      noPayoutCount += 1;

      if (noPayoutCount >= 2) {
        clearInterval(intervalId);
        isWorkerRunning = false;
        console.log("Worker stopped after 2 consecutive runs without payouts.");
      }
      return;
    }

    noPayoutCount = 0;

    try {
      const transaction = await connection.getTransaction(payout.signature, {
        maxSupportedTransactionVersion: 1,
      });

      if (!transaction) {
        return;
      }

      if (transaction?.meta?.err === null) {
        await prismaClient.$transaction(async (tx) => {
          await tx.payouts.update({
            where: {
              id: payout.id,
            },
            data: {
              status: "Success",
            },
          });

          await tx.worker.update({
            where: {
              id: payout.worker_id,
            },
            data: {
              locked_amount: {
                decrement: payout.amount,
              },
            },
          });
        });

        console.log(
          `Payout ${payout.id} which was ${payout.status} is now ${
            transaction?.meta?.err ? "Failed" : "Success"
          }`,
        );
      } else if (transaction?.meta?.err) {
        await prismaClient.$transaction(async (tx) => {
          await tx.payouts.update({
            where: {
              id: payout.id,
            },
            data: {
              status: "Failure",
            },
          });

          await tx.worker.update({
            where: {
              id: payout.worker_id,
            },
            data: {
              pending_amount: {
                increment: payout.amount,
              },
              locked_amount: {
                decrement: payout.amount,
              },
            },
          });
        });

        console.log(
          `Payout ${payout.id} which was ${payout.status} is now Failed`,
        );
      }
    } catch (e) {
      console.log(e);
    }
  }, 5000);
}
