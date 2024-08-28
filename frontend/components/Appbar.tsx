"use client";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";

export const Appbar = ({
  isVerified,
  setIsVerified,
}: {
  isVerified: boolean;
  setIsVerified: any;
}) => {
  const { publicKey, signMessage } = useWallet();
  const [balance, setBalance] = useState(0);
  const pathname = usePathname();
  const page = pathname?.split("/")[1];

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

    setBalance(response.data.amount);

    setIsVerified(true);
    localStorage.setItem("token", response.data.token);
  }

  useEffect(() => {
    if (!publicKey && !localStorage.getItem("token")) {
      setIsVerified(false);
      localStorage.removeItem("token");
    }
  }, [publicKey]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsVerified(false);
    } else {
      if (page !== "user") {
        axios
          .get(`${BACKEND_URL}/v1/worker/balance`, {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          })
          .then((res) => {
            setBalance(res.data.pendingAmount);
          })
          .catch((e) => {
            console.log(e);
          });
      }
    }
  }, []);

  return (
    <div className="flex justify-between border-b pb-2 pt-2">
      <Link
        className="text-2xl pl-4 flex justify-center pt-2 cursor-pointer"
        href={`/${page}`}
      >
        labelify
      </Link>
      <div className="text-xl pr-4 flex">
        {isVerified && page !== "user" && (
          <button
            onClick={() => {
              axios.post(
                `${BACKEND_URL}/v1/worker/payout`,
                {},
                {
                  headers: {
                    Authorization: localStorage.getItem("token"),
                  },
                },
              );
            }}
            className="px-4 bg-violet-800 text-white rounded hover:bg-slate-900 mr-2"
          >
            Pay me out ({balance}) SOL
          </button>
        )}
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
            }}
          />
        ) : (
          <WalletMultiButton />
        )}
      </div>
    </div>
  );
};
