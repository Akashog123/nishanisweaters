/**
 * Settings API - Admin-configurable settings management
 *
 * This module provides:
 * - Admin queries for listing and viewing settings
 * - Admin mutations for updating settings with validation
 * - Internal queries for other modules to read settings
 * - Audit trail for all changes
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./lib/auth";
import {
  SETTINGS_REGISTRY,
  getSettingDefinition,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  type SettingCategory,
} from "./lib/settingsRegistry";
import { validateSettingValue } from "./lib/settingsValidation";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ============================================
// INTERNAL QUERIES (for other backend modules)
// ============================================

/**
 * Get a setting value by key - used internally by other Convex functions
 * Returns the default value if setting not found in database
 */
export const getSettingValue = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (setting) {
      return setting.value;
    }

    // Fallback to registry default
    const registryEntry = getSettingDefinition(args.key);
    return registryEntry?.defaultValue ?? null;
  },
});

/**
 * Get multiple settings at once - more efficient for bulk reads
 * PERFORMANCE: Uses batch fetching and in-memory lookup instead of sequential queries
 */
export const getSettingValues = internalQuery({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, string> = {};

    // PERFORMANCE: Batch fetch all settings at once instead of N sequential queries
    // This reduces database round-trips from O(N) to O(1)
    const allSettings = await ctx.db
      .query("settings")
      .withIndex("by_key")
      .collect();

    // Build a lookup map for O(1) access
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    // Now lookup each key from the map
    for (const key of args.keys) {
      const value = settingsMap.get(key);
      if (value !== undefined) {
        result[key] = value;
      } else {
        // Fallback to registry default
        const registryEntry = getSettingDefinition(key);
        if (registryEntry) {
          result[key] = registryEntry.defaultValue;
        }
      }
    }

    return result;
  },
});

/**
 * Get email configuration for actions
 * This is specifically designed for internalActions that need email settings
 * PERFORMANCE: Uses batch fetching and in-memory lookup instead of sequential queries
 */
export const getEmailConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const keys = [
      "EMAIL.FROM_ORDERS",
      "EMAIL.FROM_SHIPPING",
      "EMAIL.FROM_WHOLESALE",
      "EMAIL.FROM_CART",
      "EMAIL.SUPPORT_ADDRESS",
    ];

    // PERFORMANCE: Batch fetch all email settings at once
    // This reduces database round-trips from 5 to 1
    const allSettings = await ctx.db
      .query("settings")
      .withIndex("by_key")
      .collect();

    // Build a lookup map for O(1) access
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    const result: Record<string, string> = {};

    for (const key of keys) {
      const value = settingsMap.get(key);
      if (value !== undefined) {
        result[key] = value;
      } else {
        const registryEntry = getSettingDefinition(key);
        if (registryEntry) {
          result[key] = registryEntry.defaultValue;
        }
      }
    }

    return {
      fromOrders: result["EMAIL.FROM_ORDERS"] || "support@nidhiclothing.com",
      fromShipping: result["EMAIL.FROM_SHIPPING"] || "support@nidhiclothing.com",
      fromWholesale: result["EMAIL.FROM_WHOLESALE"] || "support@nidhiclothing.com",
      fromCart: result["EMAIL.FROM_CART"] || "support@nidhiclothing.com",
      support: result["EMAIL.SUPPORT_ADDRESS"] || "support@nidhiclothing.com",
    };
  },
});

// ============================================
// PUBLIC QUERIES (no auth required)
// ============================================

/**
 * Get social links for footer display
 * Returns only enabled social links with their URLs
 */
