import { useState, useCallback } from 'react';

/**
 * Options for configuring the useTableState hook
 */
export interface UseTableStateOptions<T> {
  /** Initial page size (default: 10) */
  initialPageSize?: number;
  /** Initial sort field */
  initialSortField?: keyof T | null;
  /** Initial sort direction (default: 'asc') */
  initialSortDirection?: 'asc' | 'desc';
  /** Fields to search within when filtering data */
  searchFields?: (keyof T)[];
}

/**
 * Return type for the useTableState hook
 */
export interface TableState<T> {
  // Pagination
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Sorting
  sortField: keyof T | null;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: keyof T) => void;

  // Search/Filter
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Selection
  selectedItems: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: (items: T[]) => boolean;

  // Computed helpers
  paginatedData: <D extends T[]>(data: D) => D;
  filteredData: <D extends T[]>(data: D, customFilter?: (item: T) => boolean) => D;
  sortedData: <D extends T[]>(data: D) => D;
  processData: <D extends T[]>(data: D, customFilter?: (item: T) => boolean) => D;

  // Pagination info
  getTotalPages: (totalItems: number) => number;
  getPaginationInfo: (totalItems: number) => {
    startIndex: number;
    endIndex: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  // Reset helpers
  resetPagination: () => void;
  resetSelection: () => void;
  resetAll: () => void;
}

/**
 * A reusable hook for managing table state including pagination, sorting, search, and selection.
 * Designed to reduce duplication across admin pages with data tables.
 *
 * @example
 * ```tsx
 * interface Product {
 *   _id: string;
 *   name: string;
 *   category: string;
 *   price: number;
 * }
 *
 * const {
 *   currentPage,
 *   setCurrentPage,
 *   searchTerm,
 *   setSearchTerm,
 *   processData,
 *   getPaginationInfo
 * } = useTableState<Product>({
 *   initialPageSize: 10,
 *   searchFields: ['name', 'category']
 * });
 *
 * const displayedProducts = processData(products);
 * const { totalPages, hasNextPage } = getPaginationInfo(products.length);
 * ```
 */
export function useTableState<T extends { _id?: string }>(
  options: UseTableStateOptions<T> = {}
): TableState<T> {
  const {
    initialPageSize = 10,
    initialSortField = null,
    initialSortDirection = 'asc',
    searchFields = [],
  } = options;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Sorting state
  const [sortField, setSortField] = useState<keyof T | null>(initialSortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

  // Search state
  const [searchTerm, setSearchTermState] = useState('');

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Handle search term change and reset pagination
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    setCurrentPage(1);
  }, []);

  // Handle page size change and reset pagination
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Handle sorting
  const handleSort = useCallback((field: keyof T) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('asc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    const allIds = items
      .map((item) => (item as { _id?: string })._id)
      .filter((id): id is string => id !== undefined);
    setSelectedItems(new Set(allIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedItems.has(id),
    [selectedItems]
  );

  const isAllSelected = useCallback(
    (items: T[]) => {
      if (items.length === 0) return false;
      const allIds = items
        .map((item) => (item as { _id?: string })._id)
        .filter((id): id is string => id !== undefined);
      return allIds.every((id) => selectedItems.has(id));
    },
    [selectedItems]
  );

  // Filter data based on search term
  const filteredData = useCallback(
    <D extends T[]>(data: D, customFilter?: (item: T) => boolean): D => {
      let result = [...data] as D;

      if (customFilter) {
        result = result.filter(customFilter) as D;
      }

      if (searchTerm && searchFields.length > 0) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        result = result.filter((item) =>
          searchFields.some((field) => {
            const value = item[field];
            if (typeof value === 'string') {
              return value.toLowerCase().includes(lowerSearchTerm);
            }
            if (typeof value === 'number') {
              return value.toString().includes(lowerSearchTerm);
            }
            return false;
          })
        ) as D;
      }

      return result;
    },
    [searchTerm, searchFields]
  );

  // Sort data
  const sortedData = useCallback(
    <D extends T[]>(data: D): D => {
      if (!sortField) return data;

      const sorted = [...data].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const comparison = String(aValue).localeCompare(String(bValue));
        return sortDirection === 'asc' ? comparison : -comparison;
      });

      return sorted as D;
    },
    [sortField, sortDirection]
  );

  // Paginate data
  const paginatedData = useCallback(
    <D extends T[]>(data: D): D => {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return data.slice(startIndex, endIndex) as D;
    },
    [currentPage, pageSize]
  );

  // Process data: filter -> sort -> paginate
  const processData = useCallback(
    <D extends T[]>(data: D, customFilter?: (item: T) => boolean): D => {
      const filtered = filteredData(data, customFilter);
      const sorted = sortedData(filtered);
      return paginatedData(sorted);
    },
    [filteredData, sortedData, paginatedData]
  );

  // Calculate total pages
  const getTotalPages = useCallback(
    (totalItems: number) => Math.ceil(totalItems / pageSize),
    [pageSize]
  );

  // Get pagination info
  const getPaginationInfo = useCallback(
    (totalItems: number) => {
      const totalPages = getTotalPages(totalItems);
      const startIndex = (currentPage - 1) * pageSize + 1;
      const endIndex = Math.min(currentPage * pageSize, totalItems);

      return {
        startIndex: totalItems > 0 ? startIndex : 0,
        endIndex,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };
    },
    [currentPage, pageSize, getTotalPages]
  );

  // Reset helpers
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const resetAll = useCallback(() => {
    setCurrentPage(1);
    setSearchTermState('');
    setSortField(initialSortField);
    setSortDirection(initialSortDirection);
    setSelectedItems(new Set());
  }, [initialSortField, initialSortDirection]);

  return {
    // Pagination
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize: handleSetPageSize,

    // Sorting
    sortField,
    sortDirection,
    handleSort,

    // Search
    searchTerm,
    setSearchTerm,

    // Selection
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,

    // Computed helpers
    paginatedData,
    filteredData,
    sortedData,
    processData,

    // Pagination info
    getTotalPages,
    getPaginationInfo,

    // Reset helpers
    resetPagination,
    resetSelection,
    resetAll,
  };
}

export default useTableState;
