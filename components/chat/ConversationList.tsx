import { useState } from "react";
import { Spinner } from "flowbite-react";
import { HiPlus, HiSearch } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useChats } from "@/hooks/useChats";
import ConversationListItem from "./ConversationListItem";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";

type FilterKey = "all" | "unread" | "group" | "individual";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "group", label: "Groups" },
  { key: "individual", label: "Individual" },
];

interface ConversationListProps {
  activeChatId: number | null;
  onSelectChat: (chatId: number) => void;
  onOpenCreate: () => void;
  className?: string;
}

export default function ConversationList({
  activeChatId,
  onSelectChat,
  onOpenCreate,
  className = "",
}: ConversationListProps) {
  const currentUserId = useAuthStore((state) => (state.user ? Number(state.user.id) : undefined));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading } = useChats();

  const chats = data?.data ?? [];
  const byFilter = chats.filter((chat) => {
    if (filter === "unread") return (chat.unreadCount ?? 0) > 0;
    if (filter === "group") return chat.type === "GROUP";
    if (filter === "individual") return chat.type === "DIRECT";
    return true;
  });
  const filtered = search.trim()
    ? byFilter.filter((chat) => {
        const isGroup = chat.type === "GROUP";
        const other = !isGroup ? chat.participants.find((p) => p.userId !== currentUserId) : undefined;
        const name = isGroup ? (chat.name ?? "") : (other?.user.name ?? "");
        return name.toLowerCase().includes(search.trim().toLowerCase());
      })
    : byFilter;

  const emptyTitle = search
    ? "No chats found"
    : filter === "unread"
      ? "No unread chats"
      : filter === "group"
        ? "No group chats"
        : filter === "individual"
          ? "No individual chats"
          : "No chats yet";
  const emptyMessage = search
    ? "Try a different search."
    : filter !== "all"
      ? "Try a different filter."
      : "Start a new conversation to get chatting.";

  return (
    <div className={`flex flex-col h-full border-r border-gray-800 bg-gray-900 ${className}`}>
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Chats</h1>
          <button
            onClick={onOpenCreate}
            className="bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-full p-2.5 shadow-sm transition-colors"
            title="New chat"
          >
            {/* @ts-ignore */}
            <HiPlus className="w-5 h-5" />
          </button>
        </div>
        <div className="relative">
          {/* @ts-ignore */}
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start a new chat"
            className="w-full bg-gray-800/80 text-white placeholder-gray-500 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/70 focus:bg-gray-800 transition-colors"
          />
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-gold-500 text-gray-900"
                  : "bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-2">
            <EmptyStateMessage
              title={emptyTitle}
              message={emptyMessage}
              showCreateButton={!search && filter === "all"}
              onCreateClick={onOpenCreate}
              createButtonText="New chat"
            />
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((chat) => (
              <ConversationListItem
                key={chat.id}
                chat={chat}
                currentUserId={currentUserId ?? -1}
                isActive={chat.id === activeChatId}
                onClick={() => onSelectChat(chat.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
