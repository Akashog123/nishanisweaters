# Technical Specifications: Nishani Woolera E-commerce Platform

## Problem Statement

**Business Issue**: The current Nishani Woolera showcase site lacks e-commerce functionality, preventing the brand from selling premium winter wear products online. There is no support for retail (B2C) transactions, wholesale (B2B) partnerships, inventory management, or order processing.

**Current State**:
- Static React-based showcase site with product displays
- No database backend or user authentication
- No payment processing or checkout flow
- No inventory tracking or admin management capabilities
- Missing wholesale portal for bulk ordering and tiered pricing

**Expected Outcome**:
- Fully functional e-commerce platform with secure checkout and payment processing
- Dual-mode operation supporting both retail customers and wholesale partners
- Real-time inventory management with admin dashboard
- Automated email notifications for orders, shipping, and account management
- Role-based access control for customers, wholesale partners, and administrators

---

## Solution Overview

**Approach**: Build a serverless e-commerce platform leveraging Convex for real-time backend operations, Clerk for authentication and user management, Razorpay for payment processing, and Resend for transactional emails. The frontend will evolve from the existing React/Vite/TypeScript/Tailwind CSS codebase with Shadcn UI components.

**Core Changes**:
- Integrate Convex backend with schema for products, users, orders, cart, wishlist, inventory, and wholesale applications
- Implement Clerk authentication with role-based access (customer, wholesale, admin)
- Add Razorpay payment gateway for retail checkout and wholesale invoicing
- Create admin dashboard for inventory, order, and customer management
- Build wholesale portal with tiered pricing, bulk ordering, and MOQ enforcement
- Set up Resend for automated transactional and marketing emails
- Implement real-time updates using Convex reactive queries

**Success Criteria**:
- Retail customers can browse, add to cart, and complete purchases with Razorpay
- Wholesale partners can register, get approved, see tiered pricing, and place bulk orders
- Admins can manage products, process orders, track inventory, and approve wholesale applications
- Real-time inventory updates across all user interfaces
- Automated email notifications for order confirmations, shipping updates, and application status

---

## Technical Implementation

### 1. Database Schema (Convex)

#### 1.1 Products Table
```typescript
// convex/schema.ts - products table
products: defineTable({
  name: v.string(),
  slug: v.string(), // URL-friendly identifier
  description: v.string(),
  shortDescription: v.optional(v.string()),
  category: v.string(), // "jackets", "sweaters", "accessories", etc.
  subcategory: v.optional(v.string()),

  // Pricing
  retailPrice: v.number(),
  wholesalePrice: v.optional(v.number()), // Wholesale price (discount calculated based on user's tier)
  compareAtPrice: v.optional(v.number()), // Original price for discount display
  costPrice: v.optional(v.number()), // For margin calculations

  // Media
  images: v.array(v.object({
    url: v.string(),
    storageId: v.string(), // Convex file storage ID
    alt: v.string(),
    order: v.number(),
  })),
  videos: v.optional(v.array(v.object({
    url: v.string(),
    storageId: v.string(),
    thumbnail: v.string(),
  }))),

  // Variants
  variants: v.array(v.object({
    sku: v.string(),
    size: v.string(), // "XS", "S", "M", "L", "XL", "XXL"
    color: v.string(),
    colorHex: v.optional(v.string()), // Hex code for color display
    stockQuantity: v.number(),
    lowStockThreshold: v.number(), // Alert when stock falls below this
    weight: v.optional(v.number()), // For shipping calculations
  })),

  // SEO & Discovery
  tags: v.array(v.string()),
  featured: v.boolean(),
  bestseller: v.boolean(),
  newArrival: v.boolean(),

  // Wholesale
  minOrderQuantity: v.optional(v.number()), // MOQ for wholesale

  // Ratings & Reviews
  averageRating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),

  // Metadata
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.string(), // User ID
})
  .index("by_slug", ["slug"])
  .index("by_category", ["category"])
  .index("by_featured", ["featured"])
  .index("by_bestseller", ["bestseller"])
  .searchIndex("search_products", {
    searchField: "name",
    filterFields: ["category", "isActive"],
  })
```

#### 1.2 Users Table (Clerk Integration)
```typescript
// convex/schema.ts - users table
users: defineTable({
  clerkId: v.string(), // Clerk user ID
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),

  // Role-based access
  role: v.union(
    v.literal("customer"),
    v.literal("wholesale"),
    v.literal("admin")
  ),

  // Wholesale-specific
  companyName: v.optional(v.string()),
  businessEmail: v.optional(v.string()),
  gstNumber: v.optional(v.string()),
  businessAddress: v.optional(v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
  })),
  website: v.optional(v.string()),
  wholesaleTier: v.optional(v.union(
    v.literal("tier1"),
    v.literal("tier2"),
    v.literal("tier3")
  )),
  wholesaleStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("suspended")
  )),

  // Addresses
  shippingAddresses: v.array(v.object({
    id: v.string(),
    name: v.string(),
    phone: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
    isDefault: v.boolean(),
  })),

  // Preferences
  emailNotifications: v.boolean(),
  smsNotifications: v.boolean(),

  // Metadata
  createdAt: v.number(),
  lastLoginAt: v.optional(v.number()),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_role", ["role"])
  .index("by_wholesale_status", ["wholesaleStatus"])
```

#### 1.3 Wholesale Applications Table
```typescript
// convex/schema.ts - wholesaleApplications table
wholesaleApplications: defineTable({
  userId: v.string(), // Reference to users table
  clerkId: v.string(), // Clerk user ID

  // Business Information
  companyName: v.string(),
  businessEmail: v.optional(v.string()),
  gstNumber: v.optional(v.string()),
  businessAddress: v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
  }),
  website: v.optional(v.string()),

  // Documents
  documents: v.optional(v.array(v.object({
    type: v.union(
      v.literal("reseller_certificate"),
      v.literal("business_license"),
      v.literal("gst_certificate"),
      v.literal("other")
    ),
    url: v.string(),
    storageId: v.string(),
    uploadedAt: v.number(),
  }))),

  // Application Status
  status: v.union(
    v.literal("pending"),
    v.literal("under_review"),
    v.literal("approved"),
    v.literal("rejected")
  ),
  requestedTier: v.optional(v.union(
    v.literal("tier1"),
    v.literal("tier2"),
    v.literal("tier3")
  )),

  // Admin Review
  reviewedBy: v.optional(v.string()), // Admin user ID
  reviewedAt: v.optional(v.number()),
  reviewNotes: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),

  // Metadata
  submittedAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user_id", ["userId"])
  .index("by_status", ["status"])
  .index("by_clerk_id", ["clerkId"])
```

