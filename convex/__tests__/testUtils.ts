import { vi, Mock } from "vitest";
import { Id } from "../_generated/dataModel";

/**
 * Test utilities for Convex backend testing
 *
 * These utilities provide mock implementations of Convex context objects
 * for testing backend functions in isolation.
 */

// ============================================
// MOCK CONTEXT BUILDERS
// ============================================

// Define a callable mock type that includes both the function signature and mock methods
type CallableMock<T extends (...args: any[]) => any> = Mock<T> & T;

export interface MockQueryCtx {
  db: {
    get: CallableMock<(id: any) => Promise<any>>;
    query: CallableMock<(table: string) => any>;
  };
  auth: {
    getUserIdentity: CallableMock<() => Promise<any>>;
  };
}

export interface MockMutationCtx extends MockQueryCtx {
  db: {
    get: CallableMock<(id: any) => Promise<any>>;
    query: CallableMock<(table: string) => any>;
    insert: CallableMock<(table: string, document: any) => Promise<any>>;
    patch: CallableMock<(id: any, patch: any) => Promise<void>>;
    delete: CallableMock<(id: any) => Promise<void>>;
  };
  scheduler: {
    runAfter: CallableMock<(delay: number, fn: any, ...args: any[]) => Promise<any>>;
  };
}

/**
 * Create a mock query context for testing Convex queries
 */
export function createMockQueryCtx(): MockQueryCtx {
  const mockQuery = vi.fn(() => ({
    withIndex: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          first: vi.fn(),
          collect: vi.fn(),
        })),
        first: vi.fn(),
        collect: vi.fn(),
        order: vi.fn(() => ({
          take: vi.fn(),
          collect: vi.fn(),
        })),
      })),
      first: vi.fn(),
      collect: vi.fn(),
    })),
    withSearchIndex: vi.fn(() => ({
      search: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            take: vi.fn(),
          })),
          take: vi.fn(),
        })),
        take: vi.fn(),
      })),
    })),
    filter: vi.fn(() => ({
      take: vi.fn(),
      collect: vi.fn(),
    })),
    collect: vi.fn(),
    paginate: vi.fn(),
  }));

  return {
    db: {
      get: vi.fn(),
      query: mockQuery,
    },
    auth: {
      getUserIdentity: vi.fn(),
    },
  };
}

/**
 * Create a mock mutation context for testing Convex mutations
 */
