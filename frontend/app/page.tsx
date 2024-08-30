"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-black text-white overflow-hidden">
      {/* Green box above the title */}
      <div className="absolute top-0 w-full flex justify-center pointer-events-none">
        <div className="relative w-52 h-52 bg-white mt-12 rounded-md animate-appear-change-green">
          <div className="absolute inset-0 flex justify-center items-center opacity-0 text-white text-4xl animate-show-check">
            ✓
          </div>
        </div>
      </div>

      <h1 className="text-4xl font-bold m-2 z-10">Welcome to labelify</h1>

      <div className="text-lg flex justify-center pb-8 z-10">
        One-stop destination for data labeling
      </div>

      <div className="flex space-x-4 z-10">
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

      {/* Red box below the buttons */}
      <div className="absolute bottom-0 w-full flex justify-center pointer-events-none">
        <div className="relative w-52 h-52 bg-white mb-20 rounded-md animate-appear-change-red">
          <div className="absolute inset-0 flex justify-center items-center opacity-0 text-white text-4xl animate-show-cross">
            ✗
          </div>
        </div>
      </div>
    </div>
  );
}
