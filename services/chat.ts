// services/chat.ts



const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CHAT_URL = `${API_URL}/api/chat`;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

export type ChatType = "DIRECT" | "GROUP";
export type ChatParticipantRole = "ADMIN" | "MEMBER";
export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "SYSTEM"
  | "GIF"
  | "STICKER"
  | "AUDIO"
  | "VIDEO";
export type AttachmentType = "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";

export interface ChatUser {
  id: number;
  name: string;
  email: string;
  profile?: { profilePicture: string | null } | null;
}

export interface ChatParticipant {
  id: number;
  chatId: number;
  userId: number;
  role: ChatParticipantRole;
  isActive: boolean;
  isMuted: boolean;
  joinedAt: string;
  deletedAt: string | null;
  visibleFrom: string | null;
  user: ChatUser;
  isOnline?: boolean;
}

export interface MessageAttachment {
  id: number;
  messageId: number;
  url: string;
  type: AttachmentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number | null;
  thumbnailUrl?: string | null;
  createdAt: string;
}

export interface MessageReadReceipt {
  id: number;
  messageId: number;
  userId: number;
  readAt: string;
  user?: { id: number; name: string };
}

export interface ReplyToPreview {
  id: number;
  content: string;
  isDeleted?: boolean;
  sender: { id: number; name: string };
}

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  type: MessageType;
  replyToId: number | null;
  isDeleted: boolean;
  isEdited: boolean;
  deletedAt: string | null;
  deletedByAdminId: number | null;
  deletedByAdminName: string | null;
  hiddenForUserIds: number[];
  createdAt: string;
  updatedAt: string;
  sender: ChatUser;
  attachments: MessageAttachment[];
  readReceipts?: MessageReadReceipt[];
  replyTo?: ReplyToPreview | null;
  privateReplySourceChatId?: number | null;
  privateReplySourceMsgId?: number | null;
  privateReplySourceChatName?: string | null;
  privateReplySourceMsgContent?: string | null;
}

export interface Chat {
  id: number;
  type: ChatType;
  name: string | null;
  picture: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  messages?: ChatMessage[];
  unreadCount?: number;
  isMuted?: boolean;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  roleId?: number;
}

interface ApiError {
  error?: { path?: string; msg: string }[];
}

const handleResponse = async <T>(res: Response, fallbackMessage: string): Promise<T> => {
  const data = await res.json();
  if (!res.ok || (data as ApiError).error) {
    if (res.status === 401) throw new Error("Unauthorized. Please log in again.");
    if (res.status === 403)
      throw new Error((data as ApiError).error?.[0]?.msg || "You don't have permission to do this.");
    if (res.status === 404) throw new Error("Not found.");
    throw new Error((data as ApiError).error?.[0]?.msg || fallbackMessage);
  }
  return data as T;
};

// ─── Chats ──────────────────────────────────────────────────────────────────

export const createChat = async (
  token: string,
  payload: {
    type: ChatType;
    name?: string;
    picture?: string;
    participantIds: number[];
  },
): Promise<{ message: string; data: Chat }> => {
  const res = await fetch(`${CHAT_URL}/`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to create chat");
};

export const getMyChats = async (
  token: string,
  params?: { page?: number; limit?: number; type?: ChatType; unread?: boolean },
): Promise<{
  message: string;
  data: Chat[];
  pagination?: { totalItems: number; totalPages: number; currentPage: number; pageSize: number };
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.type) query.set("type", params.type);
  if (params?.unread) query.set("unread", "true");

  const res = await fetch(`${CHAT_URL}/?${query.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to fetch chats");
};

export const getChatById = async (
  token: string,
  chatId: number,
): Promise<{ message: string; data: Chat }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to fetch chat");
};

export const updateChat = async (
  token: string,
  chatId: number,
  data: { name?: string; picture?: string },
): Promise<{ message: string; data: Chat }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Failed to update chat");
};

export const renameChatGroup = async (
  token: string,
  chatId: number,
  name: string,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/rename`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ name }),
  });
  return handleResponse(res, "Failed to rename group");
};

export const addParticipants = async (
  token: string,
  chatId: number,
  participantIds: number[],
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/participants`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ participantIds }),
  });
  return handleResponse(res, "Failed to add participants");
};

export const removeParticipant = async (
  token: string,
  chatId: number,
  userId: number,
): Promise<{ message: string }> => {
  const res = await fetch(
    `${CHAT_URL}/${chatId}/participants/${userId}`,
    { method: "DELETE", headers: getAuthHeaders(token) },
  );
  return handleResponse(res, "Failed to remove participant");
};

export const promoteToAdmin = async (
  token: string,
  chatId: number,
  userId: number,
): Promise<{ message: string }> => {
  const res = await fetch(
    `${CHAT_URL}/${chatId}/participants/${userId}/promote`,
    { method: "PATCH", headers: getAuthHeaders(token) },
  );
  return handleResponse(res, "Failed to promote participant");
};

export const demoteAdmin = async (
  token: string,
  chatId: number,
  userId: number,
): Promise<{ message: string }> => {
  const res = await fetch(
    `${CHAT_URL}/${chatId}/participants/${userId}/demote`,
    { method: "PATCH", headers: getAuthHeaders(token) },
  );
  return handleResponse(res, "Failed to demote participant");
};

export const muteChat = async (
  token: string,
  chatId: number,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/mute`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to mute chat");
};

