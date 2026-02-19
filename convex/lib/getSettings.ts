/**
 * Settings Helper Functions
 *
 * Provides convenient typed access to settings from other Convex modules.
 * These helpers wrap the internal settings queries with type safety.
 */

import { internal } from "../_generated/api";
import { MutationCtx, QueryCtx } from "../_generated/server";

// ============================================
// TYPE-SAFE SETTING KEYS
// ============================================

/**
 * All available setting keys.
 * Use these constants to ensure type safety when accessing settings.
 */
export const SETTING_KEYS = {
  // Pricing & Tax
  TAX_RATE: "PRICING.TAX_RATE",

  // Shipping
  FREE_SHIPPING_THRESHOLD: "SHIPPING.FREE_THRESHOLD",
  SHIPPING_COST: "SHIPPING.STANDARD_COST",

  // Cart & Session
  GUEST_CART_EXPIRY: "CART.GUEST_EXPIRY",
  SESSION_TIMEOUT: "CART.SESSION_TIMEOUT",
  MAX_CART_ITEM_QUANTITY: "CART.MAX_ITEM_QUANTITY",

  // Validation
  MIN_WHOLESALE_QUANTITY: "VALIDATION.MIN_WHOLESALE_QUANTITY",
  MAX_NOTES_LENGTH: "VALIDATION.MAX_NOTES_LENGTH",
  MAX_FILE_SIZE: "VALIDATION.MAX_FILE_SIZE",

  // Pagination
  DEFAULT_PAGE_SIZE: "PAGINATION.DEFAULT_PAGE_SIZE",
  MAX_PAGE_SIZE: "PAGINATION.MAX_PAGE_SIZE",
  ADMIN_PAGE_SIZE: "PAGINATION.ADMIN_PAGE_SIZE",

  // Abandoned Cart
  REMINDER_1_DELAY: "ABANDONED_CART.REMINDER_1_DELAY",
  REMINDER_2_DELAY: "ABANDONED_CART.REMINDER_2_DELAY",
  REMINDER_3_DELAY: "ABANDONED_CART.REMINDER_3_DELAY",
  MAX_REMINDERS: "ABANDONED_CART.MAX_REMINDERS",
  CART_AGE_THRESHOLD: "ABANDONED_CART.CART_AGE_THRESHOLD",
  ABANDONED_CART_DISCOUNT: "ABANDONED_CART.DEFAULT_DISCOUNT",

  // Email
  EMAIL_FROM_ORDERS: "EMAIL.FROM_ORDERS",
  EMAIL_FROM_SHIPPING: "EMAIL.FROM_SHIPPING",
  EMAIL_FROM_WHOLESALE: "EMAIL.FROM_WHOLESALE",
  EMAIL_FROM_CART: "EMAIL.FROM_CART",
  EMAIL_SUPPORT: "EMAIL.SUPPORT_ADDRESS",

  // Contact
  WHATSAPP_NUMBER: "CONTACT.WHATSAPP_NUMBER",
  WHATSAPP_URL: "CONTACT.WHATSAPP_URL",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// ============================================
// SETTING ACCESS FUNCTIONS
// ============================================

type ConvexCtx = QueryCtx | MutationCtx;

/**
 * Get a setting value as a string.
 * Returns the database value if exists, otherwise the default from registry.
 */
export async function getSetting(
  ctx: ConvexCtx,
  key: SettingKey
): Promise<string> {
  const value = await ctx.runQuery(internal.settings.getSettingValue, { key });
  return value ?? "";
}

/**
 * Get a setting value as a number.
 * Parses the string value to a number.
 */
export async function getNumericSetting(
  ctx: ConvexCtx,
  key: SettingKey
): Promise<number> {
  const value = await getSetting(ctx, key);
  return parseFloat(value) || 0;
}

/**
 * Get a setting value as a percentage (0-1 stored, returned as-is).
 */
export async function getPercentageSetting(
  ctx: ConvexCtx,
  key: SettingKey
): Promise<number> {
  return getNumericSetting(ctx, key);
}

/**
 * Get a setting value as duration in milliseconds.
 */
export async function getDurationSetting(
  ctx: ConvexCtx,
  key: SettingKey
): Promise<number> {
  return getNumericSetting(ctx, key);
}

/**
 * Get multiple settings at once.
 * More efficient than multiple individual calls.
 */
export async function getSettings(
  ctx: ConvexCtx,
  keys: SettingKey[]
): Promise<Record<SettingKey, string>> {
  const result = await ctx.runQuery(internal.settings.getSettingValues, {
    keys,
  });
  return result as Record<SettingKey, string>;
}

// ============================================
// CONVENIENCE FUNCTIONS FOR COMMON USE CASES
// ============================================

/**
 * Get tax rate as a decimal (e.g., 0.18 for 18%)
 */
export async function getTaxRate(ctx: ConvexCtx): Promise<number> {
  return getNumericSetting(ctx, SETTING_KEYS.TAX_RATE);
}

/**
 * Get shipping configuration
 */
export async function getShippingConfig(ctx: ConvexCtx): Promise<{
  freeThreshold: number;
  standardCost: number;
}> {
  const settings = await getSettings(ctx, [
    SETTING_KEYS.FREE_SHIPPING_THRESHOLD,
    SETTING_KEYS.SHIPPING_COST,
  ]);

  return {
    freeThreshold: parseFloat(settings[SETTING_KEYS.FREE_SHIPPING_THRESHOLD]) || 1000,
    standardCost: parseFloat(settings[SETTING_KEYS.SHIPPING_COST]) || 99,
  };
}

/**
 * Get abandoned cart timing configuration
 */
export async function getAbandonedCartConfig(ctx: ConvexCtx): Promise<{
  reminderDelays: number[];
  maxReminders: number;
  cartAgeThreshold: number;
  defaultDiscount: number;
}> {
  const settings = await getSettings(ctx, [
    SETTING_KEYS.REMINDER_1_DELAY,
    SETTING_KEYS.REMINDER_2_DELAY,
    SETTING_KEYS.REMINDER_3_DELAY,
    SETTING_KEYS.MAX_REMINDERS,
    SETTING_KEYS.CART_AGE_THRESHOLD,
    SETTING_KEYS.ABANDONED_CART_DISCOUNT,
  ]);

  return {
    reminderDelays: [
      parseFloat(settings[SETTING_KEYS.REMINDER_1_DELAY]) || 24 * 60 * 60 * 1000,
      parseFloat(settings[SETTING_KEYS.REMINDER_2_DELAY]) || 48 * 60 * 60 * 1000,
      parseFloat(settings[SETTING_KEYS.REMINDER_3_DELAY]) || 72 * 60 * 60 * 1000,
    ],
    maxReminders: parseFloat(settings[SETTING_KEYS.MAX_REMINDERS]) || 3,
    cartAgeThreshold:
      parseFloat(settings[SETTING_KEYS.CART_AGE_THRESHOLD]) || 24 * 60 * 60 * 1000,
    defaultDiscount:
      parseFloat(settings[SETTING_KEYS.ABANDONED_CART_DISCOUNT]) || 0.1,
  };
}

/**
 * Get email sender addresses
 */
export async function getEmailConfig(ctx: ConvexCtx): Promise<{
  fromOrders: string;
  fromShipping: string;
  fromWholesale: string;
  fromCart: string;
  support: string;
}> {
  const settings = await getSettings(ctx, [
    SETTING_KEYS.EMAIL_FROM_ORDERS,
    SETTING_KEYS.EMAIL_FROM_SHIPPING,
    SETTING_KEYS.EMAIL_FROM_WHOLESALE,
    SETTING_KEYS.EMAIL_FROM_CART,
    SETTING_KEYS.EMAIL_SUPPORT,
  ]);

  return {
    fromOrders: settings[SETTING_KEYS.EMAIL_FROM_ORDERS] || "support@nidhiclothing.com",
    fromShipping: settings[SETTING_KEYS.EMAIL_FROM_SHIPPING] || "support@nidhiclothing.com",
    fromWholesale: settings[SETTING_KEYS.EMAIL_FROM_WHOLESALE] || "support@nidhiclothing.com",
    fromCart: settings[SETTING_KEYS.EMAIL_FROM_CART] || "support@nidhiclothing.com",
    support: settings[SETTING_KEYS.EMAIL_SUPPORT] || "support@nidhiclothing.com",
  };
}

/**
 * Get contact information
 */
export async function getContactConfig(ctx: ConvexCtx): Promise<{
  whatsappNumber: string;
  whatsappUrl: string;
}> {
  const settings = await getSettings(ctx, [
    SETTING_KEYS.WHATSAPP_NUMBER,
    SETTING_KEYS.WHATSAPP_URL,
  ]);

  return {
    whatsappNumber: settings[SETTING_KEYS.WHATSAPP_NUMBER] || "+91 7458 816 343",
    whatsappUrl:
      settings[SETTING_KEYS.WHATSAPP_URL] ||
      "https://wa.me/917458816343?text=Hi,%20I%27m%20interested%20in%20bulk%20purchase.",
  };
}

/**
 * Calculate shipping cost based on settings
 */
export async function calculateShipping(
  ctx: ConvexCtx,
  subtotal: number
): Promise<number> {
  const { freeThreshold, standardCost } = await getShippingConfig(ctx);
  return subtotal >= freeThreshold ? 0 : standardCost;
}

/**
 * Calculate tax based on settings
 */
export async function calculateTax(
  ctx: ConvexCtx,
  subtotal: number
): Promise<number> {
  const taxRate = await getTaxRate(ctx);
  return Math.round(subtotal * taxRate * 100) / 100;
}
