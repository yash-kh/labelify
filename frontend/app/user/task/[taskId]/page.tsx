"use client";
import { Appbar } from "@/components/Appbar";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useEffect, useState } from "react";

async function getTaskDetails(taskId: string) {
  const response = await axios.get(
    `${BACKEND_URL}/v1/user/task?taskId=${taskId}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    },
  );
  return response.data;
}

export default function Page({
  params: { taskId },
}: {
  params: { taskId: string };
}) {
  const [result, setResult] = useState<
    Record<
      string,
      {
        count: number;
        option: {
          imageUrl: string;
        };
      }
    >
  >({});
  const [taskDetails, setTaskDetails] = useState<{
    title?: string;
  }>({});

  useEffect(() => {
    getTaskDetails(taskId).then((data) => {
      setResult(data.result);
      setTaskDetails(data.taskDetails);
    });
  }, [taskId]);

  // Calculate total votes
  const totalVotes = Object.values(result).reduce(
    (sum, task) => sum + task.count,
    0,
  );

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <Appbar isVerified={true} setIsVerified={() => {}} />
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold pt-20">
          Task: {taskDetails.title || "Loading..."}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-8 mx-8">
          {Object.keys(result || {}).map((taskId) => (
            <Task
              key={taskId}
              imageUrl={result[taskId].option.imageUrl}
              votes={result[taskId].count}
              totalVotes={totalVotes}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-center py-10">
        <button
          className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-gray-300 transition"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

function Task({
  imageUrl,
  votes,
  totalVotes,
}: {
  imageUrl: string;
  votes: number;
  totalVotes: number;
}) {
  // Calculate percentage
  const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

  return (
    <div className="bg-gray-800 p-4 rounded-md text-center">
      <img
        className="w-full h-64 object-cover rounded-md mb-4"
        src={imageUrl}
        alt="Task Image"
      />
      <div className="text-lg font-medium mb-2">{votes} Votes</div>
      <div className="relative w-full h-2 bg-gray-600 rounded">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 rounded"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-sm text-gray-400 mt-1">{percentage.toFixed(1)}%</div>
    </div>
  );
}
