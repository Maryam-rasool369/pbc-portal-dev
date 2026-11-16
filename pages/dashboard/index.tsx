import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";
import { fetchOnlineCount, fetchOnlineUsers, OnlineCount, OnlineUser } from "@/services/presence";
import { fetchDailyTimeSpent, DailyTimeSpent } from "@/services/timeTracking";
import { formatDuration } from "@/utils/formatDuration";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { HiDesktopComputer, HiDeviceMobile, HiUsers, HiX } from "react-icons/hi";

const POLL_INTERVAL_MS = 15_000;

const todayUtc = () => new Date().toISOString().slice(0, 10);

export default function DashboardPage() {
  const [counts, setCounts] = useState<OnlineCount | null>(null);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [timeSpent, setTimeSpent] = useState<DailyTimeSpent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeSpentLoading, setTimeSpentLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayUtc());
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  const isAuthorized = Boolean(ability?.can("read", "OnlineUsers"));

  useEffect(() => {
    if (!token || token === "undefined" || !user) return;

    if (!isAuthorized) {
      toast.error(
        "You are not authorized to access this page. Routing you back to the homepage",
      );
      router.push("/userMarketplace");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [countsData, usersData] = await Promise.all([
          fetchOnlineCount(token),
          fetchOnlineUsers(token),
        ]);
        if (!cancelled) {
          setCounts(countsData);
          setUsers(usersData);
        }
      } catch {
        // fetchOnlineCount/fetchOnlineUsers already log the error; avoid spamming toasts on a background poll
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, user, isAuthorized]);

  useEffect(() => {
    if (!token || token === "undefined" || !user || !isAuthorized) return;

    let cancelled = false;
    const isToday = selectedDate === todayUtc();

    const loadTimeSpent = async () => {
      try {
        const timeSpentData = await fetchDailyTimeSpent(token, selectedDate);
        if (!cancelled) setTimeSpent(timeSpentData);
      } catch {
        // fetchDailyTimeSpent already logs the error; avoid spamming toasts on a background poll
      } finally {
        if (!cancelled) setTimeSpentLoading(false);
      }
    };

    setTimeSpentLoading(true);
    loadTimeSpent();

    if (!isToday) return () => { cancelled = true; };

    const interval = setInterval(loadTimeSpent, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, user, isAuthorized, selectedDate]);

  const selectedRow = selectedRowKey
    ? timeSpent.find((row) => `${row.userId}-${row.platform}` === selectedRowKey) ??
      null
    : null;
  const interactionTimestamps = [...(selectedRow?.interactionTimestamps ?? [])].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const stats = [
    { label: "Web", value: counts?.web ?? 0, icon: HiDesktopComputer },
    { label: "Mobile", value: counts?.mobile ?? 0, icon: HiDeviceMobile },
    { label: "Total Online", value: counts?.total ?? 0, icon: HiUsers },
  ];

  return (
    <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="mb-4">
        <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Users currently active on the platform, updated every 15 seconds
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {/* @ts-ignore */}
                <Icon className="w-8 h-8 text-gold-600 dark:text-gold-500 mr-4" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Online Users
            </h4>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No users currently online.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Platform
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((onlineUser) => (
                      <tr key={`${onlineUser.id}-${onlineUser.platform}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {onlineUser.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {onlineUser.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {onlineUser.platform}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Time Spent {selectedDate === todayUtc() ? "Today" : `on ${selectedDate}`}
              </h4>
              <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                Date:
                <input
                  type="date"
                  value={selectedDate}
                  max={todayUtc()}
                  onChange={(e) => {
                    setSelectedRowKey(null);
                    setSelectedDate(e.target.value);
                  }}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-2 py-1"
                />
              </label>
            </div>
            {selectedDate === todayUtc() && (
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Includes users active earlier today who may have since logged off.
              </p>
            )}
            {timeSpentLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            ) : timeSpent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No time tracked on this date.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Frequency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {timeSpent.map((row) => (
                      <tr
                        key={`${row.userId}-${row.platform}`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setSelectedRowKey(`${row.userId}-${row.platform}`)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedRowKey(`${row.userId}-${row.platform}`);
                          }
                        }}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {row.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {row.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {row.platform}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDuration(row.secondsSpent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {row.interactions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {selectedRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setSelectedRowKey(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="interaction-timestamps-title"
              className="relative inline-block align-middle bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-md sm:w-full"
            >
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3
                      id="interaction-timestamps-title"
                      className="text-lg font-medium text-gray-900 dark:text-white"
                    >
                      {selectedRow.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {selectedRow.platform} · {selectedRow.interactions} interaction
                      {selectedRow.interactions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRowKey(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close"
                  >
                    {/* @ts-ignore */}
                    <HiX className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-80 overflow-y-auto">
                {interactionTimestamps.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No interactions recorded for this date.
                  </p>
                ) : (
                  <ol className="divide-y divide-gray-200 dark:divide-gray-700">
                    {interactionTimestamps.map((timestamp, index) => (
                      <li
                        key={`${timestamp}-${index}`}
                        className="py-2 text-sm text-gray-700 dark:text-gray-200"
                      >
                        {formatDateAndTime(timestamp, true, true)}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
