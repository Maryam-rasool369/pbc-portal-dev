import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import {
  deleteChat,
  deleteDirectChat,
  deleteMessage,
  editMessage,
  leaveChat,
  muteChat,
  unmuteChat,
  type AttachmentType,
  type Chat,
  type ChatMessage,
  type MessageType,
} from "@/services/chat";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import GroupInfoModal from "./GroupInfoModal";
import ForwardMessageModal from "./ForwardMessageModal";
import DeleteMessageModal from "./DeleteMessageModal";
import PrivateReplyModal from "./PrivateReplyModal";
import ChatConfirmationModal from "./ChatConfirmationModal";
import type { TypingUser } from "@/hooks/useChatSocket";
import { markMessageDeleted, removeMessageForMe } from "@/utils/chatMessageCache";

interface UploadedAttachment {
  url: string;
  type: AttachmentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
}

interface ChatWindowProps {
  chat: Chat;
  typingUsers: TypingUser[];
  onSendMessage: (payload: {
    chatId: number;
    content?: string;
    type?: MessageType;
    replyToId?: number;
    attachments?: UploadedAttachment[];
  }) => void;
  onTyping: (chatId: number) => void;
  onStopTyping: (chatId: number) => void;
  onMarkRead: (chatId: number) => void;
  onBack: () => void;
  onChatClosed: () => void;
  onOpenChat: (chatId: number) => void;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  avatarName?: string | null;
  avatarPicture?: string | null;
  onConfirm: () => Promise<void>;
}

export default function ChatWindow({
  chat,
  typingUsers,
  onSendMessage,
  onTyping,
  onStopTyping,
  onMarkRead,
  onBack,
  onChatClosed,
  onOpenChat,
}: ChatWindowProps) {
  const token = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => (state.user ? Number(state.user.id) : undefined));
  const currentUserName = useAuthStore((state) => state.user?.name);
  const queryClient = useQueryClient();

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [privateReplyMessage, setPrivateReplyMessage] = useState<ChatMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    onMarkRead(chat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  const isGroup = chat.type === "GROUP";
  const myParticipant = chat.participants.find((p) => p.userId === currentUserId);
  const canModerate = isGroup && myParticipant?.role === "ADMIN";
  const otherParticipant = !isGroup
    ? chat.participants.find((p) => p.userId !== currentUserId)
    : undefined;

  const invalidateChats = () => queryClient.invalidateQueries({ queryKey: ["chats"] });

  const handleReply = (message: ChatMessage) => {
    setEditingMessage(null);
    setReplyingTo(message);
  };

  const handleEdit = (message: ChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(message);
  };

  const handleDelete = (message: ChatMessage) => {
    setDeletingMessage(message);
  };

  const handleConfirmDelete = async (scope?: "for_me") => {
    if (!token || !deletingMessage) return;
    setIsDeletingMessage(true);
    try {
      await deleteMessage(token, chat.id, deletingMessage.id, scope);
      // Patch the cache directly instead of waiting on the socket echo: a
      // "for_me" hide is never broadcast over the socket at all (it's a
      // per-user DB change, and this backend only allows one active session
      // per user, so there's no other device to notify), and even the
      // "for everyone" delete's `message_deleted` echo isn't guaranteed to
      // land before the user expects to see the result.
      if (scope === "for_me") {
        removeMessageForMe(queryClient, chat.id, deletingMessage.id);
      } else {
        const isAdminDelete = deletingMessage.senderId !== currentUserId;
        markMessageDeleted(
          queryClient,
          chat.id,
          deletingMessage.id,
          isAdminDelete ? currentUserName : undefined,
        );
      }
      setDeletingMessage(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message");
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleSaveEdit = async (content: string) => {
    if (!token || !editingMessage) return;
    try {
      await editMessage(token, chat.id, editingMessage.id, content);
      setEditingMessage(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to edit message");
    }
  };

  const handleToggleMute = async () => {
    if (!token) return;
    try {
      if (chat.isMuted) await unmuteChat(token, chat.id);
      else await muteChat(token, chat.id);
      invalidateChats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update mute setting");
    }
  };

  const handleLeaveOrDelete = () => {
    if (isGroup) {
      setConfirmState({
        title: "Leave group",
        message: `You'll stop receiving new messages from this group.`,
        confirmText: "Leave",
        avatarName: chat.name,
        avatarPicture: chat.picture,
        onConfirm: async () => {
          if (!token) return;
          await leaveChat(token, chat.id);
          invalidateChats();
          onChatClosed();
        },
      });
    } else {
      setConfirmState({
        title: "Delete chat",
        message: "This removes the conversation for you. The other person will keep their copy.",
        confirmText: "Delete",
        avatarName: otherParticipant?.user.name,
        avatarPicture: otherParticipant?.user.profile?.profilePicture,
        onConfirm: async () => {
          if (!token) return;
          await deleteDirectChat(token, chat.id);
          invalidateChats();
          onChatClosed();
        },
      });
    }
  };

  const runConfirm = async () => {
    if (!confirmState) return;
    setIsProcessing(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full min-w-0">
      <ChatHeader
        chat={chat}
        currentUserId={currentUserId ?? -1}
        typingUsers={typingUsers}
        onBack={onBack}
        onOpenInfo={() => (isGroup ? setShowGroupInfo(true) : undefined)}
        onToggleMute={handleToggleMute}
        onLeaveOrDelete={handleLeaveOrDelete}
      />

      <MessageList
        chat={chat}
        canModerate={!!canModerate}
        typingUsers={typingUsers}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onForward={setForwardingMessage}
        onReplyPrivately={setPrivateReplyMessage}
        onMarkRead={() => onMarkRead(chat.id)}
      />

      <MessageComposer
        chatId={chat.id}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onSend={(payload) => onSendMessage({ chatId: chat.id, ...payload })}
        onSaveEdit={handleSaveEdit}
        onTyping={() => onTyping(chat.id)}
        onStopTyping={() => onStopTyping(chat.id)}
      />

      {showGroupInfo && (
        <GroupInfoModal
          chat={chat}
          currentUserId={currentUserId ?? -1}
          onClose={() => setShowGroupInfo(false)}
          onChanged={invalidateChats}
        />
      )}

      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForwarded={invalidateChats}
        />
      )}

      {privateReplyMessage && (
        <PrivateReplyModal
          message={privateReplyMessage}
          chat={chat}
          onClose={() => setPrivateReplyMessage(null)}
          onSent={(dmChatId) => {
            invalidateChats();
            onOpenChat(dmChatId);
          }}
        />
      )}

      {deletingMessage && (
        <DeleteMessageModal
          message={deletingMessage}
          isMine={deletingMessage.senderId === currentUserId}
          onClose={() => setDeletingMessage(null)}
          onConfirm={handleConfirmDelete}
          isProcessing={isDeletingMessage}
        />
      )}

      <ChatConfirmationModal
        show={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={runConfirm}
        title={confirmState?.title ?? ""}
        description={confirmState?.message ?? ""}
        avatarName={confirmState?.avatarName}
        avatarPicture={confirmState?.avatarPicture}
        confirmText={confirmState?.confirmText}
        isProcessing={isProcessing}
      />
    </div>
  );
}
