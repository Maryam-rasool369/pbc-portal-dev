import { useEffect, useRef, useState } from "react";
import {
  HiArrowLeft,
  HiDotsVertical,
  HiInformationCircle,
  HiLogout,
  HiTrash,
  HiVolumeOff,
  HiVolumeUp,
} from "react-icons/hi";
import Avatar from "./Avatar";
import type { Chat } from "@/services/chat";
import type { TypingUser } from "@/hooks/useChatSocket";

interface ChatHeaderProps {
  chat: Chat;
  currentUserId: number;
  typingUsers: TypingUser[];
  onBack: () => void;
  onOpenInfo: () => void;
  onToggleMute: () => void;
  onLeaveOrDelete: () => void;
}

export default function ChatHeader({
  chat,
  currentUserId,
  typingUsers,
  onBack,
  onOpenInfo,
  onToggleMute,
  onLeaveOrDelete,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isGroup = chat.type === "GROUP";
  const other = !isGroup
    ? chat.participants.find((p) => p.userId !== currentUserId)
    : undefined;

  const displayName = isGroup ? chat.name ?? "Group" : other?.user.name ?? "Chat";
  const picture = isGroup ? chat.picture : other?.user.profile?.profilePicture;
  const isOnline = !isGroup && !!other?.isOnline;

  const statusText = typingUsers.length
    ? isGroup
      ? `${typingUsers.map((u) => u.name).join(", ")} typing...`
      : "typing..."
    : isGroup
      ? `${chat.participants.length} members`
      : isOnline
        ? "Online"
        : "Offline";

  return (
    <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 h-[68px] flex-shrink-0">
      <button onClick={onBack} className="lg:hidden text-gray-400 hover:text-white">
        {/* @ts-ignore */}
        <HiArrowLeft className="w-5 h-5" />
      </button>

      <button
        onClick={onOpenInfo}
        className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:bg-gray-800/50 -mx-2 px-2 py-1.5 transition-colors"
      >
        <Avatar name={displayName} picture={picture} online={isOnline} size="lg" />
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{displayName}</p>
          <p className={`text-xs truncate ${typingUsers.length ? "text-gold-400" : "text-gray-400"}`}>
            {statusText}
          </p>
        </div>
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-gray-400 hover:text-white hover:bg-gray-800 p-2.5 rounded-full transition-colors"
        >
          {/* @ts-ignore */}
          <HiDotsVertical className="w-5 h-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 z-20 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1.5 overflow-hidden">
            {isGroup && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenInfo();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                {/* @ts-ignore */}
                <HiInformationCircle className="w-4 h-4" /> Group info
              </button>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                onToggleMute();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              {chat.isMuted ? (
                <>
                  {/* @ts-ignore */}
                  <HiVolumeUp className="w-4 h-4" /> Unmute
                </>
              ) : (
                <>
                  {/* @ts-ignore */}
                  <HiVolumeOff className="w-4 h-4" /> Mute
                </>
              )}
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onLeaveOrDelete();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
            >
              {isGroup ? (
                <>
                  {/* @ts-ignore */}
                  <HiLogout className="w-4 h-4" /> Leave group
                </>
              ) : (
                <>
                  {/* @ts-ignore */}
                  <HiTrash className="w-4 h-4" /> Delete chat
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