#### 1.4 Cart Table
```typescript
// convex/schema.ts - cart table
cart: defineTable({
  userId: v.optional(v.string()), // Optional for guest carts
  sessionId: v.optional(v.string()), // For guest users

  items: v.array(v.object({
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),

    // Snapshot of product data at time of adding
    name: v.string(),
    image: v.string(),
    size: v.string(),
    color: v.string(),
    price: v.number(), // Price shown to user (retail or wholesale)

    addedAt: v.number(),
  })),

  // Cart metadata
  lastModified: v.number(),
  expiresAt: v.number(), // Auto-cleanup old carts
})
  .index("by_user_id", ["userId"])
  .index("by_session_id", ["sessionId"])
  .index("by_expires_at", ["expiresAt"])
```

#### 1.5 Wishlist Table
```typescript
// convex/schema.ts - wishlist table
wishlist: defineTable({
  userId: v.string(),

  items: v.array(v.object({
    productId: v.id("products"),
    addedAt: v.number(),
  })),

  updatedAt: v.number(),
})
  .index("by_user_id", ["userId"])
```

#### 1.6 Orders Table
```typescript
// convex/schema.ts - orders table
orders: defineTable({
  orderNumber: v.string(), // Human-readable order number
  userId: v.string(),
  userEmail: v.string(),

  // Order Type
  orderType: v.union(v.literal("retail"), v.literal("wholesale")),

  // Items
  items: v.array(v.object({
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),

    // Snapshot at time of order
    name: v.string(),
    image: v.string(),
    size: v.string(),
    color: v.string(),
    unitPrice: v.number(),
    subtotal: v.number(),
  })),

  // Pricing
  subtotal: v.number(),
  tax: v.number(),
  shippingCost: v.number(),
  discount: v.number(),
  total: v.number(),

  // Shipping Address
  shippingAddress: v.object({
    name: v.string(),
    phone: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
  }),

  // Billing Address
  billingAddress: v.optional(v.object({
    name: v.string(),
    phone: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
  })),

  // Payment
  paymentMethod: v.union(
    v.literal("razorpay"),
    v.literal("invoice"),
    v.literal("bank_transfer")
  ),
  paymentStatus: v.union(
    v.literal("pending"),
    v.literal("paid"),
    v.literal("failed"),
    v.literal("refunded"),
    v.literal("partially_refunded")
  ),
  razorpayOrderId: v.optional(v.string()),
  razorpayPaymentId: v.optional(v.string()),

  // Order Status
  orderStatus: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("processing"),
    v.literal("shipped"),
    v.literal("delivered"),
    v.literal("cancelled"),
    v.literal("refunded")
  ),

  // Fulfillment
  trackingNumber: v.optional(v.string()),
  shippingCarrier: v.optional(v.string()),
  shippedAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),

  // Notes
  customerNotes: v.optional(v.string()),
  adminNotes: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_order_number", ["orderNumber"])
  .index("by_user_id", ["userId"])
  .index("by_order_status", ["orderStatus"])
  .index("by_payment_status", ["paymentStatus"])
  .index("by_order_type", ["orderType"])
  .index("by_created_at", ["createdAt"])
```

#### 1.7 Order Status History Table
```typescript
// convex/schema.ts - orderStatusHistory table
orderStatusHistory: defineTable({
  orderId: v.id("orders"),

  fromStatus: v.optional(v.string()),
  toStatus: v.string(),

  changedBy: v.string(), // User ID (admin or system)
  notes: v.optional(v.string()),

  timestamp: v.number(),
})
  .index("by_order_id", ["orderId"])
```

#### 1.8 Reviews Table
```typescript
// convex/schema.ts - reviews table
reviews: defineTable({
  productId: v.id("products"),
  userId: v.string(),
  orderId: v.optional(v.id("orders")), // Verified purchase

  rating: v.number(), // 1-5
  title: v.optional(v.string()),
  comment: v.string(),

  // Verification
  isVerifiedPurchase: v.boolean(),
  isVerifiedByAdmin: v.boolean(),

  // Helpfulness
  helpfulCount: v.number(),

  // Admin moderation
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected")
  ),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_product_id", ["productId"])
  .index("by_user_id", ["userId"])
  .index("by_status", ["status"])
```

#### 1.9 Inventory Logs Table
```typescript
// convex/schema.ts - inventoryLogs table
inventoryLogs: defineTable({
  productId: v.id("products"),
  variantSku: v.string(),

  changeType: v.union(
    v.literal("restock"),
    v.literal("sale"),
    v.literal("return"),
    v.literal("adjustment"),
    v.literal("damaged")
  ),

  quantityBefore: v.number(),
  quantityChange: v.number(),
  quantityAfter: v.number(),

  reason: v.optional(v.string()),
  orderId: v.optional(v.id("orders")),
  changedBy: v.string(), // User ID

  timestamp: v.number(),
})
  .index("by_product_id", ["productId"])
  .index("by_timestamp", ["timestamp"])
```

#### 1.10 Email Campaigns Table
```typescript
// convex/schema.ts - emailCampaigns table
emailCampaigns: defineTable({
  name: v.string(),
  subject: v.string(),

  // Content
  htmlContent: v.string(),
  textContent: v.optional(v.string()),

  // Targeting
  targetAudience: v.union(
    v.literal("all"),
    v.literal("retail_customers"),
    v.literal("wholesale_partners"),
    v.literal("custom")
  ),
  customRecipients: v.optional(v.array(v.string())), // Email addresses

  // Scheduling
  status: v.union(
    v.literal("draft"),
    v.literal("scheduled"),
    v.literal("sent"),
    v.literal("cancelled")
  ),
  scheduledFor: v.optional(v.number()),
  sentAt: v.optional(v.number()),

  // Analytics
  recipientCount: v.optional(v.number()),
  openCount: v.optional(v.number()),
  clickCount: v.optional(v.number()),

  // Metadata
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_scheduled_for", ["scheduledFor"])
```

#### 1.11 Newsletter Subscribers Table
```typescript
// convex/schema.ts - newsletterSubscribers table
newsletterSubscribers: defineTable({
  email: v.string(),

  // Subscription status
  isSubscribed: v.boolean(),
  subscribedAt: v.optional(v.number()),
  unsubscribedAt: v.optional(v.number()),

  // Preferences
  tags: v.array(v.string()), // "new_arrivals", "promotions", etc.

  // Source
  source: v.optional(v.string()), // "footer_form", "checkout", etc.

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_is_subscribed", ["isSubscribed"])
```