export function createMockMutationCtx(): MockMutationCtx {
  const queryCtx = createMockQueryCtx();

  return {
    ...queryCtx,
    db: {
      ...queryCtx.db,
      insert: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    scheduler: {
      runAfter: vi.fn(),
    },
  };
}

// ============================================
// TEST DATA FACTORIES
// ============================================

/**
 * Create a test product with sensible defaults
 */
export function createTestProduct(overrides: Partial<any> = {}) {
  return {
    _id: "test-product-id" as Id<"products">,
    _creationTime: Date.now(),
    name: "Test T-Shirt",
    slug: "test-t-shirt",
    description: "A comfortable test t-shirt",
    shortDescription: "Test t-shirt",
    category: "Apparel",
    subcategory: "T-Shirts",
    retailPrice: 999,
    wholesalePrice: 799,
    compareAtPrice: 1299,
    images: [
      {
        url: "https://example.com/image.jpg",
        alt: "Test product",
        order: 0,
      },
    ],
    variants: [
      {
        sku: "TEST-M-BLACK",
        size: "M",
        color: "Black",
        colorHex: "#000000",
        stockQuantity: 100,
        lowStockThreshold: 10,
      },
      {
        sku: "TEST-L-BLACK",
        size: "L",
        color: "Black",
        colorHex: "#000000",
        stockQuantity: 50,
        lowStockThreshold: 10,
      },
    ],
    tags: ["test", "apparel"],
    featured: false,
    bestseller: false,
    newArrival: true,
    isActive: true,
    hasLowStock: false,
    reviewCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    availableSizes: ["M", "L"],
    availableColors: ["Black"],
    priceBucket: "0-1000",
    ...overrides,
  };
}

/**
 * Create a test order with sensible defaults
 */
export function createTestOrder(overrides: Partial<any> = {}) {
  const now = Date.now();
  return {
    _id: "test-order-id" as Id<"orders">,
    _creationTime: now,
    orderNumber: "NW-TEST-1234",
    userId: "user_test123",
    userEmail: "test@example.com",
    orderType: "retail" as const,
    items: [
      {
        productId: "test-product-id" as Id<"products">,
        variantSku: "TEST-M-BLACK",
        quantity: 2,
        name: "Test T-Shirt",
        image: "https://example.com/image.jpg",
        size: "M",
        color: "Black",
        unitPrice: 999,
        subtotal: 1998,
      },
    ],
    subtotal: 1998,
    tax: 359.64,
    shippingCost: 100,
    discount: 0,
    total: 2457.64,
    shippingAddress: {
      name: "John Doe",
      phone: "9876543210",
      street: "123 Test Street",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
    },
    paymentMethod: "razorpay" as const,
    paymentStatus: "pending" as const,
    orderStatus: "pending" as const,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test user with sensible defaults
 */
export function createTestUser(overrides: Partial<any> = {}) {
  return {
    _id: "test-user-id" as Id<"users">,
    _creationTime: Date.now(),
    clerkId: "user_test123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "customer" as const,
    shippingAddresses: [],
    emailNotifications: true,
    smsNotifications: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create a test admin user
 */
export function createTestAdminUser(overrides: Partial<any> = {}) {
  return createTestUser({
    clerkId: "user_admin123",
    email: "admin@example.com",
    role: "admin" as const,
    ...overrides,
  });
}

/**
 * Create a test cart with sensible defaults
 */
export function createTestCart(overrides: Partial<any> = {}) {
  const now = Date.now();
  return {
    _id: "test-cart-id" as Id<"cart">,
    _creationTime: now,
    userId: "user_test123",
    sessionId: undefined as string | undefined,
    items: [
      {
        productId: "test-product-id" as Id<"products">,
        variantSku: "TEST-M-BLACK",
        quantity: 2,
        name: "Test T-Shirt",
        image: "https://example.com/image.jpg",
        size: "M",
        color: "Black",
        price: 999,
        addedAt: now,
      },
    ],
    appliedPromoCode: undefined as string | undefined,
    promoDiscount: undefined as number | undefined,
    lastModified: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

/**
 * Create a test guest cart (session-based)
 */
export function createTestGuestCart(overrides: Partial<any> = {}) {
  return createTestCart({
    userId: undefined,
    sessionId: "session_test123",
    ...overrides,
  });
}

/**
 * Create a test promo code
 */
export function createTestPromoCode(overrides: Partial<any> = {}) {
  const now = Date.now();
  return {
    _id: "test-promo-id" as Id<"promoCodes">,
    _creationTime: now,
    code: "TEST10",
    description: "10% off test promo",
    discountType: "percentage" as const,
    discountValue: 10,
    // Optional validation rules
    minOrderAmount: undefined as number | undefined,
    maxDiscountAmount: undefined as number | undefined,
    // Optional usage limits
    usageLimit: undefined as number | undefined,
    usagePerUser: undefined as number | undefined,
    currentUsageCount: 0,
    startsAt: now - 86400000, // Started yesterday
    expiresAt: now + 86400000, // Expires tomorrow
    // Optional restrictions
    applicableCategories: undefined as string[] | undefined,
    excludeWholesale: false,
    isActive: true,
    createdBy: "user_admin123",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create test identity for authenticated user
 */
export function createTestIdentity(clerkId: string = "user_test123") {
  return {
    subject: clerkId,
    email: "test@example.com",
    name: "John Doe",
    tokenIdentifier: `https://clerk.dev/${clerkId}`,
  };
}

/**
 * Mock a database query result builder
 * Simplifies building complex query result chains
 */
export class MockQueryBuilder {
  private result: any = null;

  withResult(result: any) {
    this.result = result;
    return this;
  }

  build() {
    return {
      withIndex: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            first: vi.fn(() => Promise.resolve(this.result)),
            collect: vi.fn(() =>
              Promise.resolve(
                Array.isArray(this.result) ? this.result : [this.result]
              )
            ),
          })),
          first: vi.fn(() => Promise.resolve(this.result)),
          collect: vi.fn(() =>
            Promise.resolve(
              Array.isArray(this.result) ? this.result : [this.result]
            )
          ),
          order: vi.fn(() => ({
            take: vi.fn(() =>
              Promise.resolve(
                Array.isArray(this.result) ? this.result : [this.result]
              )
            ),
          })),
        })),
      })),
      collect: vi.fn(() =>
        Promise.resolve(
          Array.isArray(this.result) ? this.result : [this.result]
        )
      ),
      first: vi.fn(() => Promise.resolve(this.result)),
    };
  }
}

/**
 * Helper to mock auth with a specific user
 */
export function mockAuthenticatedUser(
  ctx: MockQueryCtx | MockMutationCtx,
  user: any
) {
  ctx.auth.getUserIdentity.mockResolvedValue(createTestIdentity(user.clerkId));
}

/**
 * Helper to mock guest (unauthenticated) user
 */
export function mockGuestUser(ctx: MockQueryCtx | MockMutationCtx) {
  ctx.auth.getUserIdentity.mockResolvedValue(null);
}
