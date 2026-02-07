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
      fromOrders: result["EMAIL.FROM_ORDERS"] || "orders@nidhisweaters.com",
      fromShipping: result["EMAIL.FROM_SHIPPING"] || "shipping@nidhisweaters.com",
      fromWholesale: result["EMAIL.FROM_WHOLESALE"] || "wholesale@nidhisweaters.com",
      fromCart: result["EMAIL.FROM_CART"] || "cart@nidhisweaters.com",
      support: result["EMAIL.SUPPORT_ADDRESS"] || "support@nidhisweaters.com",
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
