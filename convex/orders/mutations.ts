import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireCurrentUser, requireOwnershipOrAdmin } from "../lib/auth";

// Shared types and validators
import {
  addressValidator,
  paymentMethodValidator,
  orderItemInputValidator,
} from "../lib/types";

// Error factory
import { orderNotFound, validationError, forbidden } from "../lib/errors";

import {
  validateOrderItems,
  calculateOrderPricing,
  deductInventory,
  restoreInventory,
  recordPromoUsage,
  generateUniqueOrderNumber,
  clearUserCart,
  createStatusHistory,
} from "../lib/orderService";
import { sanitizeText, validatePhone, validatePostalCode } from "../lib/validation";

// Mutation: Create order
// SECURITY: Uses server-side identity verification and atomic inventory operations
export const createOrder = mutation({
  args: {
    items: v.array(orderItemInputValidator),
    shippingAddress: addressValidator,
    billingAddress: v.optional(addressValidator),
    paymentMethod: paymentMethodValidator,
    customerNotes: v.optional(v.string()),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Get authenticated user from server-side identity (not client-provided)
    const user = await requireCurrentUser(ctx);
    const userId = user.clerkId;
    const userEmail = user.email;

    // Order type is always retail for online orders
    // Bulk pricing is applied at the product/cart level, not order level
    const orderType = "retail" as const;

    // Validate shipping address phone and postal code using centralized validators
    // This avoids magic numbers and ensures consistent validation across the app
    validatePhone(args.shippingAddress.phone, "phone");
    validatePostalCode(args.shippingAddress.postalCode);

    // Step 1: Validate order items and enrich with product data
    const validatedItems = await validateOrderItems(ctx, args.items, orderType);

    // Step 2: Calculate pricing with promo code if provided
    const pricing = await calculateOrderPricing(
      ctx,
      validatedItems,
      args.promoCode,
      orderType,
      userId
    );

    // Step 3: Generate unique order number
    const orderNumber = await generateUniqueOrderNumber(ctx);

    // Step 4: Create order record
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId,
      userEmail,
      orderType,
      items: validatedItems,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      taxRate: pricing.taxRate,
      shippingCost: pricing.shippingCost,
      discount: pricing.discount,
      total: pricing.total,
      promoCodeId: pricing.promoCodeId,
      promoCode: pricing.promoCode,
      promoDiscount: pricing.promoDiscount,
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      customerNotes: args.customerNotes ? sanitizeText(args.customerNotes, 500) : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Step 5: Deduct inventory and create audit logs
    await deductInventory(ctx, validatedItems, orderId);

    // Step 6: Record promo code usage if applied
    if (pricing.promoCodeId && pricing.promoDiscount && pricing.promoDiscount > 0) {
      await recordPromoUsage(
        ctx,
        pricing.promoCodeId,
        orderId,
        userId,
        pricing.promoDiscount
      );
    }

    // Step 7: Create status history and clear cart in parallel
    await Promise.all([
      createStatusHistory(ctx, orderId, undefined, "pending", "system", "Order created"),
      clearUserCart(ctx, userId),
    ]);

    return orderId;
  },
});

// Mutation: Cancel order
// SECURITY: Requires ownership (user can cancel their own order) OR admin
export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw orderNotFound();
    }

    // SECURITY: Verify ownership or admin access
    const user = await requireOwnershipOrAdmin(ctx, order.userId);
    const isAdmin = user.role === "admin";
    const changedBy = isAdmin ? user.clerkId : "user";

    // Validate cancellation is allowed
    if (order.orderStatus === "delivered") {
      throw validationError(
        "Cannot cancel a delivered order. Please initiate a return instead."
      );
    }

    if (order.orderStatus === "cancelled") {
      throw validationError("This order has already been cancelled.");
    }

    // Only allow cancellation of shipped orders by admin
    if (order.orderStatus === "shipped" && !isAdmin) {
      throw forbidden(
        "Cannot cancel a shipped order. Please contact customer support."
      );
    }

    const now = Date.now();
    const sanitizedReason = args.reason ? sanitizeText(args.reason, 500) : "No reason provided";
    const reason = `Order cancelled: ${sanitizedReason}`;

    // Restore inventory using service function
    await restoreInventory(ctx, order.items, args.orderId, reason, changedBy);

    // Update order status and create status history in parallel
    await Promise.all([
      ctx.db.patch(args.orderId, {
        orderStatus: "cancelled" as const,
        adminNotes: sanitizedReason,
        updatedAt: now,
      }),
      createStatusHistory(
        ctx,
        args.orderId,
        order.orderStatus,
        "cancelled",
        changedBy,
        sanitizedReason
      ),
    ]);
  },
});
