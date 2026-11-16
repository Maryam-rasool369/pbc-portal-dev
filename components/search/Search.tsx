import Can from "../rbac/Can";
import useAuthStore from "@/store/authStore";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ElectionCard,
  EventCard,
  JobPostCard,
  LeadCard,
  ProfileCard,
  ProductCard,
  RFQCard,
  TicketCard,
  WishlistCard,
} from "./Cards";
import {
  RFQ,
  Wishlist,
  Product,
  JobPost,
  Lead,
  Profile,
  Election,
  EventType,
  Ticket,
} from "./types";
import { toast } from "react-toastify";

interface SearchResult {
  data: {
    rfqs: RFQ[];
    wishlists: Wishlist[];
    products: Product[];
    jobPosts: JobPost[];
    leads: Lead[];
    profiles: Profile[];
    elections: Election[];
    events: EventType[];
    tickets: Ticket[];
    counts: {
      [key: string]: number;
    };
  };
}

interface SearchComponentProps {
  placeholder?: string;
  debounceMs?: number;
}

function debounce(
  func: (arg: string) => void | Promise<void>,
  wait: number
): (arg: string) => void {
  let timeout: NodeJS.Timeout;
  return (arg: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      void func(arg);
    }, wait);
  };
}

const cardRenderers = {
  rfqs: RFQCard,
  wishlists: WishlistCard,
  products: ProductCard,
  jobPosts: JobPostCard,
  leads: LeadCard,
  profiles: ProfileCard,
  elections: ElectionCard,
  events: EventCard,
  tickets: TicketCard,
};

const moduleNamesForPermissions: Record<string, string> = {
  rfqs: "RFQ",
  wishlists: "Wishlist",
  products: "Product",
  jobPosts: "JobPost",
  leads: "Lead",
  profiles: "Profile",
  elections: "Election",
  events: "Event",
  tickets: "Ticket",
};

const categoryNames = {
  rfqs: "RFQs",
  wishlists: "Wishlists",
  products: "Products",
  jobPosts: "Job Posts",
  leads: "Leads",
  profiles: "Profiles",
  elections: "Elections",
  events: "Events",
  tickets: "Tickets",
};

const SearchComponent: React.FC<SearchComponentProps> = ({
  placeholder = "Search across all categories...",
  debounceMs = 300,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((state) => state.token);
  const MIN_SEARCH_LENGTH = 2;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchResults(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedSearch = useCallback(
    debounce(
      (async (term: string) => {
        if (term.length < MIN_SEARCH_LENGTH) {
          setSearchResults(null);
          return;
        }

        try {
          setIsSearching(true);
          const baseUrl: string = process.env.NEXT_PUBLIC_API_URL!;
          const response: Response = await fetch(
            `${baseUrl}/api/search?search=${encodeURIComponent(term)}`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(token && { token }),
              },
            }
          );

          const data: SearchResult = await response.json();
          if (response.ok) {
            setSearchResults(data);
          } else {
            const errorMessage = 
              (data as any)?.error?.[0]?.msg || 
              (data as any)?.message || 
              "Failed to search. Please try again.";
            toast.error(errorMessage);
            console.error("Search API error:", response.statusText);
            setSearchResults(null);
          }
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults(null);
        } finally {
          setIsSearching(false);
        }
      }) as (term: string) => void,
      debounceMs
    ),
    [token, debounceMs]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || token === "undefined") {
      toast.error("You must be logged in to search.");
      return;
    }
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults(null);
  };

  const handleResultClick = () => {
    setSearchResults(null);
  };

  return (
    <div className={`relative w-full`} ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearch}
          className={`w-full sm:w-80 ml-1 px-4 py-2 pr-10 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400 transition-all`}
        />
        <div className="absolute right-3 top-2.5 flex items-center">
          {isSearching ? (
            <svg
              className="animate-spin h-4 w-4 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : searchTerm ? (
            <button
              onClick={clearSearch}
              className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : (
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Search Results Dropdown - Full Screen Width */}
      {searchResults && searchTerm.length >= MIN_SEARCH_LENGTH && (
        <div className="fixed inset-x-0 top-16 z-50 mx-2 sm:mx-4 md:mx-6 lg:mx-8">
          <div className="bg-white rounded-xl shadow-2xl dark:bg-gray-800 max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Search Results for &quot;{searchTerm}&quot;
              </h3>
            </div>

            {/* Results Grid - Responsive Layout */}
            <div className="p-4">
              {Object.entries(searchResults.data)
                .filter(
                  ([category, items]) =>
                    Array.isArray(items) &&
                    items.length > 0 &&
                    category !== "counts" &&
                    Object.keys(categoryNames).includes(category) &&
                    cardRenderers[category as keyof typeof cardRenderers]
                )
                .map(([category, items]) => {
                  const CardComponent =
                    cardRenderers[category as keyof typeof cardRenderers];
                  const displayName =
                    categoryNames[category as keyof typeof categoryNames];
                  const totalCount = searchResults.data.counts[category];

                  return (
                    <Can 
                      key={category}
                      I="read" 
                      a={moduleNamesForPermissions[category]}
                    >
                      <div className="mb-6 last:mb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {displayName}
                          </h4>
                          <span className="text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                            {totalCount} total
                          </span>
                        </div>

                        {/* Responsive Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {Array.isArray(items) &&
                            items.map((item, index) => (
                              <div
                                key={`${category}-${item.id}-${index}`}
                                className="bg-gray-50 dark:bg-gray-700 rounded-lg"
                                onClick={handleResultClick}
                              >
                                <CardComponent item={item as any} />
                              </div>
                            ))}
                        </div>
                      </div>
                    </Can>
                  );
                })}

              {Object.values(searchResults.data).every(
                (items) => !Array.isArray(items) || items.length === 0
              ) && (
                <div className="p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No results found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Try searching with different keywords
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
