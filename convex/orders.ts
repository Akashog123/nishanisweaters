import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireOwnershipOrAdmin, requireCurrentUser } from "./lib/auth";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

// Shared types and validators
import {
  orderStatusValidator,
  paymentStatusValidator,
  disputeStatusValidator,
  addressValidator,
  paymentMethodValidator,
  orderItemInputValidator,
  type OrderStatus,
  type PaymentStatus,
  type DisputeStatus,
} from "./lib/types";

// Error factory
import {
  orderNotFound,
  invalidStatusTransition,
  validationError,
  forbidden,
} from "./lib/errors";
import {
  getTaxRate,
  getShippingConfig,
} from "./lib/getSettings";
import {
  validateOrderItems,
  calculateOrderPricing,
  deductInventory,
  restoreInventory,
  recordPromoUsage,
  generateUniqueOrderNumber,
  clearUserCart,
  createStatusHistory,
} from "./lib/orderService";
import { sanitizeText, validatePhone, validatePostalCode } from "./lib/validation";

// Valid order status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};


// Helper to validate status transition
function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  const validNextStates = VALID_STATUS_TRANSITIONS[fromStatus] || [];
  return validNextStates.includes(toStatus);
}


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

// Internal mutation to update Razorpay order ID
export const updateRazorpayOrderId = internalMutation({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      razorpayOrderId: args.razorpayOrderId,
      updatedAt: Date.now(),
    });
  },
});

// Internal Mutation: Update payment status
// SECURITY: This is an internal mutation - only callable from server-side code (webhooks, actions)
// NOT exposed to clients directly
export const updatePaymentStatus = internalMutation({
  args: {
    orderId: v.id("orders"),
    paymentStatus: paymentStatusValidator,
    razorpayPaymentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw orderNotFound();
    }

    const updates: {
      paymentStatus: PaymentStatus;
      updatedAt: number;
      razorpayPaymentId?: string;
      orderStatus?: OrderStatus;
    } = {
      paymentStatus: args.paymentStatus,
      updatedAt: Date.now(),
    };

    if (args.razorpayPaymentId) {
      updates.razorpayPaymentId = args.razorpayPaymentId;
    }

    // If payment is successful, confirm the order
    if (args.paymentStatus === "paid") {
      updates.orderStatus = "confirmed";

      await ctx.db.insert("orderStatusHistory", {
        orderId: args.orderId,
        fromStatus: order.orderStatus,
        toStatus: "confirmed",
        changedBy: "system",
        notes: "Payment received",
        timestamp: Date.now(),
      });

      // Schedule order confirmation email
      await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmationEmail, {
        to: order.userEmail,
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress.name,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shippingCost,
        total: order.total,
        shippingAddress: {
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
        },
      });
    }

    await ctx.db.patch(args.orderId, updates);
  },
});

// Internal Query: Get order payment status for idempotency checks
// Used by webhook handler to avoid duplicate processing
export const getOrderPaymentStatus = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      return null;
    }

    return {
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      disputeStatus: order.disputeStatus,
    };
  },
});

// Internal Query: Get order Razorpay status for payment deduplication
// Used by createRazorpayOrder action to check if order already has a Razorpay order
export const getOrderRazorpayStatus = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      return null;
    }

    return {
      razorpayOrderId: order.razorpayOrderId,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      total: order.total, // Include total for server-side amount calculation
    };
  },
});

