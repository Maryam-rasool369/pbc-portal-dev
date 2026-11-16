import { useState } from "react";
import { Button, Modal, Textarea } from "flowbite-react";
import { toast } from "react-toastify";
import { HiLockClosed } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { sendPrivateReply, type AttachmentType, type Chat, type ChatMessage } from "@/services/chat";
import Avatar from "./Avatar";

interface PrivateReplyModalProps {
  message: ChatMessage;
  chat: Chat;
  onClose: () => void;
  onSent: (dmChatId: number) => void;
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

export default function PrivateReplyModal({ message, chat, onClose, onSent }: PrivateReplyModalProps) {
  const token = useAuthStore((state) => state.token);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const preview = message.content
    ? message.content
    : message.attachments[0]
      ? attachmentLabel(message.attachments[0].type)
      : "Message";

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!token || !trimmed) return;
    setIsSending(true);
    try {
      const res = await sendPrivateReply(token, {
        targetUserId: message.senderId,
        content: trimmed,
        sourceGroupChatId: chat.id,
        sourceGroupChatName: chat.name ?? undefined,
        sourceMsgId: message.id,
        sourceMsgContent: message.content || undefined,
      });
      toast.success(res.message || "Private reply sent");
      onSent(res.data.dmChatId);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send private reply");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal show onClose={onClose} size="md">
      <Modal.Header className="border-b border-gold-500/40 bg-gray-900 [&>button]:text-gray-400 [&>button]:hover:text-white [&>button]:hover:bg-gray-800">
        <span className="text-gold-300 font-semibold flex items-center gap-2">
          {/* @ts-ignore */}
          <HiLockClosed className="w-4 h-4" />
          Reply privately
        </span>
      </Modal.Header>
      <Modal.Body className="bg-gray-900">
        <div className="flex items-center gap-3 bg-gray-800/60 border border-gold-500/20 rounded-xl px-3 py-2.5 mb-3">
          <Avatar name={message.sender.name} picture={message.sender.profile?.profilePicture} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{message.sender.name}</p>
            <p className="text-xs text-gray-400 truncate">{preview}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          Only {message.sender.name} will see this — it&apos;s sent as a direct message, not posted in{" "}
          {chat.name ? `"${chat.name}"` : "the group"}.
        </p>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${message.sender.name} privately...`}
          rows={3}
          autoFocus
        />
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-800">
        <div className="flex justify-end gap-3 w-full">
          <Button color="gray" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            className="bg-gold-500 hover:bg-gold-600 text-gray-900"
            onClick={handleSend}
            disabled={!content.trim() || isSending}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
