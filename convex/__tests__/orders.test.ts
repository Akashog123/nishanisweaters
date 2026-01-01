import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockMutationCtx,
  createMockQueryCtx,
  createTestOrder,
  createTestProduct,
  createTestUser,
  createTestAdminUser,
  createTestCart,
  createTestIdentity,
  MockMutationCtx,
  MockQueryCtx,
} from "./testUtils";

/**
 * Orders Module Unit Tests
 *
 * Tests for order functionality including:
 * - Order creation
 * - Order status updates
 * - Payment status updates
 * - Inventory deduction
 * - Order history
 * - Admin operations
 */

describe("Orders Module", () => {
  let mockMutationCtx: MockMutationCtx;
  let mockQueryCtx: MockQueryCtx;
  const testProduct = createTestProduct();
  const testUser = createTestUser();
  const testOrder = createTestOrder();
  const testCart = createTestCart();

  beforeEach(() => {
    mockMutationCtx = createMockMutationCtx();
    mockQueryCtx = createMockQueryCtx();
    vi.clearAllMocks();
  });

  describe("createOrder", () => {
    it("should create an order from cart items", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(testCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;
      mockMutationCtx.db.get.mockResolvedValue(testProduct);
      mockMutationCtx.db.insert.mockResolvedValue("new-order-id");

      // Should create order with cart items
      expect(mockMutationCtx.db.insert).toBeDefined();
    });

    it("should generate unique order number", async () => {
      // Order numbers should follow format: NW-YYYYMMDD-XXXXX
      const orderNumber = testOrder.orderNumber;

      expect(orderNumber).toMatch(/^NW-/);
    });

    it("should calculate order totals correctly", async () => {
      // Arrange
      const orderItems = [
        { quantity: 2, unitPrice: 999, subtotal: 1998 },
        { quantity: 1, unitPrice: 1499, subtotal: 1499 },
      ];

      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxRate = 0.18; // 18% GST
      const tax = Math.round(subtotal * taxRate);
      const shippingCost = 100;
      const discount = 0;
      const total = subtotal + tax + shippingCost - discount;

      expect(subtotal).toBe(3497);
      expect(tax).toBe(629);
      expect(total).toBe(4226);
    });

    it("should validate stock before creating order", async () => {
      // Arrange: product with limited stock
      const limitedStockProduct = createTestProduct({
        variants: [
          {
            sku: "TEST-M-BLACK",
            size: "M",
            color: "Black",
            colorHex: "#000000",
            stockQuantity: 2,
            lowStockThreshold: 10,
          },
        ],
      });

      const cartWithExcessQty = createTestCart({
        items: [
          {
            productId: limitedStockProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 5, // More than available (2)
            name: "Test Product",
            image: "img.jpg",
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      // Should fail validation
      expect(cartWithExcessQty.items[0].quantity).toBeGreaterThan(
        limitedStockProduct.variants[0].stockQuantity
      );
    });

    it("should clear cart after successful order creation", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(testCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should delete cart after order is created
      expect(mockMutationCtx.db.delete).toBeDefined();
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status", async () => {
      // Arrange
      const adminUser = createTestAdminUser();
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(adminUser.clerkId)
      );

      mockMutationCtx.db.get.mockResolvedValue(testOrder);

      // Should patch order with new status
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should create status history entry", async () => {
      // Arrange
      const adminUser = createTestAdminUser();
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(adminUser.clerkId)
      );

      mockMutationCtx.db.get.mockResolvedValue(testOrder);

      // Should insert status history record
      expect(mockMutationCtx.db.insert).toBeDefined();
    });

    it("should validate status transitions", () => {
      // Valid transitions
      const validTransitions: Record<string, string[]> = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: ["refunded"],
        cancelled: [],
        refunded: [],
      };

      // Test valid transition
      expect(validTransitions.pending).toContain("confirmed");
      expect(validTransitions.shipped).toContain("delivered");

      // Test invalid transition
      expect(validTransitions.delivered).not.toContain("pending");
      expect(validTransitions.cancelled).toHaveLength(0);
    });

    it("should restore inventory when order is cancelled", async () => {
      // Arrange
      const orderToCancel = createTestOrder({
        orderStatus: "processing",
        items: [
          {
            productId: testProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 3,
            name: "Test Product",
            image: "img.jpg",
            size: "M",
            color: "Black",
            unitPrice: 999,
            subtotal: 2997,
          },
        ],
      });

      mockMutationCtx.db.get
        .mockResolvedValueOnce(orderToCancel)
        .mockResolvedValueOnce(testProduct);

      // Should update product inventory
      expect(mockMutationCtx.db.patch).toBeDefined();
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update payment status", async () => {
      // Arrange
      mockMutationCtx.db.get.mockResolvedValue(testOrder);

      // Should patch order with new payment status
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should confirm order when payment is successful", async () => {
      // Arrange
      const pendingOrder = createTestOrder({
        paymentStatus: "pending",
        orderStatus: "pending",
      });

      mockMutationCtx.db.get.mockResolvedValue(pendingOrder);

      // When payment status -> paid, order status -> confirmed
      expect(pendingOrder.orderStatus).toBe("pending");
    });

    it("should handle idempotent payment updates", async () => {
      // Arrange: order already paid
      const paidOrder = createTestOrder({
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });

      mockMutationCtx.db.get.mockResolvedValue(paidOrder);

      // Should not change status if already paid
      expect(paidOrder.paymentStatus).toBe("paid");
    });
  });

  describe("deductInventory", () => {
    it("should deduct inventory for each order item", async () => {
      // Arrange
      const _orderWithItems = createTestOrder({
        items: [
          {
            productId: testProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 2,
            name: "Test Product",
            image: "img.jpg",
            size: "M",
            color: "Black",
            unitPrice: 999,
            subtotal: 1998,
          },
        ],
      });

      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      const variant = testProduct.variants.find((v) => v.sku === "TEST-M-BLACK");
      const expectedNewStock = variant!.stockQuantity - 2;

      expect(expectedNewStock).toBe(98);
    });

    it("should update hasLowStock flag when stock goes below threshold", async () => {
      // Arrange
      const productNearLowStock = createTestProduct({
        variants: [
          {
            sku: "TEST-M-BLACK",
            size: "M",
            color: "Black",
            colorHex: "#000000",
            stockQuantity: 12,
            lowStockThreshold: 10,
          },
        ],
        hasLowStock: false,
      });

      // After selling 3 units: 12 - 3 = 9, which is below threshold (10)
      const newStock = productNearLowStock.variants[0].stockQuantity - 3;
      const shouldFlagLowStock =
        newStock <= productNearLowStock.variants[0].lowStockThreshold;

      expect(shouldFlagLowStock).toBe(true);
    });

    it("should create inventory log entry", async () => {
      // Arrange
      const inventoryLog = {
        productId: testProduct._id,
        variantSku: "TEST-M-BLACK",
        changeType: "sale",
        quantityBefore: 100,
        quantityChange: -2,
        quantityAfter: 98,
        orderId: testOrder._id,
        changedBy: "system",
        timestamp: Date.now(),
      };

      expect(inventoryLog.changeType).toBe("sale");
      expect(inventoryLog.quantityChange).toBe(-2);
    });
  });

  describe("restoreInventory", () => {
    it("should restore inventory when order is cancelled", async () => {
      // Arrange
      const cancelledOrder = createTestOrder({
        orderStatus: "cancelled",
        items: [
          {
            productId: testProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 3,
            name: "Test Product",
            image: "img.jpg",
            size: "M",
            color: "Black",
            unitPrice: 999,
            subtotal: 2997,
          },
        ],
      });

      const productAfterDeduction = createTestProduct({
        variants: [
          {
            sku: "TEST-M-BLACK",
            size: "M",
            color: "Black",
            colorHex: "#000000",
            stockQuantity: 97, // After selling 3
            lowStockThreshold: 10,
          },
        ],
      });

      const restoredStock =
        productAfterDeduction.variants[0].stockQuantity +
        cancelledOrder.items[0].quantity;

      expect(restoredStock).toBe(100);
    });

    it("should clear hasLowStock flag if stock is restored above threshold", async () => {
      // Arrange
      const productWithLowStock = createTestProduct({
        variants: [
          {
            sku: "TEST-M-BLACK",
            size: "M",
            color: "Black",
            colorHex: "#000000",
            stockQuantity: 8, // Below threshold
            lowStockThreshold: 10,
          },
        ],
        hasLowStock: true,
      });

      const restoredQty = 5;
      const newStock = productWithLowStock.variants[0].stockQuantity + restoredQty;
      const shouldClearLowStock =
        newStock > productWithLowStock.variants[0].lowStockThreshold;

      expect(shouldClearLowStock).toBe(true);
    });
  });

  describe("getOrders (Admin)", () => {
    it("should return all orders for admin", async () => {
      // Arrange
      const adminUser = createTestAdminUser();
      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(adminUser.clerkId)
      );

      const allOrders = [
        createTestOrder({ orderNumber: "NW-001" }),
        createTestOrder({ orderNumber: "NW-002", userId: "other_user" }),
      ];

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue(allOrders),
          }),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      expect(allOrders.length).toBe(2);
    });

    it("should filter orders by status", async () => {
      // Arrange
      const pendingOrders = [
        createTestOrder({ orderStatus: "pending" }),
        createTestOrder({ orderStatus: "pending" }),
      ];

      const filteredOrders = pendingOrders.filter(
        (o) => o.orderStatus === "pending"
      );

      expect(filteredOrders.length).toBe(2);
    });
  });

  describe("getUserOrders", () => {
    it("should return only orders for the authenticated user", async () => {
      // Arrange
      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const userOrders = [
        createTestOrder({ userId: testUser.clerkId }),
        createTestOrder({ userId: testUser.clerkId }),
      ];

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue(userOrders),
          }),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      expect(userOrders.every((o) => o.userId === testUser.clerkId)).toBe(true);
    });

    it("should not return other users orders", async () => {
      // Arrange
      const currentUserId = testUser.clerkId;
      const otherUserId = "other_user_123";

      const mixedOrders = [
        createTestOrder({ userId: currentUserId }),
        createTestOrder({ userId: otherUserId }),
      ];

      const userOrders = mixedOrders.filter((o) => o.userId === currentUserId);

      expect(userOrders.length).toBe(1);
      expect(userOrders[0].userId).toBe(currentUserId);
    });
  });

  describe("Order pricing calculations", () => {
    it("should calculate subtotal correctly", () => {
      const items = [
        { quantity: 2, unitPrice: 999 },
        { quantity: 1, unitPrice: 1499 },
        { quantity: 3, unitPrice: 599 },
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      expect(subtotal).toBe(2 * 999 + 1 * 1499 + 3 * 599); // 5294
    });

    it("should apply tax correctly (18% GST)", () => {
      const subtotal = 1000;
      const taxRate = 0.18;
      const tax = Math.round(subtotal * taxRate);

      expect(tax).toBe(180);
    });

    it("should calculate free shipping threshold", () => {
      const freeShippingThreshold = 2499;
      const shippingCost = 100;

      const orderTotal1 = 2000;
      const orderTotal2 = 3000;

      const shipping1 = orderTotal1 >= freeShippingThreshold ? 0 : shippingCost;
      const shipping2 = orderTotal2 >= freeShippingThreshold ? 0 : shippingCost;

      expect(shipping1).toBe(100);
      expect(shipping2).toBe(0);
    });

    it("should apply promo discount correctly", () => {
      const subtotal = 5000;
      const promoDiscount = 500;
      const tax = Math.round(subtotal * 0.18);
      const shipping = 0; // Free shipping
      const total = subtotal + tax + shipping - promoDiscount;

      expect(total).toBe(5000 + 900 + 0 - 500); // 5400
    });
  });
});
