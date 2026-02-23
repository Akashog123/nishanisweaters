import { useState, useCallback, useMemo } from "react";
import {
  OrderStatusFilter,
  PaymentStatusFilter,
  OrderTypeFilter,
} from "@/lib/constants/orderStatus";

// Re-export for convenience
export type { OrderStatusFilter, PaymentStatusFilter, OrderTypeFilter };

export interface OrderFiltersState {
  searchQuery: string;
  statusFilter: OrderStatusFilter;
  paymentFilter: PaymentStatusFilter;
  typeFilter: OrderTypeFilter;
  currentPage: number;
}

export interface OrderCounts {
  all: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  disputed: number;
}

export interface UseOrderFiltersReturn {
  // Filter state
  searchQuery: string;
  debouncedSearch: string;
  statusFilter: OrderStatusFilter;
  paymentFilter: PaymentStatusFilter;
  typeFilter: OrderTypeFilter;
  currentPage: number;

  // Setters
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: OrderStatusFilter) => void;
  setPaymentFilter: (filter: PaymentStatusFilter) => void;
  setTypeFilter: (filter: OrderTypeFilter) => void;
  setCurrentPage: (page: number) => void;

  // Combined filter setter for stats cards
  setFilters: (status: OrderStatusFilter, payment: PaymentStatusFilter) => void;

  // Reset
  resetFilters: () => void;

  // Query args for server-side filtering
  queryArgs: Record<string, unknown>;
}

export function useOrderFilters(): UseOrderFiltersReturn {
  const [searchQuery, setSearchQueryState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilterState] = useState<OrderStatusFilter>("all");
  const [paymentFilter, setPaymentFilterState] = useState<PaymentStatusFilter>("all");
  const [typeFilter, setTypeFilterState] = useState<OrderTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    resetPagination();

    // Debounce the search term sent to the server
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(query);
    }, 300);
    setDebounceTimer(timer);
  }, [resetPagination, debounceTimer]);

  const setStatusFilter = useCallback((filter: OrderStatusFilter) => {
    setStatusFilterState(filter);
    resetPagination();
  }, [resetPagination]);

  const setPaymentFilter = useCallback((filter: PaymentStatusFilter) => {
    setPaymentFilterState(filter);
    resetPagination();
  }, [resetPagination]);

  const setTypeFilter = useCallback((filter: OrderTypeFilter) => {
    setTypeFilterState(filter);
    resetPagination();
  }, [resetPagination]);

  const setFilters = useCallback((status: OrderStatusFilter, payment: PaymentStatusFilter) => {
    setStatusFilterState(status);
    setPaymentFilterState(payment);
    resetPagination();
  }, [resetPagination]);

  const resetFilters = useCallback(() => {
    setSearchQueryState("");
    setDebouncedSearch("");
    setStatusFilterState("all");
    setPaymentFilterState("all");
    setTypeFilterState("all");
    resetPagination();
  }, [resetPagination]);

  // Build query args for server-side filtering
  const queryArgs = useMemo(() => {
    const args: Record<string, unknown> = { limit: 25 };
    if (statusFilter !== "all") args.orderStatus = statusFilter;
    if (paymentFilter !== "all") args.paymentStatus = paymentFilter;
    if (typeFilter !== "all") args.orderType = typeFilter;
    if (debouncedSearch.trim()) args.searchTerm = debouncedSearch.trim();
    return args;
  }, [statusFilter, paymentFilter, typeFilter, debouncedSearch]);

  return {
    searchQuery,
    debouncedSearch,
    statusFilter,
    paymentFilter,
    typeFilter,
    currentPage,
    setSearchQuery,
    setStatusFilter,
    setPaymentFilter,
    setTypeFilter,
    setCurrentPage,
    setFilters,
    resetFilters,
    queryArgs,
  };
}
