import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Modal, TextInput } from "flowbite-react";
import { toast } from "react-toastify";
import { HiOutlineUser, HiOutlineUserGroup, HiX } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { createChat, type Chat, type ChatType } from "@/services/chat";
import ContactPicker from "./ContactPicker";
import Avatar from "./Avatar";

interface CreateChatModalProps {
  onClose: () => void;
  onCreated: (chat: Chat) => void;
}

interface SelectedRecipient {
  id: number;
  name: string;
}

export default function CreateChatModal({ onClose, onCreated }: CreateChatModalProps) {
  const token = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => (state.user ? Number(state.user.id) : undefined));
  const queryClient = useQueryClient();

  const [chatType, setChatType] = useState<ChatType>("DIRECT");
  const [selected, setSelected] = useState<SelectedRecipient[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedIds = selected.map((s) => s.id);

  const handleToggle = (userId: number, name: string) => {
    if (chatType === "DIRECT") {
      setSelected([{ id: userId, name }]);
      return;
    }
    setSelected((prev) =>
      prev.some((s) => s.id === userId)
        ? prev.filter((s) => s.id !== userId)
        : [...prev, { id: userId, name }],
    );
  };

  const handleRemoveSelected = (userId: number) => {
    setSelected((prev) => prev.filter((s) => s.id !== userId));
  };

  const handleTypeChange = (type: ChatType) => {
    setChatType(type);
    setSelected([]);
  };

  const canSubmit =
    chatType === "DIRECT"
      ? selected.length === 1
      : selected.length > 0 && groupName.trim().length > 0;

  const handleCreate = async () => {
    if (!token || !canSubmit) return;
    setIsCreating(true);
    try {
      const res = await createChat(token, {
        type: chatType,
        name: chatType === "GROUP" ? groupName.trim() : undefined,
        participantIds: selectedIds,
      });
      toast.success(res.message);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create chat");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal show onClose={onClose} size="md">
      <Modal.Header className="border-b border-gray-800 bg-gray-900 [&>button]:text-gray-400 [&>button]:hover:text-white [&>button]:hover:bg-gray-800">
        <span className="text-white font-semibold">New chat</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-900">
        <div className="flex gap-1.5 p-1 mb-4 bg-gray-800/60 rounded-full">
          <button
            type="button"
            onClick={() => handleTypeChange("DIRECT")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
              chatType === "DIRECT"
                ? "bg-gold-500 text-gray-900"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {/* @ts-ignore */}
            <HiOutlineUser className="w-4 h-4" />
            Direct message
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("GROUP")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
              chatType === "GROUP"
                ? "bg-gold-500 text-gray-900"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {/* @ts-ignore */}
            <HiOutlineUserGroup className="w-4 h-4" />
            Group
          </button>
        </div>

        {chatType === "GROUP" && (
          <TextInput
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="mb-3"
          />
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1.5 bg-gray-800 border border-gold-500/40 text-gold-300 text-xs font-medium rounded-full pl-1 pr-2 py-1"
              >
                <Avatar name={s.name} size="xs" />
                {s.name}
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(s.id)}
                  className="text-gold-400/70 hover:text-white"
                >
                  {/* @ts-ignore */}
                  <HiX className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-3">
          <ContactPicker
            excludeUserIds={currentUserId ? [currentUserId] : []}
            selectedIds={selectedIds}
            onToggle={handleToggle}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-800">
        <div className="flex justify-end gap-3 w-full">
          <Button color="gray" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            className="bg-gold-500 hover:bg-gold-600 text-gray-900 enabled:hover:bg-gold-600"
            onClick={handleCreate}
            disabled={!canSubmit || isCreating}
          >
            {isCreating
              ? "Creating..."
              : chatType === "GROUP" && selected.length > 0
                ? `Create group (${selected.length})`
                : "Create"}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
