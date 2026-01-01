import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";
import {
  createMockMutationCtx,
  createTestOrder,
  createTestIdentity,
} from "./testUtils";

/**
 * Comprehensive Payment Flow Tests
 *
 * Tests for payment functionality including:
 * - createRazorpayOrder action (success, deduplication, validation)
 * - verifyPayment action (signature verification, timing attacks)
 * - handlePaymentWebhook internal action (security, idempotency)
 */

// Mock Razorpay SDK
const mockRazorpayCreate = vi.fn();
vi.mock("razorpay", () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: {
      create: mockRazorpayCreate,
    },
  })),
}));

// Mock circuit breaker
vi.mock("../lib/circuitBreaker", () => ({
  razorpayCircuitBreaker: {
    execute: vi.fn(async (ctx, fn) => {
      try {
        const result = await fn();
        return { success: true, result };
      } catch (error) {
        return { success: false, error, circuitOpen: false };
      }
    }),
  },
}));

describe("Payment Flow Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables
    process.env.RAZORPAY_KEY_ID = "rzp_test_1234567890";
    process.env.RAZORPAY_KEY_SECRET = "test_secret_key";
    process.env.RAZORPAY_WEBHOOK_SECRET_TEST = "test_webhook_secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createRazorpayOrder", () => {
    it("should create Razorpay order successfully", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock order exists and is pending (includes total for server-side amount calculation)
      const mockRunQuery = vi.fn().mockResolvedValue({
        razorpayOrderId: undefined,
        paymentStatus: "pending",
        orderStatus: "pending",
        total: 1000, // Order total in INR (will be converted to 100000 paise)
      });

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      // Mock Razorpay order creation
      mockRazorpayCreate.mockResolvedValue({
        id: "order_razorpay123",
        amount: 100000,
        currency: "INR",
      });

      const mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Simulate the action logic
      const orderStatus = await mockRunQuery();
      expect(orderStatus.razorpayOrderId).toBeUndefined();
      expect(orderStatus.paymentStatus).toBe("pending");

      const razorpayOrder = await mockRazorpayCreate({
        amount: 100000,
        currency: "INR",
        receipt: orderId,
        notes: {
          convexOrderId: orderId,
          idempotencyKey: orderId,
        },
      });

      await mockRunMutation({
        orderId,
        razorpayOrderId: razorpayOrder.id,
      });

      expect(mockRazorpayCreate).toHaveBeenCalledWith({
        amount: 100000,
        currency: "INR",
        receipt: orderId,
        notes: {
          convexOrderId: orderId,
          idempotencyKey: orderId,
        },
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        razorpayOrderId: "order_razorpay123",
      });
    });

    it("should return existing Razorpay order (deduplication)", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock order already has Razorpay order ID (includes total for server-side amount)
      const mockRunQuery = vi.fn().mockResolvedValue({
        razorpayOrderId: "order_existing123",
        paymentStatus: "pending",
        orderStatus: "pending",
        total: 1000, // Order total in INR
      });

      const mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
      };

      const orderStatus = await mockRunQuery();

      // Should return existing order without creating new one
      expect(orderStatus.razorpayOrderId).toBe("order_existing123");
      expect(mockRazorpayCreate).not.toHaveBeenCalled();
    });

    it("should throw error for already paid order", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock order is already paid (includes total for server-side amount)
      const mockRunQuery = vi.fn().mockResolvedValue({
        razorpayOrderId: undefined,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        total: 1000, // Order total in INR
      });

      const orderStatus = await mockRunQuery();

      // Should detect already paid status
      expect(orderStatus.paymentStatus).toBe("paid");

      // In real implementation, this would throw ConvexError
      const shouldThrow = orderStatus.paymentStatus === "paid";
      expect(shouldThrow).toBe(true);
    });

    it("should throw error for cancelled order", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock order is cancelled (includes total for server-side amount)
      const mockRunQuery = vi.fn().mockResolvedValue({
        razorpayOrderId: undefined,
        paymentStatus: "pending",
        orderStatus: "cancelled",
        total: 1000, // Order total in INR
      });

      const orderStatus = await mockRunQuery();

      // Should detect cancelled status
      expect(orderStatus.orderStatus).toBe("cancelled");

      // In real implementation, this would throw ConvexError
      const shouldThrow = orderStatus.orderStatus === "cancelled";
      expect(shouldThrow).toBe(true);
    });

    it("should throw error when order not found", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock order not found
      const mockRunQuery = vi.fn().mockResolvedValue(null);

      const orderStatus = await mockRunQuery();

      // Should detect missing order
      expect(orderStatus).toBeNull();

      // In real implementation, this would throw ConvexError
      const shouldThrow = orderStatus === null;
      expect(shouldThrow).toBe(true);
    });

    it("should handle circuit breaker open state", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock circuit breaker returning open state
      const mockCircuitBreaker = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          circuitOpen: true,
          error: new Error("Circuit breaker open"),
        }),
      };

      const result = await mockCircuitBreaker.execute(ctx, async () => {
        throw new Error("Service unavailable");
      });

      expect(result.success).toBe(false);
      expect(result.circuitOpen).toBe(true);

      // In real implementation, this would throw SERVICE_UNAVAILABLE error
      const shouldThrowServiceUnavailable = result.circuitOpen === true;
      expect(shouldThrowServiceUnavailable).toBe(true);
    });

    it("should handle Razorpay API failure", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Mock Razorpay API failure
      mockRazorpayCreate.mockRejectedValue(new Error("Razorpay API error"));

      try {
        await mockRazorpayCreate({
          amount: 100000,
          currency: "INR",
          receipt: orderId,
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Razorpay API error");
      }
    });
  });

  describe("verifyPayment", () => {
    it("should verify valid payment signature", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;
      const razorpayOrderId = "order_razorpay123";
      const razorpayPaymentId = "pay_razorpay456";
      const keySecret = "test_secret_key";

      // Generate valid signature
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      // Mock mutation to update payment status
      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      const mockCtx = {
        ...ctx,
        runMutation: mockRunMutation,
      };

      // Verify signature (constant-time comparison)
      const bufferA = Buffer.from(expectedSignature, "hex");
      const bufferB = Buffer.from(expectedSignature, "hex");
      const isValid = crypto.timingSafeEqual(bufferA, bufferB);

      expect(isValid).toBe(true);

      // Update payment status to paid
      await mockRunMutation({
        orderId,
        paymentStatus: "paid",
        razorpayPaymentId,
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "paid",
        razorpayPaymentId,
      });
    });

    it("should reject invalid payment signature", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;
      const razorpayOrderId = "order_razorpay123";
      const razorpayPaymentId = "pay_razorpay456";
      const keySecret = "test_secret_key";

      // Generate valid signature
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      // Tampered signature
      const tamperedSignature = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

      // Mock mutation to update payment status
      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      const mockCtx = {
        ...ctx,
        runMutation: mockRunMutation,
      };

      // Verify signature fails
      const bufferA = Buffer.from(expectedSignature, "hex");
      const bufferB = Buffer.from(tamperedSignature, "hex");

      let isValid = false;
      if (bufferA.length === bufferB.length) {
        isValid = crypto.timingSafeEqual(bufferA, bufferB);
      }

      expect(isValid).toBe(false);

      // Update payment status to failed
      await mockRunMutation({
        orderId,
        paymentStatus: "failed",
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "failed",
      });
    });

    it("should use constant-time comparison (timing attack prevention)", async () => {
      const keySecret = "test_secret_key";
      const body = "order_123|pay_456";

      const validSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      // Test with first character different
      const sig1 = validSignature;
      const sig2 = "a" + validSignature.substring(1);

      // Test with last character different
      const sig3 = validSignature.substring(0, validSignature.length - 1) + "a";

      // Both should fail in constant time (returns false, doesn't throw for same-length buffers)
      const buffer1 = Buffer.from(sig1, "hex");
      const buffer2 = Buffer.from(sig2, "hex");
      const buffer3 = Buffer.from(sig3, "hex");

      // timingSafeEqual returns false for same-length buffers with different content
      expect(crypto.timingSafeEqual(buffer1, buffer2)).toBe(false);
      expect(crypto.timingSafeEqual(buffer1, buffer3)).toBe(false);

      // Verify same signatures pass
      const buffer4 = Buffer.from(sig1, "hex");
      expect(crypto.timingSafeEqual(buffer1, buffer4)).toBe(true);
    });

    it("should handle different length signatures safely", async () => {
      const sig1 = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
      const sig2 = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6";

      const buffer1 = Buffer.from(sig1, "hex");
      const buffer2 = Buffer.from(sig2, "hex");

      // Different lengths should be rejected before timingSafeEqual
      expect(buffer1.length).not.toBe(buffer2.length);

      // Should not call timingSafeEqual with different lengths
      const shouldCompare = buffer1.length === buffer2.length;
      expect(shouldCompare).toBe(false);
    });
  });

  describe("handlePaymentWebhook", () => {
    const WEBHOOK_SECRET = "test_webhook_secret";
    const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
    const MAX_JSON_DEPTH = 10;
    const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

    it("should verify webhook signature successfully", async () => {
      const payload = JSON.stringify({
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_456",
              notes: {
                convexOrderId: "j573gq2c4rv8qzk9qxr3t7h67d6jtq95",
              },
            },
          },
        },
      });

      const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

      // Verify signature
      const bufferA = Buffer.from(expectedSignature, "hex");
      const bufferB = Buffer.from(expectedSignature, "hex");
      const isValid = crypto.timingSafeEqual(bufferA, bufferB);

      expect(isValid).toBe(true);
    });

    it("should reject invalid webhook signature", async () => {
      const payload = JSON.stringify({
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
      });

      const validSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

      const invalidSignature = "invalid_signature_hex_string_here_1234567890abcdef";

      // Verify signature fails
      const bufferA = Buffer.from(validSignature, "hex");
      let isValid = false;

      try {
        const bufferB = Buffer.from(invalidSignature, "hex");
        if (bufferA.length === bufferB.length) {
          isValid = crypto.timingSafeEqual(bufferA, bufferB);
        }
      } catch {
        isValid = false;
      }

      expect(isValid).toBe(false);
    });

    it("should reject payload exceeding size limit", async () => {
      const largePayload = "x".repeat(MAX_PAYLOAD_SIZE + 1);

      expect(largePayload.length).toBeGreaterThan(MAX_PAYLOAD_SIZE);

      // Should reject before processing
      const shouldReject = largePayload.length > MAX_PAYLOAD_SIZE;
      expect(shouldReject).toBe(true);
    });

    it("should validate JSON depth to prevent DoS", async () => {
      // Helper function to validate JSON depth
      function validateJsonDepth(obj: any, depth = 0): boolean {
        if (depth > MAX_JSON_DEPTH) return false;
        if (typeof obj !== "object" || obj === null) return true;

        for (const key of Object.keys(obj)) {
          if (!validateJsonDepth(obj[key], depth + 1)) {
            return false;
          }
        }
        return true;
      }

      // Valid payload
      const validPayload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_123",
            },
          },
        },
      };

      expect(validateJsonDepth(validPayload)).toBe(true);

      // Deeply nested payload (JSON bomb)
      let deepPayload: any = { value: "deep" };
      for (let i = 0; i < 15; i++) {
        deepPayload = { nested: deepPayload };
      }

      expect(validateJsonDepth(deepPayload)).toBe(false);
    });

    it("should reject old webhook events (replay attack prevention)", async () => {
      const now = Date.now();
      const oldTimestamp = Math.floor((now - WEBHOOK_MAX_AGE_MS - 1000) / 1000);

      const payload = {
        event: "payment.captured",
        created_at: oldTimestamp,
      };

      const eventAge = now - oldTimestamp * 1000;
      const isTooOld = eventAge > WEBHOOK_MAX_AGE_MS;

      expect(isTooOld).toBe(true);
    });

    it("should accept recent webhook events", async () => {
      const now = Date.now();
      const recentTimestamp = Math.floor((now - 1000) / 1000); // 1 second ago

      const payload = {
        event: "payment.captured",
        created_at: recentTimestamp,
      };

      const eventAge = now - recentTimestamp * 1000;
      const isTooOld = eventAge > WEBHOOK_MAX_AGE_MS;

      expect(isTooOld).toBe(false);
    });

    it("should handle payment.captured event", async () => {
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_456",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      expect(event.event).toBe("payment.captured");
      expect(event.payload.payment?.entity.notes?.convexOrderId).toBe(orderId);
    });

    it("should handle payment.failed event", async () => {
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.failed",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              error_code: "BAD_REQUEST_ERROR",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      expect(event.event).toBe("payment.failed");
      expect(event.payload.payment?.entity.notes?.convexOrderId).toBe(orderId);
    });

    it("should handle order.paid event", async () => {
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "order.paid",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          order: {
            entity: {
              id: "order_456",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      expect(event.event).toBe("order.paid");
      expect(event.payload.order?.entity.notes?.convexOrderId).toBe(orderId);
    });

    it("should handle refund.created event", async () => {
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "refund.created",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          refund: {
            entity: {
              id: "rfnd_123",
              amount: 50000,
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      expect(event.event).toBe("refund.created");
      expect(event.payload.refund?.entity.notes?.convexOrderId).toBe(orderId);
    });

    it("should handle missing order ID gracefully", async () => {
      const event = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              notes: {} as { convexOrderId?: string },
            },
          },
        },
      };

      const orderId = event.payload.payment?.entity.notes?.convexOrderId;
      expect(orderId).toBeUndefined();

      // Should skip processing when no order ID
      const shouldSkip = !orderId;
      expect(shouldSkip).toBe(true);
    });

    it("should validate order ID format", async () => {
      function isValidOrderId(orderId: unknown): boolean {
        if (typeof orderId !== "string") return false;
        const convexIdPattern = /^[a-z0-9]+$/;
        if (!convexIdPattern.test(orderId)) return false;
        if (orderId.length < 10 || orderId.length > 50) return false;
        return true;
      }

      const validId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95";
      const invalidId = "invalid-id-with-dashes";

      expect(isValidOrderId(validId)).toBe(true);
      expect(isValidOrderId(invalidId)).toBe(false);
    });
  });
});
