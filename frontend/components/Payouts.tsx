import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useEffect, useState } from "react";

export const Payouts = () => {
  const [isLoading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutList, setPayoutList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [lockedAmount, setLockedAmount] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 5;

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = (offset = 0) => {
    setLoading(true);
    axios
      .post(
        `${BACKEND_URL}/v1/worker/getPayouts`,
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
          setPayoutList(res.data.payouts);
        } else {
          setPayoutList((prevTasks) => [...prevTasks, ...res.data.payouts]);
        }
        setTotalCount(res.data.totalCount);
        setOffset((prevOffset) => prevOffset + limit);
        setLoading(false);
        setPendingAmount(res.data.pendingAmount);
        setLockedAmount(res.data.lockedAmount);
      })
      .catch((e) => {
        console.log(e);
        setLoading(false);
      });
  };

  return (
    <div className="py-10 px-4">
      {isLoading && offset === 0 ? (
        <div className="flex justify-center items-center mt-8">
          <div className="text-gray-400 text-lg">Loading...</div>
        </div>
      ) : (
        <>
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-white">Payouts</h1>
            <p className="text-lg text-gray-400 mt-4">
              Balance:{" "}
              <span className="font-bold text-white mr-2">{pendingAmount}</span>{" "}
              locked Amount:{" "}
              <span className="font-bold text-white mr-2">{lockedAmount}</span>{" "}
              Total Payouts:{" "}
              <span className="font-bold text-white mr-2">{totalCount}</span>
            </p>
            <button
              onClick={() => {
                setPayoutLoading(true);
                axios
                  .post(
                    `${BACKEND_URL}/v1/worker/payout`,
                    {},
                    {
                      headers: {
                        Authorization: localStorage.getItem("token"),
                      },
                    },
                  )
                  .then(() => {
                    fetchPayouts();
                  })
                  .catch((e) => {
                    console.log(e);
                  })
                  .finally(() => {
                    setPayoutLoading(false);
                  });
              }}
              className="px-4 py-2 mt-2 bg-violet-800 text-white rounded hover:bg-slate-900 mr-2"
              disabled={payoutLoading}
            >
              {payoutLoading
                ? "Loading..."
                : `Pay me out (${pendingAmount}) SOL`}
            </button>
          </div>
          <div className="mt-8 grid gap-4 max-w-2xl mx-auto">
            {payoutList.map((task) => (
              <div key={task.id}>
                <div className="p-4 bg-gray-800 rounded-lg shadow-lg transition duration-300">
                  <h2 className="text-xl font-semibold text-white">
                    {task.amount} SOL - Status: {task.status}
                  </h2>
                </div>
              </div>
            ))}
          </div>

          {payoutList.length < totalCount && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchPayouts(payoutList.length)}
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
