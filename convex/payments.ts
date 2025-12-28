import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { ConvexError } from "convex/values";
import Razorpay from "razorpay";
import crypto from "crypto";

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
export const createRazorpayOrder = action({
  args: {
    orderId: v.id("orders"),
    amount: v.number(), // Amount in paise (INR * 100)
    currency: v.optional(v.string()),
    receipt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> => {
    // Get Razorpay instance
    const razorpay = getRazorpayInstance();

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(args.amount), // Amount in paise
      currency: args.currency || "INR",
      receipt: args.receipt || args.orderId,
      notes: {
        convexOrderId: args.orderId,
      },
    });

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

    // Verify signature
    const body = args.razorpayOrderId + "|" + args.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== args.razorpaySignature) {
      // Payment verification failed
      await ctx.runMutation(internal.orders.updatePaymentStatus, {
        orderId: args.orderId,
        paymentStatus: "failed",
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

    return {
      success: true,
      message: "Payment verified successfully",
    };
  },
});

// Internal action for webhook handler
export const handlePaymentWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured");
      return { success: false };
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(args.payload)
      .digest("hex");

    if (expectedSignature !== args.signature) {
      console.error("Invalid webhook signature");
      return { success: false };
    }

    // Parse payload
    const event = JSON.parse(args.payload);

    // Handle different event types
    switch (event.event) {
      case "payment.captured":
        const payment = event.payload.payment.entity;
        const orderId = payment.notes?.convexOrderId;

        if (orderId) {
          await ctx.runMutation(internal.orders.updatePaymentStatus, {
            orderId,
            paymentStatus: "paid",
            razorpayPaymentId: payment.id,
          });
        }
        break;

      case "payment.failed":
        const failedPayment = event.payload.payment.entity;
        const failedOrderId = failedPayment.notes?.convexOrderId;

        if (failedOrderId) {
          await ctx.runMutation(internal.orders.updatePaymentStatus, {
            orderId: failedOrderId,
            paymentStatus: "failed",
          });
        }
        break;

      case "refund.created":
        const refund = event.payload.refund.entity;
        const refundOrderId = refund.notes?.convexOrderId;

        if (refundOrderId) {
          await ctx.runMutation(internal.orders.updatePaymentStatus, {
            orderId: refundOrderId,
            paymentStatus: "refunded",
          });
        }
        break;

      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return { success: true };
  },
});
