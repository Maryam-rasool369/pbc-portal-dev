import React, { useState } from "react";
import Navbar from "@/components/navbar/navbar";
import Sidebar from "@/components/sidebar/sidebar";
import FooterDashboard from "@/components/footers/footer-dashboard";
import { Flowbite } from "flowbite-react";
import { useSidebarCollapse } from "@/context/SidebarContext";

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu?: string;
}

export default function MainLayout({
  children,
  activeMenu = "dashboard",
}: MainLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebarCollapse();

  function sidebarHandler() {
    setSidebarOpen(!isSidebarOpen);
  }

  return (
    <Flowbite theme={{ mode: "dark" }}>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          onClickToggleNavbar={sidebarHandler}
        />
        <div className="flex flex-1 pt-16 overflow-hidden">
          <Sidebar isSidebarOpen={isSidebarOpen} activeMenu={activeMenu} />
          <div
            id="main-content"
            className={`relative flex flex-col w-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-[margin-left] duration-300 ease-in-out ${collapsed ? "lg:ml-20" : "lg:ml-64"
              }`}
          >
            <div className="flex-grow px-4 pt-6">{children}</div>
            <FooterDashboard />
          </div>
        </div>
      </div>
    </Flowbite>
  );
}
