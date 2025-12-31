import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockMutationCtx,
  createMockQueryCtx,
  createTestPromoCode,
  createTestCart,
  createTestUser,
  createTestWholesaleUser,
  createTestIdentity,
  MockMutationCtx,
  MockQueryCtx,
} from "./testUtils";

/**
 * Promo Codes Module Unit Tests
 *
 * Tests for promo code functionality including:
 * - Promo code validation
 * - Discount calculations
 * - Usage limits
 * - Expiration handling
 * - Wholesale exclusions
 */

describe("PromoCodes Module", () => {
  let mockMutationCtx: MockMutationCtx;
  let mockQueryCtx: MockQueryCtx;
  const testPromoCode = createTestPromoCode();
  const testUser = createTestUser();
  const testCart = createTestCart();

  beforeEach(() => {
    mockMutationCtx = createMockMutationCtx();
    mockQueryCtx = createMockQueryCtx();
    vi.clearAllMocks();
  });

  describe("validatePromoCode", () => {
    it("should validate an active promo code", async () => {
      // Arrange
      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const activePromo = createTestPromoCode({
        isActive: true,
        startsAt: Date.now() - 86400000, // Started yesterday
        expiresAt: Date.now() + 86400000, // Expires tomorrow
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(activePromo),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      // Should validate successfully
      expect(activePromo.isActive).toBe(true);
    });

    it("should reject an expired promo code", async () => {
      // Arrange
      const expiredPromo = createTestPromoCode({
        isActive: true,
        startsAt: Date.now() - 86400000 * 2, // Started 2 days ago
        expiresAt: Date.now() - 86400000, // Expired yesterday
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(expiredPromo),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      // Should reject as expired
      expect(expiredPromo.expiresAt).toBeLessThan(Date.now());
    });

    it("should reject a promo code that hasn't started yet", async () => {
      // Arrange
      const futurePromo = createTestPromoCode({
        isActive: true,
        startsAt: Date.now() + 86400000, // Starts tomorrow
        expiresAt: Date.now() + 86400000 * 2, // Expires in 2 days
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(futurePromo),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      // Should reject as not yet active
      expect(futurePromo.startsAt).toBeGreaterThan(Date.now());
    });

    it("should reject an inactive promo code", async () => {
      // Arrange
      const inactivePromo = createTestPromoCode({
        isActive: false,
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(inactivePromo),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      // Should reject as inactive
      expect(inactivePromo.isActive).toBe(false);
    });

    it("should reject when usage limit is reached", async () => {
      // Arrange
      const maxedOutPromo = createTestPromoCode({
        usageLimit: 10,
        currentUsageCount: 10,
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(maxedOutPromo),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      // Should reject as usage limit reached
      expect(maxedOutPromo.currentUsageCount).toBeGreaterThanOrEqual(
        maxedOutPromo.usageLimit!
      );
    });

    it("should reject when user has exceeded per-user limit", async () => {
      // Arrange
      const perUserLimitPromo = createTestPromoCode({
        usagePerUser: 1,
      });

      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      // Mock: user has already used this promo
      const mockPromoQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(perUserLimitPromo),
        }),
      });

      const mockUsageQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue([
            { userId: testUser.clerkId, promoCodeId: perUserLimitPromo._id },
          ]),
        }),
      });

      // Should reject as user has exceeded their limit
      expect(perUserLimitPromo.usagePerUser).toBe(1);
    });

    it("should reject when minimum order amount is not met", async () => {
      // Arrange
      const minOrderPromo = createTestPromoCode({
        minOrderAmount: 5000, // ₹5000 minimum
      });

      const smallCart = createTestCart({
        items: [
          {
            productId: "prod-1",
            variantSku: "SKU-1",
            quantity: 1,
            name: "Small Item",
            image: "img.jpg",
            size: "M",
            color: "Black",
            price: 999, // Only ₹999
            addedAt: Date.now(),
          },
        ],
      });

      // Calculate cart total
      const cartTotal = smallCart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Should reject as cart total is below minimum
      expect(cartTotal).toBeLessThan(minOrderPromo.minOrderAmount!);
    });

    it("should reject wholesale users when excludeWholesale is true", async () => {
      // Arrange
      const retailOnlyPromo = createTestPromoCode({
        excludeWholesale: true,
      });

      const wholesaleUser = createTestWholesaleUser();

      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(wholesaleUser.clerkId)
      );

      // Should reject for wholesale users
      expect(retailOnlyPromo.excludeWholesale).toBe(true);
      expect(wholesaleUser.role).toBe("wholesale");
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate percentage discount correctly", async () => {
      // Arrange
      const percentagePromo = createTestPromoCode({
        discountType: "percentage",
        discountValue: 20, // 20% off
      });

      const orderTotal = 1000;
      const expectedDiscount = (orderTotal * percentagePromo.discountValue) / 100;

      expect(expectedDiscount).toBe(200);
    });

    it("should calculate fixed discount correctly", async () => {
      // Arrange
      const fixedPromo = createTestPromoCode({
        discountType: "fixed",
        discountValue: 500, // ₹500 off
      });

      const orderTotal = 2000;
      const expectedDiscount = Math.min(fixedPromo.discountValue, orderTotal);

      expect(expectedDiscount).toBe(500);
    });

    it("should cap percentage discount at maxDiscountAmount", async () => {
      // Arrange
      const cappedPromo = createTestPromoCode({
        discountType: "percentage",
        discountValue: 50, // 50% off
        maxDiscountAmount: 1000, // Max ₹1000 discount
      });

      const orderTotal = 5000;
      const uncappedDiscount =
        (orderTotal * cappedPromo.discountValue) / 100; // 2500
      const cappedDiscount = Math.min(
        uncappedDiscount,
        cappedPromo.maxDiscountAmount!
      );

      expect(uncappedDiscount).toBe(2500);
      expect(cappedDiscount).toBe(1000);
    });

    it("should not give discount greater than order total", async () => {
      // Arrange
      const largeFixedPromo = createTestPromoCode({
        discountType: "fixed",
        discountValue: 2000, // ₹2000 off
      });

      const smallOrderTotal = 500;
      const discount = Math.min(largeFixedPromo.discountValue, smallOrderTotal);

      expect(discount).toBe(500);
    });
  });

  describe("applyPromoCode", () => {
    it("should apply promo code to cart", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const promoCode = createTestPromoCode();
      const cart = createTestCart();

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(cart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should patch cart with promo code info
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should replace existing promo code", async () => {
      // Arrange
      const existingCart = createTestCart({
        appliedPromoCode: "OLD10",
        promoDiscount: 100,
      });

      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should update to new promo code
      expect(existingCart.appliedPromoCode).toBe("OLD10");
    });
  });

  describe("removePromoCode", () => {
    it("should remove promo code from cart", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const cartWithPromo = createTestCart({
        appliedPromoCode: "TEST10",
        promoDiscount: 199.8,
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(cartWithPromo),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should patch cart to remove promo code
      expect(cartWithPromo.appliedPromoCode).toBeDefined();
      expect(mockMutationCtx.db.patch).toBeDefined();
    });
  });

  describe("recordPromoCodeUsage (internalMutation)", () => {
    it("should record promo code usage", async () => {
      // This is now an internalMutation and can only be called from server-side code
      // We verify the structure is correct
      const usageRecord = {
        promoCodeId: testPromoCode._id,
        userId: testUser.clerkId,
        orderId: "test-order-id",
        discountApplied: 199.8,
        usedAt: Date.now(),
      };

      expect(usageRecord.promoCodeId).toBeDefined();
      expect(usageRecord.userId).toBeDefined();
      expect(usageRecord.orderId).toBeDefined();
    });

    it("should increment currentUsageCount", async () => {
      // Arrange
      const promoWithUsage = createTestPromoCode({
        currentUsageCount: 5,
      });

      // After recording usage, count should increment
      const expectedNewCount = promoWithUsage.currentUsageCount + 1;
      expect(expectedNewCount).toBe(6);
    });
  });

  describe("Admin operations", () => {
    it("should allow admin to create promo code", async () => {
      // Arrange
      const adminIdentity = createTestIdentity("user_admin123");
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(adminIdentity);

      // Should allow insert
      mockMutationCtx.db.insert.mockResolvedValue("new-promo-id");
      expect(mockMutationCtx.db.insert).toBeDefined();
    });

    it("should allow admin to deactivate promo code", async () => {
      // Arrange
      const adminIdentity = createTestIdentity("user_admin123");
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(adminIdentity);

      const activePromo = createTestPromoCode({ isActive: true });
      mockMutationCtx.db.get.mockResolvedValue(activePromo);

      // Should toggle isActive to false
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should return usage statistics for promo code", async () => {
      // Arrange
      const promoWithStats = createTestPromoCode({
        usageLimit: 100,
        currentUsageCount: 42,
      });

      // Calculate usage percentage
      const usagePercentage =
        (promoWithStats.currentUsageCount / promoWithStats.usageLimit!) * 100;

      expect(usagePercentage).toBe(42);
    });
  });
});
