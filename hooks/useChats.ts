import { useQuery } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { getMyChats } from "@/services/chat";

export function useChats() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ["chats"],
    queryFn: () => getMyChats(token as string, { limit: 100 }),
    enabled: !!token,
  });
}
