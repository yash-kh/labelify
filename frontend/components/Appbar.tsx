"use client";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/utils";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export const Appbar = ({
  isVerified,
  setIsVerified,
}: {
  isVerified: boolean;
  setIsVerified: any;
}) => {
  const { publicKey, signMessage } = useWallet();
  const pathname = usePathname();
  const page = pathname?.split("/")[1];
  const router = useRouter();

  async function signAndSend() {
    if (!publicKey) {
      return;
    }
    const message = new TextEncoder().encode(
      "Sign into mechanical labelify" + (page === "user" ? "" : " as a worker"),
    );
    const signature = await signMessage?.(message);
    const response = await axios.post(
      `${BACKEND_URL}/v1/${page === "user" ? "user" : "worker"}/signin`,
      {
        signature,
        publicKey: publicKey?.toString(),
      },
    );

    setIsVerified(true);
    localStorage.setItem("token", response.data.token);
  }

  useEffect(() => {
    if (!publicKey && !localStorage.getItem("token")) {
      setIsVerified(false);
      localStorage.removeItem("token");
    }
  }, [publicKey]);

  return (
    <div className="flex justify-between border-b pb-2 pt-2">
      <div className="flex">
        <Link
          className={
            "text-2xl pl-4 flex justify-center pt-2 cursor-pointer" +
            (pathname === "/" + page ? " text-violet-500" : "")
          }
          href={`/${page}`}
        >
          labelify
        </Link>
        {isVerified && page === "user" && (
          <Link
            className={
              "text-1xl pl-8 flex justify-center pt-3.5 cursor-pointer" +
              (pathname === "/" + page + "/task" ? " text-violet-500" : "")
            }
            href={`/${page}/task`}
          >
            tasks
          </Link>
        )}
        {isVerified && page !== "user" && (
          <Link
            className={
              "text-1xl pl-8 flex justify-center pt-3.5 cursor-pointer" +
              (pathname === "/" + page + "/payouts" ? " text-violet-500" : "")
            }
            href={`/${page}/payouts`}
          >
            payouts
          </Link>
        )}
      </div>
      <div className="text-xl pr-4 flex">
        {publicKey && !isVerified && (
          <button
            className="px-4 bg-violet-800 text-white rounded hover:bg-slate-900 mr-2"
            onClick={signAndSend}
          >
            Verify
          </button>
        )}
        {publicKey ? (
          <WalletDisconnectButton
            onClick={() => {
              localStorage.removeItem("token");
              router.push(`/${page}`);
            }}
          />
        ) : (
          <WalletMultiButton />
        )}
      </div>
    </div>
  );
};