// Internal Mutation: Update dispute status
// SECURITY: This is an internal mutation - only callable from server-side code (webhooks)
// Handles payment.dispute.* events from Razorpay
export const updateDisputeStatus = internalMutation({
  args: {
    orderId: v.id("orders"),
    disputeStatus: disputeStatusValidator,
    disputeId: v.optional(v.string()),
    disputeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw orderNotFound();
    }

    const now = Date.now();
    const updates: {
      disputeStatus: DisputeStatus;
      disputeId?: string;
      disputeReason?: string;
      disputeCreatedAt?: number;
      disputeResolvedAt?: number;
      paymentStatus?: "disputed" | "paid" | "refunded";
      updatedAt: number;
    } = {
      disputeStatus: args.disputeStatus,
      updatedAt: now,
    };

    if (args.disputeId) {
      updates.disputeId = args.disputeId;
    }

    if (args.disputeReason) {
      updates.disputeReason = args.disputeReason;
    }

    // Track dispute creation time
    if (args.disputeStatus === "created" && !order.disputeCreatedAt) {
      updates.disputeCreatedAt = now;
      updates.paymentStatus = "disputed";
    }

    // Track dispute resolution time
    if (["won", "lost", "closed"].includes(args.disputeStatus)) {
      updates.disputeResolvedAt = now;

      // If merchant won, restore to paid status
      if (args.disputeStatus === "won") {
        updates.paymentStatus = "paid";
      }

      // If merchant lost, mark as refunded (chargeback completed)
      if (args.disputeStatus === "lost") {
        updates.paymentStatus = "refunded";
      }
    }

    await ctx.db.patch(args.orderId, updates);

    // Log dispute status change for audit trail
    await ctx.db.insert("orderStatusHistory", {
      orderId: args.orderId,
      fromStatus: order.orderStatus,
      toStatus: order.orderStatus, // Order status doesn't change
      changedBy: "system",
      notes: `Dispute ${args.disputeStatus}: ${args.disputeReason || "No reason provided"}`,
      timestamp: now,
    });

    // Send email notifications for dispute events
    const actionRequiredStatuses = ["created", "action_required"];
    const resolutionStatuses = ["won", "lost", "closed"];

    if (actionRequiredStatuses.includes(args.disputeStatus)) {
      // Send urgent alert for new disputes or action required
      await ctx.scheduler.runAfter(0, internal.emails.sendDisputeAlertEmail, {
        orderNumber: order.orderNumber,
        disputeStatus: args.disputeStatus,
        disputeReason: args.disputeReason,
        customerEmail: order.userEmail,
        orderTotal: order.total,
        actionRequired: args.disputeStatus === "action_required",
      });
    } else if (resolutionStatuses.includes(args.disputeStatus)) {
      // Send resolution notification
      await ctx.scheduler.runAfter(0, internal.emails.sendDisputeResolutionEmail, {
        orderNumber: order.orderNumber,
        resolution: args.disputeStatus as "won" | "lost" | "closed",
        orderTotal: order.total,
      });
    }
  },
});

// Query: Get user's orders
export const getUserOrders = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .order("desc")
      .take(args.limit || 50);

    return orders;
  },
});

// Query: Get single order (with ownership verification)
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      throw orderNotFound();
    }

    // Verify ownership (admins can view any order)
    await requireOwnershipOrAdmin(ctx, order.userId);

    return order;
  },
});

// Query: Get order by order number (with ownership verification)
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order) {
      throw orderNotFound();
    }

    // Verify ownership (admins can view any order)
    await requireOwnershipOrAdmin(ctx, order.userId);

    return order;
  },
});

