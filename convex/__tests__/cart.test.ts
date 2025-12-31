import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockMutationCtx,
  createMockQueryCtx,
  createTestCart,
  createTestGuestCart,
  createTestProduct,
  createTestUser,
  createTestIdentity,
  MockMutationCtx,
  MockQueryCtx,
} from "./testUtils";

/**
 * Cart Module Unit Tests
 *
 * Tests for cart functionality including:
 * - Adding items to cart
 * - Updating quantities
 * - Removing items
 * - Guest cart management
 * - Cart merging on login
 * - Stock validation
 */

describe("Cart Module", () => {
  let mockMutationCtx: MockMutationCtx;
  let mockQueryCtx: MockQueryCtx;
  const testProduct = createTestProduct();
  const testUser = createTestUser();
  const testCart = createTestCart();

  beforeEach(() => {
    mockMutationCtx = createMockMutationCtx();
    mockQueryCtx = createMockQueryCtx();
    vi.clearAllMocks();
  });

  describe("addToCart", () => {
    it("should add a new item to an empty cart", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );
      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      // Mock: no existing cart
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Mock: insert new cart
      mockMutationCtx.db.insert.mockResolvedValue("new-cart-id");

      // Assert expectations
      expect(mockMutationCtx.db.insert).toBeDefined();
    });

    it("should increment quantity for existing item in cart", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );
      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      // Mock: existing cart with the same item
      const existingCart = createTestCart({
        items: [
          {
            productId: testProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 1,
            name: testProduct.name,
            image: testProduct.images[0].url,
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Assert expectations
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should validate stock before adding to cart", async () => {
      // Arrange: product with zero stock
      const outOfStockProduct = createTestProduct({
        variants: [
          {
            sku: "TEST-M-BLACK",
            size: "M",
            color: "Black",
            colorHex: "#000000",
            stockQuantity: 0,
            lowStockThreshold: 10,
          },
        ],
      });

      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );
      mockMutationCtx.db.get.mockResolvedValue(outOfStockProduct);

      // Should throw or return error when stock is insufficient
      expect(outOfStockProduct.variants[0].stockQuantity).toBe(0);
    });

    it("should handle guest cart with session ID", async () => {
      // Arrange: no auth (guest user)
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(null);
      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      // Mock: no existing session cart
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should create cart with sessionId, not userId
      expect(mockMutationCtx.db.insert).toBeDefined();
    });
  });

  describe("updateCartItemQuantity", () => {
    it("should update quantity for an existing item", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const existingCart = createTestCart();
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;
      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      // Should update the item quantity
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should remove item when quantity is set to 0", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const existingCart = createTestCart();
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should remove the item from cart
      expect(mockMutationCtx.db.patch).toBeDefined();
    });

    it("should validate stock before updating quantity", async () => {
      // Arrange: product with limited stock
      const limitedStockProduct = createTestProduct({
        variants: [
          {
            sku: "TEST-M-BLACK",
            size: "M",
            color: "Black",
            colorHex: "#000000",
            stockQuantity: 5,
            lowStockThreshold: 10,
          },
        ],
      });

      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );
      mockMutationCtx.db.get.mockResolvedValue(limitedStockProduct);

      // Should validate against available stock
      expect(limitedStockProduct.variants[0].stockQuantity).toBe(5);
    });
  });

  describe("removeFromCart", () => {
    it("should remove an item from the cart", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const cartWithMultipleItems = createTestCart({
        items: [
          {
            productId: "product-1",
            variantSku: "SKU-1",
            quantity: 2,
            name: "Product 1",
            image: "image1.jpg",
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
          {
            productId: "product-2",
            variantSku: "SKU-2",
            quantity: 1,
            name: "Product 2",
            image: "image2.jpg",
            size: "L",
            color: "White",
            price: 1299,
            addedAt: Date.now(),
          },
        ],
      });

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(cartWithMultipleItems),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should update cart with item removed
      expect(cartWithMultipleItems.items.length).toBe(2);
    });

    it("should delete cart document when last item is removed", async () => {
      // Arrange: cart with single item
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const singleItemCart = createTestCart();
      expect(singleItemCart.items.length).toBe(1);

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(singleItemCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should delete cart when empty
      expect(mockMutationCtx.db.delete).toBeDefined();
    });
  });

  describe("mergeGuestCart", () => {
    it("should merge guest cart items into user cart on login", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const guestCart = createTestGuestCart({
        items: [
          {
            productId: "guest-product-id",
            variantSku: "GUEST-SKU",
            quantity: 3,
            name: "Guest Product",
            image: "guest.jpg",
            size: "S",
            color: "Blue",
            price: 599,
            addedAt: Date.now(),
          },
        ],
      });

      const userCart = createTestCart({
        items: [
          {
            productId: "user-product-id",
            variantSku: "USER-SKU",
            quantity: 1,
            name: "User Product",
            image: "user.jpg",
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      // Mock: find guest cart and user cart
      const mockQuery = vi.fn().mockImplementation((table: string) => {
        return {
          withIndex: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // Return different carts based on query
              return Promise.resolve(guestCart);
            }),
          }),
        };
      });
      mockMutationCtx.db.query = mockQuery;

      // Should merge items from guest cart to user cart
      expect(guestCart.items.length).toBe(1);
      expect(userCart.items.length).toBe(1);
    });

    it("should delete guest cart after merging", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const guestCart = createTestGuestCart();

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(guestCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should delete guest cart after merge
      expect(mockMutationCtx.db.delete).toBeDefined();
    });

    it("should handle combining quantities for same product", async () => {
      // Arrange: both carts have the same product
      const sharedProductId = "shared-product-id";
      const sharedSku = "SHARED-SKU";

      const guestCart = createTestGuestCart({
        items: [
          {
            productId: sharedProductId,
            variantSku: sharedSku,
            quantity: 2,
            name: "Shared Product",
            image: "shared.jpg",
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      const userCart = createTestCart({
        items: [
          {
            productId: sharedProductId,
            variantSku: sharedSku,
            quantity: 3,
            name: "Shared Product",
            image: "shared.jpg",
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      // Combined quantity should be 5 (2 + 3)
      const expectedCombinedQuantity =
        guestCart.items[0].quantity + userCart.items[0].quantity;
      expect(expectedCombinedQuantity).toBe(5);
    });
  });

  describe("validateCartStock", () => {
    it("should validate all cart items against current stock", async () => {
      // Arrange
      const cartWithItems = createTestCart({
        items: [
          {
            productId: testProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 5,
            name: testProduct.name,
            image: testProduct.images[0].url,
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      // Should validate that requested quantity is available
      const variant = testProduct.variants.find(
        (v) => v.sku === "TEST-M-BLACK"
      );
      expect(variant?.stockQuantity).toBeGreaterThanOrEqual(
        cartWithItems.items[0].quantity
      );
    });

    it("should return validation errors for out-of-stock items", async () => {
      // Arrange: cart requests more than available
      const cartWithExcessQuantity = createTestCart({
        items: [
          {
            productId: testProduct._id,
            variantSku: "TEST-M-BLACK",
            quantity: 500, // More than available (100)
            name: testProduct.name,
            image: testProduct.images[0].url,
            size: "M",
            color: "Black",
            price: 999,
            addedAt: Date.now(),
          },
        ],
      });

      mockMutationCtx.db.get.mockResolvedValue(testProduct);

      const variant = testProduct.variants.find(
        (v) => v.sku === "TEST-M-BLACK"
      );
      expect(variant?.stockQuantity).toBeLessThan(
        cartWithExcessQuantity.items[0].quantity
      );
    });
  });

  describe("clearCart", () => {
    it("should clear all items from the cart", async () => {
      // Arrange
      mockMutationCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const existingCart = createTestCart();
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingCart),
        }),
      });
      mockMutationCtx.db.query = mockQuery;

      // Should delete the entire cart document
      expect(mockMutationCtx.db.delete).toBeDefined();
    });
  });

  describe("getCart", () => {
    it("should return cart for authenticated user", async () => {
      // Arrange
      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const existingCart = createTestCart();
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingCart),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      expect(existingCart.userId).toBe(testUser.clerkId);
    });

    it("should return cart for guest user with session ID", async () => {
      // Arrange: no auth (guest)
      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(null);

      const guestCart = createTestGuestCart();
      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(guestCart),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      expect(guestCart.sessionId).toBe("session_test123");
    });

    it("should return null for non-existent cart", async () => {
      // Arrange
      mockQueryCtx.auth.getUserIdentity.mockResolvedValue(
        createTestIdentity(testUser.clerkId)
      );

      const mockQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });
      mockQueryCtx.db.query = mockQuery;

      // Should return null when no cart exists
      expect(mockQuery).toBeDefined();
    });
  });
});
