"use client";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export const Upload = ({ isVerified }: { isVerified: boolean }) => {
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  async function onSubmit(signature: string) {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/v1/user/task`,
        {
          options: images.map((image) => ({
            imageUrl: image,
          })),
          title,
          signature: signature,
        },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );

      clearInterval(submitInterval);
      setPaymentLoading(false);
      router.push(`/user/task/${response.data.id}`);
    } catch (error) {
      console.error("Submit failed, retrying...", error);
    }
  }

  async function makePayment() {
    setPaymentLoading(true);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey: new PublicKey("CLjzEzsPLYLeTY4VctXjjAeAJDdpymcUM3reqfjXgvMC"),
        lamports: 100000000,
      })
    );

    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    try {
      const signature = await sendTransaction(transaction, connection, {
        minContextSlot,
      });
      submitInterval = setInterval(() => onSubmit(signature), 6000);
    } catch (error) {
      console.error(error);
      setPaymentLoading(false);
    }
  }

  let submitInterval: NodeJS.Timeout;

  return (
    <div className="flex justify-center pb-10">
      <div className="max-w-screen-lg w-full">
        <div className="text-2xl text-center pt-20 w-full">
          {isVerified
            ? "Create a task"
            : "Connect your wallet and verify your account to create a task"}
        </div>

        {isVerified && (
          <>
            <label className="block mt-2 text-md font-medium text-white">
              Task details
            </label>

            <input
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              type="text"
              id="first_name"
              className="mt-1 bg-gray-50 border border-gray-300 text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="What is your task?"
              required
            />

            <label className="block mt-8 text-md font-medium text-white">
              Add Images
            </label>
            <div className="flex flex-wrap justify-center pt-4 max-w-screen-lg">
              {images.map((image) => (
                <UploadImage
                  key={image}
                  image={image}
                  onImageAdded={(imageUrl) => {
                    setImages((i) => [...i, imageUrl]);
                  }}
                />
              ))}
            </div>

            <div className="pt-2 flex justify-center">
              <UploadImage
                onImageAdded={(imageUrl) => {
                  setImages((i) => [...i, imageUrl]);
                }}
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={makePayment}
                type="button"
                className="mt-4 px-4 py-2 bg-violet-800 text-white rounded hover:bg-slate-900"
                disabled={paymentLoading}
              >
                {paymentLoading ? "Submitting..." : "Pay 0.1 SOL and Submit Task"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
