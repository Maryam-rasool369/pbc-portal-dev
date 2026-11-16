import React, { useEffect, useState } from "react";
import Navbar from "@/components/navbar/navbar";
import Sidebar from "@/components/sidebar/sidebar";
import { Flowbite } from "flowbite-react";
import { useSidebarCollapse } from "@/context/SidebarContext";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed, setCollapsed } = useSidebarCollapse();

  useEffect(() => {
    setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Flowbite theme={{ mode: "dark" }}>
      <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          onClickToggleNavbar={() => setSidebarOpen((v) => !v)}
        />
        <div className="flex flex-1 min-h-0 pt-16">
          <Sidebar isSidebarOpen={isSidebarOpen} activeMenu="chat" />
          <div
            className={`flex-1 min-w-0 transition-[margin-left] duration-300 ease-in-out ${collapsed ? "lg:ml-20" : "lg:ml-64"
              }`}
          >
            {children}
          </div>
        </div>
      </div>
    </Flowbite>
  );
}