export const getSocialLinks = query({
  args: {},
  handler: async (ctx) => {
    // Batch fetch all social settings in one query (optimized from N+1)
    const allSocialSettings = await ctx.db
      .query("settings")
      .withIndex("by_category", (q) => q.eq("category", "social_links"))
      .collect();

    // Build a map for O(1) lookups
    const settingsMap = new Map(allSocialSettings.map((s) => [s.key, s.value]));

    const platforms = [
      "INSTAGRAM",
      "FACEBOOK",
      "YOUTUBE",
      "WHATSAPP",
      "TWITTER",
      "LINKEDIN",
      "PINTEREST",
      "TELEGRAM",
    ];

    // Map platform to display label
    const labelMap: Record<string, string> = {
      INSTAGRAM: "INSTAGRAM",
      FACEBOOK: "FACEBOOK",
      YOUTUBE: "YOUTUBE",
      WHATSAPP: "WHATSAPP",
      TWITTER: "X/TWITTER",
      LINKEDIN: "LINKEDIN",
      PINTEREST: "PINTEREST",
      TELEGRAM: "TELEGRAM",
    };

    const result: Array<{ platform: string; url: string; label: string }> = [];

    for (const platform of platforms) {
      const url = settingsMap.get(`SOCIAL.${platform}_URL`) || "";
      const enabled = settingsMap.get(`SOCIAL.${platform}_ENABLED`) === "true";

      // Only include if both URL is set and enabled is true
      if (url && enabled) {
        result.push({
          platform: platform.toLowerCase(),
          url,
          label: labelMap[platform] || platform,
        });
      }
    }

    return result;
  },
});

/**
 * Get image configuration for frontend use
 * Returns hero URL, placeholder URL, and category banner URL
 */
export const getImageSettings = query({
  args: {},
  handler: async (ctx) => {
    // Batch fetch all image settings at once
    const allSettings = await ctx.db
      .query("settings")
      .withIndex("by_category", (q) => q.eq("category", "images"))
      .collect();

    // Build a map for O(1) lookups
    const settingsMap = new Map(allSettings.map((s) => [s.key, s.value]));

    const keys = ["IMAGES.HERO_URL", "IMAGES.PLACEHOLDER_URL", "IMAGES.CATEGORY_BANNER_URL"];
    const result: Record<string, string> = {};

    for (const key of keys) {
      const value = settingsMap.get(key);
      if (value !== undefined) {
        result[key] = value;
      } else {
        // Fallback to registry default
        const registryEntry = getSettingDefinition(key);
        if (registryEntry) {
          result[key] = registryEntry.defaultValue;
        }
      }
    }

    return {
      heroUrl: result["IMAGES.HERO_URL"] || "",
      placeholderUrl: result["IMAGES.PLACEHOLDER_URL"] || "/placeholder.svg",
      categoryBannerUrl: result["IMAGES.CATEGORY_BANNER_URL"] || "",
    };
  },
});

/**
 * Get all public settings at once - optimized single query for frontend
 * Returns branding, content, display, business info, and legal settings
 */
export const getAllPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all settings from database
    const allSettings = await ctx.db.query("settings").collect();
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    // Helper to get value with fallback to registry default
    const getValue = (key: string): string => {
      const value = settingsMap.get(key);
      const registryEntry = getSettingDefinition(key);
      return value ?? registryEntry?.defaultValue ?? "";
    };

    return {
      branding: {
        siteName: getValue("BRANDING.SITE_NAME"),
        logoUrl: getValue("BRANDING.LOGO_URL"),
        copyrightYear: getValue("BRANDING.COPYRIGHT_YEAR"),
      },
      hero: {
        badgeText: getValue("HERO.BADGE_TEXT"),
        heading: getValue("HERO.HEADING"),
        description: getValue("HERO.DESCRIPTION"),
        ctaText: getValue("HERO.CTA_TEXT"),
      },
      footer: {
        tagline: getValue("FOOTER.TAGLINE"),
        backgroundText: getValue("FOOTER.BACKGROUND_TEXT"),
      },
      businessInfo: {
        establishedYear: getValue("BUSINESS.ESTABLISHED_YEAR"),
        location: getValue("BUSINESS.LOCATION"),
        customersCount: getValue("BUSINESS.CUSTOMERS_COUNT"),
        yearsExperience: getValue("BUSINESS.YEARS_EXPERIENCE"),
        qualityGuarantee: getValue("BUSINESS.QUALITY_GUARANTEE"),
        responseTime: getValue("BUSINESS.RESPONSE_TIME"),
        hoursWeekdays: getValue("BUSINESS.HOURS_WEEKDAYS"),
        hoursWeekends: getValue("BUSINESS.HOURS_WEEKENDS"),
      },
      displayLimits: {
        newArrivalsLimit: parseInt(getValue("DISPLAY.NEW_ARRIVALS_LIMIT")) || 4,
        bestSellersLimit: parseInt(getValue("DISPLAY.BEST_SELLERS_LIMIT")) || 3,
        winterWearLimit: parseInt(getValue("DISPLAY.WINTER_WEAR_LIMIT")) || 6,
        relatedProductsLimit: parseInt(getValue("DISPLAY.RELATED_PRODUCTS_LIMIT")) || 6,
        bulkOrderLimit: parseInt(getValue("DISPLAY.BULK_ORDER_LIMIT")) || 100,
      },
      legal: {
        privacyPolicyTitle: getValue("LEGAL.PRIVACY_POLICY_TITLE"),
        privacyPolicyContent: getValue("LEGAL.PRIVACY_POLICY_CONTENT"),
        privacyPolicyEditedAt: getValue("LEGAL.PRIVACY_POLICY_EDITED_AT"),
        termsOfServiceTitle: getValue("LEGAL.TERMS_OF_SERVICE_TITLE"),
        termsOfServiceContent: getValue("LEGAL.TERMS_OF_SERVICE_CONTENT"),
        termsOfServiceEditedAt: getValue("LEGAL.TERMS_OF_SERVICE_EDITED_AT"),
      },
      categories: {
        enableDynamic: getValue("CATEGORIES.ENABLE_DYNAMIC"),
        showInHeader: getValue("CATEGORIES.SHOW_IN_HEADER"),
        newArrivalsCategory: getValue("CATEGORIES.NEW_ARRIVALS_CATEGORY"),
        winterWearCategory: getValue("CATEGORIES.WINTER_WEAR_CATEGORY"),
      },
    };
  },
});

