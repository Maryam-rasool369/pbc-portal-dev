import React, { useState, useEffect } from "react";
import Loading from "@/components/ui/Loading";
import NotificationMenuItem from "@/components/navbar/notification-menu-item";
import useAuthStore from "@/store/authStore";
import { useRouter } from "next/router";
import {
  fetchAllNotifications,
  fetchUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification,
  type PaginatedResponse,
} from "@/services/notifications";
import { toast } from "react-toastify";
import { Button } from "flowbite-react";

type FilterType = "all" | "unread";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  const loadNotifications = async (pageNumber: number, filterType: FilterType) => {
    setLoading(true);
    try {
      if (!token) {
        router.push("/");
        return;
      }

      if (filterType === "unread") {
        // Unread endpoint doesn't support pagination
        const data = await fetchUnreadNotifications(token);
        setNotifications(data);
        setTotalPages(1);
      } else {
        // All notifications with pagination
        const data: PaginatedResponse = await fetchAllNotifications(token, pageNumber, 10);
        setNotifications(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(page, filter);
  }, [page, filter, token]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when changing filter
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      if (!token) return;
      await markNotificationAsRead(token, notificationId);
      // Remove from list if in unread view, or update status if in all view
      if (filter === "unread") {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, status: "READ" as const } : n))
        );
      }
      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      if (!token) return;
      await deleteNotification(token, notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!token) return;
      await markAllNotificationsAsRead(token);
      // Reload notifications
      loadNotifications(page, filter);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      return;
    }
    try {
      if (!token) return;
      await clearAllNotifications(token);
      setNotifications([]);
      setPage(1);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      toast.error("Failed to clear all notifications");
    }
  };

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => Math.min(p + 1, totalPages));

  return (
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Your Notifications
        </h1>
        
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            color="dark"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={loading || notifications.length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark All Read
          </Button>
          <Button
            color="failure"
            size="sm"
            onClick={handleClearAll}
            disabled={loading || notifications.length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-300 dark:border-gray-600">
        <div className="flex gap-4">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === "all"
                ? "border-gold-500 text-gold-500 dark:text-gold-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => handleFilterChange("unread")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === "unread"
                ? "border-gold-500 text-gold-500 dark:text-gold-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Unread Only
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loading />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === "unread" ? "No unread notifications" : "No notifications found"}
          </p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="divide-y divide-gray-300 dark:divide-gray-600 rounded-md overflow-hidden shadow-md bg-gray-800">
          {notifications.map((notif, idx) => (
            <NotificationMenuItem
              key={notif.id}
              id={notif.id}
              title={notif.title}
              message={notif.message}
              link={notif.link}
              refId={notif.refId}
              createdAt={notif.createdAt}
              index={idx}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination - only show for "all" filter */}
      {!loading && filter === "all" && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <Button
            color="dark"
            onClick={handlePrev}
            disabled={page === 1}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>

          <span className="text-gray-700 dark:text-gray-300 font-medium">
            Page {page} of {totalPages}
          </span>

          <Button
            color="dark"
            onClick={handleNext}
            disabled={page === totalPages}
          >
            Next
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
