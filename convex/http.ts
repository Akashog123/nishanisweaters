/**
 * Convex HTTP Router
 *
 * Exposes HTTP endpoints for external webhooks and health checks.
 * These endpoints are accessible at: https://<your-deployment>.convex.site/<path>
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { logger } from "./lib/logger";
import { validateIpAddress } from "./lib/validation";

const http = httpRouter();

// Security headers for all responses
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
};

// Maximum webhook payload size (1MB)
const MAX_WEBHOOK_PAYLOAD_SIZE = 1024 * 1024;

/**
 * Razorpay Webhook Endpoint
 *
 * Receives payment events from Razorpay:
 * - payment.captured: Payment successfully captured
 * - payment.failed: Payment failed
 * - order.paid: Order fully paid
 * - refund.created: Refund initiated
 * - payment.dispute.*: Dispute events
 *
 * Configure in Razorpay Dashboard:
 * Settings → Webhooks → Add New Webhook
 * URL: https://<your-deployment>.convex.site/razorpay-webhook
 */
http.route({
  path: "/razorpay-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get client IP for rate limiting and logging
    // SECURITY: Validate IP format to prevent log injection and ensure data integrity
    const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const clientIp = validateIpAddress(rawIp);

    // Distributed rate limiting using database
    // This works correctly across all Convex instances (unlike in-memory)
    const rateLimit = await ctx.runMutation(internal.rateLimitInternal.consumeWebhookRateLimit, {
      identifier: clientIp,
      ipAddress: clientIp,
    });

    if (!rateLimit.allowed) {
      logger.warn("Webhook rate limit exceeded", { clientIp });
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            "Content-Type": "application/json",
            "Retry-After": String(Math.max(retryAfter, 1)),
          },
        }
      );
    }

    // Check Content-Length header BEFORE reading body to prevent memory exhaustion
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_WEBHOOK_PAYLOAD_SIZE) {
      logger.error("Webhook payload too large", {
        contentLength,
        maxSize: MAX_WEBHOOK_PAYLOAD_SIZE,
      });
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        {
          status: 413,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Extract signature from header
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      logger.error("Missing x-razorpay-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        {
          status: 400,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Get raw payload for signature verification
    const payload = await request.text();

    if (!payload) {
      logger.error("Empty payload received");
      return new Response(
        JSON.stringify({ error: "Empty payload" }),
        {
          status: 400,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Process webhook via internal action
      const result = await ctx.runAction(internal.payments.handlePaymentWebhook, {
        payload,
        signature,
      });

      if (result.success) {
        return new Response(
          JSON.stringify({ status: "ok" }),
          {
            status: 200,
            headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
          }
        );
      } else {
        // Return 200 even on processing failure to prevent Razorpay retries
        // The error has been logged, we can investigate later
        logger.warn("Webhook processing failed but acknowledging receipt", {
          message: result.message,
        });
        return new Response(
          JSON.stringify({ status: "acknowledged", processed: false }),
          {
            status: 200,
            headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      logger.error("Error processing webhook", error);
      // Return 200 to prevent infinite retries from Razorpay
      // We've logged the error for investigation
      return new Response(
        JSON.stringify({ status: "error_logged" }),
        {
          status: 200,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Health Check Endpoint
 *
 * Simple endpoint for monitoring and uptime checks.
 * Returns current timestamp and status.
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: Date.now(),
        service: "nishani-woolera-api",
      }),
      {
        status: 200,
        headers: {
          ...SECURITY_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

export default http;