/**
 * Get legal settings specifically - returns legal page content with auto-captured edit dates
 */
export const getLegalSettings = query({
  args: {},
  handler: async (ctx) => {
    const keys = [
      "LEGAL.PRIVACY_POLICY_TITLE",
      "LEGAL.PRIVACY_POLICY_CONTENT",
      "LEGAL.PRIVACY_POLICY_EDITED_AT",
      "LEGAL.TERMS_OF_SERVICE_TITLE",
      "LEGAL.TERMS_OF_SERVICE_CONTENT",
      "LEGAL.TERMS_OF_SERVICE_EDITED_AT",
    ];

    const allSettings = await ctx.db.query("settings").collect();
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    const result: Record<string, string> = {};
    for (const key of keys) {
      const value = settingsMap.get(key);
      const registryEntry = getSettingDefinition(key);
      result[key] = value ?? registryEntry?.defaultValue ?? "";
    }

    return {
      privacyPolicyTitle: result["LEGAL.PRIVACY_POLICY_TITLE"] || "Privacy Policy",
      privacyPolicyContent: result["LEGAL.PRIVACY_POLICY_CONTENT"] || "",
      privacyPolicyEditedAt: result["LEGAL.PRIVACY_POLICY_EDITED_AT"] || "",
      termsOfServiceTitle: result["LEGAL.TERMS_OF_SERVICE_TITLE"] || "Terms of Service",
      termsOfServiceContent: result["LEGAL.TERMS_OF_SERVICE_CONTENT"] || "",
      termsOfServiceEditedAt: result["LEGAL.TERMS_OF_SERVICE_EDITED_AT"] || "",
    };
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

/**
 * List all settings with category metadata
 * Merges database values with registry definitions
 */
export const listSettings = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Get all settings from database
    const dbSettings = await ctx.db.query("settings").collect();

    // Create a map for quick lookup
    const dbSettingsMap = new Map(dbSettings.map((s) => [s.key, s]));

    // Merge with registry to ensure all settings are present
    const allSettings = SETTINGS_REGISTRY.filter(
      (reg) => !args.category || reg.category === args.category
    ).map((reg) => {
      const dbSetting = dbSettingsMap.get(reg.key);
      return {
        ...reg,
        _id: dbSetting?._id,
        value: dbSetting?.value ?? reg.defaultValue,
        isFromDatabase: !!dbSetting,
        isModified: dbSetting
          ? dbSetting.value !== reg.defaultValue
          : false,
        updatedAt: dbSetting?.updatedAt,
        updatedBy: dbSetting?.updatedBy,
      };
    });

    // Sort by category and then by display order
    allSettings.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.displayOrder - b.displayOrder;
    });

    // Get category metadata
    const categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      key: key as SettingCategory,
      label,
      description: CATEGORY_DESCRIPTIONS[key as SettingCategory],
      icon: CATEGORY_ICONS[key as SettingCategory],
      settingsCount: allSettings.filter((s) => s.category === key).length,
      modifiedCount: allSettings.filter(
        (s) => s.category === key && s.isModified
      ).length,
    }));

    return {
      settings: allSettings,
      categories,
      totalCount: allSettings.length,
      modifiedCount: allSettings.filter((s) => s.isModified).length,
    };
  },
});