#### 1.12 CMS Content Table
```typescript
// convex/schema.ts - cmsContent table
cmsContent: defineTable({
  key: v.string(), // Unique identifier like "homepage_hero_banner"
  type: v.union(
    v.literal("banner"),
    v.literal("announcement"),
    v.literal("text_block"),
    v.literal("image"),
    v.literal("video")
  ),

  // Content
  title: v.optional(v.string()),
  content: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  ctaText: v.optional(v.string()),
  ctaLink: v.optional(v.string()),

  // Display settings
  isActive: v.boolean(),
  displayOrder: v.optional(v.number()),
  startsAt: v.optional(v.number()),
  endsAt: v.optional(v.number()),

  // Metadata
  updatedBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_type", ["type"])
  .index("by_is_active", ["isActive"])
```

---

### 2. Convex Functions (API Endpoints)

#### 2.1 Product Functions

**File: `convex/products.ts`**

```typescript
// Query: Get all products with filtering and pagination
export const listProducts = query({
  args: {
    category: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    bestseller: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Filter products, paginate, return results
  },
});

// Query: Get single product by slug
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Implementation: Fetch product, include related products
  },
});

// Query: Search products
export const searchProducts = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Implementation: Full-text search using searchIndex
  },
});

// Mutation: Create product (Admin only)
export const createProduct = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    category: v.string(),
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()), // Single wholesale price (tier discounts applied dynamically)
    images: v.array(v.object({ url: v.string(), storageId: v.string(), alt: v.string(), order: v.number() })),
    variants: v.array(v.object({
      sku: v.string(),
      size: v.string(),
      color: v.string(),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
    })),
    // ... other fields
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin role, create product
  },
});

// Mutation: Update product (Admin only)
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    // ... update fields
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, update product
  },
});

// Mutation: Delete product (Admin only)
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, soft delete or hard delete
  },
});

// Query: Get low stock products (Admin only)
export const getLowStockProducts = query({
  handler: async (ctx) => {
    // Implementation: Find products with variants below threshold
  },
});

// Mutation: Update stock quantity
export const updateStockQuantity = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
    changeType: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Update stock, create inventory log
  },
});
```

#### 2.2 User Functions

**File: `convex/users.ts`**

```typescript
// Mutation: Create or update user from Clerk webhook
export const syncUserFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Upsert user in Convex database
  },
});

// Query: Get current user profile
export const getCurrentUser = query({
  handler: async (ctx) => {
    // Implementation: Get user from Clerk auth, fetch profile
  },
});

// Mutation: Update user profile
export const updateUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Update user profile
  },
});

// Mutation: Add shipping address
export const addShippingAddress = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Implementation: Add address to user profile
  },
});

// Mutation: Update shipping address
export const updateShippingAddress = mutation({
  args: {
    addressId: v.string(),
    // ... address fields
  },
  handler: async (ctx, args) => {
    // Implementation: Update specific address
  },
});

// Mutation: Delete shipping address
export const deleteShippingAddress = mutation({
  args: { addressId: v.string() },
  handler: async (ctx, args) => {
    // Implementation: Remove address from user
  },
});

// Query: Get all users (Admin only)
export const listUsers = query({
  args: {
    role: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, list users with filters
  },
});

// Mutation: Update user role (Admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("customer"), v.literal("wholesale"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, update role
  },
});

// Mutation: Assign wholesale tier (Admin only)
export const assignWholesaleTier = mutation({
  args: {
    userId: v.string(),
    tier: v.union(v.literal("tier1"), v.literal("tier2"), v.literal("tier3")),
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, assign tier
  },
});
```

#### 2.3 Wholesale Application Functions

**File: `convex/wholesaleApplications.ts`**

```typescript
// Mutation: Submit wholesale application
export const submitWholesaleApplication = mutation({
  args: {
    companyName: v.string(),
    businessEmail: v.optional(v.string()),
    gstNumber: v.optional(v.string()),
    businessAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    website: v.optional(v.string()),
    documents: v.optional(v.array(v.object({
      type: v.string(),
      url: v.string(),
      storageId: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    // Implementation: Create application, send notification email
  },
});

// Query: Get user's wholesale application
export const getUserApplication = query({
  handler: async (ctx) => {
    // Implementation: Get current user's application
  },
});

// Query: List all applications (Admin only)
export const listApplications = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, list applications
  },
});

// Mutation: Review application (Admin only)
export const reviewApplication = mutation({
  args: {
    applicationId: v.id("wholesaleApplications"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    assignedTier: v.optional(v.union(v.literal("tier1"), v.literal("tier2"), v.literal("tier3"))),
    reviewNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Update application, update user role/tier, send email
  },
});
```

#### 2.4 Cart Functions

**File: `convex/cart.ts`**

```typescript
// Query: Get user's cart
export const getCart = query({
  handler: async (ctx) => {
    // Implementation: Fetch cart for authenticated or guest user
  },
});

// Mutation: Add item to cart
export const addToCart = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation: Add or update cart item, check stock
  },
});

// Mutation: Update cart item quantity
export const updateCartItem = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation: Update quantity or remove if 0
  },
});

// Mutation: Remove cart item
export const removeCartItem = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation: Remove item from cart
  },
});

// Mutation: Clear cart
export const clearCart = mutation({
  handler: async (ctx) => {
    // Implementation: Empty user's cart
  },
});

// Mutation: Merge guest cart with user cart (on login)
export const mergeGuestCart = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation: Merge guest cart into user cart
  },
});
```

#### 2.5 Wishlist Functions

**File: `convex/wishlist.ts`**

```typescript
// Query: Get user's wishlist
export const getWishlist = query({
  handler: async (ctx) => {
    // Implementation: Fetch wishlist with product details
  },
});

// Mutation: Add to wishlist
export const addToWishlist = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Implementation: Add product to wishlist
  },
});

// Mutation: Remove from wishlist
export const removeFromWishlist = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Implementation: Remove product from wishlist
  },
});

// Mutation: Clear wishlist
export const clearWishlist = mutation({
  handler: async (ctx) => {
    // Implementation: Empty user's wishlist
  },
});
```

#### 2.6 Order Functions

**File: `convex/orders.ts`**

