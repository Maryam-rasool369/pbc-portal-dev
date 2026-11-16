"use client";

import type { Attendance } from "@/types/attendance";
import { useState } from "react";
import { MapPin, Calendar, User, FileText } from "lucide-react";

interface AttendanceCardProps {
  attendance: Attendance;
  showUser?: boolean;
  onUpdateTasks?: () => void;
}

export default function AttendanceCard({
  attendance,
  showUser = false,
  onUpdateTasks,
}: AttendanceCardProps) {
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatLocation = (location: string) => {
    if (!location || !location.includes(",")) return { lat: "-", lng: "-" };
    const [lat, lng] = location.split(",");
    return {
      lat: Number.parseFloat(lat).toFixed(4),
      lng: Number.parseFloat(lng).toFixed(4),
    };
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

  const taskList = parseTasks(attendance.tasks);
  const hasTasks = Boolean(
    taskList?.length || attendance.tasks?.trim().length
  );
  const locationIn = formatLocation(attendance.locationIn);
  const locationOut = formatLocation(attendance.locationOut);

  return (
    <div className="border border-gray-300 rounded-lg bg-gray w-full">
      {/* Header Section */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-white" />
            <div>
              <h3 className="font-semibold text-white">
                {formatDate(attendance.clockIn)}
              </h3>
              <p className="text-gray-400 text-sm">
                {formatTime(attendance.clockIn)}
              </p>
            </div>
          </div>
          {showUser && attendance.user && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded border border-gray-300">
              <User className="h-4 w-4 text-gold-500 font-medium" />
              <span className="text-gold-500 text-sm">
                {attendance.user.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-1 rounded bg-green-600 text-xs text-white font-semibold">
                Clocked In
              </span>
              <span className="text-xs text-gray-400">
                {attendance.clockIn
                  ? formatTime(attendance.clockIn)
                  : "Not marked"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-400" />
              <span className="text-xs text-gray-300 font-mono">
                Lat: {locationIn.lat} | Long: {locationIn.lng}
              </span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-1 rounded bg-red-600 text-xs text-white font-semibold">
                Clocked Out
              </span>
              <span className="text-xs text-gray-400">
                {attendance.clockOut
                  ? formatTime(attendance.clockOut)
                  : "Not marked"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-400" />
              <span className="text-xs text-gray-300 font-mono">
                Lat: {locationOut.lat} | Long: {locationOut.lng}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-white" />
              <h4 className="text-sm font-medium text-white">Tasks</h4>
            </div>
            {hasTasks ? (
              <button
                onClick={() => setShowTaskDetails(!showTaskDetails)}
                className="text-sm text-gold-600 hover:underline"
              >
                {showTaskDetails ? "Hide" : "View"}
              </button>
            ) : (
              <span className="text-sm text-gold-500">No tasks recorded</span>
            )}
          </div>
          {hasTasks && showTaskDetails && (
            <div className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 shadow-inner">
              {taskList ? (
                <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {taskList.map((task, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 rounded-md border border-gray-800 bg-gray-800/80 px-3 py-2"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500 text-[11px] font-semibold text-gray-900">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-200">
                        {stripHtml(task)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-200">
                  {stripHtml(attendance.tasks)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Update Button */}
        {onUpdateTasks && !attendance.clockOut && (
          <div>
            <button
              onClick={onUpdateTasks}
              className="w-full text-sm bg-gold-500 hover:bg-gold-600 text-gray-800 px-4 py-2 rounded"
            >
              {hasTasks ? "Update Tasks" : "Add Tasks"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