/**
 * Get a single setting with full details
 */
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const dbSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const registryEntry = getSettingDefinition(args.key);

    if (!registryEntry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Setting ${args.key} not found in registry`,
      });
    }

    return {
      ...registryEntry,
      _id: dbSetting?._id,
      value: dbSetting?.value ?? registryEntry.defaultValue,
      isFromDatabase: !!dbSetting,
      isModified: dbSetting
        ? dbSetting.value !== registryEntry.defaultValue
        : false,
      updatedAt: dbSetting?.updatedAt,
      updatedBy: dbSetting?.updatedBy,
    };
  },
});

/**
 * Get settings history for a specific setting
 */
export const getSettingHistory = query({
  args: {
    settingKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 50;

    const history = await ctx.db
      .query("settingsHistory")
      .withIndex("by_setting_key", (q) => q.eq("settingKey", args.settingKey))
      .order("desc")
      .take(limit);

    return history;
  },
});

/**
 * Get recent settings changes across all settings (for dashboard)
 */
export const getRecentChanges = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 20;

    const history = await ctx.db
      .query("settingsHistory")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Enrich with setting labels
    const enrichedHistory = history.map((h) => {
      const reg = getSettingDefinition(h.settingKey);
      return {
        ...h,
        settingLabel: reg?.label ?? h.settingKey,
        settingCategory: reg?.category,
        categoryLabel: reg
          ? CATEGORY_LABELS[reg.category]
          : undefined,
      };
    });

    return enrichedHistory;
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Admin user information for audit trail
 */
interface AdminInfo {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Internal helper to update a single setting with validation and history tracking
 * Shared by both updateSetting and updateSettings mutations
 */
async function updateSettingInternal(
  ctx: MutationCtx,
  key: string,
  value: string,
  admin: AdminInfo,
  reason: string | undefined,
  now: number
): Promise<boolean> {
  // Validate against registry
  const registryEntry = getSettingDefinition(key);
  if (!registryEntry) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: `Setting ${key} not found in registry`,
    });
  }

  // Validate value based on type
  validateSettingValue(registryEntry, value);

  // Get existing setting
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  const previousValue = existing?.value ?? registryEntry.defaultValue;

  // Skip if value hasn't changed
  if (previousValue === value) {
    return false;
  }

  // Prepare admin name for history
  const adminName =
    `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || undefined;

  let settingId: Id<"settings">;

  if (existing) {
    // Update existing setting
    await ctx.db.patch(existing._id, {
      value,
      updatedAt: now,
      updatedBy: admin.clerkId,
    });
    settingId = existing._id;
  } else {
    // Create new setting entry
    settingId = await ctx.db.insert("settings", {
      key,
      label: registryEntry.label,
      description: registryEntry.description,
      category: registryEntry.category,
      valueType: registryEntry.valueType,
      value,
      defaultValue: registryEntry.defaultValue,
      minValue: registryEntry.minValue,
      maxValue: registryEntry.maxValue,
      displayOrder: registryEntry.displayOrder,
      affectedAreas: registryEntry.affectedAreas,
      isActive: true,
      updatedAt: now,
      updatedBy: admin.clerkId,
    });
  }

  // Record history
  await ctx.db.insert("settingsHistory", {
    settingId,
    settingKey: key,
    previousValue,
    newValue: value,
    changedBy: admin.clerkId,
    changedByEmail: admin.email,
    changedByName: adminName,
    changeReason: reason,
    timestamp: now,
  });

  // Auto-capture edit date for legal content pages
  if (key === "LEGAL.PRIVACY_POLICY_CONTENT" || key === "LEGAL.TERMS_OF_SERVICE_CONTENT") {
    const editedAtKey = key.replace("_CONTENT", "_EDITED_AT");

    // Check if _EDITED_AT setting exists
    const editedAtSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", q => q.eq("key", editedAtKey))
      .first();

    if (editedAtSetting) {
      // Update existing timestamp
      await ctx.db.patch(editedAtSetting._id, {
        value: new Date(now).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        updatedAt: now,
      });
    } else {
      // Create new timestamp setting
      const registryEntry = getSettingDefinition(editedAtKey);
      if (registryEntry) {
        await ctx.db.insert("settings", {
          key: editedAtKey,
          label: registryEntry.label,
          description: registryEntry.description,
          category: registryEntry.category,
          valueType: registryEntry.valueType,
          value: new Date(now).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          defaultValue: registryEntry.defaultValue,
          minValue: registryEntry.minValue,
          maxValue: registryEntry.maxValue,
          displayOrder: registryEntry.displayOrder,
          affectedAreas: registryEntry.affectedAreas,
          isActive: true,
          updatedAt: now,
          updatedBy: admin.clerkId,
        });
      }
    }
  }

  return true;
}

