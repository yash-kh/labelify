"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
      <h1 className="text-4xl font-bold m-2">Welcome to labelify</h1>
      <div className="text-lg flex justify-center pb-8">
        Your one stop destination to getting your data labelled
      </div>
      <div className="flex space-x-4">
        <Link href="/user">
          <button className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-gray-300 transition">
            Get Data Labeled
          </button>
        </Link>
        <Link href="/work">
          <button className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-gray-300 transition">
            Earn Crypto
          </button>
        </Link>
      </div>
    </div>
  );
}
