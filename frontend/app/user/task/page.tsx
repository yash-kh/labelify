"use client";
import { Appbar } from "@/components/Appbar";
import { TaskList } from "@/components/TaskList";
import { useState } from "react";

export default function Home() {
  const [isVerified, setIsVerified] = useState(true);

  return (
    <main className="bg-black text-white min-h-screen">
      <Appbar isVerified={isVerified} setIsVerified={setIsVerified} />
      <TaskList />
    </main>
  );
}
