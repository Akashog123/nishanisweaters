/**
 * Circuit Breaker State Persistence
 *
 * Internal mutations and queries for persisting circuit breaker state
 * in the Convex database. This enables distributed circuit breaker behavior
 * across all Convex instances.
 *
 * Note: Circuit breaker state is stored in the settings table using a
 * specific key prefix to avoid adding a new table.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Key prefix for circuit breaker state in settings
const CB_KEY_PREFIX = "CIRCUIT_BREAKER.";

// Default state for new circuit breakers
const DEFAULT_STATE = {
  state: "closed" as const,
  failureCount: 0,
  successCount: 0,
  lastFailureTime: null as number | null,
  lastSuccessTime: null as number | null,
  lastStateChange: Date.now(),
};

/**
 * Get the current circuit breaker state for a service.
 */
export const getState = internalQuery({
  args: {
    serviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `${CB_KEY_PREFIX}${args.serviceName}`;

    // Try to get existing state from settings
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!setting) {
      return {
        serviceName: args.serviceName,
        ...DEFAULT_STATE,
      };
    }

    try {
      const parsed = JSON.parse(setting.value);
      return {
        serviceName: args.serviceName,
        state: parsed.state || "closed",
        failureCount: parsed.failureCount || 0,
        successCount: parsed.successCount || 0,
        lastFailureTime: parsed.lastFailureTime || null,
        lastSuccessTime: parsed.lastSuccessTime || null,
        lastStateChange: parsed.lastStateChange || Date.now(),
      };
    } catch {
      return {
        serviceName: args.serviceName,
        ...DEFAULT_STATE,
      };
    }
  },
});

/**
 * Update the circuit breaker state for a service.
 */
export const setState = internalMutation({
  args: {
    serviceName: v.string(),
    state: v.union(v.literal("closed"), v.literal("open"), v.literal("half_open")),
    failureCount: v.number(),
    successCount: v.number(),
    lastFailureTime: v.union(v.number(), v.null()),
    lastSuccessTime: v.union(v.number(), v.null()),
    lastStateChange: v.number(),
  },
  handler: async (ctx, args) => {
    const key = `${CB_KEY_PREFIX}${args.serviceName}`;
    const now = Date.now();

    // Serialize state to JSON
    const value = JSON.stringify({
      state: args.state,
      failureCount: args.failureCount,
      successCount: args.successCount,
      lastFailureTime: args.lastFailureTime,
      lastSuccessTime: args.lastSuccessTime,
      lastStateChange: args.lastStateChange,
    });

    // Check if setting exists
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: now,
      });
    } else {
      // Create new setting for circuit breaker state
      await ctx.db.insert("settings", {
        key,
        label: `Circuit Breaker: ${args.serviceName}`,
        description: `Circuit breaker state for ${args.serviceName} external service`,
        category: "validation", // Using existing category
        valueType: "string",
        value,
        defaultValue: JSON.stringify(DEFAULT_STATE),
        displayOrder: 999, // Low priority in display
        affectedAreas: ["payments", "integrations"],
        isActive: true,
        updatedAt: now,
        updatedBy: "system",
      });
    }
  },
});

/**
 * Reset a circuit breaker to closed state.
 * Useful for manual intervention.
 */
export const resetCircuit = internalMutation({
  args: {
    serviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `${CB_KEY_PREFIX}${args.serviceName}`;
    const now = Date.now();

    const value = JSON.stringify({
      ...DEFAULT_STATE,
      lastStateChange: now,
    });

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: now,
      });
    }

    return { success: true, serviceName: args.serviceName };
  },
});

/**
 * Get all circuit breaker states for monitoring dashboard.
 */
export const getAllStates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("settings")
      .collect();

    const circuitBreakerSettings = settings.filter(
      (s) => s.key.startsWith(CB_KEY_PREFIX)
    );

    return circuitBreakerSettings.map((setting) => {
      const serviceName = setting.key.replace(CB_KEY_PREFIX, "");
      try {
        const parsed = JSON.parse(setting.value);
        return {
          serviceName,
          state: parsed.state || "closed",
          failureCount: parsed.failureCount || 0,
          successCount: parsed.successCount || 0,
          lastFailureTime: parsed.lastFailureTime,
          lastSuccessTime: parsed.lastSuccessTime,
          lastStateChange: parsed.lastStateChange,
          updatedAt: setting.updatedAt,
        };
      } catch {
        return {
          serviceName,
          state: "closed",
          failureCount: 0,
          successCount: 0,
          lastFailureTime: null,
          lastSuccessTime: null,
          lastStateChange: Date.now(),
          updatedAt: setting.updatedAt,
        };
      }
    });
  },
});
