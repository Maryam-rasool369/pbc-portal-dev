# Web Chat Feature — Technical Reference

Standalone chat (`/chat`), built fresh against pbc-api's custom REST + Socket.IO
chat backend. **Not** the old Twilio-based chat — that was deleted (see
"History" below). Read this before touching chat code instead of
re-exploring `pbc-api` or the frontend from scratch.

## Status

Core MVP shipped: direct + group chats, text/image/document attachments,
typing indicators, read receipts, online presence, group management
(create/rename/add/remove/leave), mute, live unread counts, cursor-paginated
infinite scroll.

**Deferred (backend supports these, frontend does not build them yet):**
message forwarding (`POST /chats/forward`), private-reply-from-group
(`POST /chats/private-reply`), admin transfer/demote
(`.../promote`, `.../demote`), voice/video message *authoring* (backend's
`sendMessage` attachment classification only handles IMAGE/DOCUMENT, so
audio/video would need a backend fix too), full-text `/chats/search` UI
(current search just filters the loaded conversation list client-side).

## Backend contract (pbc-api — read-only reference, do not re-derive)

- Routes: `src/routes/chat.ts` → mounted at `/api/chat`. Controller:
  `src/controllers/chatController.ts`. DB: `src/repositories/chatRepository.ts`.
  Socket: `src/jobs/socketConnection.ts`.
- **Auth**: custom `token` header (not `Authorization: Bearer`), JWT verified
  via `verifyToken`. Sessions are single-active-session — a `sessionId`
  mismatch invalidates old tokens/sockets.
- **Response envelope**: `{message, data}` or `{message, data, pagination}`.
  Chat list uses offset pagination; messages use cursor pagination
  (`{cursor, limit}` query → `{nextCursor, hasMore}`), ordered
  `createdAt desc, id desc` (newest first per page).
- **Prisma models** (`prisma/schema.prisma`, "Chat Models" section):
  `Chat` (DIRECT/GROUP), `ChatParticipant` (role ADMIN/MEMBER, `isActive`,
  `isMuted`, `deletedAt`/`visibleFrom` for per-user soft delete),
  `Message` (TEXT/IMAGE/DOCUMENT/SYSTEM/GIF/STICKER/AUDIO/VIDEO,
  `replyToId` self-relation, `hiddenForUserIds` for delete-for-me,
  `deletedByAdminId/Name` for admin moderation), `MessageAttachment`,
  `MessageReadReceipt`.
- **REST endpoints**: `chatRouter` is mounted at `/api/chat` with **bare**
  paths — `/`, `/:chatId`, `/:chatId/messages`, etc. **There is no `/chats`
  segment anywhere** (a past mistake in `services/chat.ts` added one, which
  silently misrouted every chat request into `GET/PATCH/DELETE /:chatId`
  with `chatId` equal to the literal string `"chats"` — 404s on create, and
  a `NaN`-`chatId` Prisma error on list that crashed the whole API, since
  this repo's `unhandledRejection` handler calls `process.exit(0)` on any
  uncaught rejection. Both the URL bug and the missing input validation in
  `validateChatParticipant.ts` are now fixed — see History). See
  `src/routes/chat.ts` for the exact endpoint list (chats, participants,
  mute/leave/delete, messages, attachment upload, read receipts). Contact
  picker for "New Chat" reuses the existing
  `GET /api/user/all/users?status=active&membership=verified&selfIncluded=false`
  endpoint (no dedicated chat-contacts endpoint exists).
- **Reliability gotcha (repo-wide, not chat-specific)**: `src/utils/gracefulShutdown.ts`
  treats *any* unhandled promise rejection or uncaught exception as fatal
  and calls `process.exit(0)`, killing the entire API (including
  unrelated routes like login) until nodemon picks up a file change. Any
  new async middleware/controller must validate its inputs and/or catch
  errors — don't assume a bad request just 500s harmlessly.
- **Socket events** (`SOCKET_EVENTS` in `socketConnection.ts`):
  - Inbound: `join_chat`, `leave_chat`, `send_message`, `typing`,
    `stop_typing`, `mark_read`.
  - Outbound: `new_message`, `message_deleted`, `message_updated`,
    `user_typing`, `user_stop_typing`, `messages_read`, `chat_updated`,
    `user_online`, `user_offline`, `chat_error`.
  - **Gotcha**: `message_deleted`/`message_updated`/`chat_updated` are
    emitted via `getIO().to(room)` — the *actor also receives their own
    event*. But `messages_read` and typing events use `socket.to(room)`,
    which **excludes the emitter** — the reader never gets their own
    `messages_read` echo, and you never get your own typing rebroadcast.
  - **Gotcha**: `addParticipants`/`removeParticipant`/`mute`/`unmute`
    have **no dedicated socket event** for the updated participant/mute
    state (only a best-effort SYSTEM chat message on add/remove). The
    frontend must `invalidateQueries(["chats"])` after these actions.
  - Room = `chat:${chatId}`, client must `join_chat` before receiving
    room-scoped events.