```typescript
// Mutation: Create order
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
    paymentMethod: v.string(),
    customerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Create order, deduct inventory, generate order number
  },
});

// Action: Create Razorpay order
export const createRazorpayOrder = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    // Implementation: Call Razorpay API to create order
  },
});

// Mutation: Update payment status
export const updatePaymentStatus = mutation({
  args: {
    orderId: v.id("orders"),
    paymentStatus: v.string(),
    razorpayPaymentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Update order payment status, trigger email
  },
});

// Query: Get user's orders
export const getUserOrders = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Fetch orders for current user
  },
});

// Query: Get single order
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // Implementation: Fetch order with verification
  },
});

// Query: List all orders (Admin only)
export const listAllOrders = query({
  args: {
    orderStatus: v.optional(v.string()),
    orderType: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Verify admin, list orders with filters
  },
});

// Mutation: Update order status (Admin only)
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    orderStatus: v.string(),
    trackingNumber: v.optional(v.string()),
    shippingCarrier: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Update status, create history entry, send email
  },
});

// Mutation: Cancel order
export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Cancel order, restore inventory, process refund
  },
});
```

#### 2.7 Review Functions

**File: `convex/reviews.ts`**

```typescript
// Mutation: Submit review
export const submitReview = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    title: v.optional(v.string()),
    comment: v.string(),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    // Implementation: Create review, verify purchase if orderId provided
  },
});

// Query: Get product reviews
export const getProductReviews = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Fetch approved reviews for product
  },
});

// Query: Get pending reviews (Admin only)
export const getPendingReviews = query({
  handler: async (ctx) => {
    // Implementation: Fetch reviews awaiting approval
  },
});

// Mutation: Verify review (Admin only)
export const verifyReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    // Implementation: Update review status, recalculate product rating
  },
});

// Mutation: Mark review helpful
export const markReviewHelpful = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    // Implementation: Increment helpful count
  },
});
```

#### 2.8 Analytics Functions

**File: `convex/analytics.ts`**

```typescript
// Query: Get sales analytics (Admin only)
export const getSalesAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    // Implementation: Calculate sales metrics, revenue, order counts
  },
});

// Query: Get top selling products (Admin only)
export const getTopSellingProducts = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Implementation: Aggregate order items, return top products
  },
});

// Query: Get customer acquisition data (Admin only)
export const getCustomerAcquisition = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation: New users by date, source tracking
  },
});

// Query: Get wholesale vs retail breakdown (Admin only)
export const getOrderTypeBreakdown = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation: Compare retail and wholesale metrics
  },
});
```

#### 2.9 Email Functions

**File: `convex/emails.ts`**

```typescript
// Action: Send order confirmation email
export const sendOrderConfirmation = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // Implementation: Fetch order, send email via Resend
  },
});

// Action: Send shipping notification
export const sendShippingNotification = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // Implementation: Send tracking info email
  },
});

// Action: Send wholesale application status email
export const sendApplicationStatusEmail = action({
  args: {
    applicationId: v.id("wholesaleApplications"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation: Send approval/rejection email
  },
});

// Mutation: Subscribe to newsletter
export const subscribeToNewsletter = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Implementation: Add subscriber, send welcome email
  },
});

// Action: Send marketing campaign
export const sendMarketingCampaign = action({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    // Implementation: Send bulk emails via Resend
  },
});
```

#### 2.10 CMS Functions

**File: `convex/cms.ts`**

```typescript
// Query: Get CMS content by key
export const getContentByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    // Implementation: Fetch active content
  },
});

// Query: Get all banners
export const getActiveBanners = query({
  handler: async (ctx) => {
    // Implementation: Fetch active banners in display order
  },
});

// Mutation: Update CMS content (Admin only)
export const updateCMSContent = mutation({
  args: {
    key: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    // ... other fields
  },
  handler: async (ctx, args) => {
    // Implementation: Upsert content
  },
});

// Mutation: Delete CMS content (Admin only)
export const deleteCMSContent = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    // Implementation: Remove content
  },
});
```

---

### 3. Clerk Authentication Integration

#### 3.1 Environment Configuration

**File: `.env.local`**
```env
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
VITE_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOYMENT=prod:...

# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Resend
RESEND_API_KEY=re_...
```

#### 3.2 Clerk Provider Setup

**File: `src/main.tsx`**
```typescript
import { ClerkProvider } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
```

#### 3.3 Clerk Webhook Handler

**File: `convex/http.ts`**
```typescript
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";

const http = httpRouter();

// Clerk webhook for user sync
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: async (ctx, request) => {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    const webhook = new Webhook(webhookSecret);

    const payload = await request.text();
    const evt = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });

    const { type, data } = evt;

    if (type === "user.created" || type === "user.updated") {
      await ctx.runMutation(internal.users.syncUserFromClerk, {
        clerkId: data.id,
        email: data.email_addresses[0].email_address,
        firstName: data.first_name,
        lastName: data.last_name,
      });
    }

    return new Response(null, { status: 200 });
  },
});

export default http;
```

#### 3.4 Role-Based Access Control

**File: `convex/auth.ts`**
```typescript
import { query } from "./_generated/server";
import { getUserByClerkId } from "./users";

export async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity;
}

export async function requireAdmin(ctx: any) {
  const identity = await requireAuth(ctx);
  const user = await getUserByClerkId(ctx, identity.subject);

  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
}

export async function requireWholesale(ctx: any) {
  const identity = await requireAuth(ctx);
  const user = await getUserByClerkId(ctx, identity.subject);

  if (!user || (user.role !== "wholesale" && user.role !== "admin")) {
    throw new Error("Unauthorized: Wholesale access required");
  }

  return user;
}
```

#### 3.5 Frontend Auth Components

**File: `src/components/auth/SignInButton.tsx`**
```typescript
import { SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';

export function AuthButton() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <SignInButton mode="modal">
      <Button variant="outline">Sign In</Button>
    </SignInButton>
  );
}
```

**File: `src/components/auth/ProtectedRoute.tsx`**
```typescript
import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (requiredRole && user.publicMetadata?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

---

### 4. Razorpay Payment Integration

#### 4.1 Razorpay Order Creation

**File: `convex/payments.ts`**
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const createRazorpayOrder = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderId: args.orderId,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100), // Convert to paise
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        orderId: args.orderId,
      },
    });

    await ctx.runMutation(internal.orders.updateRazorpayOrderId, {
      orderId: args.orderId,
      razorpayOrderId: razorpayOrder.id,
    });

    return razorpayOrder;
  },
});

export const verifyRazorpayPayment = action({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args) => {
    const crypto = require("crypto");

    const body = args.razorpayOrderId + "|" + args.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === args.razorpaySignature;

    if (isValid) {
      await ctx.runMutation(internal.orders.updatePaymentStatus, {
        razorpayOrderId: args.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
        paymentStatus: "paid",
      });
    }

    return { verified: isValid };
  },
});
```

#### 4.2 Frontend Razorpay Checkout

