import { useEffect } from "react";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useSocket } from "@/context/SocketContext";
import useAuthStore from "@/store/authStore";
import type { Chat, ChatMessage } from "@/services/chat";
import { markMessageDeleted, type MessagesPage } from "@/utils/chatMessageCache";

interface ChatsListData {
  data: Chat[];
  pagination?: unknown;
}

export function useChatCacheSync() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) =>
    state.user ? Number(state.user.id) : undefined,
  );

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message: ChatMessage) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ["messages", message.chatId],
        (old) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          if (firstPage?.data.some((m) => m.id === message.id)) return old;
          const newFirstPage: MessagesPage = {
            ...firstPage,
            data: [message, ...(firstPage?.data ?? [])],
          };
          return { ...old, pages: [newFirstPage, ...old.pages.slice(1)] };
        },
      );

      queryClient.setQueryData<ChatsListData>(["chats"], (old) => {
        if (!old) return old;
        const isMine = message.senderId === currentUserId;
        let found = false;
        const chats = old.data.map((chat) => {
          if (chat.id !== message.chatId) return chat;
          found = true;
          return {
            ...chat,
            messages: [message],
            updatedAt: message.createdAt,
            unreadCount: isMine ? (chat.unreadCount ?? 0) : (chat.unreadCount ?? 0) + 1,
          };
        });
        if (!found) return old;
        chats.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        return { ...old, data: chats };
      });
    };

    const onMessageDeleted = (payload: {
      messageId: number;
      chatId: number;
      deletedByAdminName?: string;
    }) => {
      markMessageDeleted(queryClient, payload.chatId, payload.messageId, payload.deletedByAdminName);
    };

    const onMessageUpdated = (payload: {
      messageId: number;
      chatId: number;
      content: string;
      isEdited: boolean;
      updatedAt: string;
    }) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ["messages", payload.chatId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === payload.messageId
                  ? {
                      ...m,
                      content: payload.content,
                      isEdited: payload.isEdited,
                      updatedAt: payload.updatedAt,
                    }
                  : m,
              ),
            })),
          };
        },
      );
    };

    const onChatUpdated = (payload: { chatId: number; name: string }) => {
      queryClient.setQueryData<ChatsListData>(["chats"], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((chat) =>
            chat.id === payload.chatId ? { ...chat, name: payload.name } : chat,
          ),
        };
      });
    };

    const onMessagesRead = (payload: {
      chatId: number;
      readByUserId: number;
      readAt: string;
    }) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ["messages", payload.chatId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) => {
                if (m.senderId !== currentUserId) return m;
                const receipts = m.readReceipts ?? [];
                if (receipts.some((r) => r.userId === payload.readByUserId)) return m;
                return {
                  ...m,
                  readReceipts: [
                    ...receipts,
                    {
                      id: -payload.readByUserId,
                      messageId: m.id,
                      userId: payload.readByUserId,
                      readAt: payload.readAt,
                    },
                  ],
                };
              }),
            })),
          };
        },
      );
    };

    const setParticipantOnline = (userId: number, isOnline: boolean) => {
      queryClient.setQueryData<ChatsListData>(["chats"], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.userId === userId ? { ...p, isOnline } : p,
            ),
          })),
        };
      });
    };
    const onUserOnline = (payload: { userId: number }) => setParticipantOnline(payload.userId, true);
    const onUserOffline = (payload: { userId: number }) => setParticipantOnline(payload.userId, false);
    const onChatError = (payload: { message: string }) => toast.error(payload.message);

    socket.on("new_message", onNewMessage);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("message_updated", onMessageUpdated);
    socket.on("chat_updated", onChatUpdated);
    socket.on("messages_read", onMessagesRead);
    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("chat_error", onChatError);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("message_updated", onMessageUpdated);
      socket.off("chat_updated", onChatUpdated);
      socket.off("messages_read", onMessagesRead);
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
      socket.off("chat_error", onChatError);
    };
  }, [socket, queryClient, currentUserId]);
}