export const unmuteChat = async (
  token: string,
  chatId: number,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/mute`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to unmute chat");
};

export const leaveChat = async (
  token: string,
  chatId: number,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/leave`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to leave chat");
};

export const deleteDirectChat = async (
  token: string,
  chatId: number,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/direct`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to delete chat");
};

export const deleteChat = async (
  token: string,
  chatId: number,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to delete group");
};

export const checkChatAccess = async (
  token: string,
  chatId: number,
): Promise<{ message: string; data: { exists: boolean; isMember: boolean } }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/access-check`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to check chat access");
};

// ─── Messages ───────────────────────────────────────────────────────────────

export const getMessages = async (
  token: string,
  chatId: number,
  params?: { cursor?: number; limit?: number },
): Promise<{
  message: string;
  data: ChatMessage[];
  pagination: { nextCursor: number | null; hasMore: boolean };
}> => {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", String(params.cursor));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await fetch(
    `${CHAT_URL}/${chatId}/messages?${query.toString()}`,
    { method: "GET", headers: getAuthHeaders(token) },
  );
  return handleResponse(res, "Failed to fetch messages");
};

export const uploadAttachment = async (
  token: string,
  chatId: number,
  file: File,
  duration?: number,
): Promise<{
  message: string;
  data: {
    url: string;
    type: AttachmentType;
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration?: number;
  };
}> => {
  const formData = new FormData();
  formData.append("file", file);
  if (duration) formData.append("duration", String(duration));

  const res = await fetch(`${CHAT_URL}/${chatId}/messages/upload`, {
    method: "POST",
    headers: { token },
    body: formData,
  });
  return handleResponse(res, "Failed to upload attachment");
};

export const sendMessage = async (
  token: string,
  chatId: number,
  payload: {
    content?: string;
    type?: MessageType;
    replyToId?: number;
    attachments?: {
      url: string;
      type: AttachmentType;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }[];
  },
): Promise<{ message: string; data: ChatMessage }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/messages`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to send message");
};

export const markMessagesAsRead = async (
  token: string,
  chatId: number,
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/${chatId}/messages/read`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to mark messages as read");
};

export const deleteMessage = async (
  token: string,
  chatId: number,
  messageId: number,
  scope?: "for_me",
): Promise<{ message: string }> => {
  const res = await fetch(
    `${CHAT_URL}/${chatId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
      body: JSON.stringify(scope ? { scope } : {}),
    },
  );
  return handleResponse(res, "Failed to delete message");
};

export const forwardMessage = async (
  token: string,
  payload: { messageIds: number[]; chatIds?: number[]; userIds?: number[] },
): Promise<{ message: string }> => {
  const res = await fetch(`${CHAT_URL}/forward`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to forward message");
};

export const sendPrivateReply = async (
  token: string,
  payload: {
    targetUserId: number;
    content: string;
    sourceGroupChatId: number;
    sourceGroupChatName?: string;
    sourceMsgId: number;
    sourceMsgContent?: string;
  },
): Promise<{ message: string; data: { message: ChatMessage; dmChatId: number } }> => {
  const res = await fetch(`${CHAT_URL}/private-reply`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to send private reply");
};

export const editMessage = async (
  token: string,
  chatId: number,
  messageId: number,
  content: string,
): Promise<{ message: string; data: ChatMessage }> => {
  const res = await fetch(
    `${CHAT_URL}/${chatId}/messages/${messageId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ content }),
    },
  );
  return handleResponse(res, "Failed to edit message");
};

// ─── Contacts (for "New Chat") ──────────────────────────────────────────────

export const fetchContacts = async (
  token: string,
  params?: { page?: number; limit?: number; search?: string },
): Promise<{
  message: string;
  data: Contact[];
  pagination?: { totalItems: number; totalPages: number; currentPage: number; pageSize: number };
}> => {
  const query = new URLSearchParams({
    status: "active",
    membership: "verified",
    selfIncluded: "false",
  });
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`${API_URL}/api/user/all/users?${query.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  return handleResponse(res, "Failed to fetch contacts");
};
