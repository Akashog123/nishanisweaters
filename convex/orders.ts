import { query, mutation, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireOwnershipOrAdmin, requireCurrentUser } from "./lib/auth";
import { ConvexError } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  WHOLESALE_MIN_ORDER_AMOUNTS,
  WHOLESALE_DISCOUNTS,
} from "./lib/constants";

// Valid order status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};

// Helper to generate order number with uniqueness check
async function generateUniqueOrderNumber(ctx: MutationCtx): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `NW-${timestamp}-${random}`;

    // Check if order number already exists
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", orderNumber))
      .first();

    if (!existing) {
      return orderNumber;
    }

    attempts++;
  }

  // Fallback with more randomness
  const fallback = `NW-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  return fallback;
}

// Helper to validate status transition
function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  const validNextStates = VALID_STATUS_TRANSITIONS[fromStatus] || [];
  return validNextStates.includes(toStatus);
}

// Helper type for inventory deduction tracking
interface InventoryDeduction {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
  quantityBefore: number;
}

// Mutation: Create order
// SECURITY: Uses server-side identity verification and atomic inventory operations
export const createOrder = mutation({
  args: {
    items: v.array(v.object({
      productId: v.id("products"),
      variantSku: v.string(),
      quantity: v.number(),
    })),
    shippingAddress: v.object({
      name: v.string(),
      phone: v.string(),
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    billingAddress: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    })),
    paymentMethod: v.union(
      v.literal("razorpay"),
      v.literal("invoice"),
      v.literal("bank_transfer")
    ),
    customerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Get authenticated user from server-side identity (not client-provided)
    const user = await requireCurrentUser(ctx);
    const userId = user.clerkId;
    const userEmail = user.email;

    // Determine order type and tier from database user (not client-provided)
    const orderType = user.role === "wholesale" && user.wholesaleStatus === "approved"
      ? "wholesale" as const
      : "retail" as const;
    const wholesaleTier = orderType === "wholesale" ? user.wholesaleTier : undefined;

    // Validate items array
    if (args.items.length === 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Order must contain at least one item",
      });
    }

    // Validate shipping address phone and postal code
    const phoneRegex = /^[0-9]{10}$/;
    const postalRegex = /^[0-9]{6}$/;

    const cleanPhone = args.shippingAddress.phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Please enter a valid 10-digit phone number",
      });
    }

    if (!postalRegex.test(args.shippingAddress.postalCode)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Please enter a valid 6-digit postal code",
      });
    }

    const now = Date.now();
    const inventoryDeductions: InventoryDeduction[] = [];
    const orderItems: Array<{
      productId: Id<"products">;
      variantSku: string;
      quantity: number;
      name: string;
      image: string;
      size: string;
      color: string;
      unitPrice: number;
      subtotal: number;
    }> = [];

    // ATOMIC OPERATION: Validate AND deduct inventory in a single pass per item
    // This prevents race conditions (TOCTOU vulnerability)
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: `Product not found`,
        });
      }

      if (!product.isActive) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: `${product.name} is no longer available`,
        });
      }

      const variantIndex = product.variants.findIndex(v => v.sku === item.variantSku);
      if (variantIndex === -1) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: `Variant ${item.variantSku} not found for ${product.name}`,
        });
      }

      const variant = product.variants[variantIndex];

      // Validate quantity
      if (item.quantity <= 0) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: `Invalid quantity for ${product.name}`,
        });
      }

      if (variant.stockQuantity < item.quantity) {
        throw new ConvexError({
          code: "OUT_OF_STOCK",
          message: `Insufficient stock for ${product.name} - ${variant.size}/${variant.color}. Only ${variant.stockQuantity} available.`,
        });
      }

      // ATOMIC: Immediately deduct inventory to prevent race conditions
      const updatedVariants = [...product.variants];
      const quantityBefore = updatedVariants[variantIndex].stockQuantity;
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        stockQuantity: quantityBefore - item.quantity,
      };

      // Recalculate hasLowStock flag
      const hasLowStock = updatedVariants.some(
        v => v.stockQuantity <= v.lowStockThreshold
      );

      await ctx.db.patch(item.productId, {
        variants: updatedVariants,
        hasLowStock,
        updatedAt: now,
      });

      // Track deduction for inventory logs (and potential rollback)
      inventoryDeductions.push({
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        quantityBefore,
      });

      // Determine price based on order type and tier
      let unitPrice = product.retailPrice;
      if (orderType === "wholesale" && wholesaleTier) {
        if (wholesaleTier === "tier1") unitPrice = product.wholesalePriceTier1;
        else if (wholesaleTier === "tier2") unitPrice = product.wholesalePriceTier2;
        else if (wholesaleTier === "tier3") unitPrice = product.wholesalePriceTier3;
      }

      orderItems.push({
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        name: product.name,
        image: product.images[0]?.url || "",
        size: variant.size,
        color: variant.color,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      });
    }

    // Calculate totals using constants
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Apply wholesale discount if applicable
    let discount = 0;
    if (orderType === "wholesale" && wholesaleTier) {
      const tierDiscount = WHOLESALE_DISCOUNTS[wholesaleTier as keyof typeof WHOLESALE_DISCOUNTS] || 0;
      discount = subtotal * tierDiscount;

      // Enforce MOQ for wholesale orders
      const discountedTotal = subtotal - discount;
      const minOrderAmount = WHOLESALE_MIN_ORDER_AMOUNTS[wholesaleTier as keyof typeof WHOLESALE_MIN_ORDER_AMOUNTS] || 10000;

      if (discountedTotal < minOrderAmount) {
        // Rollback inventory deductions if MOQ not met
        for (const deduction of inventoryDeductions) {
          const product = await ctx.db.get(deduction.productId);
          if (!product) continue;

          const variantIndex = product.variants.findIndex(v => v.sku === deduction.variantSku);
          if (variantIndex === -1) continue;

          const updatedVariants = [...product.variants];
          updatedVariants[variantIndex] = {
            ...updatedVariants[variantIndex],
            stockQuantity: deduction.quantityBefore,
          };

          await ctx.db.patch(deduction.productId, {
            variants: updatedVariants,
            updatedAt: now,
          });
        }

        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: `Wholesale orders require a minimum order of ₹${minOrderAmount.toLocaleString('en-IN')}. Your current total after discount is ₹${discountedTotal.toLocaleString('en-IN')}.`,
        });
      }
    }

    const tax = subtotal * TAX_RATE;
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + tax + shippingCost - discount;

    // Generate unique order number
    const orderNumber = await generateUniqueOrderNumber(ctx);

    // Create order
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId,
      userEmail,
      orderType,
      items: orderItems,
      subtotal,
      tax,
      shippingCost,
      discount,
      total,
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      customerNotes: args.customerNotes,
      createdAt: now,
      updatedAt: now,
    });

    // Log inventory changes
    for (const deduction of inventoryDeductions) {
      await ctx.db.insert("inventoryLogs", {
        productId: deduction.productId,
        variantSku: deduction.variantSku,
        changeType: "sale",
        quantityBefore: deduction.quantityBefore,
        quantityChange: -deduction.quantity,
        quantityAfter: deduction.quantityBefore - deduction.quantity,
        orderId,
        changedBy: "system",
        timestamp: now,
      });
    }

    // Create initial status history
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      fromStatus: undefined,
      toStatus: "pending",
      changedBy: "system",
      notes: "Order created",
      timestamp: now,
    });

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
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    razorpayPaymentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    const updates: {
      paymentStatus: "pending" | "paid" | "failed" | "refunded";
      updatedAt: number;
      razorpayPaymentId?: string;
      orderStatus?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
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
    orderStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
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
    if (args.orderStatus) {
      // Use compound index by_status_created for status + ordering
      query = ctx.db
        .query("orders")
        .withIndex("by_status_created", (q) => q.eq("orderStatus", args.orderStatus))
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
    orderStatus: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    trackingNumber: v.optional(v.string()),
    shippingCarrier: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    // Validate status transition
    if (!isValidStatusTransition(order.orderStatus, args.orderStatus)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `Invalid status transition from "${order.orderStatus}" to "${args.orderStatus}". Valid next states: ${VALID_STATUS_TRANSITIONS[order.orderStatus]?.join(", ") || "none"}`,
      });
    }

    const now = Date.now();
    const updates: {
      orderStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
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
    if (args.adminNotes) updates.adminNotes = args.adminNotes;

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
    await ctx.db.insert("orderStatusHistory", {
      orderId: args.orderId,
      fromStatus: order.orderStatus,
      toStatus: args.orderStatus,
      changedBy: admin.clerkId,
      notes: args.adminNotes,
      timestamp: now,
    });
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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    // SECURITY: Verify ownership or admin access
    const user = await requireOwnershipOrAdmin(ctx, order.userId);
    const isAdmin = user.role === "admin";
    const changedBy = isAdmin ? user.clerkId : "user";

    // Validate cancellation is allowed
    if (order.orderStatus === "delivered") {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Cannot cancel a delivered order. Please initiate a return instead.",
      });
    }

    if (order.orderStatus === "cancelled") {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "This order has already been cancelled.",
      });
    }

    // Only allow cancellation of shipped orders by admin
    if (order.orderStatus === "shipped" && !isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot cancel a shipped order. Please contact customer support.",
      });
    }

    const now = Date.now();

    // Restore inventory
    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      const variantIndex = product.variants.findIndex(v => v.sku === item.variantSku);
      if (variantIndex === -1) continue;

      const updatedVariants = [...product.variants];
      const quantityBefore = updatedVariants[variantIndex].stockQuantity;
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        stockQuantity: quantityBefore + item.quantity,
      };

      // Recalculate hasLowStock flag
      const hasLowStock = updatedVariants.some(
        v => v.stockQuantity <= v.lowStockThreshold
      );

      await ctx.db.patch(item.productId, {
        variants: updatedVariants,
        hasLowStock,
        updatedAt: now,
      });

      // Log inventory restoration
      await ctx.db.insert("inventoryLogs", {
        productId: item.productId,
        variantSku: item.variantSku,
        changeType: "return",
        quantityBefore,
        quantityChange: item.quantity,
        quantityAfter: quantityBefore + item.quantity,
        reason: `Order cancelled: ${args.reason || "No reason provided"}`,
        orderId: args.orderId,
        changedBy,
        timestamp: now,
      });
    }

    // Update order status
    await ctx.db.patch(args.orderId, {
      orderStatus: "cancelled",
      adminNotes: args.reason,
      updatedAt: now,
    });

    // Log status change
    await ctx.db.insert("orderStatusHistory", {
      orderId: args.orderId,
      fromStatus: order.orderStatus,
      toStatus: "cancelled",
      changedBy,
      notes: args.reason || "Order cancelled by user",
      timestamp: now,
    });
  },
});

// Query: Get order status history
// SECURITY: Requires ownership (user can view their own order history) OR admin
export const getOrderStatusHistory = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
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

    const orderType = user?.role === "wholesale" && user?.wholesaleStatus === "approved"
      ? "wholesale"
      : "retail";
    const wholesaleTier = orderType === "wholesale" ? user?.wholesaleTier : undefined;

    const previewItems = [];
    const errors: string[] = [];

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
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

      let unitPrice = product.retailPrice;
      if (orderType === "wholesale" && wholesaleTier) {
        if (wholesaleTier === "tier1") unitPrice = product.wholesalePriceTier1;
        else if (wholesaleTier === "tier2") unitPrice = product.wholesalePriceTier2;
        else if (wholesaleTier === "tier3") unitPrice = product.wholesalePriceTier3;
      }

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
    const tax = subtotal * TAX_RATE;
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + tax + shippingCost;

    return {
      items: previewItems,
      subtotal,
      tax,
      taxRate: TAX_RATE,
      shippingCost,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      total,
      orderType,
      wholesaleTier,
      errors,
      isValid: errors.length === 0,
    };
  },
});