// ============================================
// ADMIN MUTATIONS
// ============================================

/**
 * Update a single setting
 */
export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    const changed = await updateSettingInternal(
      ctx,
      args.key,
      args.value,
      admin,
      args.reason,
      now
    );

    return { success: true, changed };
  },
});

/**
 * Update multiple settings at once (batch update)
 */
export const updateSettings = mutation({
  args: {
    updates: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
      })
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    // Validate all settings first (fail fast before any updates)
    for (const update of args.updates) {
      const registryEntry = getSettingDefinition(update.key);
      if (!registryEntry) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: `Setting ${update.key} not found in registry`,
        });
      }
      validateSettingValue(registryEntry, update.value);
    }

    let updatedCount = 0;

    // Apply all updates using the shared helper
    for (const update of args.updates) {
      const changed = await updateSettingInternal(
        ctx,
        update.key,
        update.value,
        admin,
        args.reason,
        now
      );

      if (changed) {
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  },
});

/**
 * Reset a setting to its default value
 */
export const resetSetting = mutation({
  args: {
    key: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    const registryEntry = getSettingDefinition(args.key);
    if (!registryEntry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Setting ${args.key} not found in registry`,
      });
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing && existing.value !== registryEntry.defaultValue) {
      // Record history before reset
      await ctx.db.insert("settingsHistory", {
        settingId: existing._id,
        settingKey: args.key,
        previousValue: existing.value,
        newValue: registryEntry.defaultValue,
        changedBy: admin.clerkId,
        changedByEmail: admin.email,
        changedByName:
          `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || undefined,
        changeReason: args.reason || "Reset to default",
        timestamp: now,
      });

      // Update to default
      await ctx.db.patch(existing._id, {
        value: registryEntry.defaultValue,
        updatedAt: now,
        updatedBy: admin.clerkId,
      });

      return { success: true, reset: true };
    }

    return { success: true, reset: false };
  },
});

/**
 * Reset all settings in a category to defaults
 */
export const resetCategory = mutation({
  args: {
    category: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    // Get all settings in category from registry
    const categorySettings = SETTINGS_REGISTRY.filter(
      (s) => s.category === args.category
    );

    if (categorySettings.length === 0) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Category ${args.category} not found`,
      });
    }

    let resetCount = 0;

    for (const reg of categorySettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", reg.key))
        .first();

      if (existing && existing.value !== reg.defaultValue) {
        await ctx.db.insert("settingsHistory", {
          settingId: existing._id,
          settingKey: reg.key,
          previousValue: existing.value,
          newValue: reg.defaultValue,
          changedBy: admin.clerkId,
          changedByEmail: admin.email,
          changedByName:
            `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() ||
            undefined,
          changeReason: args.reason || `Reset ${args.category} to defaults`,
          timestamp: now,
        });

        await ctx.db.patch(existing._id, {
          value: reg.defaultValue,
          updatedAt: now,
          updatedBy: admin.clerkId,
        });

        resetCount++;
      }
    }

    return { success: true, resetCount };
  },
});

