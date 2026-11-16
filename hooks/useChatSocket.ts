import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/context/SocketContext";
import type { AttachmentType, Chat, MessageType } from "@/services/chat";

interface ChatsListData {
  data: Chat[];
  pagination?: unknown;
}

export interface TypingUser {
  userId: number;
  name: string;
}

interface SendMessagePayload {
  chatId: number;
  content?: string;
  type?: MessageType;
  replyToId?: number;
  attachments?: {
    url: string;
    type: AttachmentType;
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration?: number;
  }[];
}


export function useChatSocket(activeChatId: number | null) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    setTypingUsers([]);
    if (!socket || !activeChatId) return;

    const onTyping = (payload: { chatId: number; userId: number; name: string }) => {
      if (payload.chatId !== activeChatId) return;
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === payload.userId)
          ? prev
          : [...prev, { userId: payload.userId, name: payload.name }],
      );
    };
    const onStopTyping = (payload: { chatId: number; userId: number }) => {
      if (payload.chatId !== activeChatId) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
    };

    socket.on("user_typing", onTyping);
    socket.on("user_stop_typing", onStopTyping);
    return () => {
      socket.off("user_typing", onTyping);
      socket.off("user_stop_typing", onStopTyping);
    };
  }, [socket, activeChatId]);

  useEffect(() => {
    if (!socket || !activeChatId) return;
    socket.emit("join_chat", activeChatId);
    return () => {
      socket.emit("leave_chat", activeChatId);
    };
  }, [socket, activeChatId]);

  const sendMessage = useCallback(
    (payload: SendMessagePayload) => socket?.emit("send_message", payload),
    [socket],
  );
  const emitTyping = useCallback(
    (chatId: number) => socket?.emit("typing", chatId),
    [socket],
  );
  const emitStopTyping = useCallback(
    (chatId: number) => socket?.emit("stop_typing", chatId),
    [socket],
  );
  const markRead = useCallback(
    (chatId: number) => {
      socket?.emit("mark_read", chatId);
      queryClient.setQueryData<ChatsListData>(["chats"], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((chat) =>
            chat.id === chatId ? { ...chat, unreadCount: 0 } : chat,
          ),
        };
      });
    },
    [socket, queryClient],
  );

  return {
    connected: !!socket,
    typingUsers,
    sendMessage,
    emitTyping,
    emitStopTyping,
    markRead,
  };
}
