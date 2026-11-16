import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";
import ActivityLogTab from "@/components/logs/ActivityLogTab";
import InteractionLogTab from "@/components/logs/InteractionLogTab";

type LogsTab = "activity" | "interaction";

export default function LogsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const canViewLogs = !!ability?.can("read", "Logs");

  const [activeTab, setActiveTab] = useState<LogsTab>(
    router.query.tab === "interaction" ? "interaction" : "activity",
  );

  useEffect(() => {
    if (!token || token === "undefined" || !user) return;

    if (!canViewLogs) {
      toast.error(
        "You are not authorized to access this page. Routing you back to the homepage",
      );
      router.push("/userMarketplace");
    }
  }, [token, user, canViewLogs]);

  const handleTabChange = (tab: LogsTab) => {
    setActiveTab(tab);
    router.push({ pathname: "/logs", query: { tab } }, undefined, {
      shallow: true,
    });
  };

  if (!canViewLogs) return null;

  return (
    <div>
      <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 -mb-px">
          <button
            type="button"
            onClick={() => handleTabChange("activity")}
            className={`py-3 px-1 border-b-2 text-sm font-medium ${
              activeTab === "activity"
                ? "border-gold-600 text-gold-600 dark:text-gold-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400"
            }`}
          >
            Activity Log
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("interaction")}
            className={`py-3 px-1 border-b-2 text-sm font-medium ${
              activeTab === "interaction"
                ? "border-gold-600 text-gold-600 dark:text-gold-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400"
            }`}
          >
            Interaction Log
          </button>
        </nav>
      </div>

      {activeTab === "activity" ? <ActivityLogTab /> : <InteractionLogTab />}
    </div>
  );
}
