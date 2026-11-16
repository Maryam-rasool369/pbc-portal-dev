import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@/services/chat";

export interface MessagesPage {
  data: ChatMessage[];
  pagination: { nextCursor: number | null; hasMore: boolean };
}

export function markMessageDeleted(
  queryClient: QueryClient,
  chatId: number,
  messageId: number,
  deletedByAdminName?: string,
) {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", chatId], (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                content: "",
                ...(deletedByAdminName && { deletedByAdminName }),
              }
            : m,
        ),
      })),
    };
  });
}

export function removeMessageForMe(queryClient: QueryClient, chatId: number, messageId: number) {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", chatId], (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.filter((m) => m.id !== messageId),
      })),
    };
  });
}
