import { useSiteSettings } from "./useSiteSettings";

/**
 * Hook to get image configuration settings.
 * Now delegates to useSiteSettings (which includes images)
 * instead of making a separate query — saves one WebSocket subscription.
 */
export function useImageSettings() {
  const { images, isLoading } = useSiteSettings();

  return {
    heroUrl: images.heroUrl,
    placeholderUrl: images.placeholderUrl,
    categoryBannerUrl: images.categoryBannerUrl,
    isLoading,
  };
}
