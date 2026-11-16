import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import useAuthStore from "@/store/authStore";

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });


export function SocketProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const instance = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token, platform: "web" },
    });
    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): Socket | null {
  return useContext(SocketContext).socket;
}
