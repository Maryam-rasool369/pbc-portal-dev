import { useEffect, useLayoutEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Spinner } from "flowbite-react";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { getMessages, type Chat, type ChatMessage } from "@/services/chat";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Avatar from "./Avatar";
import type { TypingUser } from "@/hooks/useChatSocket";

const NEAR_BOTTOM_THRESHOLD = 150;
const LOAD_MORE_THRESHOLD = 100;

interface MessageListProps {
  chat: Chat;
  canModerate: boolean;
  typingUsers: TypingUser[];
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onReplyPrivately: (message: ChatMessage) => void;
  onMarkRead: () => void;
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

export default function MessageList({
  chat,
  canModerate,
  typingUsers,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReplyPrivately,
  onMarkRead,
}: MessageListProps) {
  const chatId = chat.id;
  const isGroup = chat.type === "GROUP";
  const token = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => (state.user ? Number(state.user.id) : undefined));
  const otherParticipant = !isGroup
    ? chat.participants.find((p) => p.userId !== currentUserId)
    : undefined;
  const displayName = isGroup ? chat.name ?? "Group" : otherParticipant?.user.name ?? "Chat";
  const displayPicture = isGroup ? chat.picture : otherParticipant?.user.profile?.profilePicture;

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const res = await getMessages(token as string, chatId, { cursor: pageParam, limit: 30 });
      return { data: res.data, pagination: res.pagination };
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    initialPageParam: undefined as number | undefined,
    enabled: !!token,
  });

  // Pages arrive newest-first per page, newest page first — flatten then reverse for oldest-to-newest, top-to-bottom.
  const messages = (data?.pages.flatMap((p) => p.data) ?? []).slice().reverse();
  const newestMessageId = data?.pages[0]?.data[0]?.id;

  useEffect(() => {
    isNearBottomRef.current = true;
  }, [chatId]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !prevScrollHeightRef.current) return;
    el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
    prevScrollHeightRef.current = 0;
  }, [data]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestMessageId, chatId]);

  // The typing indicator appears/disappears without a new message arriving,
  // so it needs its own scroll trigger — otherwise it can render just below
  // the visible viewport, hidden behind the composer, until the user
  // manually scrolls.
  useEffect(() => {
    if (typingUsers.length > 0 && isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingUsers.length]);

  useEffect(() => {
    const newest = data?.pages[0]?.data[0];
    if (newest && newest.senderId !== currentUserId) {
      onMarkRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestMessageId]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;

    if (el.scrollTop < LOAD_MORE_THRESHOLD && hasNextPage && !isFetchingNextPage) {
      prevScrollHeightRef.current = el.scrollHeight;
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-gray-950 [background-image:radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:22px_22px]">
        <div className="relative">
          <Avatar name={displayName} picture={displayPicture} size="xl" className="ring-4 ring-gold-500/20" />
          <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-8 h-8 rounded-full bg-gold-500 ring-4 ring-gray-950">
            {/* @ts-ignore */}
            <HiOutlineChatAlt2 className="w-4 h-4 text-gray-900" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-white font-semibold text-lg">{displayName}</h3>
          <p className="text-gray-400 text-sm mt-1">No messages yet</p>
          <p className="text-gray-500 text-sm">Say hi to start the conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 lg:px-10 xl:px-24 pt-4 pb-6 bg-gray-950 [background-image:radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:22px_22px]"
    >
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Spinner size="sm" />
        </div>
      )}

      {messages.map((message, i) => {
        const prev = messages[i - 1];
        const showDateSeparator =
          !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
        const isNewRun = !prev || prev.senderId !== message.senderId || showDateSeparator;

        return (
          <div key={message.id}>
            {showDateSeparator && (
              <div className="flex justify-center my-3">
                <span className="text-xs text-gray-400 bg-gray-800/70 rounded-full px-3 py-1">
                  {formatDateLabel(message.createdAt)}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              isMine={message.senderId === currentUserId}
              isGroup={isGroup}
              showSenderName={isNewRun}
              showAvatar={isNewRun}
              canModerate={canModerate}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onForward={onForward}
              onReplyPrivately={onReplyPrivately}
            />
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="mt-1 mb-2">
          <TypingIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
