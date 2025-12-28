import { useState, useCallback } from "react";
import { CategoryFilterType, StockFilterType } from "./types";

interface UseProductFiltersReturn {
  searchQuery: string;
  categoryFilter: CategoryFilterType;
  stockFilter: StockFilterType;
  currentPage: number;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: CategoryFilterType) => void;
  setStockFilter: (filter: StockFilterType) => void;
  setCurrentPage: (page: number) => void;
  resetFilters: () => void;
}

export function useProductFilters(): UseProductFiltersReturn {
  const [searchQuery, setSearchQueryState] = useState("");
  const [categoryFilter, setCategoryFilterState] = useState<CategoryFilterType>("all");
  const [stockFilter, setStockFilterState] = useState<StockFilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setCurrentPage(1);
  }, []);

  const setCategoryFilter = useCallback((filter: CategoryFilterType) => {
    setCategoryFilterState(filter);
    setCurrentPage(1);
  }, []);

  const setStockFilter = useCallback((filter: StockFilterType) => {
    setStockFilterState(filter);
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQueryState("");
    setCategoryFilterState("all");
    setStockFilterState("all");
    setCurrentPage(1);
  }, []);

  return {
    searchQuery,
    categoryFilter,
    stockFilter,
    currentPage,
    setSearchQuery,
    setCategoryFilter,
    setStockFilter,
    setCurrentPage,
    resetFilters,
  };
}
