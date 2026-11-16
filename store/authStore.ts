import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  roleId?: number;
  Role: {
    id: number;
    name: string;
  };
}

interface Role {
  id: number;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  roles: Role[] | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  setUser: (user: User) => void;
  clearUser: () => void;
  permissions: any | null;
  setPermissions: (permissions: any) => void;
  setRoles: (roles: Role[]) => void;
  clearRoles: () => void;
}

interface Storage {
  getItem: (name: string) => any;
  setItem: (name: string, value: any) => void;
  removeItem: (name: string) => void;
}

interface AuthStoreActions {
  setToken: (token: string) => void;
  clearToken: () => void;
  setUser: (user: any) => void;
  clearUser: () => void;
  setPermissions: (permissions: any) => void;
  logout: () => void;
}

const useAuthStore = create(


  
  persist<AuthState & AuthStoreActions>(
    (set) => ({
      token: null,
      user: null,
      roles: [],
      permissions: [],
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setRoles: (roles) => set({ roles }),
      setPermissions: (permissions) => set({ permissions }),
      clearToken: () => {
        set({ token: null, user: null, roles: [], permissions: [] });
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      },
      clearUser: () => set({ user: null }),
      clearRoles: () => set({ roles: [] }),

      logout: () => {
        set({ token: null, user: null, roles: [], permissions: [] });
        localStorage.removeItem("auth-storage");
        sessionStorage.clear();
      },
    }),
    {
      name: "auth-storage",
      storage: {
        getItem: (name: string): any => {
          const item = localStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name: string, value: any): void => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name: string): void => {
          localStorage.removeItem(name);
        },
      } as Storage,
    },
  ),
);

export default useAuthStore;
