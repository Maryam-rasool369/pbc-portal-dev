import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "pbc_sidebar_collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsedState(stored === "true");
  }, []);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarCollapse must be used within a SidebarProvider");
  return ctx;
}
