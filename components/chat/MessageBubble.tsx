import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import emojiRegex from "emoji-regex";
import {
  HiCheck,
  HiDocumentText,
  HiDotsVertical,
  HiDownload,
  HiLockClosed,
  HiPencilAlt,
  HiReply,
  HiShare,
  HiTrash,
} from "react-icons/hi";
import Avatar from "./Avatar";
import ImageLightbox from "./ImageLightbox";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import type { ChatMessage } from "@/services/chat";

const MENU_GAP = 6;
const MENU_WIDTH = 176;
const MENU_HEIGHT_ESTIMATE = 190;
const LONG_MESSAGE_CHAR_LIMIT = 350;
const MAX_JUMBO_EMOJI = 3;


function isJumboEmojiContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const matches = trimmed.match(emojiRegex());
  if (!matches || !matches.length || matches.length > MAX_JUMBO_EMOJI) return false;
  return trimmed.replace(emojiRegex(), "").trim().length === 0;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  isGroup: boolean;
  showSenderName: boolean;
  showAvatar: boolean;
  canModerate: boolean;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onReplyPrivately: (message: ChatMessage) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({
  message,
  isMine,
  isGroup,
  showSenderName,
  showAvatar,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReplyPrivately,
}: MessageBubbleProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openMenu = (anchorRight: boolean) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUpward = rect.top > MENU_HEIGHT_ESTIMATE + MENU_GAP;
    const style: CSSProperties = { position: "fixed", zIndex: 9999, width: MENU_WIDTH };
    if (openUpward) style.bottom = window.innerHeight - rect.top + MENU_GAP;
    else style.top = rect.bottom + MENU_GAP;
    if (anchorRight) style.right = Math.max(8, window.innerWidth - rect.right);
    else style.left = Math.max(8, rect.left);
    setMenuStyle(style);
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const handleScroll = () => setMenuOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [menuOpen]);

  if (message.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-800/70 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    );
  }

  const isRead =
    !message.isDeleted &&
    (message.readReceipts ?? []).some((r) => r.userId !== message.senderId);
  const canEdit = isMine && !message.isDeleted && message.type === "TEXT";
  const canDelete = !message.isDeleted && (isMine || canModerate);
  const canReplyPrivately = isGroup && !isMine && !message.isDeleted;
  const isLongMessage = message.content.length > LONG_MESSAGE_CHAR_LIMIT;
  const displayContent =
    isLongMessage && !isExpanded
      ? `${message.content.slice(0, LONG_MESSAGE_CHAR_LIMIT).trimEnd()}…`
      : message.content;
  const images = message.attachments.filter((a) => a.type === "IMAGE");
  const others = message.attachments.filter((a) => a.type !== "IMAGE");
  const hasImages = images.length > 0;
  const isGif = message.type === "GIF";
  const gifContentUrl = isGif && !hasImages && message.content ? message.content : null;
  const hasVisualMedia = hasImages || !!gifContentUrl;
  const isJumbo =
    message.type === "TEXT" && !message.isDeleted && !message.attachments.length && isJumboEmojiContent(message.content);

  return (
    <div className={`group flex items-end gap-2 mb-1 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && isGroup && (
        <div className="w-8">
          {showAvatar && (
            <Avatar name={message.sender.name} picture={message.sender.profile?.profilePicture} size="sm" />
          )}
        </div>
      )}

      <div
        className={`flex flex-col min-w-0 ${hasVisualMedia ? "max-w-[85%] lg:max-w-[420px]" : "max-w-[75%] lg:max-w-[min(65%,560px)]"
          } ${isMine ? "items-end" : "items-start"}`}
      >
        {!isMine && isGroup && showSenderName && (
          <span className="text-xs text-gold-400 font-medium mb-0.5 px-1">
            {message.sender.name}
          </span>
        )}

        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          {isMine && !message.isDeleted && (
            <button
              ref={buttonRef}
              onClick={() => (menuOpen ? setMenuOpen(false) : openMenu(true))}
              title="Message options"
              className={`p-1 text-gray-400 hover:text-white transition-opacity flex-shrink-0 ${
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {/* @ts-ignore */}
              <HiDotsVertical className="w-4 h-4" />
            </button>
          )}

          <div
            className={
              isJumbo
                ? "px-1 py-1 text-white min-w-0 max-w-full"
                : `rounded-2xl px-4 py-2 shadow-sm min-w-0 max-w-full ${
                    isMine
                      ? "bg-gold-500 text-gray-900 rounded-br-sm"
                      : "bg-gray-800 text-white rounded-bl-sm"
                  }`
            }
          >
            {message.isDeleted ? (
              <p className="italic text-sm opacity-70">
                {message.deletedByAdminName
                  ? `This message was deleted by ${message.deletedByAdminName}`
                  : "This message was deleted"}
              </p>
            ) : (
              <>
                {message.replyTo && (
                  <div
                    className={`mb-1.5 rounded-lg px-2 py-1 text-xs border-l-2 ${
                      isMine && !isJumbo
                        ? "bg-black/10 border-gray-800"
                        : "bg-gray-900/60 border-gold-500"
                    }`}
                  >
                    <p className="font-medium">{message.replyTo.sender.name}</p>
                    <p className="truncate opacity-80">
                      {message.replyTo.isDeleted ? "Message deleted" : message.replyTo.content}
                    </p>
                  </div>
                )}

                {message.privateReplySourceMsgId && (
                  <div
                    className={`mb-1.5 rounded-lg px-2 py-1 text-xs border-l-2 ${
                      isMine && !isJumbo
                        ? "bg-black/10 border-gray-800"
                        : "bg-gray-900/60 border-gold-500"
                    }`}
                  >
                    <p className="font-medium flex items-center gap-1">
                      {/* @ts-ignore */}
                      <HiLockClosed className="w-3 h-3" />
                      Replied privately{message.privateReplySourceChatName ? ` from ${message.privateReplySourceChatName}` : ""}
                    </p>
                    {message.privateReplySourceMsgContent && (
                      <p className="truncate opacity-80">{message.privateReplySourceMsgContent}</p>
                    )}
                  </div>
                )}

                {gifContentUrl && (
                  <button type="button" onClick={() => setLightboxUrl(gifContentUrl)} className="relative block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gifContentUrl}
                      alt="GIF"
                      className="rounded-lg max-h-96 min-h-[160px] w-full object-cover cursor-zoom-in hover:brightness-95 transition"
                    />
                    <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold tracking-wide rounded px-1.5 py-0.5">
                      GIF
                    </span>
                  </button>
                )}

                {images.length > 0 && (
                  <div className={`grid gap-1 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${message.content || others.length ? "mb-1.5" : ""}`}>
                    {images.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setLightboxUrl(att.url)}
                        className="relative block w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.fileName}
                          className="rounded-lg max-h-96 min-h-[160px] w-full object-cover cursor-zoom-in hover:brightness-95 transition"
                        />
                        {isGif && (
                          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold tracking-wide rounded px-1.5 py-0.5">
                            GIF
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {others.map((att) =>
                  att.type === "AUDIO" ? (
                    <div key={att.id} className="mb-1.5">
                      <VoiceMessagePlayer url={att.url} duration={att.duration} isMine={isMine} />
                    </div>
                  ) : att.type === "VIDEO" ? (
                    <video key={att.id} controls src={att.url} className="rounded-lg max-h-60 mb-1.5" />
                  ) : (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-1.5 ${
                        isMine ? "bg-black/10" : "bg-gray-900/60"
                      }`}
                    >
                      {/* @ts-ignore */}
                      <HiDocumentText className="w-6 h-6 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{att.fileName}</p>
                        <p className="text-xs opacity-70">{formatFileSize(att.fileSize)}</p>
                      </div>
                      {/* @ts-ignore */}
                      <HiDownload className="w-4 h-4 flex-shrink-0 ml-auto" />
                    </a>
                  ),
                )}

                {message.content && isJumbo && (
                  <p className="text-7xl leading-none break-words">{message.content}</p>
                )}

                {message.content && !isJumbo && !gifContentUrl && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {displayContent}
                    {isLongMessage && (
                      <button
                        type="button"
                        onClick={() => setIsExpanded((v) => !v)}
                        className={`ml-1 font-medium underline underline-offset-2 whitespace-nowrap ${
                          isMine ? "text-blue-900 hover:text-blue-900" : "text-gold-400 hover:text-gold-300"
                        }`}
                      >
                        {isExpanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </p>
                )}
              </>
            )}

            <div
              className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"} ${
                isJumbo ? "bg-gray-900/60 rounded-full px-2 py-0.5 w-fit" : ""
              } ${isJumbo && isMine ? "ml-auto" : ""}`}
            >
              {message.isEdited && !message.isDeleted && (
                <span className="text-[10px] opacity-60">edited</span>
              )}
              <span
                className={`text-[10px] ${
                  isJumbo ? "text-gray-300" : isMine ? "text-gray-800/70" : "text-gray-400"
                }`}
              >
                {formatTime(message.createdAt)}
              </span>
              {isMine && !message.isDeleted && (
                <span className={`flex ${isRead ? "text-sky-400" : isJumbo ? "text-gray-400" : "text-gray-800/50"}`}>
                  {/* @ts-ignore */}
                  <HiCheck className="w-3.5 h-3.5 -mr-2" />
                  {/* @ts-ignore */}
                  <HiCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>

          {!isMine && !message.isDeleted && (
            <button
              ref={buttonRef}
              onClick={() => (menuOpen ? setMenuOpen(false) : openMenu(false))}
              title="Message options"
              className={`p-1 text-gray-400 hover:text-white transition-opacity flex-shrink-0 ${
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {/* @ts-ignore */}
              <HiDotsVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {lightboxUrl && <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {menuOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={menuStyle}
            className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1.5 overflow-hidden"
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                onReply(message);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              {/* @ts-ignore */}
              <HiReply className="w-4 h-4" /> Reply
            </button>
            {canReplyPrivately && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onReplyPrivately(message);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                {/* @ts-ignore */}
                <HiLockClosed className="w-4 h-4" /> Reply privately
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(message);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                {/* @ts-ignore */}
                <HiPencilAlt className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                onForward(message);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              {/* @ts-ignore */}
              <HiShare className="w-4 h-4" /> Forward
            </button>
            {canDelete && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(message);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
              >
                {/* @ts-ignore */}
                <HiTrash className="w-4 h-4" /> Delete
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