- **Attachment flow**: upload via `POST /chats/:chatId/messages/upload`
  (multipart, field `file`) → returns `{url, type, fileName, fileSize,
  mimeType, duration?}` → send the message via the **socket** `send_message`
  event with `attachments: [...]` (not the REST `POST /messages`, whose
  attachment handling expects a local filesystem path and only classifies
  IMAGE/DOCUMENT — it's effectively unusable from a browser).

## Frontend architecture (pbc-portal)

```
layouts/ChatLayout.tsx            Full-screen layout used ONLY by pages/chat/index.tsx
                                   via the Next.js `Component.getLayout` pattern
                                   (see pages/_app.tsx's `getLayout` resolution).
                                   Keeps the top Navbar but drops the left Sidebar,
                                   page padding and footer, so the two chat panes
                                   fill the entire viewport below the navbar
                                   (WhatsApp-Web style, not boxed in a card).
                                   To add a similarly immersive full-screen page
                                   elsewhere, copy this pattern rather than
                                   fighting MainLayout's fixed sidebar margin.
services/chat.ts                  REST client (fetch + `token` header, typed)
context/SocketContext.tsx         SocketProvider — the ONE shared socket.io-client
                                   connection, auth {token, platform:"web"}.
                                   Mounted in pages/_app.tsx (wrapping
                                   `getLayout(...)`, inside QueryClientProvider)
                                   — NOT inside MainLayout — so the connection
                                   persists across layout switches (e.g.
                                   MainLayout ↔ ChatLayout) instead of
                                   disconnecting/reconnecting on navigation.
hooks/useChatCacheSync.ts         Global, mounted once via
                                   components/chat/ChatCacheSync.tsx (headless,
                                   rendered in pages/_app.tsx next to SocketProvider).
                                   Listens to new_message/message_deleted/
                                   message_updated/chat_updated/messages_read/
                                   user_online/user_offline/chat_error and
                                   patches the ["chats"] and ["messages", chatId]
                                   query caches. This is what keeps the sidebar
                                   unread badge live even when /chat isn't open.
hooks/useChatSocket.ts            Page-scoped (pages/chat/index.tsx only):
                                   join_chat/leave_chat for the active chat,
                                   typing-indicator state, and the emit
                                   helpers (sendMessage/emitTyping/
                                   emitStopTyping/markRead). markRead also
                                   optimistically zeroes unreadCount in the
                                   ["chats"] cache client-side, since
                                   messages_read never echoes back to the reader.
hooks/useChats.ts                 Shared useQuery(["chats"]) — used by
                                   sidebar badge, ConversationList, and the
                                   chat page itself (same cache, no dup fetch).
pages/chat/index.tsx              Master-detail page. activeChatId synced to
                                   ?chatId= query param.
components/chat/
  ConversationList.tsx            List + client-side search + "New chat".
  ConversationListItem.tsx
  ChatWindow.tsx                  Owns replyingTo/editingMessage/confirm state,
                                   REST mutations for mute/leave/delete/edit/
                                   delete-message (these rely on the socket
                                   broadcast to update the cache — see gotcha
                                   above about which events echo to the actor).
  ChatHeader.tsx                  Name/avatar/online/typing + overflow menu.
  MessageList.tsx                 useInfiniteQuery(["messages", chatId]),
                                   reverse-infinite-scroll, date separators,
                                   auto-mark-read effect.
  MessageBubble.tsx, MessageComposer.tsx, TypingIndicator.tsx
  CreateChatModal.tsx, GroupInfoModal.tsx, ContactPicker.tsx (shared
                                   contact search+picker, used by both modals)
  Avatar.tsx                      Shared initials/picture/online-dot avatar.
  ChatCacheSync.tsx                Headless mount point for useChatCacheSync.
```

React Query key conventions: `["chats"]`, `["messages", chatId]`,
`["contacts", searchTerm]`. When adding a new chat mutation, check whether
the backend already broadcasts a socket event for it (see gotcha above) —
if not, call `queryClient.invalidateQueries({queryKey: ["chats"]})` after
the REST call instead of assuming the cache will update itself.

## Design system decisions (for consistency in new chat UI)

- Layout is full-bleed (see `layouts/ChatLayout.tsx` above), not a boxed
  card — tonal depth mimics WhatsApp Web's panel hierarchy: conversation
  list / header / composer are `bg-gray-900`, the message thread itself is
  a shade darker (`bg-gray-950` + a very subtle dot-pattern background) for
  contrast. `border-gray-800` dividers. Brand accent `gold` (`#BF9B30`,
  `tailwind.config.js`).
- My message bubble: `bg-gold-500 text-gray-900 rounded-br-sm`. Others':
  `bg-gray-800 text-white rounded-bl-sm`. Bubble width capped at
  `max-w-[75%] lg:max-w-[min(65%,560px)]` so it doesn't stretch edge-to-edge
  on wide monitors now that the layout is full-screen.
  Unread badges: `bg-gold-500` pill everywhere (conversation list rows AND
  the sidebar's "Chat" nav badge) — **changed from an earlier red-pill
  decision** to match WhatsApp's own convention of using its brand color for
  unread counts rather than a separate alert color.
  Read receipts: single gray check = sent, double gold check = read
  (no separate "delivered" state — backend only exposes read receipts).
- Composer is a single pill (`bg-gray-800 rounded-3xl`) containing the
  attach icon + textarea, with a separate circular gold send button outside
  it — not one flat rounded-2xl input, to read as more "chat app" than "form
  field".
- Icons: `react-icons/hi` (matches the rest of the app). **Every icon JSX
  usage needs a `{/* @ts-ignore */}` comment on the line above it** — this
  is a pre-existing, repo-wide react-icons/React-18 type mismatch, not
  specific to chat (see any existing sidebar/navbar icon usage).
- `useAuthStore().user.id` is typed `string` — cast with `Number(user.id)`
  whenever comparing against backend numeric ids (`senderId`, `userId`, etc.).

## History

The chat feature replaced a legacy, disconnected Twilio Conversations
frontend (`pages/chat/index.tsx`, `components/chat/CreateChatModal.tsx`,
`services/twilioService.ts` — all deleted) that predated this Prisma/
Socket.IO backend and was already broken against it (wrong token-generation
endpoint). `pbc-api` still exposes a legacy
`POST /api/chat/generate-chat-token` route "for backward compatibility" —
unused by the current frontend, safe to ignore unless something else
depends on it.
