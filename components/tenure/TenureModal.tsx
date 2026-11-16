import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Button,
  Label,
  TextInput,
  Textarea,
  Spinner,
  Select,
} from "flowbite-react";
import ReactSelect from "react-select";
import { toast } from "react-toastify";
import { useLoadingStore } from "@/store/useLoadingStore";
import useAuthStore from "@/store/authStore";
import { DateTime } from "luxon";
import {
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import { addNonMembersToTenure } from "@/services/tenure";
import { COMMON_TIMEZONES } from "@/constants/datetime";

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

interface Tenure {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

interface TenureModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  tenure?: Tenure | null;
  isUpdate?: boolean;
}

const TenureModal = ({ open, onClose, onSuccess, tenure, isUpdate = false }: TenureModalProps) => {
  const userTimezone = DateTime.local().zoneName;
  const formatExistingDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return DateTime.fromISO(dateString).toFormat("yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    userId: "",
    roleId: 5,
    timezone: userTimezone,
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<number, number>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [nonMembers, setNonMembers] = useState<{ name: string; roleId: number }[]>([]);
  const [nonMemberName, setNonMemberName] = useState("");
  const [nonMemberRoleId, setNonMemberRoleId] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const token = useAuthStore((state) => state.token);
  const setLoading = useLoadingStore((state) => state.setLoading);

  const timezoneOptions = COMMON_TIMEZONES.map((tz) =>
    tz === "LOCAL_TIMEZONE_PLACEHOLDER" ? userTimezone : tz
  ).filter((tz, index, self) => self.indexOf(tz) === index);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/roles`, {
        headers: { "Content-Type": "application/json", token: token || "" }
      });
      const data = await response.json();
      if (response.ok) {
        setRoles(data?.data?.filter((role: Role) => role.id !== 9 && role.id !== 12) || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  }, [token]);

  const fetchAllUsers = useCallback(async (search: string = "") => {
    setIsLoadingMembers(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/user/all/users`);
      url.searchParams.append("status", "active");
      url.searchParams.append("membership", "verified");
      url.searchParams.append("sortBy", "name:asc");
      if (search) {
        url.searchParams.append("search", search);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          token: token || "",
        },
      });

      const data = await response.json();
      if (response.ok) {
        setAllUsers(data.data || []);
      } else {
        toast.error(data?.error[0]?.msg || "Failed to fetch members");
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [token]);

  const handleMemberSelection = (userId: number) => {
    if (formData.userId && parseInt(formData.userId) === userId) {
      toast.warning("This user is already selected as Chairman");
      return;
    }
    setSelectedMemberIds(prev => {
      if (prev.includes(userId)) {
        setMemberRoles(r => {
          const newR = { ...r };
          delete newR[userId];
          return newR;
        });
        return prev.filter(id => id !== userId);
      }
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        setMemberRoles(r => ({ ...r, [userId]: user.Role.id }));
      }
      return [...prev, userId];
    });
  };

  const handleSelectAllMembers = () => {
    const availableUsers = allUsers.filter(
      user => !formData.userId || user.id !== parseInt(formData.userId)
    );
    if (selectedMemberIds.length === availableUsers.length) {
      setSelectedMemberIds([]);
      setMemberRoles({});
    } else {
      setSelectedMemberIds(availableUsers.map(user => user.id));
      const newRoles: Record<number, number> = {};
      availableUsers.forEach(u => newRoles[u.id] = u.Role.id);
      setMemberRoles(newRoles);
    }
  };

  useEffect(() => {
    if (open) {
      if (!isUpdate) {
        fetchRoles();
      }

      if (isUpdate && tenure) {
        setFormData({
          name: tenure.name,
          description: tenure.description || "",
          startDate: tenure.startDate ? formatExistingDate(tenure.startDate) : "",
          endDate: tenure.endDate ? formatExistingDate(tenure.endDate) : "",
          userId: "",
          roleId: 5,
          timezone: userTimezone,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          userId: "",
          roleId: 5,
          timezone: userTimezone,
        });
        setSelectedMemberIds([]);
        setMemberRoles({});
        setNonMembers([]);
        setNonMemberName("");
        setNonMemberRoleId(0);
      }
    }
  }, [open, isUpdate, tenure, fetchRoles]);

  // Remove chairman from selected members if chairman changes
  useEffect(() => {
    if (formData.userId) {
      const chairmanId = parseInt(formData.userId);
      setSelectedMemberIds(prev => prev.filter(id => id !== chairmanId));
      setMemberRoles(prev => {
        const newRoles = { ...prev };
        delete newRoles[chairmanId];
        return newRoles;
      });
    }
  }, [formData.userId]);

  // Debounced search - handles initial load and search updates
  useEffect(() => {
    if (open && !isUpdate) {
      const timer = setTimeout(() => {
        fetchAllUsers(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, open, isUpdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = isUpdate
      ? ['name', 'description', 'startDate', 'endDate']
      : ['name', 'description', 'startDate', 'endDate', 'userId'];

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.name.length < 3) {
      toast.error("Name must be at least 3 characters");
      return;
    }

    if (formData.description.length < 5) {
      toast.error("Description must be at least 5 characters");
      return;
    }

    try {
      const startDate = DateTime.fromISO(formData.startDate);
      const endDate = DateTime.fromISO(formData.endDate);

      if (endDate <= startDate) {
        toast.error("End date must be after start date");
        return;
      }
    } catch (error) {
      toast.error("Invalid date format");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const url = isUpdate
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/tenure/update/${tenure?.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/tenure/create`;

      const method = isUpdate ? "PATCH" : "POST";

      const { timezone, ...submitData } = formData;

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          token: token || "",
        },
        body: JSON.stringify({
          ...submitData,
          ...(isUpdate ? {} : { userId: parseInt(formData.userId), roleId: formData.roleId }),
          startDate: formatDateWithTimezoneForAPI(formData.startDate, formData.timezone),
          endDate: formatDateWithTimezoneForAPI(formData.endDate, formData.timezone),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (!isUpdate && selectedMemberIds.length > 0 && data.data?.id) {
          try {
            const membersPayload = selectedMemberIds.map(id => ({
              userId: id,
              roleId: memberRoles[id] || allUsers.find(u => u.id === id)?.Role.id || 6
            }));

            const membersResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/tenure/add-members/${data.data.id}`,
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
            if (!membersResponse.ok) {
              console.error("Failed to add some members");
              toast.warning("Tenure created but some members could not be added");
            }
          } catch (memberError) {
            console.error("Error adding members:", memberError);
            toast.warning("Tenure created but members could not be added");
          }
        }
        if (!isUpdate && nonMembers.length > 0 && data.data?.id) {
          try {
            await addNonMembersToTenure(data.data.id, nonMembers, token || "");
          } catch (nmError) {
            console.error("Error adding non-members:", nmError);
            toast.warning("Tenure created but non-members could not be added");
          }
        }
        toast.success(isUpdate ? "Tenure updated successfully!" : "Tenure created successfully!");
        handleClose();
        onSuccess?.();
      } else {
        throw new Error(data?.error[0]?.msg || `Failed to ${isUpdate ? 'update' : 'create'} tenure`);
      }
    } catch (error) {
      console.error(`Error ${isUpdate ? 'updating' : 'creating'} tenure:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isUpdate ? 'update' : 'create'} tenure`);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      userId: "",
      roleId: 5,
      timezone: userTimezone,
    });
    setSelectedMemberIds([]);
    setMemberRoles({});
    setNonMembers([]);
    setNonMemberName("");
    setNonMemberRoleId(0);
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
          {isUpdate ? "Update Tenure" : "Create New Tenure"}
        </p>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label
              htmlFor="name"
              value="Tenure Name *"
              className="text-gold-500 mb-2 block"
            />
            <TextInput
              id="name"
              required
              minLength={3}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
              placeholder="Enter tenure name (e.g., Board of Directors (2024-2026))"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label
              htmlFor="description"
              value="Description *"
              className="text-gold-500 mb-2 block"
            />
            <Textarea
              id="description"
              required
              minLength={5}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
              rows={3}
              placeholder="Enter tenure description (e.g., Executive tenure)"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label
              htmlFor="timezone"
              value="Timezone *"
              className="text-gold-500 mb-2 block"
            />
            <Select
              id="timezone"
              value={formData.timezone}
              onChange={(e) =>
                setFormData({ ...formData, timezone: e.target.value })
              }
              className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
              disabled={isSubmitting}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz === userTimezone
                    ? `${tz.replace(/_/g, " ")} (Local time)`
                    : `${tz.replace(/_/g, " ")} (${getRelativeTimezoneOffset(tz, userTimezone)})`}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-gray-400">
              All dates will be interpreted in this timezone
            </p>
          </div>


          {!isUpdate && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="userId"
                    value="Chairman *"
                    className="text-gold-500 mb-2 block"
                  />
                  <ReactSelect
                    inputId="userId"
                    required
                    value={allUsers.filter(u => u.id.toString() === formData.userId).map(u => ({ value: u.id.toString(), label: `${u.name} (${u.email})` }))[0] || null}
                    onChange={(selected: any) =>
                      setFormData({ ...formData, userId: selected ? selected.value : "" })
                    }
                    options={allUsers.map((user) => ({
                      value: user.id.toString(),
                      label: `${user.name} (${user.email})`
                    }))}
                    className="text-black"
                    placeholder="Select Chairman"
                    isDisabled={isSubmitting || isLoadingMembers}
                    isClearable
                    isSearchable
                  />
                  {isLoadingMembers && (
                    <p className="mt-1 text-xs text-gray-400">Loading users...</p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="roleId"
                    value="Role *"
                    className="text-gold-500 mb-2 block"
                  />
                  <Select
                    id="roleId"
                    required
                    value={formData.roleId}
                    onChange={(e) =>
                      setFormData({ ...formData, roleId: parseInt(e.target.value) })
                    }
                    className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                    disabled={isSubmitting || roles.length === 0}
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label
                  value="Board Members"
                  className="text-gold-500 mb-2 block"
                />
                <p className="text-xs text-gray-400 mb-2">
                  You can add or remove member later as well.
                </p>
                <div className="mb-3">
                  <TextInput
                    type="text"
                    placeholder="Search members by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isSubmitting || isLoadingMembers}
                    className="border-gray-600 focus:ring-gold-500 focus:border-gold-500"
                    icon={() => (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      disabled={isSubmitting}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-lg p-3 relative">
                  {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" className="mr-2" />
                      <span className="text-gray-400">Loading members...</span>
                    </div>
                  ) : allUsers.length > 0 ? (
                    <div className="space-y-2">
                      <div
                        className={`flex items-center gap-3 p-2 bg-gray-700 rounded-lg cursor-pointer transition-colors ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"
                          }`}
                        onClick={!isSubmitting ? handleSelectAllMembers : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={
                            allUsers.filter(u => !formData.userId || u.id !== parseInt(formData.userId)).length > 0 &&
                            selectedMemberIds.length === allUsers.filter(u => !formData.userId || u.id !== parseInt(formData.userId)).length
                          }
                          readOnly
                          disabled={isSubmitting}
                          className="form-checkbox h-4 w-4 text-gold-500 rounded"
                        />
                        <span className="text-gold-300 font-medium text-sm">
                          Select All ({allUsers.filter(u => !formData.userId || u.id !== parseInt(formData.userId)).length})
                        </span>
                      </div>

                      {allUsers.map((user) => {
                        const isChairman = Boolean(formData.userId && user.id === parseInt(formData.userId));
                        const isSelected = selectedMemberIds.includes(user.id);

                        return (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isChairman
                                ? "bg-gray-600 opacity-60 cursor-not-allowed"
                                : isSubmitting
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-gray-700 cursor-pointer"
                              }`}
                            onClick={!isSubmitting && !isChairman ? () => handleMemberSelection(user.id) : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={isChairman || isSelected}
                              readOnly
                              disabled={isSubmitting || isChairman}
                              className={`form-checkbox h-4 w-4 rounded ${isChairman ? "text-green-500" : "text-gold-500"
                                }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-medium text-sm truncate ${isChairman ? "text-green-400" : "text-white"
                                  }`}>
                                  {user.name}
                                  {isChairman && (
                                    <span className="ml-2 text-xs bg-green-500 text-black px-2 py-0.5 rounded">
                                      Chairman
                                    </span>
                                  )}
                                </span>
                                {isSelected && !isChairman ? (
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
                                  <span className="text-gold-500 text-xs flex-shrink-0">{user.Role.name}</span>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs truncate">{user.email}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No users available</p>
                  )}
                </div>

                {selectedMemberIds.length > 0 && (
                  <div className="mt-3 bg-gray-700 p-3 rounded-lg">
                    <Label
                      value={`Selected Members (${selectedMemberIds.length})`}
                      className="text-gold-500 mb-2 block text-sm font-medium"
                    />
                    <div className="flex flex-wrap gap-2">
                      {selectedMemberIds.map((userId) => {
                        const user = allUsers.find(u => u.id === userId);
                        return user ? (
                          <span
                            key={userId}
                            className="bg-gold-500 text-black px-2 py-1 rounded-full text-xs flex items-center gap-1"
                          >
                            {user.name}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemberSelection(userId);
                              }}
                              className="hover:bg-gold-600 rounded-full p-0.5"
                              disabled={isSubmitting}
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label value="Non-Members (optional)" className="text-gold-500 mb-2 block" />
                <p className="text-xs text-gray-400 mb-2">
                  Add historical members not registered in the system.
                </p>
                <div className="flex gap-2 items-end mb-2">
                  <div className="flex-1">
                    <TextInput
                      value={nonMemberName}
                      onChange={(e) => setNonMemberName(e.target.value)}
                      placeholder="Enter name"
                      disabled={isSubmitting}
                      className="border-gray-600"
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      value={nonMemberRoleId}
                      onChange={(e) => setNonMemberRoleId(parseInt(e.target.value))}
                      disabled={isSubmitting || roles.length === 0}
                      className="border-gray-600"
                    >
                      <option value={0} disabled>Select Role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting || !nonMemberName.trim() || !nonMemberRoleId}
                    onClick={() => {
                      if (!nonMemberName.trim() || !nonMemberRoleId) return;
                      setNonMembers(prev => [...prev, { name: nonMemberName.trim(), roleId: nonMemberRoleId }]);
                      setNonMemberName("");
                    }}
                    className="px-3 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-black text-sm rounded-lg font-medium whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
                {nonMembers.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-600 rounded-lg p-2">
                    {nonMembers.map((nm, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-700 px-2 py-1.5 rounded">
                        <span className="text-white text-xs">{nm.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gold-500 text-xs">{roles.find(r => r.id === nm.roleId)?.name}</span>
                          <button
                            type="button"
                            onClick={() => setNonMembers(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300 text-xs ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="startDate"
                value="Start Date & Time *"
                className="text-gold-500 mb-2 block"
              />
              <TextInput
                id="startDate"
                type="datetime-local"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                disabled={isSubmitting}
                className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Tenure begins ({formData.timezone})
              </p>
            </div>
            <div>
              <Label
                htmlFor="endDate"
                value="End Date & Time *"
                className="text-gold-500 mb-2 block"
              />
              <TextInput
                id="endDate"
                type="datetime-local"
                required
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                disabled={isSubmitting}
                className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Tenure ends ({formData.timezone})
              </p>
            </div>
          </div>

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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {isUpdate ? "Updating..." : "Creating..."}
                </>
              ) : (
                isUpdate ? "Update Tenure" : "Create Tenure"
              )}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default TenureModal;
