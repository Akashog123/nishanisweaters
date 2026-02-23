import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UseInfiniteProductsArgs {
  category?: string;
  newArrival?: boolean;
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
}

const PAGE_SIZE = 20;

export function useInfiniteProducts(args: UseInfiniteProductsArgs) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lastProcessedCursor = useRef<string | null>(null);

  // Stable key for detecting filter changes (excluding cursor)
  const argsKey = JSON.stringify(args);

  // Reset accumulated state when filters change
  useEffect(() => {
    setCursor(undefined);
    setAllProducts([]);
    lastProcessedCursor.current = null;
    setIsLoadingMore(false);
  }, [argsKey]);

  const queryArgs = useMemo(
    () => ({
      ...args,
      limit: PAGE_SIZE,
      cursor,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [argsKey, cursor]
  );

  const result = useQuery(api.products.listProducts, queryArgs);

  // Process new results when they arrive
  useEffect(() => {
    if (!result) return;

    const cursorKey = cursor ?? "__initial__";
    if (lastProcessedCursor.current === cursorKey) return;

    lastProcessedCursor.current = cursorKey;
    setIsLoadingMore(false);

    if (!cursor) {
      // First page (or reset after filter change)
      setAllProducts(result.products);
    } else {
      // Subsequent pages — append
      setAllProducts((prev) => [...prev, ...result.products]);
    }
  }, [result, cursor]);

  const loadMore = useCallback(() => {
    if (result?.continueCursor && !result?.isDone && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(result.continueCursor);
    }
  }, [result, isLoadingMore]);

  return {
    products: allProducts,
    isLoading: result === undefined && allProducts.length === 0,
    isLoadingMore,
    isDone: result?.isDone ?? false,
    loadMore,
  };
}
