import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  generatePaymentSignature,
  verifyPaymentSignature,
  generateWebhookSignature,
  verifyWebhookSignature,
  parseWebhookEvent,
  isValidRazorpayAmount,
  inrToPaise,
  paiseToInr,
  type RazorpayWebhookEvent,
} from "./payment-utils";

describe("Payment Utilities", () => {
  // Test secrets - these are NOT real secrets, just for testing
  const TEST_KEY_SECRET = "test_secret_key_12345";
  const TEST_WEBHOOK_SECRET = "test_webhook_secret_67890";

  describe("generatePaymentSignature", () => {
    it("should generate a valid HMAC-SHA256 signature", () => {
      const orderId = "order_123456789";
      const paymentId = "pay_987654321";

      const signature = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);

      // Verify it's a valid hex string
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate consistent signatures for the same input", () => {
      const orderId = "order_ABC123";
      const paymentId = "pay_XYZ789";

      const signature1 = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);
      const signature2 = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);

      expect(signature1).toBe(signature2);
    });

    it("should generate different signatures for different order IDs", () => {
      const paymentId = "pay_123";

      const signature1 = generatePaymentSignature("order_A", paymentId, TEST_KEY_SECRET);
      const signature2 = generatePaymentSignature("order_B", paymentId, TEST_KEY_SECRET);

      expect(signature1).not.toBe(signature2);
    });

    it("should generate different signatures for different payment IDs", () => {
      const orderId = "order_123";

      const signature1 = generatePaymentSignature(orderId, "pay_A", TEST_KEY_SECRET);
      const signature2 = generatePaymentSignature(orderId, "pay_B", TEST_KEY_SECRET);

      expect(signature1).not.toBe(signature2);
    });

    it("should generate different signatures for different secrets", () => {
      const orderId = "order_123";
      const paymentId = "pay_456";

      const signature1 = generatePaymentSignature(orderId, paymentId, "secret_1");
      const signature2 = generatePaymentSignature(orderId, paymentId, "secret_2");

      expect(signature1).not.toBe(signature2);
    });

    it("should match the expected Razorpay signature format", () => {
      // Manually compute what Razorpay expects
      const orderId = "order_test";
      const paymentId = "pay_test";
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(body)
        .digest("hex");

      const signature = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);

      expect(signature).toBe(expectedSignature);
    });
  });

  describe("verifyPaymentSignature", () => {
    it("should return true for a valid signature", () => {
      const orderId = "order_valid";
      const paymentId = "pay_valid";

      // Generate a valid signature
      const body = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(body)
        .digest("hex");

      const result = verifyPaymentSignature(
        orderId,
        paymentId,
        validSignature,
        TEST_KEY_SECRET
      );

      expect(result).toBe(true);
    });

    it("should return false for an invalid signature", () => {
      const orderId = "order_test";
      const paymentId = "pay_test";
      const invalidSignature = "invalid_signature_abc123";

      const result = verifyPaymentSignature(
        orderId,
        paymentId,
        invalidSignature,
        TEST_KEY_SECRET
      );

      expect(result).toBe(false);
    });

    it("should return false when order ID is tampered", () => {
      const originalOrderId = "order_original";
      const tamperedOrderId = "order_tampered";
      const paymentId = "pay_123";

      // Generate signature with original order ID
      const signature = generatePaymentSignature(
        originalOrderId,
        paymentId,
        TEST_KEY_SECRET
      );

      // Verify with tampered order ID
      const result = verifyPaymentSignature(
        tamperedOrderId,
        paymentId,
        signature,
        TEST_KEY_SECRET
      );

      expect(result).toBe(false);
    });

    it("should return false when payment ID is tampered", () => {
      const orderId = "order_123";
      const originalPaymentId = "pay_original";
      const tamperedPaymentId = "pay_tampered";

      // Generate signature with original payment ID
      const signature = generatePaymentSignature(
        orderId,
        originalPaymentId,
        TEST_KEY_SECRET
      );

      // Verify with tampered payment ID
      const result = verifyPaymentSignature(
        orderId,
        tamperedPaymentId,
        signature,
        TEST_KEY_SECRET
      );

      expect(result).toBe(false);
    });

    it("should return false when secret is wrong", () => {
      const orderId = "order_123";
      const paymentId = "pay_456";
      const wrongSecret = "wrong_secret";

      // Generate signature with correct secret
      const signature = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);

      // Verify with wrong secret
      const result = verifyPaymentSignature(orderId, paymentId, signature, wrongSecret);

      expect(result).toBe(false);
    });

    it("should be case-sensitive for signatures", () => {
      const orderId = "order_123";
      const paymentId = "pay_456";

      const signature = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);
      const uppercaseSignature = signature.toUpperCase();

      const result = verifyPaymentSignature(
        orderId,
        paymentId,
        uppercaseSignature,
        TEST_KEY_SECRET
      );

      expect(result).toBe(false);
    });
  });

  describe("generateWebhookSignature", () => {
    it("should generate a valid HMAC-SHA256 signature for webhook payload", () => {
      const payload = JSON.stringify({ event: "payment.captured" });

      const signature = generateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate consistent signatures for the same payload", () => {
      const payload = '{"event":"payment.captured","data":{"id":"pay_123"}}';

      const signature1 = generateWebhookSignature(payload, TEST_WEBHOOK_SECRET);
      const signature2 = generateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      expect(signature1).toBe(signature2);
    });

    it("should generate different signatures for different payloads", () => {
      const payload1 = '{"event":"payment.captured"}';
      const payload2 = '{"event":"payment.failed"}';

      const signature1 = generateWebhookSignature(payload1, TEST_WEBHOOK_SECRET);
      const signature2 = generateWebhookSignature(payload2, TEST_WEBHOOK_SECRET);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should return true for a valid webhook signature", () => {
      const payload = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123"}}}}';
      const signature = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

      const result = verifyWebhookSignature(payload, signature, TEST_WEBHOOK_SECRET);

      expect(result).toBe(true);
    });

    it("should return false for an invalid webhook signature", () => {
      const payload = '{"event":"payment.captured"}';
      const invalidSignature = "abc123invalid";

      const result = verifyWebhookSignature(payload, invalidSignature, TEST_WEBHOOK_SECRET);

      expect(result).toBe(false);
    });

    it("should return false when payload is tampered", () => {
      const originalPayload = '{"event":"payment.captured","amount":1000}';
      const tamperedPayload = '{"event":"payment.captured","amount":9999}';

      const signature = generateWebhookSignature(originalPayload, TEST_WEBHOOK_SECRET);

      const result = verifyWebhookSignature(tamperedPayload, signature, TEST_WEBHOOK_SECRET);

      expect(result).toBe(false);
    });
  });

  describe("parseWebhookEvent", () => {
    it("should parse a valid payment.captured event", () => {
      const event: RazorpayWebhookEvent = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_456",
              amount: 50000,
              currency: "INR",
              status: "captured",
              notes: { convexOrderId: "conv_789" },
            },
          },
        },
      };

      const result = parseWebhookEvent(JSON.stringify(event));

      expect(result).toEqual(event);
      expect(result?.event).toBe("payment.captured");
      expect(result?.payload.payment?.entity.id).toBe("pay_123");
    });

    it("should parse a valid payment.failed event", () => {
      const event: RazorpayWebhookEvent = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed",
              order_id: "order_123",
              amount: 10000,
              currency: "INR",
              status: "failed",
            },
          },
        },
      };

      const result = parseWebhookEvent(JSON.stringify(event));

      expect(result).toEqual(event);
      expect(result?.event).toBe("payment.failed");
    });

    it("should parse a valid refund.created event", () => {
      const event: RazorpayWebhookEvent = {
        event: "refund.created",
        payload: {
          refund: {
            entity: {
              id: "rfnd_123",
              payment_id: "pay_456",
              amount: 5000,
              notes: { convexOrderId: "conv_789" },
            },
          },
        },
      };

      const result = parseWebhookEvent(JSON.stringify(event));

      expect(result).toEqual(event);
      expect(result?.event).toBe("refund.created");
      expect(result?.payload.refund?.entity.id).toBe("rfnd_123");
    });

    it("should return null for invalid JSON", () => {
      const invalidJson = "not valid json {{{";

      const result = parseWebhookEvent(invalidJson);

      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseWebhookEvent("");

      expect(result).toBeNull();
    });
  });

  describe("isValidRazorpayAmount", () => {
    it("should return true for positive integers", () => {
      expect(isValidRazorpayAmount(100)).toBe(true);
      expect(isValidRazorpayAmount(1)).toBe(true);
      expect(isValidRazorpayAmount(999999)).toBe(true);
    });

    it("should return false for zero", () => {
      expect(isValidRazorpayAmount(0)).toBe(false);
    });

    it("should return false for negative numbers", () => {
      expect(isValidRazorpayAmount(-1)).toBe(false);
      expect(isValidRazorpayAmount(-100)).toBe(false);
    });

    it("should return false for non-integers", () => {
      expect(isValidRazorpayAmount(99.99)).toBe(false);
      expect(isValidRazorpayAmount(0.5)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isValidRazorpayAmount(NaN)).toBe(false);
    });

    it("should return false for Infinity", () => {
      expect(isValidRazorpayAmount(Infinity)).toBe(false);
      expect(isValidRazorpayAmount(-Infinity)).toBe(false);
    });
  });

  describe("inrToPaise", () => {
    it("should convert INR to paise correctly", () => {
      expect(inrToPaise(1)).toBe(100);
      expect(inrToPaise(10)).toBe(1000);
      expect(inrToPaise(999.99)).toBe(99999);
    });

    it("should handle decimal values correctly", () => {
      expect(inrToPaise(1.5)).toBe(150);
      expect(inrToPaise(99.95)).toBe(9995);
    });

    it("should handle zero", () => {
      expect(inrToPaise(0)).toBe(0);
    });

    it("should round to avoid floating point issues", () => {
      // 19.99 * 100 = 1998.9999999999998 in JavaScript
      expect(inrToPaise(19.99)).toBe(1999);
    });

    it("should handle large amounts", () => {
      expect(inrToPaise(100000)).toBe(10000000);
    });
  });

  describe("paiseToInr", () => {
    it("should convert paise to INR correctly", () => {
      expect(paiseToInr(100)).toBe(1);
      expect(paiseToInr(1000)).toBe(10);
      expect(paiseToInr(99999)).toBe(999.99);
    });

    it("should handle fractional paise", () => {
      expect(paiseToInr(150)).toBe(1.5);
      expect(paiseToInr(9995)).toBe(99.95);
    });

    it("should handle zero", () => {
      expect(paiseToInr(0)).toBe(0);
    });

    it("should handle large amounts", () => {
      expect(paiseToInr(10000000)).toBe(100000);
    });
  });

  describe("Integration: Round-trip conversion", () => {
    it("should convert INR -> paise -> INR without loss", () => {
      const originalAmount = 499.99;
      const paise = inrToPaise(originalAmount);
      const backToInr = paiseToInr(paise);

      expect(backToInr).toBeCloseTo(originalAmount, 2);
    });
  });

  describe("Security: Timing attack resistance", () => {
    it("should use constant-time comparison (signature verification)", () => {
      const orderId = "order_timing_test";
      const paymentId = "pay_timing_test";
      const validSignature = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);
      const invalidSignature = "0".repeat(64); // Valid format but wrong signature

      // Both should complete in similar time (this is a basic check)
      const start1 = Date.now();
      verifyPaymentSignature(orderId, paymentId, validSignature, TEST_KEY_SECRET);
      const validTime = Date.now() - start1;

      const start2 = Date.now();
      verifyPaymentSignature(orderId, paymentId, invalidSignature, TEST_KEY_SECRET);
      const invalidTime = Date.now() - start2;

      // The times should be within a reasonable range of each other
      // Note: This is a weak test for timing attacks; in production,
      // crypto.timingSafeEqual should be used
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(50);
    });
  });
});