// Query: List all orders (Admin only)
// Optimized: Uses indexes for status filtering and cursor-based pagination
export const listAllOrders = query({
  args: {
    orderStatus: v.optional(orderStatusValidator),
    orderType: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || 50;
    let query;

    // Use appropriate index based on filters
    const orderStatus = args.orderStatus;
    if (orderStatus) {
      // Use compound index by_status_created for status + ordering
      query = ctx.db
        .query("orders")
        .withIndex("by_status_created", (q) => q.eq("orderStatus", orderStatus))
        .order("desc");
    } else {
      // Use by_created_at index for ordering when no status filter
      query = ctx.db
        .query("orders")
        .withIndex("by_created_at")
        .order("desc");
    }

    // Apply pagination
    const paginatedResults = await query.paginate({
      numItems: limit,
      cursor: args.cursor ?? null,
    });

    // Apply orderType filter in memory (less common filter)
    let filteredOrders = paginatedResults.page;
    if (args.orderType) {
      filteredOrders = filteredOrders.filter(o => o.orderType === args.orderType);
    }

    return {
      orders: filteredOrders,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

// Mutation: Update order status (Admin only)
// SECURITY: Admin-only with status transition validation
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    orderStatus: orderStatusValidator,
    trackingNumber: v.optional(v.string()),
    shippingCarrier: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw orderNotFound();
    }

    // Validate status transition
    if (!isValidStatusTransition(order.orderStatus, args.orderStatus)) {
      throw invalidStatusTransition(
        order.orderStatus,
        args.orderStatus,
        VALID_STATUS_TRANSITIONS[order.orderStatus] || []
      );
    }

    const now = Date.now();
    const updates: {
      orderStatus: OrderStatus;
      updatedAt: number;
      trackingNumber?: string;
      shippingCarrier?: string;
      adminNotes?: string;
      shippedAt?: number;
      deliveredAt?: number;
    } = {
      orderStatus: args.orderStatus,
      updatedAt: now,
    };

    if (args.trackingNumber) updates.trackingNumber = args.trackingNumber;
    if (args.shippingCarrier) updates.shippingCarrier = args.shippingCarrier;
    if (args.adminNotes) updates.adminNotes = sanitizeText(args.adminNotes, 500);

    if (args.orderStatus === "shipped") {
      updates.shippedAt = now;

      // Send shipping update email
      if (args.trackingNumber && args.shippingCarrier) {
        await ctx.scheduler.runAfter(0, internal.emails.sendShippingUpdateEmail, {
          to: order.userEmail,
          customerName: order.shippingAddress.name,
          orderNumber: order.orderNumber,
          trackingNumber: args.trackingNumber,
          carrier: args.shippingCarrier,
        });
      }
    } else if (args.orderStatus === "delivered") {
      updates.deliveredAt = now;
    }

    await ctx.db.patch(args.orderId, updates);

    // Log status change with admin info
    await createStatusHistory(
      ctx,
      args.orderId,
      order.orderStatus,
      args.orderStatus,
      admin.clerkId,
      args.adminNotes
    );
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

// Query: Get order status history
// SECURITY: Requires ownership (user can view their own order history) OR admin
export const getOrderStatusHistory = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw orderNotFound();
    }

    // SECURITY: Verify ownership or admin access
    await requireOwnershipOrAdmin(ctx, order.userId);

    return await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .collect();
  },
});

// Query: Get order preview (calculates totals without creating order)
// SECURITY: Uses server-side identity for pricing
export const getOrderPreview = query({
  args: {
    items: v.array(v.object({
      productId: v.id("products"),
      variantSku: v.string(),
      quantity: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Get user info for pricing (optional - guests get retail prices)
    const user = await (async () => {
      try {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .first();
      } catch {
        return null;
      }
    })();

    // Order type is always retail - bulk pricing is handled at product level
    const orderType = "retail";

    const previewItems = [];
    const errors: string[] = [];

    // OPTIMIZATION: Batch-fetch all products to prevent N+1 queries
    const uniqueProductIds = [...new Set(args.items.map(item => item.productId))];
    type ProductDoc = NonNullable<Awaited<ReturnType<typeof ctx.db.get<"products">>>>;
    const productsMap = new Map<string, ProductDoc>();

    await Promise.all(
      uniqueProductIds.map(async (productId) => {
        const product = await ctx.db.get(productId);
        if (product) {
          productsMap.set(productId, product as ProductDoc);
        }
      })
    );

    for (const item of args.items) {
      const product = productsMap.get(item.productId);
      if (!product || !product.isActive) {
        errors.push(`Product not available`);
        continue;
      }

      const variant = product.variants.find(v => v.sku === item.variantSku);
      if (!variant) {
        errors.push(`${product.name}: Size/color not available`);
        continue;
      }

      if (variant.stockQuantity < item.quantity) {
        errors.push(`${product.name}: Only ${variant.stockQuantity} available`);
      }

      const unitPrice = product.retailPrice;

      previewItems.push({
        productId: item.productId,
        name: product.name,
        variantSku: item.variantSku,
        size: variant.size,
        color: variant.color,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        available: variant.stockQuantity >= item.quantity,
      });
    }

    const subtotal = previewItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Get dynamic settings for tax and shipping
    const taxRate = await getTaxRate(ctx);
    const { freeThreshold, standardCost } = await getShippingConfig(ctx);

    const tax = subtotal * taxRate;
    const shippingCost = subtotal >= freeThreshold ? 0 : standardCost;
    const total = subtotal + tax + shippingCost;

    return {
      items: previewItems,
      subtotal,
      tax,
      taxRate,
      shippingCost,
      freeShippingThreshold: freeThreshold,
      total,
      orderType,
      errors,
      isValid: errors.length === 0,
    };
  },
});
