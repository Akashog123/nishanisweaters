import { useState, useCallback, useMemo } from "react";
import { Doc } from "../../../../convex/_generated/dataModel";
import {
  OrderStatus,
  PaymentStatus,
  OrderType,
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
  processing: number;
  shipped: number;
  delivered: number;
  disputed: number;
}

export interface UseOrderFiltersReturn {
  // Filter state
  searchQuery: string;
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

  // Computed values
  filterOrders: (orders: Doc<"orders">[]) => Doc<"orders">[];
  getOrderCounts: (orders: Doc<"orders">[]) => OrderCounts;
  getPaginatedOrders: (filteredOrders: Doc<"orders">[], itemsPerPage: number) => Doc<"orders">[];
  getTotalPages: (filteredOrders: Doc<"orders">[], itemsPerPage: number) => number;
}

export function useOrderFilters(): UseOrderFiltersReturn {
  const [searchQuery, setSearchQueryState] = useState("");
  const [statusFilter, setStatusFilterState] = useState<OrderStatusFilter>("all");
  const [paymentFilter, setPaymentFilterState] = useState<PaymentStatusFilter>("all");
  const [typeFilter, setTypeFilterState] = useState<OrderTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    resetPagination();
  }, [resetPagination]);

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
    setStatusFilterState("all");
    setPaymentFilterState("all");
    setTypeFilterState("all");
    resetPagination();
  }, [resetPagination]);

  const filterOrders = useCallback((orders: Doc<"orders">[]): Doc<"orders">[] => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || order.orderStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "all" || order.paymentStatus === paymentFilter;

      const matchesType = typeFilter === "all" || order.orderType === typeFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesType;
    });
  }, [searchQuery, statusFilter, paymentFilter, typeFilter]);

  const getOrderCounts = useCallback((orders: Doc<"orders">[]): OrderCounts => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.orderStatus === "pending").length,
      processing: orders.filter((o) => o.orderStatus === "processing").length,
      shipped: orders.filter((o) => o.orderStatus === "shipped").length,
      delivered: orders.filter((o) => o.orderStatus === "delivered").length,
      disputed: orders.filter((o) => o.paymentStatus === "disputed").length,
    };
  }, []);

  const getPaginatedOrders = useCallback(
    (filteredOrders: Doc<"orders">[], itemsPerPage: number): Doc<"orders">[] => {
      return filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );
    },
    [currentPage]
  );

  const getTotalPages = useCallback(
    (filteredOrders: Doc<"orders">[], itemsPerPage: number): number => {
      return Math.ceil(filteredOrders.length / itemsPerPage);
    },
    []
  );

  return {
    searchQuery,
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
    filterOrders,
    getOrderCounts,
    getPaginatedOrders,
    getTotalPages,
  };
}
