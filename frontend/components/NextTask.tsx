"use client";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useEffect, useState } from "react";

interface Task {
  id: number;
  amount: number;
  title: string;
  options: {
    id: number;
    image_url: string;
    task_id: number;
  }[];
}

export const NextTask = ({ isVerified }: { isVerified: boolean }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isVerified) {
      getNextTask();
    }
  }, [isVerified]);

  const getNextTask = () => {
    setLoading(true);
    axios
      .get(`${BACKEND_URL}/v1/worker/nextTask`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      })
      .then((res) => {
        setCurrentTask(res.data.task);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setCurrentTask(null);
      });
  };

  if (!isVerified) {
    return (
      <div className="h-screen flex items-center justify-center text-2xl text-center">
        Connect your wallet and verify your account to get started
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-2xl">
        Loading...
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="h-screen flex items-center justify-center text-2xl text-center">
        Please check back later, there are no pending tasks at the moment
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="text-3xl font-bold pt-20">
        {currentTask.title || "Select the most clickable thumbnail"}
      </div>
      <div className="text-lg font-bold text-slate-400 pt-3">
        Select the most appealing option
      </div>
      {submitting && <div className="text-lg text-gray-500 mt-2">Submitting...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-8 m-8">
        {currentTask.options.map((option) => (
          <Option
            key={option.id}
            imageUrl={option.image_url}
            onSelect={async () => {
              setSubmitting(true);
              try {
                const response = await axios.post(
                  `${BACKEND_URL}/v1/worker/submission`,
                  {
                    taskId: currentTask.id.toString(),
                    selection: option.id.toString(),
                  },
                  {
                    headers: {
                      Authorization: localStorage.getItem("token"),
                    },
                  }
                );

                const nextTask = response.data.nextTask;
                if (nextTask) {
                  setCurrentTask(nextTask);
                } else {
                  setCurrentTask(null);
                }
              } catch (e) {
                console.error(e);
              }
              setSubmitting(false);
            }}
          />
        ))}
      </div>
    </div>
  );
};

function Option({
  imageUrl,
  onSelect,
}: {
  imageUrl: string;
  onSelect: () => void;
}) {
  return (
    <div className="p-4 bg-slate-600 rounded-md border-2 border-white flex justify-center">
      <img
        onClick={onSelect}
        className="h-80 object-cover cursor-pointer rounded-md shadow-lg hover:scale-105 transition-transform duration-200"
        src={imageUrl}
        alt="Task Option"
      />
    </div>
  );
}
