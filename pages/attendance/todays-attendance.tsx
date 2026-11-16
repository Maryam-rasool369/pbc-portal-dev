"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MarkAttendanceModal from "@/components/attendance/MarkAttendanceModal";
import UpdateTasksModal from "@/components/attendance/UpdateTasksModal";
import useAuthStore from "@/store/authStore";
import { getTodayAttendance, addAttendanceTask, deleteAttendanceTask, updateAttendanceTask } from "@/services/attendance";
import { Attendance } from "@/types/attendance";
import Can from "@/components/rbac/Can";
import { HiArrowLeft } from "react-icons/hi";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";

export default function TodaysAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [deletingTaskIndex, setDeletingTaskIndex] = useState<number | null>(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingTaskValue, setEditingTaskValue] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

  const ability = useAbility();

  const fetchTodaysAttendance = async () => {
    setLoading(true);
    try {
      const response = await getTodayAttendance(token || "");
      setAttendance(response.data || null);
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch today's attendance"
      );
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || token === "undefined" || !user) return;

    if (token && !ability?.can("read", "Attendance")) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }
    fetchTodaysAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAttendanceMarked = () => {
    fetchTodaysAttendance();
    toast.success("Attendance marked successfully");
  };

  const handleTasksUpdated = () => {
    fetchTodaysAttendance();
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

  const parseTasks = (tasks?: string): string[] | null => {
    if (!tasks) return null;
    try {
      const parsed = JSON.parse(tasks);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const handleAddTask = async () => {
    if (!stripHtml(newTask)) return;
    setTaskSubmitting(true);
    try {
      await addAttendanceTask(token, newTask.trim());
      setNewTask("");
      await fetchTodaysAttendance();
      toast.success("Task added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add task");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleEditTask = (index: number, currentValue: string) => {
    setEditingTaskIndex(index);
    setEditingTaskValue(stripHtml(currentValue));
  };

  const handleCancelEdit = () => {
    setEditingTaskIndex(null);
    setEditingTaskValue("");
  };

  const handleSaveEdit = async (index: number) => {
    if (!stripHtml(editingTaskValue)) return;
    setEditSubmitting(true);
    try {
      await updateAttendanceTask(token, index, editingTaskValue.trim());
      setEditingTaskIndex(null);
      setEditingTaskValue("");
      await fetchTodaysAttendance();
      toast.success("Task updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteTask = async (index: number) => {
    setDeletingTaskIndex(index);
    try {
      await deleteAttendanceTask(token, index);
      await fetchTodaysAttendance();
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete task");
    } finally {
      setDeletingTaskIndex(null);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatLocation = (location?: string) => {
    if (!location || !location.includes(","))
      return { lat: "-", lng: "-", url: "" };
    const [lat, lng] = location.split(",");
    return {
      lat: Number.parseFloat(lat).toFixed(4),
      lng: Number.parseFloat(lng).toFixed(4),
      url: `https://www.google.com/maps?q=${lat},${lng}`,
    };
  };

  const getFormattedTodayDate = () => {
    const today = new Date();
    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    return today.toLocaleDateString(
      "en-US",
      options as Intl.DateTimeFormatOptions
    );
  };

  const locationIn = formatLocation(attendance?.locationIn);
  const locationOut = formatLocation(attendance?.locationOut);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/attendance")}
          className="mr-4 text-gray-400 hover:text-white flex items-center"
        >
          {/* @ts-ignore */}
          <HiArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
      </div>

      {showMarkModal && (
        <MarkAttendanceModal
          open={showMarkModal}
          onClose={() => setShowMarkModal(false)}
          onSuccess={handleAttendanceMarked}
        />
      )}

      {showTasksModal && attendance && (
        <UpdateTasksModal
          open={showTasksModal}
          onClose={() => setShowTasksModal(false)}
          onSuccess={handleTasksUpdated}
          initialTasks={attendance.tasks}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Today&apos;s Attendance
          </h1>
          <p className="text-gray-400">{getFormattedTodayDate()}</p>
        </div>

        <div className="flex space-x-2">
          {!attendance ? (
            <Can I="create" a="Attendance">
              <button
                onClick={() => setShowMarkModal(true)}
                className="px-4 py-2 bg-gold-500 text-gray-800 rounded-md hover:bg-gold-600 mt-3 lg:mt-0"
              >
                Mark Today&apos;s Attendance
              </button>
            </Can>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : attendance ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-bold text-gold-500 mb-2 md:mb-0">
                Attendance Record
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  Clock In
                </h3>
                <div className="bg-gray-800 p-4 rounded-md space-y-2">
                  <div className="flex items-center mb-1">
                    <span className="inline-block px-2 py-1 rounded bg-green-600 text-xs text-white font-semibold mr-2">
                      {attendance.clockIn ? "Marked" : "Not Marked"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {attendance.clockIn
                        ? formatTime(attendance.clockIn)
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-400 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-300 text-sm">
                      Lat: {locationIn.lat} | Long: {locationIn.lng}
                    </span>
                  </div>
                  {attendance.locationIn && (
                    <a
                      href={locationIn.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-xs"
                    >
                      View Clocked In Location
                    </a>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">
                  Clock Out
                </h3>
                <div className="bg-gray-800 p-4 rounded-md space-y-2">
                  <div className="flex items-center mb-1">
                    <span className="inline-block px-2 py-1 rounded bg-red-600 text-xs text-white font-semibold mr-2">
                      {attendance.clockOut ? "Marked" : "Not Marked"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {attendance.clockOut
                        ? formatTime(attendance.clockOut)
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-red-400 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-300 text-sm">
                      Lat: {locationOut.lat} | Long: {locationOut.lng}
                    </span>
                  </div>
                  {attendance.locationOut && (
                    <a
                      href={locationOut.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-xs"
                    >
                      View Clocked Out Location
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gold-500">Tasks</h3>
              </div>
              <div className="bg-gray-800 p-4 rounded-md space-y-2">
                {(() => {
                  const taskList = parseTasks(attendance.tasks);
                  if (taskList !== null) {
                    return taskList.length > 0 ? (
                      <ul className="space-y-2">
                        {taskList.map((task, index) => (
                          <li
                            key={index}
                            className="bg-gray-700 px-3 py-2 rounded-md"
                          >
                            {editingTaskIndex === index ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingTaskValue}
                                  onChange={(e) => setEditingTaskValue(e.target.value)}
                                  rows={4}
                                  className="w-full min-h-[96px] rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                                  placeholder="Edit task"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={editSubmitting}
                                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(index)}
                                    disabled={editSubmitting || !stripHtml(editingTaskValue)}
                                    className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black text-sm rounded-md transition-colors flex items-center gap-1"
                                  >
                                    {editSubmitting ? (
                                      <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Saving...
                                      </>
                                    ) : "Save"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div
                                  className="text-gray-300 text-sm flex-1 whitespace-pre-wrap break-words prose prose-sm max-w-none prose-headings:text-gray-300 prose-a:text-blue-400 prose-invert"
                                >
                                  {stripHtml(task)}
                                </div>
                                {!attendance.clockOut && (
                                  <Can I="update" a="Attendance">
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        onClick={() => handleEditTask(index, task)}
                                        className="text-gold-400 hover:text-gold-300 transition-colors"
                                        title="Edit task"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTask(index)}
                                        disabled={deletingTaskIndex === index}
                                        className="text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                                        title="Delete task"
                                      >
                                        {deletingTaskIndex === index ? (
                                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                          </svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  </Can>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">No tasks recorded.</p>
                    );
                  }
                  // Legacy HTML fallback
                  return attendance.tasks ? (
                    <div
                      className="text-gray-300 prose prose-sm max-w-none prose-headings:text-gray-300 prose-a:text-blue-400"
                      dangerouslySetInnerHTML={{ __html: attendance.tasks }}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No tasks recorded.</p>
                  );
                })()}

                {!attendance.clockOut && (
                  <Can I="update" a="Attendance">
                    <div className="pt-3 border-t border-gray-700 space-y-2">
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Add New Task</p>
                      <textarea
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        rows={4}
                        className="w-full min-h-[96px] rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                        placeholder="Add a new task"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddTask}
                          disabled={taskSubmitting || !stripHtml(newTask)}
                          className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black text-sm rounded-md transition-colors flex items-center gap-2"
                        >
                          {taskSubmitting ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Adding...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Task
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </Can>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              No Attendance Recorded for Today
            </h2>
            <p className="text-gray-500 mb-6">
              Please mark your attendance to start recording your day.
            </p>
            <button
              onClick={() => setShowMarkModal(true)}
              className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium"
            >
              Mark Attendance Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
