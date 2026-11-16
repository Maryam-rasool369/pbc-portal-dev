import { useState } from "react";
import { Button, Modal } from "flowbite-react";
import { toast } from "react-toastify";
import { HiCheck } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useChats } from "@/hooks/useChats";
import { forwardMessage, type AttachmentType, type ChatMessage } from "@/services/chat";
import Avatar from "./Avatar";
import ContactPicker from "./ContactPicker";

interface ForwardMessageModalProps {
  message: ChatMessage;
  onClose: () => void;
  onForwarded: () => void;
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

export default function ForwardMessageModal({ message, onClose, onForwarded }: ForwardMessageModalProps) {
  const token = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => (state.user ? Number(state.user.id) : undefined));
  const { data } = useChats();

  const [tab, setTab] = useState<"chats" | "contacts">("chats");
  const [selectedChatIds, setSelectedChatIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const chats = data?.data ?? [];
  const selectedCount = selectedChatIds.length + selectedUserIds.length;

  const toggleChat = (chatId: number) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId],
    );
  };

  const toggleContact = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const preview = message.content
    ? message.content
    : message.attachments[0]
      ? attachmentLabel(message.attachments[0].type)
      : "Message";

  const handleForward = async () => {
    if (!token || !selectedCount) return;
    setIsForwarding(true);
    try {
      const res = await forwardMessage(token, {
        messageIds: [message.id],
        chatIds: selectedChatIds,
        userIds: selectedUserIds,
      });
      toast.success(res.message || "Message forwarded");
      onForwarded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to forward message");
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Modal show onClose={onClose} size="md">
      <Modal.Header className="border-b border-gray-800 bg-gray-900 [&>button]:text-gray-400 [&>button]:hover:text-white [&>button]:hover:bg-gray-800">
        <span className="text-white font-semibold">Forward message</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-900">
        <div className="bg-gray-800/60 border-l-2 border-gold-500 rounded-lg px-3 py-2 mb-4 text-sm text-gray-300 truncate">
          {preview}
        </div>

        <div className="flex gap-1.5 p-1 mb-3 bg-gray-800/60 rounded-full">
          <button
            type="button"
            onClick={() => setTab("chats")}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              tab === "chats" ? "bg-gold-500 text-gray-900" : "text-gray-300 hover:text-white"
            }`}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => setTab("contacts")}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              tab === "contacts" ? "bg-gold-500 text-gray-900" : "text-gray-300 hover:text-white"
            }`}
          >
            Contacts
          </button>
        </div>

        {tab === "chats" ? (
          <div className="overflow-y-auto max-h-72 -mx-1 px-1">
            {chats.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No conversations yet.</p>
            ) : (
              <ul className="space-y-1">
                {chats.map((chat) => {
                  const isGroup = chat.type === "GROUP";
                  const other = !isGroup
                    ? chat.participants.find((p) => p.userId !== currentUserId)
                    : undefined;
                  const displayName = isGroup ? chat.name ?? "Group" : other?.user.name ?? "Chat";
                  const picture = isGroup ? chat.picture : other?.user.profile?.profilePicture;
                  const isSelected = selectedChatIds.includes(chat.id);
                  return (
                    <li key={chat.id}>
                      <button
                        onClick={() => toggleChat(chat.id)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-gray-700 ${
                          isSelected ? "bg-gray-700" : ""
                        }`}
                      >
                        <Avatar name={displayName} picture={picture} size="sm" />
                        <span className="text-sm text-white truncate flex-1 min-w-0">{displayName}</span>
                        {isSelected && (
                          <span className="bg-gold-500 text-gray-900 rounded-full p-0.5 flex-shrink-0">
                            {/* @ts-ignore */}
                            <HiCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <ContactPicker
            excludeUserIds={currentUserId ? [currentUserId] : []}
            selectedIds={selectedUserIds}
            onToggle={(userId) => toggleContact(userId)}
          />
        )}
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-800">
        <div className="flex justify-end gap-3 w-full">
          <Button color="gray" onClick={onClose} disabled={isForwarding}>
            Cancel
          </Button>
          <Button
            className="bg-gold-500 hover:bg-gold-600 text-gray-900"
            onClick={handleForward}
            disabled={!selectedCount || isForwarding}
          >
            {isForwarding ? "Forwarding..." : `Forward${selectedCount ? ` (${selectedCount})` : ""}`}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
