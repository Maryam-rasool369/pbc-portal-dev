"use client";

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { HiEye, HiPencil, HiPlus, HiRefresh, HiSearch } from "react-icons/hi";
import Pagination from "@/components/common/Pagination";
import {
  BusinessConnectionSummary,
  getCounterparty,
  natureBadgeClass,
  natureLabel,
} from "@/components/business-connections/BusinessConnectionHelpers";
import {
  fetchAllBusinessConnections,
  fetchBusinessConnections,
} from "@/services/businessConnections";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";
import { BusinessConnection, BusinessConnectionsPagination } from "@/types/businessConnection";
import Can from "@/components/rbac/Can";

const IconEye = HiEye as any;
const IconPencil = HiPencil as any;
const IconPlus = HiPlus as any;
const IconRefresh = HiRefresh as any;
const IconSearch = HiSearch as any;

const defaultPagination: BusinessConnectionsPagination = {
  totalItems: 0,
  totalPages: 0,
  currentPage: 1,
  pageSize: 9,
};

export default function BusinessConnectionsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  const [connections, setConnections] = useState<BusinessConnection[]>([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"my" | "all">("my");
  const [search, setSearch] = useState("");
  const canManageConnections = ability?.can("manage", "BusinessConnection") ?? false;

  const loadConnections = async (page = pagination.currentPage, searchTerm = search) => {
    if (!token || token === "undefined") return;
    setLoading(true);
    try {
      const response =
        selectedTab === "all"
          ? await fetchAllBusinessConnections(token, page, pagination.pageSize, searchTerm)
          : await fetchBusinessConnections(token, page, pagination.pageSize, searchTerm);
      setConnections(response.data || []);
      setPagination(response.pagination || defaultPagination);
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch business connections");
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || token === "undefined") return;
    // if (!canManageConnections && selectedTab === "all") {
    //   setSelectedTab("my");
    //   return;
    // }

    const handle = window.setTimeout(() => {
      loadConnections(1, search);
    }, 350);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTab, canManageConnections, search]);

  const counts = useMemo(
    () =>
      connections.reduce(
        (acc, connection) => {
          acc[connection.natureOfBusiness] += 1;
          return acc;
        },
        { BOUGHT: 0, SOLD: 0, PARTNERSHIP: 0 },
      ),
    [connections],
  );

  return (
    <>
      <Head>
        <title>Business Connections | PBC</title>
      </Head>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Business Connections
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track business bought, sold, and partnership outcomes with members and non-members.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadConnections(pagination.currentPage)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <IconRefresh className="h-4 w-4" />
              Refresh
            </button>
            <Can I="create" a="BusinessConnection">
              <Link
                href="/business-connections/new"
                className="inline-flex items-center gap-2 rounded-md bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-700"
              >
                <IconPlus className="h-4 w-4" />
                Create Connection
              </Link>
            </Can>
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setSelectedTab("my")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${selectedTab === "my"
              ? "bg-gold-600 text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }`}
          >
            My Connections
          </button>
            <button
              type="button"
              onClick={() => setSelectedTab("all")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${selectedTab === "all"
                ? "bg-gold-600 text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
            >
              All Connections
            </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by connection details, member name, company, email, or nature..."
              className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["BOUGHT", "SOLD", "PARTNERSHIP"] as const).map((nature) => (
            <div
              key={nature}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{natureLabel[nature]}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {counts[nature]}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Loading business connections...
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              No business connections yet
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Create your first connection to start recording business activity.
            </p>
            <Link
              href="/business-connections/new"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-700"
            >
              <IconPlus className="h-4 w-4" />
              Create Connection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {connections.map((connection) => {
              const counterparty = getCounterparty(connection);
              return (
                <div
                  key={connection.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                        {counterparty.name}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {counterparty.companyName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${natureBadgeClass[connection.natureOfBusiness]
                        }`}
                    >
                      {natureLabel[connection.natureOfBusiness]}
                    </span>
                  </div>
                  <BusinessConnectionSummary connection={connection} compact />
                  <p className="mt-4 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
                    {connection.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/business-connections/${connection.id}`)}
                      className="inline-flex items-center gap-1 rounded-md bg-gold-600 px-3 py-2 text-sm font-medium text-white hover:bg-gold-700"
                    >
                      <IconEye className="h-4 w-4" />
                      View
                    </button>
                    {(canManageConnections || String(connection.userId) === String(user?.id)) && (
                      <button
                        type="button"
                        onClick={() => router.push(`/business-connections/${connection.id}/edit`)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <IconPencil className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          isLoading={loading}
          onPageChange={(page) => loadConnections(page)}
        />
      </div>
    </>
  );
}
