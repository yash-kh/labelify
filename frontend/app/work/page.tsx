"use client";

import { Appbar } from "@/components/Appbar";
import { NextTask } from "@/components/NextTask";
import { useState } from "react";

export default function Home() {
  const [isVerified, setIsVerified] = useState(true);

  return (
    <div className="bg-black text-white min-h-screen">
      <Appbar isVerified={isVerified} setIsVerified={setIsVerified} />
      <NextTask isVerified={isVerified} setIsVerified={setIsVerified} />
    </div>
  );
}
