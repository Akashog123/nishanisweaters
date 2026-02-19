import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Products Table
  // =========================================================================
  // SCHEMA DESIGN DECISIONS:
  // 1. Denormalized fields (availableSizes, availableColors, priceBucket) enable
  //    indexed filtering without scanning variant arrays
  // 2. Price buckets allow range queries using equality indexes (Convex limitation)
  // 3. createdAt index supports "newest" sorting with true pagination
  // =========================================================================
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),

    // Pricing
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),

    // =========================================================================
    // DENORMALIZED FIELDS FOR EFFICIENT FILTERING
    // These must be updated whenever variants change (see updateProduct mutation)
    // =========================================================================
    // Available sizes across all variants (e.g., ["S", "M", "L"])
    availableSizes: v.optional(v.array(v.string())),
    // Available colors across all variants (e.g., ["Black", "White"])
    availableColors: v.optional(v.array(v.string())),
    // Price bucket for range queries: "0-1000", "1000-2500", "2500-5000", "5000-10000", "10000+"
    priceBucket: v.optional(v.string()),

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
    // =========================================================================
    // NEW INDEXES FOR EFFICIENT SORTING AND FILTERING
    // =========================================================================
    // Price bucket index for range filtering (avoids full table scan)
    .index("by_price_bucket_active", ["priceBucket", "isActive"])
    // Sorting indexes: enable true indexed sorting with pagination
    .index("by_created_at", ["createdAt"])
    .index("by_retail_price_active", ["isActive", "retailPrice"])
    .index("by_name_active", ["isActive", "name"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["category", "isActive"],
    }),

  // Categories Table - Admin-managed product categories
  categories: defineTable({
    name: v.string(),           // Display name: "Men's Wear"
    slug: v.string(),           // URL slug: "mens"
    description: v.optional(v.string()),

    // Display settings
    isActive: v.boolean(),      // Whether category is active
    showInHeader: v.boolean(),  // Whether to show in main navigation
    displayOrder: v.number(),   // Order in navigation/lists

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_is_active", ["isActive"])
    .index("by_show_in_header", ["showInHeader"])
    .index("by_display_order", ["displayOrder"]),

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
      v.literal("admin")
    ),

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
    .index("by_role", ["role"]),

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

    // Promo Code
    appliedPromoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),

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

    // Promo Code
    promoCodeId: v.optional(v.id("promoCodes")),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),

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
      v.literal("partially_refunded"),
      v.literal("disputed"),
      v.literal("refund_pending"),
      v.literal("refund_failed")
    ),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),

    // Dispute tracking
    disputeStatus: v.optional(
      v.union(
        v.literal("created"),
        v.literal("under_review"),
        v.literal("action_required"),
        v.literal("won"),
        v.literal("lost"),
        v.literal("closed")
      )
    ),
    disputeId: v.optional(v.string()),
    disputeReason: v.optional(v.string()),
    disputeCreatedAt: v.optional(v.number()),
    disputeResolvedAt: v.optional(v.number()),

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
    .index("by_payment_created", ["paymentStatus", "createdAt"])
    // Index for webhook lookups by Razorpay order ID
    .index("by_razorpay_order_id", ["razorpayOrderId"]),

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
    .index("by_status", ["status"])
    // Compound indexes for efficient queries
    .index("by_product_status", ["productId", "status"])
    .index("by_product_status_created", ["productId", "status", "createdAt"]),

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

  // Promo Codes Table
  promoCodes: defineTable({
    code: v.string(),
    description: v.string(),

    // Discount Configuration
    discountType: v.union(
      v.literal("percentage"),
      v.literal("fixed")
    ),
    discountValue: v.number(),

    // Validation Rules
    minOrderAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),

    // Usage Limits
    usageLimit: v.optional(v.number()),
    usagePerUser: v.optional(v.number()),
    currentUsageCount: v.number(),

    // Time Constraints
    startsAt: v.number(),
    expiresAt: v.optional(v.number()),

    // Restrictions
    applicableCategories: v.optional(v.array(v.string())),
    excludeWholesale: v.boolean(),

    // Status
    isActive: v.boolean(),

    // Metadata
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_is_active", ["isActive"])
    .index("by_expires_at", ["expiresAt"]),

  // Promo Code Usage Tracking
  promoCodeUsage: defineTable({
    promoCodeId: v.id("promoCodes"),
    userId: v.string(),
    orderId: v.id("orders"),
    discountApplied: v.number(),
    usedAt: v.number(),
  })
    .index("by_promo_code", ["promoCodeId"])
    .index("by_user", ["userId"])
    .index("by_promo_user", ["promoCodeId", "userId"]),

  // Email Logs Table
  emailLogs: defineTable({
    emailType: v.union(
      v.literal("order_confirmation"),
      v.literal("shipping_update"),
      v.literal("abandoned_cart"),
      v.literal("welcome"),
      v.literal("wholesale_status"),
      v.literal("newsletter_welcome"),
      v.literal("contact_inquiry")
    ),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    subject: v.string(),

    // Reference data
    orderId: v.optional(v.id("orders")),
    userId: v.optional(v.string()),
    cartId: v.optional(v.id("cart")),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),

    // Metadata
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_email_type", ["emailType"])
    .index("by_status", ["status"])
    .index("by_recipient", ["recipientEmail"])
    .index("by_order_id", ["orderId"]),

  // Abandoned Cart Notifications
  abandonedCartNotifications: defineTable({
    cartId: v.id("cart"),
    userId: v.optional(v.string()),
    email: v.string(),
    reminderCount: v.number(),
    lastReminderAt: v.number(),
    nextReminderAt: v.optional(v.number()),
    convertedToOrder: v.boolean(),
    orderId: v.optional(v.id("orders")),
    createdAt: v.number(),
  })
    .index("by_cart_id", ["cartId"])
    .index("by_email", ["email"])
    .index("by_next_reminder", ["nextReminderAt"])
    .index("by_converted", ["convertedToOrder"]),

  // Settings Table - Admin-configurable business settings
  settings: defineTable({
    // Unique setting key (e.g., "PRICING.TAX_RATE", "SHIPPING.FREE_THRESHOLD")
    key: v.string(),
    // Human-readable label for admin UI
    label: v.string(),
    // Detailed description of what this setting controls
    description: v.string(),
    // Category for grouping in UI
    category: v.union(
      v.literal("pricing_tax"),
      v.literal("shipping"),
      v.literal("cart_session"),
      v.literal("validation"),
      v.literal("pagination"),
      v.literal("abandoned_cart"),
      v.literal("email"),
      v.literal("contact"),
      v.literal("social_links"),
      v.literal("images"),
      v.literal("branding"),
      v.literal("content"),
      v.literal("display"),
      v.literal("business_info"),
      v.literal("legal")
    ),
    // Value type for proper input rendering and validation
    valueType: v.union(
      v.literal("number"),
      v.literal("percentage"),
      v.literal("currency"),
      v.literal("duration_ms"),
      v.literal("duration_hours"),
      v.literal("string"),
      v.literal("text"),
      v.literal("email"),
      v.literal("phone"),
      v.literal("url"),
      v.literal("boolean")
    ),
    // The actual value (stored as string, parsed based on valueType)
    value: v.string(),
    // Default value for reset functionality
    defaultValue: v.string(),
    // Optional constraints
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    // Display order within category
    displayOrder: v.number(),
    // Affected code areas (for preview feature)
    affectedAreas: v.array(v.string()),
    // Metadata
    isActive: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"])
    .index("by_category_order", ["category", "displayOrder"]),

  // Settings History Table - Audit trail for all settings changes
  settingsHistory: defineTable({
    // Reference to the setting
    settingId: v.id("settings"),
    settingKey: v.string(),
    // Change details
    previousValue: v.string(),
    newValue: v.string(),
    // Who made the change
    changedBy: v.string(),
    changedByEmail: v.optional(v.string()),
    changedByName: v.optional(v.string()),
    // Change metadata
    changeReason: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_setting_id", ["settingId"])
    .index("by_setting_key", ["settingKey"])
    .index("by_changed_by", ["changedBy"])
    .index("by_timestamp", ["timestamp"]),

  // Settings Categories Table - Dynamic category management
  settingsCategories: defineTable({
    key: v.string(),           // Unique key: "pricing_tax", "branding", "custom_shipping"
    label: v.string(),         // Display label: "Pricing & Tax", "Branding"
    description: v.string(),  // Category description
    icon: v.string(),         // Icon name for UI
    displayOrder: v.number(),  // Sorting order
    isSystem: v.boolean(),    // true for built-in categories (cannot delete)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_display_order", ["displayOrder"]),

  // =========================================================================
  // SECURITY INFRASTRUCTURE TABLES
  // =========================================================================

  // Security Events Table - Audit trail for security-related events
  securityEvents: defineTable({
    eventType: v.union(
      v.literal("admin_action"),
      v.literal("rate_limit_violation"),
      v.literal("invalid_signature"),
      v.literal("auth_failure"),
      v.literal("unauthorized_access"),
      v.literal("suspicious_activity")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    userId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    action: v.string(),
    resource: v.optional(v.string()),
    details: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON stringified additional data
    timestamp: v.number(),
  })
    .index("by_event_type", ["eventType"])
    .index("by_severity", ["severity"])
    .index("by_user_id", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_severity_timestamp", ["severity", "timestamp"]),

  // Contact Form Submissions Table
  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.union(
      v.literal("general"),
      v.literal("order_inquiry"),
      v.literal("wholesale"),
      v.literal("feedback"),
      v.literal("other")
    ),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved")
    ),
    userId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    reviewedBy: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"])
    .index("by_status_created", ["status", "createdAt"]),

  // Webhook Events Table - Idempotency tracking for Razorpay webhooks
  // Stores processed event IDs to prevent duplicate processing
  webhookEvents: defineTable({
    // Razorpay's unique event ID from x-razorpay-event-id header
    eventId: v.string(),
    // Event type (e.g., "payment.captured", "order.paid")
    eventType: v.string(),
    // When the event was processed
    processedAt: v.number(),
    // Associated order (if applicable)
    orderId: v.optional(v.id("orders")),
    // Processing result
    success: v.boolean(),
    // Optional error message if processing failed
    errorMessage: v.optional(v.string()),
  })
    .index("by_event_id", ["eventId"])
    .index("by_processed_at", ["processedAt"]),

  // Rate Limits Table - Distributed rate limiting across Convex instances
  rateLimits: defineTable({
    // Unique identifier (e.g., "webhook:192.168.1.1" or "api:user123")
    identifier: v.string(),
    // Rate limit category for different limits per endpoint type
    category: v.union(
      v.literal("webhook"),
      v.literal("api"),
      v.literal("auth"),
      v.literal("mutation")
    ),
    // Sliding window start time
    windowStart: v.number(),
    // Number of requests in current window
    requestCount: v.number(),
    // Last request timestamp
    lastRequest: v.number(),
    // When this record should be cleaned up
    expiresAt: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_category", ["category"])
    .index("by_expires_at", ["expiresAt"]),
});
