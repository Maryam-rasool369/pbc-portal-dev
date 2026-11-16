import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { HiSearch } from "react-icons/hi";
import { Spinner } from "flowbite-react";
import { getTrendingGifs, searchGifs, type KlipyGif } from "@/utils/klipy";

interface EmojiGifPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onGifSelect: (gif: KlipyGif) => void;
}

function GifPickerTab({ onGifSelect }: { onGifSelect: (gif: KlipyGif) => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["klipy-gifs", debouncedSearch],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      debouncedSearch ? searchGifs(debouncedSearch, pageParam) : getTrendingGifs(pageParam),
    getNextPageParam: (lastPage, pages) => (lastPage.hasNext ? pages.length + 1 : undefined),
    initialPageParam: 1,
    retry: false,
  });

  const gifs = data?.pages.flatMap((p) => p.gifs) ?? [];

  return (
    <div className="flex flex-col">
      <div className="relative p-2 pb-0">
        {/* @ts-ignore */}
        <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/70"
        />
      </div>

      <div className="p-2 max-h-[330px] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-400 px-4 py-10">
            {error instanceof Error ? error.message : "Failed to load GIFs."}
          </p>
        ) : gifs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No GIFs found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onGifSelect(gif)}
                className="block w-full rounded-lg overflow-hidden bg-gray-800 hover:opacity-80 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.previewUrl ?? undefined} alt="GIF" className="w-full h-24 object-cover" />
              </button>
            ))}
          </div>
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

export default function EmojiGifPicker({ onEmojiSelect, onGifSelect }: EmojiGifPickerProps) {
  const [tab, setTab] = useState<"emoji" | "gifs">("emoji");

  return (
    <div className="w-[320px] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex gap-1 p-2 border-b border-gray-800">
        <button
          type="button"
          onClick={() => setTab("emoji")}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
            tab === "emoji" ? "bg-gold-500 text-gray-900" : "text-gray-300 hover:text-white"
          }`}
        >
          Emoji
        </button>
        <button
          type="button"
          onClick={() => setTab("gifs")}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
            tab === "gifs" ? "bg-gold-500 text-gray-900" : "text-gray-300 hover:text-white"
          }`}
        >
          GIFs
        </button>
      </div>

      {tab === "emoji" ? (
        <EmojiPicker
          theme={Theme.DARK}
          onEmojiClick={(data) => onEmojiSelect(data.emoji)}
          width="100%"
          height={360}
          previewConfig={{ showPreview: false }}
        />
      ) : (
        <GifPickerTab onGifSelect={onGifSelect} />
      )}
    </div>
  );
}
