"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { ConvexError } from "convex/values";
import Razorpay from "razorpay";
import crypto from "crypto";
import { logger } from "./lib/logger";
import { Id } from "./_generated/dataModel";
import { razorpayCircuitBreaker, withTimeout, PAYMENT_TIMEOUT_MS } from "./lib/circuitBreaker";
import { webhookHandlers, RazorpayEvent } from "./lib/webhookHandlers";

// Constants for security
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB max payload
const MAX_JSON_DEPTH = 10;
const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Determines if we're in test mode based on the Razorpay key prefix.
 * Razorpay test keys start with "rzp_test_", live keys with "rzp_live_".
 */
function isTestMode(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  return keyId.startsWith("rzp_test_");
}

/**
 * Gets the appropriate webhook secret based on environment.
 *
 * Environment variables:
 * - RAZORPAY_WEBHOOK_SECRET_TEST: Secret for test mode webhooks
 * - RAZORPAY_WEBHOOK_SECRET_LIVE: Secret for production webhooks
 * - RAZORPAY_WEBHOOK_SECRET: Legacy fallback (deprecated, for backwards compatibility)
 *
 * The function automatically selects the correct secret based on the
 * RAZORPAY_KEY_ID prefix (rzp_test_ vs rzp_live_).
 */
function getWebhookSecret(): string | undefined {
  if (isTestMode()) {
    // Test mode: prefer test-specific secret, fall back to legacy
    return process.env.RAZORPAY_WEBHOOK_SECRET_TEST || process.env.RAZORPAY_WEBHOOK_SECRET;
  } else {
    // Live mode: prefer live-specific secret, fall back to legacy
    return process.env.RAZORPAY_WEBHOOK_SECRET_LIVE || process.env.RAZORPAY_WEBHOOK_SECRET;
  }
}

/**
 * Type-safe helper to convert validated order ID string to Convex Id type.
 * Use after isValidOrderId() check to satisfy TypeScript without using `as any`.
 */
