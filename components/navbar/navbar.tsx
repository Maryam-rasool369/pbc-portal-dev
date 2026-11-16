import React, { useEffect, useRef, useState } from "react";
import Loading from "../ui/Loading";
import Image from "next/image";
import Link from "next/link";
import ProfileMenuItem from "./profile-menu-item";
import ApplicationMenuItem from "./application-menu-item";
import SearchComponent from "../search/Search";
import NotificationMenuItem from "./notification-menu-item";
import { useThemeMode } from "flowbite-react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import {
  fetchUnreadNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification as NotificationData,
} from "@/services/notifications";
import { toast } from "react-toastify";
import { HiShoppingCart, HiUser } from "react-icons/hi";
import BirthdayWishModal from "../modals/BirthdayWishModal";
import { useBirthday } from "@/hooks/useBirthday";
import { useQueryClient } from "@tanstack/react-query";

interface NavbarProps {
  isSidebarOpen: boolean;
  onClickToggleNavbar: React.MouseEventHandler<SVGSVGElement>;
}

export default function Navbar(props: NavbarProps) {
  const { isSidebarOpen, onClickToggleNavbar } = props;
  const { mode, toggleMode } = useThemeMode();
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [isApplicationOpen, setApplicationOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const clearToken = useAuthStore((state) => state.clearToken);
  const clearUser = useAuthStore((state) => state.clearUser);
  const clearRoles = useAuthStore((state) => state.clearRoles);
  
  // Check if today is user's birthday
  const { isBirthday, dateOfBirth, userName, profilePicture, template } = useBirthday();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  function toggleThemeHandler() {
    toggleMode();
    setNotificationOpen(false);
    setApplicationOpen(false);
    setProfileOpen(false);
  }

  function toggleNotificationHandler() {
    setNotificationOpen(!isNotificationOpen);
    setApplicationOpen(false);
    setProfileOpen(false);
  }

  function toggleApplicationHandler() {
    setApplicationOpen(!isApplicationOpen);
    setNotificationOpen(false);
    setProfileOpen(false);
  }

  function toggleProfileHandler() {
    setProfileOpen(!isProfileOpen);
    setNotificationOpen(false);
    setApplicationOpen(false);
  }

  function toggleBirthdayModal() {
    setIsBirthdayModalOpen(!isBirthdayModalOpen);
    setNotificationOpen(false);
    setApplicationOpen(false);
    setProfileOpen(false);
  }

  // Reset birthday modal state when token changes (user logs in/out)
  useEffect(() => {
    setIsBirthdayModalOpen(false);
  }, [token]);

  // Auto-open birthday modal on mount if it's the user's birthday
  useEffect(() => {
    if (isBirthday && !isBirthdayModalOpen) {
      // Check if we've already shown the modal today
      const lastShown = localStorage.getItem("birthdayModalShown");
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        setIsBirthdayModalOpen(true);
        localStorage.setItem("birthdayModalShown", today);
      }
    }
  }, [isBirthday, isBirthdayModalOpen]);

  useEffect(() => {
    if (isOpen) {
      loadUnreadNotifications();
    }
  }, [isOpen]);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (token) {
      loadUnreadCount();
      // Poll for new notifications every 60 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest("#user-menu-button-2")
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUnreadNotifications = async () => {
    setLoading(true);
    try {
      if (!token) {
        router.push("/");
        return;
      }
      const data = await fetchUnreadNotifications(token);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      if (!token) return;
      const count = await fetchUnreadCount(token);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      if (!token) return;
      await markNotificationAsRead(token, notificationId);
      // Remove from unread list
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      if (!token) return;
      await deleteNotification(token, notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleClearAll = async () => {
    try {
      if (!token) return;
      await clearAllNotifications(token);
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      toast.error("Failed to clear all notifications");
    }
  };

  return (
    <nav className="fixed z-30 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            <button
              id="toggleSidebarMobile"
              aria-expanded="true"
              aria-controls="sidebar"
              className="p-2 text-gray-600 rounded cursor-pointer lg:hidden hover:text-gray-900 hover:bg-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-2 focus:ring-gray-100 dark:focus:ring-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              {isSidebarOpen ? (
                <svg
                  id="toggleSidebarMobileClose"
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={onClickToggleNavbar}
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              ) : (
                <svg
                  id="toggleSidebarMobileHamburger"
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={onClickToggleNavbar}
                >
                  <path
                    fillRule="evenodd"
                    d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
            </button>
            <Link href="/userMarketplace" className="flex ml-2 md:mr-24">
              {/* <Image
                src="/logo.svg"
                className="h-8 mr-3"
                alt="App Logo"
                width={32}
                height={32}
              /> */}
              <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white">
                PBC Dubai
              </span>
            </Link>
          </div>
          <div className="flex items-center">
            {/* Search mobile
            <button
              id="toggleSidebarMobileSearch"
              type="button"
              className="p-2 text-gray-500 rounded-lg lg:hidden hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <span className="sr-only">Search</span>
              
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button> */}

            {isBirthday && (
              <div className="relative inline-block text-left mr-2">
                <button
                  onClick={toggleBirthdayModal}
                  className="relative p-2.5 rounded-full bg-gradient-to-br from-yellow-400 via-pink-400 to-purple-400 hover:from-yellow-500 hover:via-pink-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 animate-bounce hover:animate-none"
                  aria-label="View birthday wish"
                  title="It's your birthday! 🎉 Click to see your special message!"
                  style={{ animationDuration: "2s" }}
                >
                  <div className="relative text-2xl filter drop-shadow-lg">
                    🎂
                    <span className="absolute -top-1 -right-1 text-xs animate-ping" style={{ animationDelay: "0s" }}>✨</span>
                    <span className="absolute -bottom-1 -left-1 text-xs animate-ping" style={{ animationDelay: "0.5s" }}>⭐</span>
                  </div>
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-yellow-300 opacity-60 animate-ping" 
                    style={{ animationDuration: "1.5s" }}
                  ></div>
                </button>
              </div>
            )}

            <SearchComponent />
            

            
            {/* Notifications */}
            <div className="relative inline-block text-left">
              {/* Notification Bell Button */}
              <button
                onClick={toggleDropdown}
                className="relative p-2 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                aria-label="View notifications"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-3 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              <div
                ref={dropdownRef}
                className="relative inline-block text-left"
              >
                {isOpen && (
                  <div className="absolute right-0 top-10 z-20 w-96 max-w-lg bg-gray-800 border border-gray-600 rounded-lg shadow-lg divide-y divide-gray-700 overflow-hidden">
                    <div className="px-6 py-3 flex items-center justify-between text-gray-200 bg-gray-900">
                      <span className="font-semibold">Unread Notifications</span>
                      {notifications.length > 0 && (
                        <div className="flex gap-2">
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs px-2 py-1 text-blue-400 hover:text-blue-300 transition"
                            title="Mark all as read"
                          >
                            ✓ All
                          </button>
                          <button
                            onClick={handleClearAll}
                            className="text-xs px-2 py-1 text-red-400 hover:text-red-300 transition"
                            title="Clear all"
                          >
                            🗑 Clear
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                      {loading && (
                        <div className="p-4 text-center text-gray-300">
                          <Loading/>
                        </div>
                      )}
                      {!loading && notifications.length === 0 && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          You don’t have any unread notifications.
                        </div>
                      )}
                      {!loading &&
                        notifications.map((notification, idx) => (
                          <NotificationMenuItem
                            key={notification.id}
                            id={notification.id}
                            title={notification.title}
                            message={notification.message}
                            link={notification.link}
                            refId={notification.refId}
                            createdAt={notification.createdAt}
                            index={idx}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDeleteNotification}
                          />
                        ))}
                    </div>
                    <div className="text-center p-3 bg-gray-900">
                      <Link
                        href="/notifications"
                        onClick={() => setIsOpen(false)}
                        className="inline-block px-4 py-2 font-semibold text-gold-400 bg-gray-800 rounded hover:bg-gold-600 hover:text-gray-900 transition duration-200 cursor-pointer dark:bg-gray-700 dark:hover:bg-gold-500 dark:hover:text-white"
                      >
                        View All
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Theme */}
            {/* <button
              id="theme-toggle"
              className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5"
              data-tooltip-target="tooltip-toggle"
              type="button"
              onClick={toggleThemeHandler}
            >
              {mode === "dark" ? (
                <svg
                  id="theme-toggle-light-icon"
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  ></path>
                </svg>
              ) : (
                <svg
                  id="theme-toggle-dark-icon"
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>
            <div
              id="tooltip-toggle"
              role="tooltip"
              className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip"
            >
              Toggle dark mode
              <div className="tooltip-arrow" data-popper-arrow></div>
            </div> */}
            {/* <div>
              <Link href={"/cart"}>
             
                <HiShoppingCart color="9ca3af" size="25px" />
              </Link>
            </div> */}
            {/* Profile */}
            <div className="flex items-center ml-3">
              <div>
                <button
                  className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                  type="button"
                  id="user-menu-button-2"
                  aria-expanded="false"
                  data-dropdown-toggle="dropdown-2"
                  onClick={toggleProfileHandler}
                >
                  <span className="sr-only">Open user menu</span>
                  {/* <Image
                    className="w-8 h-8 rounded-full"
                    src="/icons/profile.svg"
                    width={150}
                    height={150}
                    alt="user photo"
                  /> */}
                  {/*@ts-ignore*/}
                  <HiUser color="9ca3af" size="25px" />
                </button>
              </div>
              {/* Dropdown menu */}
              <div
                ref={profileDropdownRef}
                className={`${
                  isProfileOpen ? "absolute" : "hidden"
                } z-50 right-6 top-14 text-base list-none bg-white divide-y divide-gray-100 rounded shadow dark:bg-gray-700 dark:text-white dark:divide-gray-600`}
                id="dropdown-2"
              >
                <ul
                  className="text-sm text-gray-700 dark:text-gray-200"
                  role="menu"
                >
                  <li>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        // Clear React Query cache
                        queryClient.clear();
                        // Clear auth state
                        clearToken();
                        clearUser();
                        clearRoles();
                        // Clear localStorage
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        localStorage.removeItem("roles");
                        localStorage.removeItem("birthdayModalShown");
                        // Clear sessionStorage
                        sessionStorage.removeItem("token");
                        sessionStorage.removeItem("user");
                        sessionStorage.removeItem("roles");
                        router.push("/");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white transition-colors duration-200 rounded"
                      role="menuitem"
                    >
                      🚪 Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      

      {isBirthday && (
        <BirthdayWishModal
          isOpen={isBirthdayModalOpen}
          onClose={() => setIsBirthdayModalOpen(false)}
          userName={userName}
          profilePicture={profilePicture}
          dateOfBirth={dateOfBirth}
          template={template}
        />
      )}
    </nav>
  );
}
