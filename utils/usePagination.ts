"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface PaginationData {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationData;
  message?: string;
  error?: { msg: string; path?: string }[];
}

interface UsePaginationProps<T> {
  queryKey: any[];
  fetchFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>;
  limit?: number;
  enabled?: boolean;
}

export function usePagination<T>({
  queryKey,
  fetchFn,
  limit = 10,
  enabled = true,
}: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isPreviousData,
  } = useQuery({
    queryKey: [...queryKey, currentPage, limit],
    queryFn: async () => {
      return await fetchFn(currentPage, limit);
    },
    keepPreviousData: true,
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });

  const pagination = response?.pagination || {
    totalItems: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: limit,
  };

  const data = response?.data || [];

  const hasNextPage = currentPage < pagination.totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage && !isPreviousData) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage, isPreviousData]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pagination.totalPages) {
        setCurrentPage(page);
      }
    },
    [pagination.totalPages],
  );
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  return {
    data,
    pagination,
    currentPage,
    isLoading,
    isError,
    error,
    isPreviousData,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    resetPagination,
  };
}
