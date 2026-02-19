import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to get image configuration settings from the backend
 * Returns hero URL, placeholder URL, and category banner URL
 */
export function useImageSettings() {
  const imageSettings = useQuery(api.settings.getImageSettings);

  return {
    heroUrl: imageSettings?.heroUrl ?? "",
    placeholderUrl: imageSettings?.placeholderUrl ?? "/placeholder.svg",
    categoryBannerUrl: imageSettings?.categoryBannerUrl ?? "",
    isLoading: imageSettings === undefined,
  };
}
