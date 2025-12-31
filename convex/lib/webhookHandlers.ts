import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { logger } from "./logger";

/**
 * Razorpay webhook event structure
 */
export interface RazorpayEvent {
  event: string;
  created_at?: number;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        notes?: { convexOrderId?: string };
        dispute?: {
          id: string;
          reason_code?: string;
          reason_description?: string;
        };
      };
    };
    order?: { entity: { id: string; notes?: { convexOrderId?: string } } };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        status?: string;
        notes?: { convexOrderId?: string };
      };
    };
  };
}

/**
 * Result returned by webhook handlers
 */
export interface WebhookResult {
  success: boolean;
  message?: string;
}

/**
 * Logger interface for webhook handlers
 */
export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Type for webhook handler function
 */
export type WebhookHandler = (
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
) => Promise<WebhookResult>;

/**
 * Type-safe helper to convert validated order ID string to Convex Id type.
 * Use after isValidOrderId() check to satisfy TypeScript without using `as any`.
 */
function toOrderId(orderId: string): Id<"orders"> {
  return orderId as Id<"orders">;
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

/**
 * Handler for payment.captured event
 * Payment successfully captured (auto-capture mode)
 */
async function handlePaymentCaptured(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId) {
    logger.debug("payment.captured: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  // Validate order ID format
  if (!isValidOrderId(orderId)) {
    logger.error("payment.captured: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  // Idempotency check: verify order exists and isn't already paid
  const orderStatus = await ctx.runQuery(internal.orders.getOrderPaymentStatus, {
    orderId: toOrderId(orderId),
  });

  if (!orderStatus) {
    logger.error("payment.captured: Order not found");
    return { success: false, message: "Order not found" };
  }

  if (orderStatus.paymentStatus === "paid") {
    logger.debug("payment.captured: Order already paid, skipping");
    return { success: true, message: "Already processed" };
  }

  await ctx.runMutation(internal.orders.updatePaymentStatus, {
    orderId: toOrderId(orderId),
    paymentStatus: "paid",
    razorpayPaymentId: payment?.id,
  });

  logger.info("payment.captured: Order updated to paid");
  return { success: true };
}

/**
 * Handler for order.paid event
 * Order fully paid (recommended for e-commerce)
 * Triggered once per order when fully paid
 */
async function handleOrderPaid(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const order = event.payload.order?.entity;
  const orderId = order?.notes?.convexOrderId;

  if (!orderId) {
    logger.debug("order.paid: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  // Validate order ID format
  if (!isValidOrderId(orderId)) {
    logger.error("order.paid: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  // Idempotency check
  const orderStatus = await ctx.runQuery(internal.orders.getOrderPaymentStatus, {
    orderId: toOrderId(orderId),
  });

  if (!orderStatus) {
    logger.error("order.paid: Order not found");
    return { success: false, message: "Order not found" };
  }

  if (orderStatus.paymentStatus === "paid") {
    logger.debug("order.paid: Order already paid, skipping");
    return { success: true, message: "Already processed" };
  }

  await ctx.runMutation(internal.orders.updatePaymentStatus, {
    orderId: toOrderId(orderId),
    paymentStatus: "paid",
  });

  logger.info("order.paid: Order updated to paid");
  return { success: true };
}

/**
 * Handler for payment.failed event
 * Payment failed
 */
async function handlePaymentFailed(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const failedPayment = event.payload.payment?.entity;
  const failedOrderId = failedPayment?.notes?.convexOrderId;

  if (!failedOrderId) {
    logger.debug("payment.failed: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  // Validate order ID format
  if (!isValidOrderId(failedOrderId)) {
    logger.error("payment.failed: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  // Check if order exists and payment isn't already marked as paid
  // (edge case: webhook arrives after successful retry)
  const orderStatus = await ctx.runQuery(internal.orders.getOrderPaymentStatus, {
    orderId: toOrderId(failedOrderId),
  });

  if (!orderStatus) {
    logger.error("payment.failed: Order not found");
    return { success: false, message: "Order not found" };
  }

  // Don't mark as failed if already paid (payment succeeded on retry)
  if (orderStatus.paymentStatus === "paid") {
    logger.debug("payment.failed: Order already paid, ignoring failure");
    return { success: true, message: "Already paid, ignoring failure" };
  }

  await ctx.runMutation(internal.orders.updatePaymentStatus, {
    orderId: toOrderId(failedOrderId),
    paymentStatus: "failed",
  });

  logger.info("payment.failed: Order marked as failed");
  return { success: true };
}

/**
 * Handler for refund.created event
 * Refund initiated from Razorpay dashboard
 */
async function handleRefundCreated(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const refund = event.payload.refund?.entity;
  const refundOrderId = refund?.notes?.convexOrderId;

  if (!refundOrderId) {
    logger.debug("refund.created: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  // Validate order ID format
  if (!isValidOrderId(refundOrderId)) {
    logger.error("refund.created: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  // Check order exists
  const orderStatus = await ctx.runQuery(internal.orders.getOrderPaymentStatus, {
    orderId: toOrderId(refundOrderId),
  });

  if (!orderStatus) {
    logger.error("refund.created: Order not found");
    return { success: false, message: "Order not found" };
  }

  // Check if already refunded (idempotency)
  if (orderStatus.paymentStatus === "refunded") {
    logger.debug("refund.created: Order already refunded, skipping");
    return { success: true, message: "Already refunded" };
  }

  await ctx.runMutation(internal.orders.updatePaymentStatus, {
    orderId: toOrderId(refundOrderId),
    paymentStatus: "refunded",
  });

  logger.info("refund.created: Order marked as refunded");
  return { success: true };
}

/**
 * Handler for refund.processed event
 * Refund has been successfully processed
 */
async function handleRefundProcessed(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const refund = event.payload.refund?.entity;
  const orderId = refund?.notes?.convexOrderId;

  if (!orderId) {
    logger.debug("refund.processed: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  if (!isValidOrderId(orderId)) {
    logger.error("refund.processed: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  // Update to refunded status (confirmation that refund completed)
  await ctx.runMutation(internal.orders.updatePaymentStatus, {
    orderId: toOrderId(orderId),
    paymentStatus: "refunded",
  });

  logger.info("refund.processed: Refund completed successfully");
  return { success: true };
}

/**
 * Handler for refund.failed event
 * Refund failed - need to notify admin and potentially retry
 */
async function handleRefundFailed(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const refund = event.payload.refund?.entity;
  const orderId = refund?.notes?.convexOrderId;

  if (!orderId) {
    logger.debug("refund.failed: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  if (!isValidOrderId(orderId)) {
    logger.error("refund.failed: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  // Mark as refund_failed so admin can investigate
  await ctx.runMutation(internal.orders.updatePaymentStatus, {
    orderId: toOrderId(orderId),
    paymentStatus: "refund_failed",
  });

  logger.error("refund.failed: Refund failed, admin action required", {
    refundId: refund?.id,
  });
  return { success: true };
}

/**
 * Handler for payment.dispute.created event
 * CRITICAL: Chargeback initiated
 */
async function handleDisputeCreated(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId) {
    logger.debug("payment.dispute.created: No convexOrderId in notes, skipping");
    return { success: true, message: "No order ID, skipped" };
  }

  if (!isValidOrderId(orderId)) {
    logger.error("payment.dispute.created: Invalid order ID format");
    return { success: false, message: "Invalid order ID format" };
  }

  await ctx.runMutation(internal.orders.updateDisputeStatus, {
    orderId: toOrderId(orderId),
    disputeStatus: "created",
    disputeId: payment?.dispute?.id,
    disputeReason: payment?.dispute?.reason_description || payment?.dispute?.reason_code,
  });

  logger.warn("payment.dispute.created: CHARGEBACK INITIATED - Immediate attention required", {
    disputeId: payment?.dispute?.id,
    reason: payment?.dispute?.reason_code,
  });
  return { success: true };
}

/**
 * Handler for payment.dispute.under_review event
 * Dispute is being reviewed
 */
async function handleDisputeUnderReview(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId || !isValidOrderId(orderId)) {
    return { success: true, message: "Invalid or missing order ID" };
  }

  await ctx.runMutation(internal.orders.updateDisputeStatus, {
    orderId: toOrderId(orderId),
    disputeStatus: "under_review",
    disputeId: payment?.dispute?.id,
  });

  logger.info("payment.dispute.under_review: Dispute being reviewed");
  return { success: true };
}

/**
 * Handler for payment.dispute.action_required event
 * URGENT: Evidence submission required
 */
async function handleDisputeActionRequired(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId || !isValidOrderId(orderId)) {
    return { success: true, message: "Invalid or missing order ID" };
  }

  await ctx.runMutation(internal.orders.updateDisputeStatus, {
    orderId: toOrderId(orderId),
    disputeStatus: "action_required",
    disputeId: payment?.dispute?.id,
  });

  logger.warn("payment.dispute.action_required: URGENT - Evidence submission required", {
    disputeId: payment?.dispute?.id,
  });
  return { success: true };
}

/**
 * Handler for payment.dispute.won event
 * Dispute resolved in merchant's favor
 */
async function handleDisputeWon(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId || !isValidOrderId(orderId)) {
    return { success: true, message: "Invalid or missing order ID" };
  }

  await ctx.runMutation(internal.orders.updateDisputeStatus, {
    orderId: toOrderId(orderId),
    disputeStatus: "won",
    disputeId: payment?.dispute?.id,
  });

  logger.info("payment.dispute.won: Dispute resolved in merchant's favor");
  return { success: true };
}

/**
 * Handler for payment.dispute.lost event
 * Chargeback completed - funds returned to customer
 */
async function handleDisputeLost(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId || !isValidOrderId(orderId)) {
    return { success: true, message: "Invalid or missing order ID" };
  }

  await ctx.runMutation(internal.orders.updateDisputeStatus, {
    orderId: toOrderId(orderId),
    disputeStatus: "lost",
    disputeId: payment?.dispute?.id,
  });

  logger.error("payment.dispute.lost: Chargeback completed - funds returned to customer", {
    disputeId: payment?.dispute?.id,
  });
  return { success: true };
}

/**
 * Handler for payment.dispute.closed event
 * Dispute has been closed
 */
async function handleDisputeClosed(
  ctx: ActionCtx,
  event: RazorpayEvent,
  logger: Logger
): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  const orderId = payment?.notes?.convexOrderId;

  if (!orderId || !isValidOrderId(orderId)) {
    return { success: true, message: "Invalid or missing order ID" };
  }

  await ctx.runMutation(internal.orders.updateDisputeStatus, {
    orderId: toOrderId(orderId),
    disputeStatus: "closed",
    disputeId: payment?.dispute?.id,
  });

  logger.info("payment.dispute.closed: Dispute has been closed");
  return { success: true };
}

/**
 * Registry of webhook handlers by event type
 * Maps Razorpay event names to their corresponding handler functions
 */
export const webhookHandlers: Record<string, WebhookHandler> = {
  "payment.captured": handlePaymentCaptured,
  "order.paid": handleOrderPaid,
  "payment.failed": handlePaymentFailed,
  "refund.created": handleRefundCreated,
  "refund.processed": handleRefundProcessed,
  "refund.failed": handleRefundFailed,
  "payment.dispute.created": handleDisputeCreated,
  "payment.dispute.under_review": handleDisputeUnderReview,
  "payment.dispute.action_required": handleDisputeActionRequired,
  "payment.dispute.won": handleDisputeWon,
  "payment.dispute.lost": handleDisputeLost,
  "payment.dispute.closed": handleDisputeClosed,
};