**File: `src/components/checkout/RazorpayCheckout.tsx`**
```typescript
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/clerk-react';

export function RazorpayCheckout({ orderId }: { orderId: string }) {
  const createRazorpayOrder = useAction(api.payments.createRazorpayOrder);
  const verifyPayment = useAction(api.payments.verifyRazorpayPayment);
  const { user } = useUser();

  const handlePayment = async () => {
    const razorpayOrder = await createRazorpayOrder({ orderId });

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
      name: "Nishani Woolera",
      description: "Order Payment",
      prefill: {
        email: user?.emailAddresses[0].emailAddress,
        contact: user?.phoneNumbers[0]?.phoneNumber,
      },
      theme: {
        color: "#3B82F6",
      },
      handler: async (response: any) => {
        const verified = await verifyPayment({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });

        if (verified) {
          // Redirect to order confirmation
          window.location.href = `/order-confirmation/${orderId}`;
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  return (
    <Button onClick={handlePayment} size="lg" className="w-full">
      Pay with Razorpay
    </Button>
  );
}
```

#### 4.3 Razorpay Webhook Handler

**File: `convex/http.ts` (add to existing router)**
```typescript
// Add to http router
http.route({
  path: "/razorpay-webhook",
  method: "POST",
  handler: async (ctx, request) => {
    const crypto = require("crypto");
    const signature = request.headers.get("x-razorpay-signature");
    const body = await request.text();

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature === expectedSignature) {
      const event = JSON.parse(body);

      if (event.event === "payment.captured") {
        await ctx.runMutation(internal.orders.handlePaymentCaptured, {
          razorpayPaymentId: event.payload.payment.entity.id,
          razorpayOrderId: event.payload.payment.entity.order_id,
        });
      }
    }

    return new Response(null, { status: 200 });
  },
});
```

---

### 5. Resend Email Integration

#### 5.1 Email Templates

**File: `convex/emails/templates.ts`**
```typescript
export function orderConfirmationTemplate(order: any) {
  return {
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
            .order-details { background: #F3F4F6; padding: 20px; margin: 20px 0; }
            .item { border-bottom: 1px solid #E5E7EB; padding: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <p>Thank you for your order!</p>
            <div class="order-details">
              <h2>Order #${order.orderNumber}</h2>
              <p>Total: ₹${order.total.toFixed(2)}</p>
              ${order.items.map((item: any) => `
                <div class="item">
                  <strong>${item.name}</strong><br>
                  Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity}<br>
                  ₹${item.subtotal.toFixed(2)}
                </div>
              `).join('')}
            </div>
            <p>We'll send you a shipping confirmation when your items are on the way.</p>
          </div>
        </body>
      </html>
    `,
  };
}

export function shippingNotificationTemplate(order: any) {
  return {
    subject: `Your Order Has Shipped - ${order.orderNumber}`,
    html: `
      <!-- Similar structure with tracking info -->
    `,
  };
}

export function wholesaleApprovalTemplate(application: any, user: any) {
  return {
    subject: "Wholesale Application Approved",
    html: `
      <!-- Approval notification with login instructions -->
    `,
  };
}

export function wholesaleRejectionTemplate(application: any, user: any) {
  return {
    subject: "Wholesale Application Update",
    html: `
      <!-- Rejection notification with reason -->
    `,
  };
}
```

#### 5.2 Resend Integration

**File: `convex/emails/resend.ts`**
```typescript
import { action } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const { data, error } = await resend.emails.send({
      from: "Nishani Woolera <orders@nishaniwoolera.com>",
      to: args.to,
      subject: args.subject,
      html: args.html,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  },
});

export const sendOrderConfirmation = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderId: args.orderId,
    });

    const template = orderConfirmationTemplate(order);

    await sendEmail(ctx, {
      to: order.userEmail,
      subject: template.subject,
      html: template.html,
    });
  },
});
```

---

### 6. Admin Dashboard Specifications

#### 6.1 Admin Routes

**File: `src/App.tsx` (add routes)**
```typescript
// Add admin routes
<Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
  <Route index element={<AdminDashboard />} />
  <Route path="products" element={<AdminProducts />} />
  <Route path="products/new" element={<AdminProductForm />} />
  <Route path="products/:productId/edit" element={<AdminProductForm />} />
  <Route path="orders" element={<AdminOrders />} />
  <Route path="orders/:orderId" element={<AdminOrderDetail />} />
  <Route path="customers" element={<AdminCustomers />} />
  <Route path="wholesale" element={<AdminWholesale />} />
  <Route path="analytics" element={<AdminAnalytics />} />
  <Route path="cms" element={<AdminCMS />} />
  <Route path="email-campaigns" element={<AdminEmailCampaigns />} />
</Route>
```

#### 6.2 Admin Dashboard Component

**File: `src/pages/admin/AdminDashboard.tsx`**
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, Users, ShoppingCart, DollarSign } from 'lucide-react';

export function AdminDashboard() {
  const analytics = useQuery(api.analytics.getSalesAnalytics, {
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    endDate: Date.now(),
  });

  const lowStockProducts = useQuery(api.products.getLowStockProducts);
  const pendingOrders = useQuery(api.orders.listAllOrders, {
    orderStatus: "pending",
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics?.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.orderCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.customerCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {lowStockProducts?.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts, tables, recent activity */}
    </div>
  );
}
```

#### 6.3 Product Management

**File: `src/pages/admin/AdminProducts.tsx`**
```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';

export function AdminProducts() {
  const products = useQuery(api.products.listProducts, {});
  const deleteProduct = useMutation(api.products.deleteProduct);

  const columns = [
    { accessorKey: "name", header: "Product Name" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "retailPrice", header: "Price", cell: ({ row }) => `₹${row.original.retailPrice}` },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => row.original.isActive ? "Active" : "Inactive" },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/products/${row.original._id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteProduct({ productId: row.original._id })}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={() => navigate("/admin/products/new")}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <DataTable columns={columns} data={products || []} />
    </div>
  );
}
```

#### 6.4 Order Management

