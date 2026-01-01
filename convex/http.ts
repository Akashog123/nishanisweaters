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

/**
 * Security Headers for HTTP Responses
 *
 * These headers implement defense-in-depth security controls following OWASP recommendations.
 * Applied to all HTTP responses from the Convex backend.
 *
 * Header explanations:
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks (IE/Chrome)
 * - X-Frame-Options: Prevents clickjacking by disallowing framing (legacy browsers)
 * - Cache-Control: Prevents caching of sensitive API responses
 * - X-XSS-Protection: Enables XSS filter in legacy browsers (IE, older Chrome/Safari)
 * - Referrer-Policy: Controls referrer information leakage; strict-origin-when-cross-origin
 *   sends full referrer for same-origin, only origin for cross-origin (HTTPS->HTTPS)
 * - Permissions-Policy: Restricts access to browser features (geolocation, camera, mic)
 *   to prevent potential abuse if XSS occurs
 * - Strict-Transport-Security: Forces HTTPS for 1 year, including subdomains
 *   Note: Only effective when served over HTTPS
 */
const SECURITY_HEADERS = {
  // Prevent MIME-type sniffing - forces browser to respect declared Content-Type
  "X-Content-Type-Options": "nosniff",

  // Clickjacking protection - prevents embedding in iframes (legacy header)
  "X-Frame-Options": "DENY",

  // Prevent caching of sensitive API data
  "Cache-Control": "no-store, no-cache, must-revalidate, private",

  // XSS protection for legacy browsers (IE, older Chrome/Safari)
  // Modern browsers ignore this in favor of CSP, but it provides defense-in-depth
  "X-XSS-Protection": "1; mode=block",

  // Control referrer information sent with requests
  // strict-origin-when-cross-origin: Full URL for same-origin, origin only for cross-origin
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Restrict access to browser features to minimize attack surface
  // Disabling geolocation, microphone, and camera prevents abuse if XSS occurs
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",

  // Force HTTPS for all future requests (1 year = 31536000 seconds)
  // includeSubDomains ensures all subdomains are also HTTPS-only
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
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

    // Extract event ID for idempotency tracking
    // Razorpay sends a unique ID with each webhook event
    const eventId = request.headers.get("x-razorpay-event-id") || undefined;

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
        eventId, // Pass event ID for idempotency tracking
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
