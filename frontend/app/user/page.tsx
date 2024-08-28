"use client";
import { Appbar } from "@/components/Appbar";
import { Hero } from "@/components/Hero";
import { Upload } from "@/components/Upload";
import { useState } from "react";

export default function Home() {
  const [isVerified, setIsVerified] = useState(true);

  return (
    <main className="bg-black text-white min-h-screen">
      <Appbar isVerified={isVerified} setIsVerified={setIsVerified} />
      <Hero />
      <Upload isVerified={isVerified} />
    </main>
  );
}
