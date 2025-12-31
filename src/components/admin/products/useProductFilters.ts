import { useState, useCallback } from "react";
import { CategoryFilterType, StockFilterType } from "./types";

interface UseProductFiltersReturn {
  searchQuery: string;
  categoryFilter: CategoryFilterType;
  stockFilter: StockFilterType;
  currentPage: number;
  cursor: string | null;
  cursorHistory: string[];
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: CategoryFilterType) => void;
  setStockFilter: (filter: StockFilterType) => void;
  setCurrentPage: (page: number) => void;
  goToNextPage: (nextCursor: string) => void;
  goToPreviousPage: () => void;
  resetFilters: () => void;
}

export function useProductFilters(): UseProductFiltersReturn {
  const [searchQuery, setSearchQueryState] = useState("");
  const [categoryFilter, setCategoryFilterState] = useState<CategoryFilterType>("all");
  const [stockFilter, setStockFilterState] = useState<StockFilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  // Cursor-based pagination state
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursor(null);
    setCursorHistory([]);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    resetPagination();
  }, [resetPagination]);

  const setCategoryFilter = useCallback((filter: CategoryFilterType) => {
    setCategoryFilterState(filter);
    resetPagination();
  }, [resetPagination]);

  const setStockFilter = useCallback((filter: StockFilterType) => {
    setStockFilterState(filter);
    resetPagination();
  }, [resetPagination]);

  const goToNextPage = useCallback((nextCursor: string) => {
    // Save current cursor to history for going back
    if (cursor !== null) {
      setCursorHistory(prev => [...prev, cursor]);
    } else {
      // First page has no cursor, save empty string as marker
      setCursorHistory(prev => [...prev, ""]);
    }
    setCursor(nextCursor);
    setCurrentPage(prev => prev + 1);
  }, [cursor]);

  const goToPreviousPage = useCallback(() => {
    if (cursorHistory.length === 0) return;

    const newHistory = [...cursorHistory];
    const prevCursor = newHistory.pop();
    setCursorHistory(newHistory);
    // Empty string means first page (no cursor)
    setCursor(prevCursor === "" ? null : prevCursor || null);
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, [cursorHistory]);

  const resetFilters = useCallback(() => {
    setSearchQueryState("");
    setCategoryFilterState("all");
    setStockFilterState("all");
    resetPagination();
  }, [resetPagination]);

  return {
    searchQuery,
    categoryFilter,
    stockFilter,
    currentPage,
    cursor,
    cursorHistory,
    setSearchQuery,
    setCategoryFilter,
    setStockFilter,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    resetFilters,
  };
}