function toOrderId(orderId: string): Id<"orders"> {
  return orderId as Id<"orders">;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses crypto.timingSafeEqual for secure signature verification.
 */
function secureCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  // Convert hex strings to buffers for comparison
  try {
    const bufferA = Buffer.from(a, "hex");
    const bufferB = Buffer.from(b, "hex");

    // Lengths must match for timingSafeEqual
    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

/**
 * Validates JSON depth to prevent JSON bomb attacks.
 */
function validateJsonDepth(obj: unknown, depth = 0): boolean {
  if (depth > MAX_JSON_DEPTH) return false;
  if (typeof obj !== "object" || obj === null) return true;

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (!validateJsonDepth((obj as Record<string, unknown>)[key], depth + 1)) {
      return false;
    }
  }
  return true;
}

/**
 * Validates Convex order ID format.
 * Returns true if the ID appears to be a valid Convex document ID.
 */
function isValidOrderId(orderId: unknown): boolean {
  if (typeof orderId !== "string") return false;

  // Convex IDs are alphanumeric, typically 20-40 characters
  const convexIdPattern = /^[a-z0-9]+$/;
  if (!convexIdPattern.test(orderId)) return false;
  if (orderId.length < 10 || orderId.length > 50) return false;

  return true;
}

// Initialize Razorpay instance
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new ConvexError({
      code: "CONFIGURATION_ERROR",
      message: "Razorpay credentials not configured",
    });
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// Action: Create Razorpay order
// RESILIENCE: Uses circuit breaker pattern to prevent cascading failures
// DEDUPLICATION: Checks for existing Razorpay order to prevent duplicate payments
// SECURITY: Amount is fetched from database, not client-provided
export const createRazorpayOrder = action({
  args: {
    orderId: v.id("orders"),
    currency: v.optional(v.string()),
    receipt: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()), // Client-provided key for deduplication
  },
  handler: async (ctx, args): Promise<{
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> => {
    // DEDUPLICATION: Check if order already has a Razorpay order ID
    const existingOrder = await ctx.runQuery(internal.orders.getOrderRazorpayStatus, {
      orderId: args.orderId,
    });

    if (!existingOrder) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    // SECURITY: Use server-side amount from database (not client-provided)
    const amountInPaise = Math.round(existingOrder.total * 100);

    // If Razorpay order already exists, return it (idempotent behavior)
    if (existingOrder.razorpayOrderId) {
      logger.info("Returning existing Razorpay order (deduplication)", {
        orderId: args.orderId,
        razorpayOrderId: existingOrder.razorpayOrderId,
      });

      return {
        razorpayOrderId: existingOrder.razorpayOrderId,
        amount: amountInPaise,
        currency: args.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID!,
      };
    }

    // Prevent creating payment for already paid/cancelled orders
    if (existingOrder.paymentStatus === "paid") {
      throw new ConvexError({
        code: "ORDER_ALREADY_PAID",
        message: "This order has already been paid",
      });
    }

    if (existingOrder.orderStatus === "cancelled") {
      throw new ConvexError({
        code: "ORDER_CANCELLED",
        message: "Cannot create payment for a cancelled order",
      });
    }

    // Get Razorpay instance
    const razorpay = getRazorpayInstance();

    // Use circuit breaker with timeout for Razorpay API call
    // PERFORMANCE: Timeout prevents slow Razorpay responses from blocking users
    const result = await razorpayCircuitBreaker.execute(ctx, async () => {
      return withTimeout(
        razorpay.orders.create({
          amount: amountInPaise, // Amount in paise from database
          currency: args.currency || "INR",
          receipt: args.receipt || args.orderId,
          notes: {
            convexOrderId: args.orderId,
            idempotencyKey: args.idempotencyKey || args.orderId,
          },
        }),
        PAYMENT_TIMEOUT_MS,
        "Razorpay order creation"
      );
    });

    if (!result.success) {
      logger.error("Failed to create Razorpay order", {
        error: result.error,
        circuitOpen: result.circuitOpen,
        orderId: args.orderId,
      });

      if (result.circuitOpen) {
        throw new ConvexError({
          code: "SERVICE_UNAVAILABLE",
          message: "Payment service is temporarily unavailable. Please try again in a few moments.",
        });
      }

      throw new ConvexError({
        code: "PAYMENT_ERROR",
        message: "Failed to create payment order. Please try again.",
      });
    }

    const razorpayOrder = result.result;

    // Update order with Razorpay order ID
    await ctx.runMutation(internal.orders.updateRazorpayOrderId, {
      orderId: args.orderId,
      razorpayOrderId: razorpayOrder.id,
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount as number,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  },
});

// Action: Verify Razorpay payment signature
export const verifyPayment = action({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new ConvexError({
        code: "CONFIGURATION_ERROR",
        message: "Razorpay key secret not configured",
      });
    }

    // Verify signature using HMAC-SHA256: order_id|payment_id
    const body = args.razorpayOrderId + "|" + args.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    // Use constant-time comparison to prevent timing attacks
    if (!secureCompare(expectedSignature, args.razorpaySignature)) {
      // Payment verification failed
      await ctx.runMutation(internal.orders.updatePaymentStatus, {
        orderId: args.orderId,
        paymentStatus: "failed",
      });

      logger.error("Payment signature verification failed", {
        orderIdLength: args.orderId.length,
        timestamp: Date.now(),
      });

      return {
        success: false,
        message: "Payment verification failed",
      };
    }

    // Payment verified successfully
    await ctx.runMutation(internal.orders.updatePaymentStatus, {
      orderId: args.orderId,
      paymentStatus: "paid",
      razorpayPaymentId: args.razorpayPaymentId,
    });

    logger.info("Payment verified successfully", {
      orderIdPrefix: args.orderId.substring(0, 8),
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: "Payment verified successfully",
    };
  },
});

/**
 * Internal action for webhook handler
 *
 * Handles Razorpay webhook events with idempotency checks:
 * - payment.captured: Payment successfully captured (auto-capture mode)
 * - payment.failed: Payment failed
 * - order.paid: Order fully paid (recommended for e-commerce)
 * - refund.created: Refund initiated from Razorpay dashboard
 *
 * Security:
 * - Constant-time signature verification (prevents timing attacks)
 * - Payload size and depth validation (prevents DoS)
 * - Order ID format validation (prevents injection)
 * - Idempotent: skips already-processed payments
 */
export const handlePaymentWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
    eventId: v.optional(v.string()), // x-razorpay-event-id for idempotency
  },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string }> => {
    const webhookSecret = getWebhookSecret();
    const isTest = isTestMode();

    if (!webhookSecret) {
      logger.error("Razorpay webhook secret not configured", {
        mode: isTest ? "test" : "live",
        expectedEnvVar: isTest ? "RAZORPAY_WEBHOOK_SECRET_TEST" : "RAZORPAY_WEBHOOK_SECRET_LIVE",
      });
      return { success: false, message: "Webhook secret not configured" };
    }

    // Validate payload size to prevent memory exhaustion
    if (args.payload.length > MAX_PAYLOAD_SIZE) {
      logger.error("Webhook payload too large", {
        size: args.payload.length,
        maxSize: MAX_PAYLOAD_SIZE,
      });
      return { success: false, message: "Payload too large" };
    }

    // Verify webhook signature using constant-time comparison
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(args.payload)
      .digest("hex");

    if (!secureCompare(expectedSignature, args.signature)) {
      logger.error("Invalid webhook signature", {
        signatureLength: args.signature.length,
        timestamp: Date.now(),
      });
      return { success: false, message: "Invalid signature" };
    }

    // IDEMPOTENCY CHECK: If event ID provided, check if already processed
    if (args.eventId) {
      const existingEvent = await ctx.runQuery(internal.webhookEventsInternal.getByEventId, {
        eventId: args.eventId,
      });

      if (existingEvent) {
        logger.debug("Webhook event already processed, skipping", {
          eventId: args.eventId,
          processedAt: existingEvent.processedAt,
        });
        return { success: true, message: "Event already processed (idempotent)" };
      }
    }

    // Parse payload with validation
    let event: RazorpayEvent;

    try {
      event = JSON.parse(args.payload);

      // Validate JSON depth to prevent JSON bomb attacks
      if (!validateJsonDepth(event)) {
        throw new Error("JSON depth exceeds maximum");
      }
    } catch (error) {
      logger.error("Failed to parse webhook payload");
      return { success: false, message: "Invalid payload format" };
    }

    // Validate event timestamp to prevent replay attacks
    if (event.created_at) {
      const eventAge = Date.now() - event.created_at * 1000;
      if (eventAge > WEBHOOK_MAX_AGE_MS) {
        logger.warn("Webhook event too old, possible replay attack", {
          eventAgeMs: eventAge,
          maxAgeMs: WEBHOOK_MAX_AGE_MS,
        });
        return { success: false, message: "Event too old" };
      }
    }

    logger.info("Processing webhook event", { eventType: event.event });

    // Use registry pattern to handle different event types
    const handler = webhookHandlers[event.event];

    if (handler) {
      const result = await handler(ctx, event, logger);

      // Record processed event for idempotency (if event ID was provided)
      if (args.eventId) {
        await ctx.runMutation(internal.webhookEventsInternal.recordProcessedEvent, {
          eventId: args.eventId,
          eventType: event.event,
          success: result.success,
          errorMessage: result.success ? undefined : result.message,
        });
      }

      return result;
    }

    // Handle unknown event type - still record it if event ID provided
    if (args.eventId) {
      await ctx.runMutation(internal.webhookEventsInternal.recordProcessedEvent, {
        eventId: args.eventId,
        eventType: event.event,
        success: true,
        errorMessage: undefined,
      });
    }

    logger.debug("Unhandled webhook event", { eventType: event.event });
    return { success: true, message: `Unhandled event: ${event.event}` };
  },
});