// ============================================
// CATEGORY MANAGEMENT (CRUD + Delete Protection)
// ============================================

/**
 * Get all settings categories (combines registry with database)
 */
export const getSettingsCategories = query({
  args: {},
  handler: async (ctx) => {
    // Get custom categories from database
    const dbCategories = await ctx.db
      .query("settingsCategories")
      .order("asc")
      .collect();

    // Build registry categories map
    const registryCategories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      key,
      label,
      description: CATEGORY_DESCRIPTIONS[key as SettingCategory] || "",
      icon: CATEGORY_ICONS[key as SettingCategory] || "Settings",
      isSystem: true,
      displayOrder: SETTINGS_REGISTRY.filter(s => s.category === key).length > 0
        ? Math.min(...SETTINGS_REGISTRY.filter(s => s.category === key).map(s => s.displayOrder))
        : 999,
    }));

    // Merge: database categories override registry ones
    const merged = new Map(registryCategories.map(c => [c.key, c]));
    for (const dbCat of dbCategories) {
      merged.set(dbCat.key, {
        key: dbCat.key,
        label: dbCat.label,
        description: dbCat.description,
        icon: dbCat.icon,
        isSystem: dbCat.isSystem,
        displayOrder: dbCat.displayOrder,
      });
    }

    // Return sorted by displayOrder
    return Array.from(merged.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * Get category usage info (for delete protection UI)
 */
export const getCategoryUsage = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Count products using this category
    const productsWithCategory = await ctx.db
      .query("products")
      .filter(q => q.eq(q.field("category"), args.key))
      .collect();

    // Count settings in this category
    const settingsCount = await ctx.db
      .query("settings")
      .filter(q => q.eq(q.field("category"), args.key))
      .collect();

    return {
      canDelete: productsWithCategory.length === 0,
      productCount: productsWithCategory.length,
      settingsCount: settingsCount.length,
      productNames: productsWithCategory.slice(0, 5).map(p => p.name),
    };
  },
});

/**
 * Create a new settings category
 */
export const createSettingsCategory = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    description: v.string(),
    icon: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if key already exists
    const existing = await ctx.db
      .query("settingsCategories")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (existing) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Category with this key already exists",
      });
    }

    // Also check if it's a registry category
    const registryCategories = Object.keys(CATEGORY_LABELS);
    if (registryCategories.includes(args.key)) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Cannot create category with reserved registry key",
      });
    }

    const now = Date.now();

    await ctx.db.insert("settingsCategories", {
      ...args,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Update a settings category
 */
export const updateSettingsCategory = mutation({
  args: {
    key: v.string(),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const category = await ctx.db
      .query("settingsCategories")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (!category) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    if (category.isSystem) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot modify system category",
      });
    }

    await ctx.db.patch(category._id, {
      ...(args.label && { label: args.label }),
      ...(args.description && { description: args.description }),
      ...(args.icon && { icon: args.icon }),
      ...(args.displayOrder !== undefined && { displayOrder: args.displayOrder }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a settings category with product protection
 */
export const deleteSettingsCategory = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const category = await ctx.db
      .query("settingsCategories")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (!category) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    if (category.isSystem) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot delete system category",
      });
    }

    // Check for products using this category
    const productsWithCategory = await ctx.db
      .query("products")
      .filter(q => q.eq(q.field("category"), args.key))
      .collect();

    if (productsWithCategory.length > 0) {
      throw new ConvexError({
        code: "CONFLICT",
        message: `Cannot delete category with ${productsWithCategory.length} products. Please reassign or remove products first.`,
      });
    }

    // Delete associated settings
    const settingsInCategory = await ctx.db
      .query("settings")
      .filter(q => q.eq(q.field("category"), args.key))
      .collect();

    for (const setting of settingsInCategory) {
      await ctx.db.delete(setting._id);
    }

    await ctx.db.delete(category._id);

    return { success: true, deletedSettingsCount: settingsInCategory.length };
  },
});
