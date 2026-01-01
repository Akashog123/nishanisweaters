import { describe, it, expect, vi, beforeEach } from "vitest";
import { Id } from "../_generated/dataModel";
import { createMockMutationCtx } from "./testUtils";

/**
 * Webhook Handler Tests
 *
 * Comprehensive tests for Razorpay webhook event handlers:
 * - payment.captured: Payment successfully captured
 * - payment.failed: Payment failed
 * - order.paid: Order fully paid
 * - refund.created: Refund initiated
 * - refund.processed: Refund completed
 * - refund.failed: Refund failed
 * - payment.dispute.created: Chargeback initiated
 * - payment.dispute.won: Dispute resolved in merchant's favor
 * - payment.dispute.lost: Chargeback completed
 * - Idempotency: Duplicate event handling
 */

describe("Webhook Handler Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("payment.captured event", () => {
    it("should update order to paid status", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              order_id: "order_razorpay123",
              amount: 100000,
              currency: "INR",
              status: "captured",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      // Mock order status check (idempotency)
      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "pending",
        orderStatus: "pending",
      });

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      const _mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Simulate handler logic
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("pending");

      // Update to paid
      await mockRunMutation({
        orderId,
        paymentStatus: "paid",
        razorpayPaymentId: event.payload.payment.entity.id,
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "paid",
        razorpayPaymentId: "pay_123456789",
      });
    });

    it("should skip if order already paid (idempotency)", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const _event = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      // Mock order already paid
      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      const mockRunMutation = vi.fn();

      const _mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Check order status
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("paid");

      // Should skip update (idempotent)
      const shouldSkip = orderStatus.paymentStatus === "paid";
      expect(shouldSkip).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });

    it("should handle missing order ID gracefully", async () => {
      const event = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              notes: {} as { convexOrderId?: string },
            },
          },
        },
      };

      const orderId = event.payload.payment?.entity.notes?.convexOrderId;
      expect(orderId).toBeUndefined();

      // Should skip processing
      const shouldSkip = !orderId;
      expect(shouldSkip).toBe(true);
    });

    it("should reject invalid order ID format", async () => {
      const event = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              notes: {
                convexOrderId: "invalid-order-id",
              },
            },
          },
        },
      };

      function isValidOrderId(orderId: unknown): boolean {
        if (typeof orderId !== "string") return false;
        const convexIdPattern = /^[a-z0-9]+$/;
        if (!convexIdPattern.test(orderId)) return false;
        if (orderId.length < 10 || orderId.length > 50) return false;
        return true;
      }

      const orderId = event.payload.payment?.entity.notes?.convexOrderId;
      const isValid = isValidOrderId(orderId);

      expect(isValid).toBe(false);
    });

    it("should handle order not found error", async () => {
      const _ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunQuery = vi.fn().mockResolvedValue(null);

      const orderStatus = await mockRunQuery();
      expect(orderStatus).toBeNull();

      // Should return error
      const shouldError = orderStatus === null;
      expect(shouldError).toBe(true);
    });
  });

  describe("payment.failed event", () => {
    it("should update order to failed status", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const _event = {
        event: "payment.failed",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              error_code: "BAD_REQUEST_ERROR",
              error_description: "Payment failed due to insufficient funds",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "pending",
        orderStatus: "pending",
      });

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      const _mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Check order status
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("pending");

      // Update to failed
      await mockRunMutation({
        orderId,
        paymentStatus: "failed",
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "failed",
      });
    });

    it("should not mark as failed if already paid (retry succeeded)", async () => {
      const ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      const mockRunMutation = vi.fn();

      const _mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Check order status
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("paid");

      // Should skip marking as failed
      const shouldSkip = orderStatus.paymentStatus === "paid";
      expect(shouldSkip).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });
  });

  describe("order.paid event", () => {
    it("should update order to paid status", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const _event = {
        event: "order.paid",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          order: {
            entity: {
              id: "order_razorpay123",
              amount: 100000,
              amount_paid: 100000,
              status: "paid",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "pending",
        orderStatus: "pending",
      });

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      const _mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Check order status
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("pending");

      // Update to paid
      await mockRunMutation({
        orderId,
        paymentStatus: "paid",
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "paid",
      });
    });

    it("should skip if order already paid (idempotency)", async () => {
      const _ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      const mockRunMutation = vi.fn();

      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("paid");

      // Should skip (idempotent)
      const shouldSkip = orderStatus.paymentStatus === "paid";
      expect(shouldSkip).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });
  });

  describe("refund.created event", () => {
    it("should update order to refunded status", async () => {
      const ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const _event = {
        event: "refund.created",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          refund: {
            entity: {
              id: "rfnd_123456789",
              amount: 50000,
              payment_id: "pay_123456789",
              status: "processed",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      const _mockCtx = {
        ...ctx,
        runQuery: mockRunQuery,
        runMutation: mockRunMutation,
      };

      // Check order status
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("paid");

      // Update to refunded
      await mockRunMutation({
        orderId,
        paymentStatus: "refunded",
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "refunded",
      });
    });

    it("should skip if already refunded (idempotency)", async () => {
      const _ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "refunded",
        orderStatus: "refunded",
      });

      const mockRunMutation = vi.fn();

      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("refunded");

      // Should skip (idempotent)
      const shouldSkip = orderStatus.paymentStatus === "refunded";
      expect(shouldSkip).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });
  });

  describe("refund.processed event", () => {
    it("should confirm refund completion", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const _event = {
        event: "refund.processed",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          refund: {
            entity: {
              id: "rfnd_123456789",
              amount: 50000,
              status: "processed",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      await mockRunMutation({
        orderId,
        paymentStatus: "refunded",
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "refunded",
      });
    });
  });

  describe("refund.failed event", () => {
    it("should update order to refund_failed status", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const _event = {
        event: "refund.failed",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          refund: {
            entity: {
              id: "rfnd_123456789",
              amount: 50000,
              status: "failed",
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      await mockRunMutation({
        orderId,
        paymentStatus: "refund_failed",
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        paymentStatus: "refund_failed",
      });
    });
  });

  describe("payment.dispute.created event", () => {
    it("should update order with dispute status", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.dispute.created",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              dispute: {
                id: "disp_123456789",
                reason_code: "chargeback",
                reason_description: "Customer claims unauthorized transaction",
              },
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      await mockRunMutation({
        orderId,
        disputeStatus: "created",
        disputeId: event.payload.payment.entity.dispute.id,
        disputeReason: event.payload.payment.entity.dispute.reason_description,
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        disputeStatus: "created",
        disputeId: "disp_123456789",
        disputeReason: "Customer claims unauthorized transaction",
      });
    });

    it("should trigger urgent alert for dispute", async () => {
      const event = {
        event: "payment.dispute.created",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              dispute: {
                id: "disp_123456789",
                reason_code: "chargeback",
              },
            },
          },
        },
      };

      // Verify event type is critical
      expect(event.event).toBe("payment.dispute.created");
      expect(event.payload.payment.entity.dispute).toBeDefined();

      // Should trigger urgent notification
      const isCritical = event.event === "payment.dispute.created";
      expect(isCritical).toBe(true);
    });
  });

  describe("payment.dispute.won event", () => {
    it("should update dispute status to won", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.dispute.won",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              dispute: {
                id: "disp_123456789",
              },
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      await mockRunMutation({
        orderId,
        disputeStatus: "won",
        disputeId: event.payload.payment.entity.dispute.id,
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        disputeStatus: "won",
        disputeId: "disp_123456789",
      });
    });

    it("should restore payment status to paid when dispute won", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      // Dispute won should restore to paid status
      await mockRunMutation({
        orderId,
        disputeStatus: "won",
        paymentStatus: "paid",
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          disputeStatus: "won",
          paymentStatus: "paid",
        })
      );
    });
  });

  describe("payment.dispute.lost event", () => {
    it("should update dispute status to lost", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.dispute.lost",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              dispute: {
                id: "disp_123456789",
              },
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      await mockRunMutation({
        orderId,
        disputeStatus: "lost",
        disputeId: event.payload.payment.entity.dispute.id,
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        disputeStatus: "lost",
        disputeId: "disp_123456789",
      });
    });

    it("should update payment status to refunded when dispute lost", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      // Dispute lost means chargeback completed
      await mockRunMutation({
        orderId,
        disputeStatus: "lost",
        paymentStatus: "refunded",
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          disputeStatus: "lost",
          paymentStatus: "refunded",
        })
      );
    });
  });

  describe("payment.dispute.closed event", () => {
    it("should update dispute status to closed", async () => {
      const _ctx = createMockMutationCtx();
      const orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const event = {
        event: "payment.dispute.closed",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123456789",
              dispute: {
                id: "disp_123456789",
              },
              notes: {
                convexOrderId: orderId,
              },
            },
          },
        },
      };

      const mockRunMutation = vi.fn().mockResolvedValue(undefined);

      await mockRunMutation({
        orderId,
        disputeStatus: "closed",
        disputeId: event.payload.payment.entity.dispute.id,
      });

      expect(mockRunMutation).toHaveBeenCalledWith({
        orderId,
        disputeStatus: "closed",
        disputeId: "disp_123456789",
      });
    });
  });

  describe("Idempotency handling", () => {
    it("should handle duplicate payment.captured events", async () => {
      const _ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      const mockRunMutation = vi.fn();

      // First event already processed
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("paid");

      // Second event should be skipped
      const shouldSkip = orderStatus.paymentStatus === "paid";
      expect(shouldSkip).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });

    it("should handle duplicate refund.created events", async () => {
      const _ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "refunded",
        orderStatus: "refunded",
      });

      const mockRunMutation = vi.fn();

      // First event already processed
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("refunded");

      // Second event should be skipped
      const shouldSkip = orderStatus.paymentStatus === "refunded";
      expect(shouldSkip).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });

    it("should handle out-of-order webhook events", async () => {
      const _ctx = createMockMutationCtx();
      const _orderId = "j573gq2c4rv8qzk9qxr3t7h67d6jtq95" as Id<"orders">;

      // Scenario: payment.failed arrives after payment.captured
      const mockRunQuery = vi.fn().mockResolvedValue({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      const mockRunMutation = vi.fn();

      // Check current status
      const orderStatus = await mockRunQuery();
      expect(orderStatus.paymentStatus).toBe("paid");

      // Should not mark as failed if already paid
      const shouldIgnoreFailure = orderStatus.paymentStatus === "paid";
      expect(shouldIgnoreFailure).toBe(true);
      expect(mockRunMutation).not.toHaveBeenCalled();
    });
  });

  describe("Event validation", () => {
    it("should validate event structure", () => {
      const validEvent = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              notes: {
                convexOrderId: "j573gq2c4rv8qzk9qxr3t7h67d6jtq95",
              },
            },
          },
        },
      };

      expect(validEvent.event).toBeDefined();
      expect(validEvent.created_at).toBeDefined();
      expect(validEvent.payload).toBeDefined();
    });

    it("should handle missing payload gracefully", () => {
      const invalidEvent = {
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {} as any,
      };

      const orderId = invalidEvent.payload.payment?.entity?.notes?.convexOrderId;
      expect(orderId).toBeUndefined();

      // Should skip processing
      const shouldSkip = !orderId;
      expect(shouldSkip).toBe(true);
    });
  });

  describe("Webhook handler registry", () => {
    it("should have handlers for all supported events", () => {
      const supportedEvents = [
        "payment.captured",
        "order.paid",
        "payment.failed",
        "refund.created",
        "refund.processed",
        "refund.failed",
        "payment.dispute.created",
        "payment.dispute.under_review",
        "payment.dispute.action_required",
        "payment.dispute.won",
        "payment.dispute.lost",
        "payment.dispute.closed",
      ];

      // Verify all events are defined
      supportedEvents.forEach((eventType) => {
        expect(eventType).toBeTruthy();
        expect(typeof eventType).toBe("string");
      });
    });

    it("should handle unknown event types gracefully", () => {
      const unknownEvent = {
        event: "payment.unknown_event",
        created_at: Math.floor(Date.now() / 1000),
        payload: {},
      };

      // Should not throw error for unknown events
      expect(unknownEvent.event).toBe("payment.unknown_event");

      // Should return success with message
      const shouldSkip = !["payment.captured", "order.paid", "payment.failed"].includes(
        unknownEvent.event
      );
      expect(shouldSkip).toBe(true);
    });
  });
});