**File: `src/pages/admin/AdminOrders.tsx`**
```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

export function AdminOrders() {
  const orders = useQuery(api.orders.listAllOrders, {});
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderStatus({ orderId, orderStatus: newStatus });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Orders</h1>

      <div className="space-y-4">
        {orders?.map((order) => (
          <Card key={order._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{order.orderNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground">{order.userEmail}</p>
                </div>
                <Badge variant={order.orderStatus === "delivered" ? "success" : "default"}>
                  {order.orderStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-lg">₹{order.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Payment</p>
                  <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>

              <div className="mt-4">
                <Select
                  value={order.orderStatus}
                  onValueChange={(value) => handleStatusChange(order._id, value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 6.5 Wholesale Applications Management

**File: `src/pages/admin/AdminWholesale.tsx`**
```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export function AdminWholesale() {
  const applications = useQuery(api.wholesaleApplications.listApplications, {});
  const reviewApplication = useMutation(api.wholesaleApplications.reviewApplication);

  const handleApprove = (applicationId: string, tier: string) => {
    reviewApplication({
      applicationId,
      status: "approved",
      assignedTier: tier,
    });
  };

  const handleReject = (applicationId: string, reason: string) => {
    reviewApplication({
      applicationId,
      status: "rejected",
      rejectionReason: reason,
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Wholesale Applications</h1>

      <div className="space-y-4">
        {applications?.map((app) => (
          <Card key={app._id}>
            <CardHeader>
              <CardTitle>{app.companyName}</CardTitle>
              <Badge>{app.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Email:</strong> {app.businessEmail}</p>
                <p><strong>GST:</strong> {app.gstNumber || "N/A"}</p>
                <p><strong>Address:</strong> {app.businessAddress.city}, {app.businessAddress.state}</p>

                {app.status === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => handleApprove(app._id, "tier1")}>
                      Approve (Tier 1)
                    </Button>
                    <Button onClick={() => handleApprove(app._id, "tier2")}>
                      Approve (Tier 2)
                    </Button>
                    <Button onClick={() => handleApprove(app._id, "tier3")}>
                      Approve (Tier 3)
                    </Button>
                    <Button variant="destructive" onClick={() => handleReject(app._id, "")}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

### 7. B2B Wholesale Portal Specifications

#### 7.1 Wholesale Registration Flow

**File: `src/pages/wholesale/WholesaleRegistration.tsx`**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const wholesaleSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  businessEmail: z.string().email().optional(),
  gstNumber: z.string().optional(),
  street: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(5, "Postal code is required"),
  country: z.string().default("India"),
  website: z.string().url().optional(),
});

export function WholesaleRegistration() {
  const submitApplication = useMutation(api.wholesaleApplications.submitWholesaleApplication);

  const form = useForm({
    resolver: zodResolver(wholesaleSchema),
    defaultValues: {
      companyName: "",
      businessEmail: "",
      gstNumber: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      website: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof wholesaleSchema>) => {
    await submitApplication({
      companyName: data.companyName,
      businessEmail: data.businessEmail,
      gstNumber: data.gstNumber,
      businessAddress: {
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
      },
      website: data.website,
    });

    // Show success message
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Apply for Wholesale Account</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField name="companyName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )} />

          <FormField name="businessEmail" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Business Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
            </FormItem>
          )} />

          <FormField name="gstNumber" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>GST Number</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )} />

          {/* Address fields */}

          <Button type="submit" size="lg" className="w-full">
            Submit Application
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

#### 7.2 Wholesale Dashboard

**File: `src/pages/wholesale/WholesaleDashboard.tsx`**
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-react';

export function WholesaleDashboard() {
  const { user } = useUser();
  const userProfile = useQuery(api.users.getCurrentUser);
  const orders = useQuery(api.orders.getUserOrders, {});
  const application = useQuery(api.wholesaleApplications.getUserApplication);

  if (application?.status === "pending") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Application Under Review</h1>
        <p>Your wholesale application is being reviewed. We'll notify you once it's approved.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wholesale Dashboard</h1>
        <p className="text-muted-foreground">
          Tier: {userProfile?.wholesaleTier} | Company: {userProfile?.companyName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Tier Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {userProfile?.wholesaleTier === "tier1" && "10%"}
              {userProfile?.wholesaleTier === "tier2" && "15%"}
              {userProfile?.wholesaleTier === "tier3" && "20%"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orders?.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹50,000</div>
          </CardContent>
        </Card>
      </div>

      {/* Order history, quick reorder, etc. */}
    </div>
  );
}
```

#### 7.3 Wholesale Product Listing (Tiered Pricing)

**File: `src/components/wholesale/WholesaleProductCard.tsx`**
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card } from '@/components/ui/card';

export function WholesaleProductCard({ product }: { product: any }) {
  const user = useQuery(api.users.getCurrentUser);

  // Get wholesale price (tier-based discounts can be applied as percentage adjustments)
  const getWholesalePrice = () => {
    // If no wholesale price set, fall back to retail
    if (!product.wholesalePrice) return product.retailPrice;

    // Tier-based additional discounts can be applied here if needed
    // Currently using the single wholesale price for all tiers
    return product.wholesalePrice;
  };

  const wholesalePrice = getWholesalePrice();
  const discount = ((product.retailPrice - wholesalePrice) / product.retailPrice * 100).toFixed(0);

  return (
    <Card>
      <img src={product.images[0]?.url} alt={product.name} />
      <div className="p-4">
        <h3 className="font-bold">{product.name}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-2xl font-bold">₹{wholesalePrice}</span>
          <span className="text-sm line-through text-muted-foreground">₹{product.retailPrice}</span>
          <Badge variant="success">{discount}% OFF</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          MOQ: {product.minOrderQuantity || 1} units
        </p>
      </div>
    </Card>
  );
}
```

#### 7.4 Bulk Order Form

**File: `src/components/wholesale/BulkOrderForm.tsx`**
```typescript
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Table } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function BulkOrderForm({ product }: { product: any }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const addToCart = useMutation(api.cart.addToCart);

  const handleQuantityChange = (sku: string, quantity: number) => {
    setQuantities({ ...quantities, [sku]: quantity });
  };

  const handleAddAllToCart = async () => {
    for (const [sku, quantity] of Object.entries(quantities)) {
      if (quantity > 0) {
        await addToCart({
          productId: product._id,
          variantSku: sku,
          quantity,
        });
      }
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Bulk Order</h3>
      <Table>
        <thead>
          <tr>
            <th>Size</th>
            <th>Color</th>
            <th>Stock</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {product.variants.map((variant: any) => (
            <tr key={variant.sku}>
              <td>{variant.size}</td>
              <td>{variant.color}</td>
              <td>{variant.stockQuantity}</td>
              <td>
                <Input
                  type="number"
                  min="0"
                  max={variant.stockQuantity}
                  value={quantities[variant.sku] || 0}
                  onChange={(e) => handleQuantityChange(variant.sku, parseInt(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button onClick={handleAddAllToCart} className="mt-4">
        Add All to Cart
      </Button>
    </div>
  );
}
```

---

## Implementation Sequence

### Phase 1: Foundation Setup (Week 1-2)
1. **Convex Setup**
   - Install Convex: `npm install convex`
   - Initialize Convex: `npx convex dev`
   - Create `convex/schema.ts` with all table definitions
   - Deploy schema to Convex cloud

2. **Clerk Integration**
   - Install Clerk: `npm install @clerk/clerk-react`
   - Configure Clerk in `src/main.tsx`
   - Set up Clerk webhook in `convex/http.ts`
   - Implement user sync functionality
   - Add environment variables for Clerk

3. **Basic Auth Flow**
   - Create `src/components/auth/SignInButton.tsx`
   - Create `src/components/auth/ProtectedRoute.tsx`
   - Add sign-in/sign-up pages
   - Test authentication flow

### Phase 2: Product & Inventory Management (Week 3-4)
1. **Product CRUD Operations**
   - Implement all product functions in `convex/products.ts`
   - Create admin product management pages
   - Build product form with image upload
   - Add variant management UI

2. **Product Display**
   - Update existing product listing pages to use Convex queries
   - Implement search functionality
   - Add filtering and sorting
   - Create product detail page with real data

3. **Inventory Tracking**
   - Implement stock update functions
   - Create inventory logs system
   - Build low-stock alert dashboard
   - Add real-time stock updates using Convex subscriptions

### Phase 3: Shopping Cart & Checkout (Week 5-6)
1. **Cart Functionality**
   - Migrate CartContext to use Convex
   - Implement persistent cart for logged-in users
   - Add guest cart with session tracking
   - Build cart merge functionality for login

2. **Razorpay Integration**
   - Install Razorpay: `npm install razorpay`
   - Set up Razorpay credentials
   - Implement payment creation in `convex/payments.ts`
   - Create checkout page with Razorpay widget
   - Add payment verification

3. **Order Processing**
   - Implement order creation function
   - Build order confirmation page
   - Add order history page
   - Create order tracking functionality

### Phase 4: Email Integration (Week 7)
1. **Resend Setup**
   - Install Resend SDK
   - Create email templates in `convex/emails/templates.ts`
   - Implement send functions in `convex/emails/resend.ts`

2. **Transactional Emails**
   - Order confirmation emails
   - Shipping notification emails
   - Account verification emails

3. **Marketing Emails**
   - Newsletter subscription
   - Campaign creation in admin
   - Abandoned cart recovery emails

### Phase 5: Admin Dashboard (Week 8-9)
1. **Dashboard Layout**
   - Create admin layout with sidebar navigation
   - Build dashboard overview page with analytics
   - Add sales charts using Recharts

2. **Order Management**
   - Build order listing page with filters
   - Create order detail page
   - Implement status update functionality
   - Add tracking number input

3. **Customer Management**
   - Build customer listing page
   - Add customer detail view
   - Implement role assignment
   - Create customer analytics

4. **Analytics & Reporting**
   - Sales reports (daily, weekly, monthly)
   - Top-selling products
   - Customer acquisition metrics
   - Revenue breakdown (retail vs wholesale)

### Phase 6: Wholesale Portal (Week 10-11)
1. **Application System**
   - Create wholesale registration form
   - Build document upload functionality
   - Implement application review flow in admin
   - Add approval/rejection notifications

2. **Tiered Pricing**
   - Implement price calculation based on tier
   - Update product cards to show wholesale prices
   - Add tier badge display
   - Create tier comparison page

3. **Bulk Ordering**
   - Build bulk order form component
   - Implement MOQ validation
   - Add quick-add functionality
   - Create wholesale cart view

4. **Wholesale Dashboard**
   - Build wholesale-specific dashboard
   - Add order history with invoicing
   - Create reorder functionality
   - Display tier benefits

### Phase 7: Reviews & Ratings (Week 12)
1. **Review System**
   - Implement review submission
   - Add review moderation in admin
   - Build review display on product pages
   - Calculate and display average ratings

2. **Review Verification**
   - Verify purchase before allowing review
   - Add admin verification status
   - Implement helpful vote system

### Phase 8: CMS & Marketing (Week 13)
1. **Content Management**
   - Build CMS interface for banners
   - Add announcement management
   - Create homepage customization
   - Implement content scheduling

2. **Email Campaigns**
   - Build campaign creation interface
   - Add recipient targeting
   - Implement campaign scheduling
   - Track email analytics (opens, clicks)

### Phase 9: Testing & Optimization (Week 14-15)
1. **End-to-End Testing**
   - Test complete retail checkout flow
   - Test wholesale application and ordering
   - Verify all email triggers
   - Test payment processing

2. **Performance Optimization**
   - Optimize Convex queries
   - Add pagination to all listings
   - Implement lazy loading for images
   - Add caching strategies

3. **Bug Fixes & Polish**
   - Fix UI/UX issues
   - Improve error handling
   - Add loading states
   - Enhance mobile responsiveness

### Phase 10: Deployment (Week 16)
1. **Production Setup**
   - Set up production Convex deployment
   - Configure production Clerk instance
   - Add production Razorpay credentials
   - Set up production Resend account

2. **Deployment**
   - Deploy frontend to Vercel
   - Configure environment variables
   - Set up custom domain
   - Enable SSL certificates

3. **Post-Deployment**
   - Monitor error logs
   - Test all critical flows
   - Set up analytics
   - Create admin user accounts

---

## Validation Plan

### Unit Tests
1. **Convex Functions**
   - Test product CRUD operations
   - Test cart functionality (add, update, remove)
   - Test order creation and status updates
   - Test wholesale application workflow
   - Test payment verification logic

2. **Frontend Components**
   - Test authentication flows
   - Test form validations
   - Test cart operations
   - Test product filtering and search

### Integration Tests
1. **E2E Retail Flow**
   - User registration → Browse products → Add to cart → Checkout → Payment → Order confirmation
   - Verify email notifications at each step
   - Confirm inventory deduction after order

2. **E2E Wholesale Flow**
   - User registration → Submit wholesale application → Admin approval → Login → View wholesale prices → Bulk order → Invoice generation
   - Verify approval email
   - Confirm tiered pricing display

3. **Admin Workflows**
   - Add product → Update inventory → Process order → Ship order → Track delivery
   - Review wholesale application → Approve/reject → Assign tier
   - Create email campaign → Schedule → Send

### Business Logic Verification
1. **Inventory Management**
   - Verify stock decreases on order placement
   - Verify stock increases on order cancellation
   - Confirm low-stock alerts trigger correctly
   - Test overselling prevention

2. **Pricing Logic**
   - Verify correct wholesale price displays based on tier
   - Confirm MOQ enforcement for wholesale orders
   - Test discount calculations
   - Verify tax and shipping calculations

3. **Role-Based Access**
   - Confirm customers cannot access admin pages
   - Verify wholesale users see tiered pricing
   - Test admin-only mutations are protected
   - Validate Clerk JWT authentication

4. **Payment Processing**
   - Test successful Razorpay payment flow
   - Test failed payment handling
   - Verify payment status updates
   - Confirm refund processing

5. **Email Notifications**
   - Verify order confirmation emails send
   - Test shipping notification emails
   - Confirm wholesale application status emails
   - Validate newsletter subscription emails

---

## File Structure

```
D:\Projects\blockhaus-clone-showcase\
├── convex/
│   ├── schema.ts                    # Database schema definitions
│   ├── http.ts                      # HTTP routes (webhooks)
│   ├── auth.ts                      # Authentication helpers
│   ├── products.ts                  # Product queries/mutations
│   ├── users.ts                     # User management functions
│   ├── cart.ts                      # Cart operations
│   ├── wishlist.ts                  # Wishlist functions
│   ├── orders.ts                    # Order management
│   ├── payments.ts                  # Razorpay integration
│   ├── wholesaleApplications.ts     # Wholesale application functions
│   ├── reviews.ts                   # Review system
│   ├── analytics.ts                 # Analytics queries
│   ├── cms.ts                       # CMS functions
│   ├── emails/
│   │   ├── templates.ts             # Email templates
│   │   └── resend.ts                # Resend integration
│   └── _generated/                  # Convex generated files
│
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SignInButton.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── checkout/
│   │   │   ├── RazorpayCheckout.tsx
│   │   │   ├── CheckoutForm.tsx
│   │   │   └── AddressForm.tsx
│   │   ├── wholesale/
│   │   │   ├── WholesaleProductCard.tsx
│   │   │   ├── BulkOrderForm.tsx
│   │   │   └── WholesaleApplicationForm.tsx
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── OrderStatusSelect.tsx
│   │   │   └── AnalyticsChart.tsx
│   │   └── ui/                      # Existing Shadcn components
│   │
│   ├── pages/
│   │   ├── Index.tsx                # Homepage (existing)
│   │   ├── Shop.tsx                 # Product listing (existing)
│   │   ├── ProductDetail.tsx        # Product detail (existing)
│   │   ├── Cart.tsx                 # New cart page
│   │   ├── Checkout.tsx             # New checkout page
│   │   ├── OrderConfirmation.tsx    # New order confirmation
│   │   ├── Account.tsx              # User account page
│   │   ├── OrderHistory.tsx         # Order history
│   │   ├── wholesale/
│   │   │   ├── WholesaleRegistration.tsx
│   │   │   ├── WholesaleDashboard.tsx
│   │   │   └── WholesaleProducts.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminProducts.tsx
│   │       ├── AdminOrders.tsx
│   │       ├── AdminCustomers.tsx
│   │       ├── AdminWholesale.tsx
│   │       ├── AdminAnalytics.tsx
│   │       ├── AdminCMS.tsx
│   │       └── AdminEmailCampaigns.tsx
│   │
│   ├── context/
│   │   └── CartContext.tsx          # Update to use Convex
│   │
│   ├── hooks/
│   │   ├── use-smooth-scroll.tsx    # Existing
│   │   └── use-toast.ts             # Existing
│   │
│   ├── lib/
│   │   └── utils.ts                 # Existing utilities
│   │
│   ├── App.tsx                      # Update with new routes
│   └── main.tsx                     # Add Clerk and Convex providers
│
├── .env.local                       # Environment variables
├── package.json                     # Add new dependencies
└── convex.json                      # Convex configuration
```

---

## Dependencies to Install

```json
{
  "dependencies": {
    // Existing dependencies remain...

    // New additions:
    "@clerk/clerk-react": "^5.x",
    "convex": "^1.x",
    "convex-helpers": "^0.x",
    "razorpay": "^2.x",
    "resend": "^3.x"
  },
  "devDependencies": {
    // Existing remain unchanged
  }
}
```

---

## Environment Variables

**File: `.env.local`**
```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex Backend
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment

# Razorpay Payment Gateway
VITE_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Resend Email Service
RESEND_API_KEY=re_...

# App Configuration
VITE_APP_URL=http://localhost:8080
VITE_API_URL=https://your-deployment.convex.cloud
```

---

## Configuration Files

### Convex Configuration

**File: `convex.json`**
```json
{
  "functions": "convex/",
  "node": {
    "externalPackages": ["razorpay", "resend", "svix"]
  }
}
```

### Updated Vite Configuration

**File: `vite.config.ts`**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure Razorpay SDK works in production
    'process.env': {},
  },
}));
```

---

## API Rate Limits & Quotas

### Clerk
- Free tier: 5,000 monthly active users
- Webhook delivery: Best-effort (use retry logic)

### Convex
- Free tier: 1GB storage, 1M function calls/month
- Real-time subscriptions: Unlimited on all tiers
- File storage: 1GB free, then paid

### Razorpay
- Test mode: Unlimited transactions
- Production: Transaction fees apply (2% + GST)
- Webhook retries: 3 attempts with exponential backoff

### Resend
- Free tier: 100 emails/day
- Paid: $20/month for 50,000 emails
- Rate limit: 1 email/second on free tier

---

## Security Considerations

1. **Authentication**
   - All Convex mutations verify Clerk JWT tokens
   - Admin functions use `requireAdmin()` helper
   - Wholesale functions use `requireWholesale()` helper

2. **Payment Security**
   - Razorpay payment verification using signature
   - Never expose Razorpay secret key in frontend
   - Validate payment amounts server-side

3. **Data Access**
   - Users can only access their own orders and cart
   - Admins can access all data
   - Wholesale users can only see approved applications

4. **File Uploads**
   - Validate file types and sizes
   - Use Convex file storage with access control
   - Scan uploaded files for malware

5. **Rate Limiting**
   - Implement rate limiting on expensive operations
   - Throttle email sends to prevent spam
   - Limit API calls per user

---

## Success Metrics

### Technical Metrics
- [ ] All Convex schema tables deployed successfully
- [ ] Clerk authentication working with role-based access
- [ ] Razorpay payments processing successfully
- [ ] Email notifications sending via Resend
- [ ] Real-time inventory updates functioning
- [ ] Admin dashboard displaying analytics
- [ ] Wholesale portal showing tiered pricing

### Business Metrics
- [ ] Users can complete retail checkout in < 3 minutes
- [ ] Wholesale applications processed within 24 hours
- [ ] Order fulfillment time < 48 hours
- [ ] Email open rate > 20%
- [ ] Cart abandonment rate < 70%
- [ ] Wholesale conversion rate > 10%

---

This technical specification provides a complete blueprint for transforming the Nishani Woolera showcase site into a full-fledged e-commerce platform with B2C and B2B capabilities. Each section maps directly to implementation tasks with specific file paths, function signatures, and integration details.
