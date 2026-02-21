import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to get all public site settings from the backend
 * Returns branding, content, display limits, business info, and legal settings
 */
export function useSiteSettings() {
  const settings = useQuery(api.settings.getAllPublicSettings);

  return {
    // Branding settings
    siteName: settings?.branding?.siteName ?? "NIDHI CLOTHING CO.",
    logoUrl: settings?.branding?.logoUrl ?? "/Logo.png",
    copyrightYear: settings?.branding?.copyrightYear ?? "2025",

    // Hero content
    heroBadgeText: settings?.hero?.badgeText ?? "YEAR-END SALE",
    heroHeading: settings?.hero?.heading ?? "NIDHI CLOTHING CO.\nSIGNATURES 25% OFF",
    heroDescription: settings?.hero?.description ?? "Redefine your look with 25% off for all NIDHI CLOTHING CO. Signatures outfit",
    heroCtaText: settings?.hero?.ctaText ?? "Explore",

    // Footer content
    footerTagline: settings?.footer?.tagline ?? "Made by OG",
    footerBackgroundText: settings?.footer?.backgroundText ?? "DESIGNED FOR THE BOLD.",

    // Business info
    establishedYear: settings?.businessInfo?.establishedYear ?? "2013",
    businessLocation: settings?.businessInfo?.location ?? "Sikandarpur, Uttarpradesh",
    customersCount: settings?.businessInfo?.customersCount ?? "10K+",
    yearsExperience: settings?.businessInfo?.yearsExperience ?? "40+",
    qualityGuarantee: settings?.businessInfo?.qualityGuarantee ?? "100%",
    responseTime: settings?.businessInfo?.responseTime ?? "We respond within 24 hours",
    hoursWeekdays: settings?.businessInfo?.hoursWeekdays ?? "10:00 AM - 6:00 PM",
    hoursWeekends: settings?.businessInfo?.hoursWeekends ?? "Closed",

    // Display limits
    newArrivalsLimit: settings?.displayLimits?.newArrivalsLimit ?? 4,
    bestSellersLimit: settings?.displayLimits?.bestSellersLimit ?? 3,
    winterWearLimit: settings?.displayLimits?.winterWearLimit ?? 6,
    relatedProductsLimit: settings?.displayLimits?.relatedProductsLimit ?? 6,
    bulkOrderLimit: settings?.displayLimits?.bulkOrderLimit ?? 100,

    // Legal settings
    privacyPolicyTitle: settings?.legal?.privacyPolicyTitle ?? "Privacy Policy",
    privacyPolicyContent: settings?.legal?.privacyPolicyContent ?? "",
    privacyPolicyEditedAt: settings?.legal?.privacyPolicyEditedAt ?? "",
    termsOfServiceTitle: settings?.legal?.termsOfServiceTitle ?? "Terms of Service",
    termsOfServiceContent: settings?.legal?.termsOfServiceContent ?? "",
    termsOfServiceEditedAt: settings?.legal?.termsOfServiceEditedAt ?? "",

    // Category settings
    settings: settings?.categories ?? {
      enableDynamic: "false",
      showInHeader: "new-arrival,mens,womens,kids,winter",
      newArrivalsCategory: "new-arrival",
      winterWearCategory: "winter",
    },

    // Loading state
    isLoading: settings === undefined,
  };
}

/**
 * Hook to get legal page settings specifically
 * Returns privacy policy and terms of service content with edit dates
 */
export function useLegalSettings() {
  const legalSettings = useQuery(api.settings.getLegalSettings);

  return {
    privacyPolicyTitle: legalSettings?.privacyPolicyTitle ?? "Privacy Policy",
    privacyPolicyContent: legalSettings?.privacyPolicyContent ?? "",
    privacyPolicyEditedAt: legalSettings?.privacyPolicyEditedAt ?? "",
    termsOfServiceTitle: legalSettings?.termsOfServiceTitle ?? "Terms of Service",
    termsOfServiceContent: legalSettings?.termsOfServiceContent ?? "",
    termsOfServiceEditedAt: legalSettings?.termsOfServiceEditedAt ?? "",
    isLoading: legalSettings === undefined,
  };
}

/**
 * Hook to get settings categories for admin UI
 */
export function useSettingsCategories() {
  const categories = useQuery(api.settings.getSettingsCategories);

  return {
    categories: categories ?? [],
    isLoading: categories === undefined,
  };
}
