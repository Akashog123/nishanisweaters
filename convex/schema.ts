import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Products Table
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),

    // Pricing
    retailPrice: v.number(),
    wholesalePriceTier1: v.number(),
    wholesalePriceTier2: v.number(),
    wholesalePriceTier3: v.number(),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),

    // Media
    images: v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.string()),
      alt: v.string(),
      order: v.number(),
    })),
    videos: v.optional(v.array(v.object({
      youtubeId: v.string(),         // 11-character YouTube video ID
      title: v.optional(v.string()), // Optional admin-provided title
      thumbnail: v.string(),         // Auto-generated thumbnail URL
      order: v.number(),             // Display order in gallery
    }))),

    // Variants
    variants: v.array(v.object({
      sku: v.string(),
      size: v.string(),
      color: v.string(),
      colorHex: v.optional(v.string()),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
      weight: v.optional(v.number()),
    })),

    // SEO & Discovery
    tags: v.array(v.string()),
    featured: v.boolean(),
    bestseller: v.boolean(),
    newArrival: v.boolean(),

    // Wholesale
    minOrderQuantity: v.optional(v.number()),

    // Ratings & Reviews
    averageRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),

    // Metadata
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
    // Denormalized flag for efficient low stock queries
    hasLowStock: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_featured", ["featured"])
    .index("by_bestseller", ["bestseller"])
    .index("by_is_active", ["isActive"])
    // Compound indexes for optimized filtering
    .index("by_category_active", ["category", "isActive"])
    .index("by_featured_active", ["featured", "isActive"])
    .index("by_bestseller_active", ["bestseller", "isActive"])
    .index("by_new_arrival_active", ["newArrival", "isActive"])
    // Index for low stock queries (products flagged as having low stock)
    .index("by_has_low_stock", ["hasLowStock"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["category", "isActive"],
    }),

  // Users Table (Clerk Integration)
  users: defineTable({
    clerkId: v.string(),
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
    .index("by_wholesale_status", ["wholesaleStatus"]),

  // Wholesale Applications Table
  wholesaleApplications: defineTable({
    userId: v.optional(v.string()),
    clerkId: v.string(),

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
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),

    // Metadata
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_status", ["status"])
    .index("by_status_submitted", ["status", "submittedAt"]),

  // Cart Table
  cart: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),

    items: v.array(v.object({
      productId: v.id("products"),
      variantSku: v.string(),
      quantity: v.number(),
      name: v.string(),
      image: v.string(),
      size: v.string(),
      color: v.string(),
      price: v.number(),
      addedAt: v.number(),
    })),

    lastModified: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_session_id", ["sessionId"])
    .index("by_expires_at", ["expiresAt"]),

  // Wishlist Table
  wishlist: defineTable({
    userId: v.string(),

    items: v.array(v.object({
      productId: v.id("products"),
      addedAt: v.number(),
    })),

    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"]),

  // Orders Table
  orders: defineTable({
    orderNumber: v.string(),
    userId: v.string(),
    userEmail: v.string(),

    // Order Type
    orderType: v.union(v.literal("retail"), v.literal("wholesale")),

    // Items
    items: v.array(v.object({
      productId: v.id("products"),
      variantSku: v.string(),
      quantity: v.number(),
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
    // Compound indexes for optimized queries
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status_created", ["orderStatus", "createdAt"])
    .index("by_payment_created", ["paymentStatus", "createdAt"]),

  // Order Status History
  orderStatusHistory: defineTable({
    orderId: v.id("orders"),
    fromStatus: v.optional(v.string()),
    toStatus: v.string(),
    changedBy: v.string(),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_order_id", ["orderId"]),

  // Reviews Table
  reviews: defineTable({
    productId: v.id("products"),
    userId: v.string(),
    orderId: v.optional(v.id("orders")),

    rating: v.number(),
    title: v.optional(v.string()),
    comment: v.string(),

    isVerifiedPurchase: v.boolean(),
    isVerifiedByAdmin: v.boolean(),

    helpfulCount: v.number(),

    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product_id", ["productId"])
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"]),

  // Inventory Logs
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
    changedBy: v.string(),

    timestamp: v.number(),
  })
    .index("by_product_id", ["productId"])
    .index("by_timestamp", ["timestamp"]),

  // Newsletter Subscribers
  newsletterSubscribers: defineTable({
    email: v.string(),
    isSubscribed: v.boolean(),
    subscribedAt: v.optional(v.number()),
    unsubscribedAt: v.optional(v.number()),
    tags: v.array(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_is_subscribed", ["isSubscribed"]),

  // CMS Content
  cmsContent: defineTable({
    key: v.string(),
    type: v.union(
      v.literal("banner"),
      v.literal("announcement"),
      v.literal("text_block"),
      v.literal("image"),
      v.literal("video")
    ),

    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaLink: v.optional(v.string()),

    isActive: v.boolean(),
    displayOrder: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),

    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_type", ["type"])
    .index("by_is_active", ["isActive"]),
});
