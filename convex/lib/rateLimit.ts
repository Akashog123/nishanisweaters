/**
 * Distributed Rate Limiting Utility
 *
 * Provides rate limiting that works across all Convex instances using
 * the database as the source of truth. Uses sliding window algorithm.
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { logRateLimitViolation } from "./securityLogger";

// ============================================
// TYPES
// ============================================

export type RateLimitCategory = "webhook" | "api" | "auth" | "mutation";

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Category for different rate limit rules */
  category: RateLimitCategory;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  currentCount: number;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const RATE_LIMIT_CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
  webhook: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    category: "webhook",
  },
  api: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1000 requests per minute
    category: "api",
  },
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 auth attempts per minute
    category: "auth",
  },
  mutation: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 mutations per minute
    category: "mutation",
  },
};

// ============================================
// RATE LIMITING FUNCTIONS
// ============================================

/**
 * Check if a request is allowed under rate limiting.
 * This is a read-only check that doesn't increment the counter.
 */
export async function checkRateLimit(
  ctx: QueryCtx,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Find existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (!existing || existing.windowStart < windowStart) {
    // No record or window expired - request is allowed
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      currentCount: 0,
    };
  }

  const allowed = existing.requestCount < config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - existing.requestCount - 1),
    resetAt: existing.windowStart + config.windowMs,
    currentCount: existing.requestCount,
  };
}

/**
 * Check and consume a rate limit slot.
 * Returns whether the request is allowed and updates the counter.
 */
export async function consumeRateLimit(
  ctx: MutationCtx,
  identifier: string,
  config: RateLimitConfig,
  ipAddress?: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Find existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  if (!existing) {
    // Create new record
    await ctx.db.insert("rateLimits", {
      identifier,
      category: config.category,
      windowStart: now,
      requestCount: 1,
      lastRequest: now,
      expiresAt: now + config.windowMs * 2, // Keep for 2 windows for cleanup
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      currentCount: 1,
    };
  }

  // Check if window has expired
  if (existing.windowStart < windowStart) {
    // Reset the window
    await ctx.db.patch(existing._id, {
      windowStart: now,
      requestCount: 1,
      lastRequest: now,
      expiresAt: now + config.windowMs * 2,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      currentCount: 1,
    };
  }

  // Window is still active
  const newCount = existing.requestCount + 1;
  const allowed = newCount <= config.maxRequests;

  if (allowed) {
    // Increment counter
    await ctx.db.patch(existing._id, {
      requestCount: newCount,
      lastRequest: now,
    });
  } else {
    // Rate limit exceeded - log the violation
    await logRateLimitViolation(
      ctx,
      identifier,
      {
        category: config.category,
        currentCount: newCount,
        maxAllowed: config.maxRequests,
        windowMs: config.windowMs,
      },
      ipAddress
    );
  }

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - newCount),
    resetAt: existing.windowStart + config.windowMs,
    currentCount: newCount,
  };
}

/**
 * Create a rate limiter for a specific category with a custom identifier prefix.
 */
export function createRateLimiter(category: RateLimitCategory, customConfig?: Partial<RateLimitConfig>) {
  const config: RateLimitConfig = {
    ...RATE_LIMIT_CONFIGS[category],
    ...customConfig,
    category,
  };

  return {
    /**
     * Check if request is allowed (read-only).
     */
    check: (ctx: QueryCtx, identifier: string) =>
      checkRateLimit(ctx, `${category}:${identifier}`, config),

    /**
     * Check and consume a rate limit slot.
     */
    consume: (ctx: MutationCtx, identifier: string, ipAddress?: string) =>
      consumeRateLimit(ctx, `${category}:${identifier}`, config, ipAddress),
  };
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================

export const webhookRateLimiter = createRateLimiter("webhook");
export const apiRateLimiter = createRateLimiter("api");
export const authRateLimiter = createRateLimiter("auth");
export const mutationRateLimiter = createRateLimiter("mutation");
