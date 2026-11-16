import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Spinner, TextInput } from "flowbite-react";
import { HiCheck, HiSearch } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { fetchContacts } from "@/services/chat";
import Avatar from "./Avatar";

interface ContactPickerProps {
  excludeUserIds: number[];
  selectedIds: number[];
  onToggle: (userId: number, name: string) => void;
}

export default function ContactPicker({ excludeUserIds, selectedIds, onToggle }: ContactPickerProps) {
  const token = useAuthStore((state) => state.token);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["contacts", debouncedSearch],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return fetchContacts(token as string, { page: pageParam, limit: 30, search: debouncedSearch || undefined });
    },
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      if (!p) return undefined;
      return p.currentPage < p.totalPages ? p.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!token,
  });

  const contacts = (data?.pages.flatMap((p) => p.data) ?? []).filter(
    (c) => !excludeUserIds.includes(c.id),
  );

  return (
    <div className="flex flex-col min-h-0">
      <div className="relative mb-3">
        {/* @ts-ignore */}
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="[&>div>input]:pl-9"
        />
      </div>

      <div className="overflow-y-auto max-h-72 -mx-1 px-1">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">No contacts found.</p>
        ) : (
          <ul className="space-y-1">
            {contacts.map((contact) => {
              const isSelected = selectedIds.includes(contact.id);
              return (
                <li key={contact.id}>
                  <button
                    onClick={() => onToggle(contact.id, contact.name)}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-gray-700 ${
                      isSelected ? "bg-gray-700" : ""
                    }`}
                  >
                    <Avatar name={contact.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{contact.name}</p>
                      <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                    </div>
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

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full text-center text-sm text-gold-400 hover:text-gold-300 py-2"
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
