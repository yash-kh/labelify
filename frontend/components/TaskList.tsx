import { BACKEND_URL } from "@/utils";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

export const TaskList = () => {
  const [isLoading, setLoading] = useState(true);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 5;

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = (offset = 0) => {
    setLoading(true);
    axios
      .post(
        `${BACKEND_URL}/v1/user/taskList`,
        {
          limit,
          offset,
        },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        },
      )
      .then((res) => {
        if (offset === 0) {
          setTaskList(res.data.tasks);
        } else {
          setTaskList((prevTasks) => [...prevTasks, ...res.data.tasks]);
        }
        setTotalCount(res.data.totalCount);
        setOffset((prevOffset) => prevOffset + limit);
        setLoading(false);
      })
      .catch((e) => {
        console.log(e);
        setLoading(false);
      });
  };

  return (
    <div className="py-10 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white">Task List</h1>
        <p className="text-lg text-gray-400 mt-4">
          Total Tasks:{" "}
          <span className="font-bold text-white">{totalCount}</span>
        </p>
      </div>

      {isLoading && offset === 0 ? (
        <div className="flex justify-center items-center mt-8">
          <div className="text-gray-400 text-lg">Loading...</div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 max-w-2xl mx-auto">
            {taskList.map((task, i) => (
              <Link key={task.id} href={`/user/task/${task.id}`}>
                <div className="flex p-4 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
                  <h2 className="text-xl font-semibold text-white">
                    {i + 1}:{" "}
                    {String(task.title).substring(0, 25) +
                      (task.title.length > 25 ? "..." : "")}
                  </h2>
                  <div className="ml-auto">{task.done ? "✅" : ""}</div>
                </div>
              </Link>
            ))}
          </div>

          {taskList.length < totalCount && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchTasks(taskList.length)}
                className="px-4 py-2 bg-violet-800 text-white rounded hover:bg-slate-900"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
