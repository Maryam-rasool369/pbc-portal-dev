import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Label,
  Spinner,
  Select,
  TextInput,
} from "flowbite-react";
import { toast } from "react-toastify";
import { useLoadingStore } from "@/store/useLoadingStore";
import useAuthStore from "@/store/authStore";
import { Tenure, TenureNonMember } from "@/types/tenure";
import { removeMembersFromTenure, addNonMembersToTenure, removeNonMembersFromTenure } from "@/services/tenure";

interface User {
  id: number;
  name: string;
  email: string;
  Role: {
    id: number;
    name: string;
  };
}

interface Role {
  id: number;
  name: string;
}

interface AddMembersModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  tenureId: number | null;
  tenure: Tenure;
  initialTab?: "add" | "remove" | "nonMembers";
}

const AddMembersModal = ({ open, onClose, onSuccess, tenureId, tenure, initialTab = "add" }: AddMembersModalProps) => {

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("add");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const [nonMemberName, setNonMemberName] = useState("");
  const [nonMemberRoleId, setNonMemberRoleId] = useState<number>(0);
  const [pendingNonMembers, setPendingNonMembers] = useState<{ name: string; roleId: number }[]>([]);
  const [selectedNonMemberIds, setSelectedNonMemberIds] = useState<number[]>([]);
  const existingNonMembers: TenureNonMember[] = tenure?.nonMembers || [];
  const token = useAuthStore((state) => state.token);

  const setLoading = useLoadingStore((state) => state.setLoading);
  const existingMemberIds = tenure?.members?.map(member => member.user?.id).filter(Boolean) || [];
  const existingMembers = tenure?.members?.map(member => ({
    id: member.user?.id || 0,
    name: member.user?.name || "Unknown",
    email: member.user?.email || "",
    roleId: member?.roleId || 0
  })).filter(member => member.id > 0) || [];

  // Filter out Chairman (roleId === 5) from remove members list - using user's roleId
  const removableMembers = existingMembers.filter(member => member.roleId !== 5);

  const uniqueRoles = Array.from(new Set(users.map(user => user.Role.name))).sort();
  const filteredUsers = selectedRole === "all"
    ? users
    : users.filter(user => user.Role.name === selectedRole);
  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/all/users?status=active&membership=verified`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setUsers(data.data || []);
      } else {
        const errorMessage = data?.error?.[0]?.msg || data?.message || "Failed to fetch users";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/roles`, {
        headers: { "Content-Type": "application/json", token: token || "" }
      });
      const data = await response.json();
      if (response.ok) {
        setRoles(data.data?.filter((role: Role) => role.id !== 9 && role.id !== 12) || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAllUsers();
      fetchRoles();
      setSelectedUserIds([]);
      setSelectedRole("all");
      setMemberRoles({});
      setNonMemberName("");
      setNonMemberRoleId(0);
      setPendingNonMembers([]);
      setSelectedNonMemberIds([]);
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);
  const handleUserSelection = (userId: number) => {
    if (activeTab === "add") {
      if (existingMemberIds.includes(userId)) {
        return;
      }
    } else {
      // Prevent selecting Chairman (roleId === 5) in remove tab - using user's roleId
      const member = existingMembers.find(m => m.id === userId);
      if (member && member.roleId === 5) {
        return;
      }
    }
    setSelectedUserIds(prev => {
      const isSelected = prev.includes(userId);
      if (isSelected) {
        setMemberRoles(r => {
          const newR = { ...r };
          delete newR[userId];
          return newR;
        });
        return prev.filter(id => id !== userId);
      } else {
        const user = users.find(u => u.id === userId);
        if (user) {
          setMemberRoles(r => ({ ...r, [userId]: user.Role.id }));
        }
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    if (activeTab === "add") {
      const availableUsers = filteredUsers.filter(user => !existingMemberIds.includes(user.id));

      if (selectedUserIds.length === availableUsers.length) {
        setSelectedUserIds([]);
        setMemberRoles({});
      } else {
        setSelectedUserIds(availableUsers.map(user => user.id));
        const newRoles: Record<number, number> = {};
        availableUsers.forEach(u => newRoles[u.id] = u.Role.id);
        setMemberRoles(newRoles);
      }
    } else {
      if (selectedUserIds.length === removableMembers.length) {
        setSelectedUserIds([]);
      } else {
        setSelectedUserIds(removableMembers.map(member => member.id));
      }
    }
  };

  const handleAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenureId) {
      toast.error("No tenure selected");
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const membersPayload = selectedUserIds.map(id => ({
        userId: id,
        roleId: memberRoles[id] || users.find(u => u.id === id)?.Role.id || 6
      }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tenure/add-members/${tenureId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
          body: JSON.stringify({
            members: membersPayload,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        toast.success("Board members added successfully!");
        handleClose();
        onSuccess?.();
      } else {
        const errorMessage = data?.error?.[0]?.msg || data?.message || "Failed to add members";
        throw new Error(errorMessage);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add members");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleRemoveMembers = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenureId) {
      toast.error("No tenure selected");
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one board member to remove");
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      await removeMembersFromTenure(tenureId, selectedUserIds, token || "");
      toast.success("Board member removed successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error removing members:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove board member");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleAddNonMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingNonMembers.length === 0) {
      toast.error("Please add at least one non-member");
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      await addNonMembersToTenure(tenureId!, pendingNonMembers, token || "");
      toast.success("Non-members added successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add non-members");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleRemoveNonMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNonMemberIds.length === 0) {
      toast.error("Please select at least one non-member to remove");
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      await removeNonMembersFromTenure(tenureId!, selectedNonMemberIds, token || "");
      toast.success("Non-members removed successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove non-members");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setMemberRoles({});
    setNonMemberName("");
    setNonMemberRoleId(0);
    setPendingNonMembers([]);
    setSelectedNonMemberIds([]);
    onClose();
  };

  return (
    <Modal
      show={open}
      onClose={isSubmitting ? undefined : handleClose}
      size="2xl"
    >
      <Modal.Header className="border-b border-gold-500">
        <p className="text-xl font-serif text-gold-300">
          Manage Members
        </p>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <div className="w-full">
          {/* Custom Tab Headers */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab("add");
                  setSelectedUserIds([]);
                  setSelectedRole("all");
                  setMemberRoles({});
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "add"
                  ? "border-gold-500 text-gold-500"
                  : "border-transparent text-gray-400 hover:text-gold-400 hover:border-gray-300"
                  }`}
              >
                Add Members
              </button>
              <button
                onClick={() => {
                  setActiveTab("remove");
                  setSelectedUserIds(prev => prev.filter(id => {
                    const member = existingMembers.find(m => m.id === id);
                    return member && member.roleId !== 5;
                  }));
                  setSelectedRole("all");
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "remove"
                  ? "border-gold-500 text-gold-500"
                  : "border-transparent text-gray-400 hover:text-gold-400 hover:border-gray-300"
                  }`}
              >
                Remove Members
              </button>
              <button
                onClick={() => {
                  setActiveTab("nonMembers");
                  setNonMemberName("");
                  setNonMemberRoleId(roles[0]?.id || 0);
                  setPendingNonMembers([]);
                  setSelectedNonMemberIds([]);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "nonMembers"
                  ? "border-gold-500 text-gold-500"
                  : "border-transparent text-gray-400 hover:text-gold-400 hover:border-gray-300"
                  }`}
              >
                Non-Members
              </button>
            </nav>
          </div>
          {activeTab === "add" && (
            <form onSubmit={handleAddMembers} className="space-y-6">
              <div className="mb-4">
                <Select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setSelectedUserIds([]);
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                >
                  <option value="all">All Roles ({users.length})</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role} ({users.filter(user => user.Role.name === role).length})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg p-4">
                {filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer transition-colors ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"
                        }`}
                      onClick={!isSubmitting ? handleSelectAll : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.filter(user => !existingMemberIds.includes(user.id)).length}
                        readOnly
                        disabled={isSubmitting}
                        className="form-checkbox h-4 w-4 text-gold-500 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-gold-300 font-medium">
                          Select All Available Users ({filteredUsers.filter(user => !existingMemberIds.includes(user.id)).length})
                        </span>
                      </div>
                    </div>

                    {filteredUsers.map((user) => {
                      const isExistingMember = existingMemberIds.includes(user.id);
                      const isSelected = selectedUserIds.includes(user.id);

                      return (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isExistingMember
                            ? "bg-gray-600 opacity-75 cursor-not-allowed"
                            : isSubmitting
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-gray-700 cursor-pointer"
                            }`}
                          onClick={!isSubmitting && !isExistingMember ? () => handleUserSelection(user.id) : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={isExistingMember || isSelected}
                            readOnly
                            disabled={isSubmitting || isExistingMember}
                            className={`form-checkbox h-4 w-4 rounded ${isExistingMember
                              ? "text-green-500 bg-green-500"
                              : "text-gold-500"
                              }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isExistingMember ? "text-green-400" : "text-white"}`}>
                                {user.name}
                                {isExistingMember && (
                                  <span className="ml-2 text-xs bg-green-500 text-black px-2 py-1 rounded">
                                    Already Added
                                  </span>
                                )}
                              </span>
                              {isSelected && !isExistingMember ? (
                                <select
                                  value={memberRoles[user.id] || user.Role.id}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setMemberRoles(prev => ({ ...prev, [user.id]: parseInt(e.target.value) }));
                                  }}
                                  className="text-xs bg-gray-600 text-white border-gray-500 rounded py-1 px-2 cursor-pointer focus:ring-gold-500"
                                  disabled={isSubmitting}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-gold-500 text-sm">
                                  {isExistingMember 
                                    ? (roles.find(r => r.id === existingMembers.find(m => m.id === user.id)?.roleId)?.name || user.Role.name)
                                    : user.Role.name}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Spinner size="sm" className="mr-2" />
                        <span className="text-gray-400">Loading users...</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-400">
                          {selectedRole === "all"
                            ? "No users found"
                            : `No users found with role "${selectedRole}"`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedUserIds.length > 0 && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <Label
                    value={`Selected Members to Add (${selectedUserIds.length})`}
                    className="text-gold-500 mb-2 block font-medium"
                  />
                  <div className="flex flex-wrap gap-2">
                    {selectedUserIds.map((userId) => {
                      const user = filteredUsers.find(u => u.id === userId);
                      return user ? (
                        <span
                          key={userId}
                          className="bg-gold-500 text-black px-3 py-1 rounded-full text-sm"
                        >
                          {user.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-8">
                <Button
                  color="dark"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  disabled={selectedUserIds.length === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Adding Members...
                    </>
                  ) : (
                    `Add ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </form>
          )}

          {activeTab === "remove" && (
            <form onSubmit={handleRemoveMembers} className="space-y-6">
              <div>
                <Label
                  value="Select Members to Remove"
                  className="text-gold-500 mb-4 block text-lg font-semibold"
                />
                <p className="text-gray-400 text-sm mb-4">
                  Select existing members to remove from this tenure. You can select multiple members.
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg p-4">
                {removableMembers.length > 0 ? (
                  <div className="space-y-2">
                    {removableMembers.map((member) => {
                      const isSelected = selectedUserIds.includes(member.id);

                      return (
                        <div
                          key={member.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isSubmitting
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-700 cursor-pointer"
                            }`}
                          onClick={!isSubmitting ? () => handleUserSelection(member.id) : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            disabled={isSubmitting}
                            className="form-checkbox h-4 w-4 text-red-500 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserSelection(member.id);
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium">
                                {member.name}
                              </span>
                              <span className="text-gold-500 text-sm">
                                {roles.find(r => r.id === member.roleId)?.name || "Unknown Role"}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No members found in this tenure.</p>
                  </div>
                )}
              </div>

              {selectedUserIds.length > 0 && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <Label
                    value={`Selected Members to Remove (${selectedUserIds.length})`}
                    className="text-red-500 mb-2 block font-medium"
                  />
                  <div className="flex flex-wrap gap-2">
                    {selectedUserIds.map((userId) => {
                      const member = removableMembers.find(m => m.id === userId);
                      return member ? (
                        <span
                          key={userId}
                          className="bg-red-500 text-white px-3 py-1 rounded-full text-sm"
                        >
                          {member.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-8">
                <Button
                  color="dark"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={selectedUserIds.length === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Removing Members..
                    </>
                  ) : (
                    `Remove ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </form>
          )}
          {activeTab === "nonMembers" && (
            <div className="space-y-6">
              <div>
                <Label value="Add Non-Member" className="text-gold-500 mb-3 block text-base font-semibold" />
                <p className="text-gray-400 text-sm mb-4">
                  Add historical members who are not registered in the system.
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label value="Name *" className="text-gold-500 mb-1 block text-sm" />
                    <TextInput
                      value={nonMemberName}
                      onChange={(e) => setNonMemberName(e.target.value)}
                      placeholder="Enter name"
                      disabled={isSubmitting}
                      className="border-gray-600 bg-gray-700 text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <Label value="Role *" className="text-gold-500 mb-1 block text-sm" />
                    <select
                      value={nonMemberRoleId}
                      onChange={(e) => setNonMemberRoleId(parseInt(e.target.value))}
                      disabled={isSubmitting || roles.length === 0}
                      className="w-full text-sm bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-gold-500 focus:border-gold-500"
                    >
                      <option value={0} disabled>Select Role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    className="bg-gold-500 hover:bg-gold-600 text-black shrink-0"
                    disabled={isSubmitting || !nonMemberName.trim() || !nonMemberRoleId}
                    onClick={() => {
                      if (!nonMemberName.trim() || !nonMemberRoleId) return;
                      setPendingNonMembers(prev => [...prev, { name: nonMemberName.trim(), roleId: nonMemberRoleId }]);
                      setNonMemberName("");
                    }}
                  >
                    + Add
                  </Button>
                </div>

                {pendingNonMembers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label value="To be added:" className="text-gold-500 text-sm block" />
                    {pendingNonMembers.map((nm, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg">
                        <span className="text-white text-sm">{nm.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gold-500 text-xs">{roles.find(r => r.id === nm.roleId)?.name}</span>
                          <button
                            type="button"
                            onClick={() => setPendingNonMembers(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {existingNonMembers.length > 0 && (
                <div className="border-t border-gray-700 pt-6">
                  <Label value="Remove Non-Members" className="text-gold-500 mb-3 block text-base font-semibold" />
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {existingNonMembers.map((nm) => (
                      <div
                        key={nm.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedNonMemberIds.includes(nm.id) ? "bg-red-900/30 border border-red-500" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                        onClick={() => setSelectedNonMemberIds(prev =>
                          prev.includes(nm.id) ? prev.filter(id => id !== nm.id) : [...prev, nm.id]
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedNonMemberIds.includes(nm.id)}
                            readOnly
                            className="form-checkbox h-4 w-4 text-red-500 rounded"
                          />
                          <span className="text-white text-sm">{nm.name}</span>
                        </div>
                        <span className="text-gold-500 text-xs">
                          {roles.find(r => r.id === nm.roleId)?.name || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-4">
                <Button color="dark" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                {selectedNonMemberIds.length > 0 ? (
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={handleRemoveNonMembers}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <><Spinner size="sm" className="mr-2" />Removing...</> : `Remove ${selectedNonMemberIds.length}`}
                  </Button>
                ) : (
                  <Button
                    className="bg-gold-500 hover:bg-gold-600 text-black"
                    onClick={handleAddNonMembers}
                    disabled={pendingNonMembers.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? <><Spinner size="sm" className="mr-2" />Adding...</> : `Add ${pendingNonMembers.length} Non-Member${pendingNonMembers.length !== 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default AddMembersModal;
