/**
 * Internal Rate Limiting Mutations
 *
 * This module provides internal mutations for rate limiting that can be called
 * from HTTP actions. Since httpAction provides ActionCtx (not MutationCtx),
 * we need these wrapper mutations to use the distributed rate limiter.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { consumeRateLimit, RATE_LIMIT_CONFIGS } from "./lib/rateLimit";

/**
 * Consume a rate limit slot for webhook requests.
 * Called from HTTP action handlers to enforce distributed rate limiting.
 *
 * @param identifier - Unique identifier for the rate limit (typically IP address)
 * @param ipAddress - Optional IP address for logging violations
 * @returns Rate limit result with allowed status and remaining requests
 */
export const consumeWebhookRateLimit = internalMutation({
  args: {
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await consumeRateLimit(
      ctx,
      `webhook:${args.identifier}`,
      RATE_LIMIT_CONFIGS.webhook,
      args.ipAddress
    );
  },
});

/**
 * Consume a rate limit slot for API requests.
 * Can be used for other HTTP endpoints that need rate limiting.
 */
export const consumeApiRateLimit = internalMutation({
  args: {
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await consumeRateLimit(
      ctx,
      `api:${args.identifier}`,
      RATE_LIMIT_CONFIGS.api,
      args.ipAddress
    );
  },
});

/**
 * Consume a rate limit slot for authentication attempts.
 * Use for login/signup endpoints to prevent brute force attacks.
 */
export const consumeAuthRateLimit = internalMutation({
  args: {
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await consumeRateLimit(
      ctx,
      `auth:${args.identifier}`,
      RATE_LIMIT_CONFIGS.auth,
      args.ipAddress
    );
  },
});
