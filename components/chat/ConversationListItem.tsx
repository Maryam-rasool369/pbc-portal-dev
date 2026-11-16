import { HiVolumeOff } from "react-icons/hi";
import Avatar from "./Avatar";
import type { AttachmentType, Chat } from "@/services/chat";

interface ConversationListItemProps {
  chat: Chat;
  currentUserId: number;
  isActive: boolean;
  onClick: () => void;
}

function attachmentLabel(type: AttachmentType): string {
  switch (type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Voice message";
    default:
      return "Document";
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationListItem({
  chat,
  currentUserId,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const isGroup = chat.type === "GROUP";
  const other = !isGroup ? chat.participants.find((p) => p.userId !== currentUserId) : undefined;
  const displayName = isGroup ? chat.name ?? "Group" : other?.user.name ?? "Chat";
  const picture = isGroup ? chat.picture : other?.user.profile?.profilePicture;

  const lastMessage = chat.messages?.[0];
  let preview = "No messages yet";
  if (lastMessage) {
    if (lastMessage.type === "SYSTEM") {
      preview = lastMessage.content;
    } else if (lastMessage.isDeleted) {
      preview = "Message deleted";
    } else {
      const prefix =
        lastMessage.senderId === currentUserId
          ? "You: "
          : isGroup
            ? `${lastMessage.sender?.name ?? ""}: `
            : "";
      const body =
        lastMessage.type === "GIF"
          ? "GIF"
          : lastMessage.type === "STICKER"
            ? lastMessage.content || "Sticker"
            : lastMessage.content ||
              (lastMessage.attachments?.[0] ? attachmentLabel(lastMessage.attachments[0].type) : "");
      preview = `${prefix}${body}`;
    }
  }

  const unreadCount = chat.unreadCount ?? 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 pl-2.5 pr-3 py-3 rounded-lg text-left transition-colors border-l-2 ${
        isActive
          ? "bg-gray-800 border-gold-500"
          : "border-transparent hover:bg-gray-800/50"
      }`}
    >
      <Avatar name={displayName} picture={picture} online={!isGroup && !!other?.isOnline} size="lg" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate ${unreadCount ? "text-white font-semibold" : "text-gray-200 font-medium"}`}>
            {displayName}
          </p>
          {lastMessage && (
            <span className={`text-xs flex-shrink-0 ${unreadCount ? "text-gold-400 font-medium" : "text-gray-500"}`}>
              {formatRelativeTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={`text-sm truncate ${unreadCount ? "text-gray-300" : "text-gray-500"}`}>
            {preview}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {chat.isMuted && (
              // @ts-ignore
              <HiVolumeOff className="w-3.5 h-3.5 text-gray-500" />
            )}
            {unreadCount > 0 && (
              <span className="bg-gold-500 text-gray-900 text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
