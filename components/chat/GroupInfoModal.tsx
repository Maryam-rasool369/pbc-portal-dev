import { useEffect, useRef, useState } from "react";
import { Button, Modal, TextInput } from "flowbite-react";
import { toast } from "react-toastify";
import {
  HiCheck,
  HiDotsVertical,
  HiPencilAlt,
  HiPlus,
  HiShieldCheck,
  HiX,
} from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import {
  addParticipants,
  demoteAdmin,
  promoteToAdmin,
  removeParticipant,
  renameChatGroup,
  type Chat,
  type ChatParticipant,
} from "@/services/chat";
import Avatar from "./Avatar";
import ContactPicker from "./ContactPicker";
import ChatConfirmationModal from "./ChatConfirmationModal";

interface GroupInfoModalProps {
  chat: Chat;
  currentUserId: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function GroupInfoModal({ chat, currentUserId, onClose, onChanged }: GroupInfoModalProps) {
  const token = useAuthStore((state) => state.token);
  const isAdmin = chat.participants.some((p) => p.userId === currentUserId && p.role === "ADMIN");

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(chat.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [newParticipantIds, setNewParticipantIds] = useState<number[]>([]);
  const [removeTarget, setRemoveTarget] = useState<ChatParticipant | null>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<number | null>(null);
  const [roleChangeInFlightId, setRoleChangeInFlightId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuOpenForId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenForId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenForId]);

  const handleSaveName = async () => {
    if (!token || !nameInput.trim()) return;
    setIsSaving(true);
    try {
      await renameChatGroup(token, chat.id, nameInput.trim());
      onChanged();
      setIsEditingName(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddParticipants = async () => {
    if (!token || !newParticipantIds.length) return;
    setIsSaving(true);
    try {
      await addParticipants(token, chat.id, newParticipantIds);
      toast.success("Participants added");
      onChanged();
      setNewParticipantIds([]);
      setShowAddPicker(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add participants");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromote = async (participant: ChatParticipant) => {
    if (!token) return;
    setMenuOpenForId(null);
    setRoleChangeInFlightId(participant.userId);
    try {
      const res = await promoteToAdmin(token, chat.id, participant.userId);
      toast.success(res.message || `${participant.user.name} is now an admin`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote participant");
    } finally {
      setRoleChangeInFlightId(null);
    }
  };

  const handleDemote = async (participant: ChatParticipant) => {
    if (!token) return;
    setMenuOpenForId(null);
    setRoleChangeInFlightId(participant.userId);
    try {
      const res = await demoteAdmin(token, chat.id, participant.userId);
      toast.success(res.message || `${participant.user.name} is no longer an admin`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to demote participant");
    } finally {
      setRoleChangeInFlightId(null);
    }
  };

  const handleRemove = async () => {
    if (!token || !removeTarget) return;
    setIsSaving(true);
    try {
      await removeParticipant(token, chat.id, removeTarget.userId);
      onChanged();
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove participant");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show onClose={onClose} size="md">
      <Modal.Header className="border-b border-gold-500 bg-gray-900">
        <span className="text-gold-300">Group info</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-900">
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={chat.name} picture={chat.picture} size="lg" />
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <TextInput value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                <button onClick={handleSaveName} disabled={isSaving} className="text-green-400 hover:text-green-300">
                  {/* @ts-ignore */}
                  <HiCheck className="w-5 h-5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-gray-400 hover:text-white">
                  {/* @ts-ignore */}
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-white truncate">{chat.name}</p>
                {isAdmin && (
                  <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-gold-400">
                    {/* @ts-ignore */}
                    <HiPencilAlt className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-400">{chat.participants.length} members</p>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-4">
            {showAddPicker ? (
              <div className="bg-gray-800 rounded-lg p-3">
                <ContactPicker
                  excludeUserIds={chat.participants.map((p) => p.userId)}
                  selectedIds={newParticipantIds}
                  onToggle={(userId) =>
                    setNewParticipantIds((prev) =>
                      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
                    )
                  }
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button color="gray" size="sm" onClick={() => setShowAddPicker(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold-500 hover:bg-gold-600 text-gray-900"
                    onClick={handleAddParticipants}
                    disabled={!newParticipantIds.length || isSaving}
                  >
                    Add ({newParticipantIds.length})
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPicker(true)}
                className="flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300"
              >
                {/* @ts-ignore */}
                <HiPlus className="w-4 h-4" /> Add participants
              </button>
            )}
          </div>
        )}

        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {chat.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800">
              <Avatar name={p.user.name} picture={p.user.profile?.profilePicture} size="sm" online={p.isOnline} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">
                  {p.user.name} {p.userId === currentUserId && <span className="text-gray-400">(you)</span>}
                </p>
              </div>
              {p.role === "ADMIN" && (
                <span className="flex items-center gap-1 text-xs text-gold-400 flex-shrink-0">
                  {/* @ts-ignore */}
                  <HiShieldCheck className="w-4 h-4" /> Admin
                </span>
              )}
              {isAdmin && p.userId !== currentUserId && (
                <div className="relative flex-shrink-0" ref={menuOpenForId === p.userId ? menuRef : undefined}>
                  <button
                    onClick={() => setMenuOpenForId((cur) => (cur === p.userId ? null : p.userId))}
                    disabled={roleChangeInFlightId === p.userId}
                    className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1.5 transition-colors disabled:opacity-50"
                    title="Participant options"
                  >
                    {/* @ts-ignore */}
                    <HiDotsVertical className="w-4 h-4" />
                  </button>

                  {menuOpenForId === p.userId && (
                    <div className="absolute right-0 top-9 z-30 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1.5 overflow-hidden">
                      {p.role === "ADMIN" ? (
                        <button
                          onClick={() => handleDemote(p)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                        >
                          {/* @ts-ignore */}
                          <HiShieldCheck className="w-4 h-4" /> Dismiss as admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromote(p)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                        >
                          {/* @ts-ignore */}
                          <HiShieldCheck className="w-4 h-4" /> Make admin
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpenForId(null);
                          setRemoveTarget(p);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                      >
                        {/* @ts-ignore */}
                        <HiX className="w-4 h-4" /> Remove from group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Modal.Body>
      <Modal.Footer className="bg-gray-900 border-t border-gray-700">
        <Button color="gray" onClick={onClose} className="ml-auto">
          Close
        </Button>
      </Modal.Footer>

      <ChatConfirmationModal
        show={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove participant"
        description={`They'll be removed from "${chat.name}" and lose access to this group's messages.`}
        avatarName={removeTarget?.user.name}
        avatarPicture={removeTarget?.user.profile?.profilePicture}
        confirmText="Remove"
        isProcessing={isSaving}
      />
    </Modal>
  );
}
