import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "admin-sidebar-open";

/**
 * Custom hook for managing admin sidebar collapsed/expanded state
 * with localStorage persistence.
 *
 * The state persists across browser sessions so the admin's preference
 * is remembered.
 */
export function useAdminSidebarState() {
  // Initialize state - default to expanded (true) on first visit
  const [isOpen, setIsOpenInternal] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to expanded if no preference saved
    return stored === null ? true : stored === "true";
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  // Wrapper to set open state
  const setIsOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsOpenInternal(value);
  }, []);

  // Toggle helper
  const toggle = useCallback(() => {
    setIsOpenInternal((prev) => !prev);
  }, []);

  return { isOpen, setIsOpen, toggle };
}

export default useAdminSidebarState;
