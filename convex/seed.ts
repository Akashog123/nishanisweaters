import { mutation } from "./_generated/server";

// Seed products for development
export const seedProducts = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    const products = [
      {
        name: "Premium Wool Sweater",
        slug: "premium-wool-sweater",
        description: "Luxuriously soft merino wool sweater crafted for ultimate comfort and warmth. Perfect for chilly winter evenings.",
        shortDescription: "Soft merino wool sweater",
        category: "sweaters",
        retailPrice: 2999,
        wholesalePrice: 2399,
        compareAtPrice: 3499,
        images: [
          { url: "/placeholder.svg", alt: "Premium Wool Sweater", order: 0 },
        ],
        variants: [
          { sku: "PWS-S-BLK", size: "S", color: "Black", colorHex: "#000000", stockQuantity: 25, lowStockThreshold: 5 },
          { sku: "PWS-M-BLK", size: "M", color: "Black", colorHex: "#000000", stockQuantity: 30, lowStockThreshold: 5 },
          { sku: "PWS-L-BLK", size: "L", color: "Black", colorHex: "#000000", stockQuantity: 20, lowStockThreshold: 5 },
          { sku: "PWS-S-NVY", size: "S", color: "Navy", colorHex: "#1a237e", stockQuantity: 15, lowStockThreshold: 5 },
          { sku: "PWS-M-NVY", size: "M", color: "Navy", colorHex: "#1a237e", stockQuantity: 25, lowStockThreshold: 5 },
          { sku: "PWS-L-NVY", size: "L", color: "Navy", colorHex: "#1a237e", stockQuantity: 18, lowStockThreshold: 5 },
        ],
        tags: ["winter", "wool", "sweater", "premium"],
        featured: true,
        bestseller: true,
        newArrival: false,
        minOrderQuantity: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Classic Cashmere Cardigan",
        slug: "classic-cashmere-cardigan",
        description: "Elegant cashmere cardigan with button-front closure. A timeless piece for your winter wardrobe.",
        shortDescription: "Elegant cashmere cardigan",
        category: "sweaters",
        retailPrice: 4999,
        wholesalePrice: 3999,
        compareAtPrice: 5999,
        images: [
          { url: "/placeholder.svg", alt: "Classic Cashmere Cardigan", order: 0 },
        ],
        variants: [
          { sku: "CCC-S-CRM", size: "S", color: "Cream", colorHex: "#FFFDD0", stockQuantity: 12, lowStockThreshold: 3 },
          { sku: "CCC-M-CRM", size: "M", color: "Cream", colorHex: "#FFFDD0", stockQuantity: 15, lowStockThreshold: 3 },
          { sku: "CCC-L-CRM", size: "L", color: "Cream", colorHex: "#FFFDD0", stockQuantity: 10, lowStockThreshold: 3 },
          { sku: "CCC-S-GRY", size: "S", color: "Grey", colorHex: "#808080", stockQuantity: 8, lowStockThreshold: 3 },
          { sku: "CCC-M-GRY", size: "M", color: "Grey", colorHex: "#808080", stockQuantity: 12, lowStockThreshold: 3 },
        ],
        tags: ["winter", "cashmere", "cardigan", "luxury"],
        featured: true,
        bestseller: false,
        newArrival: true,
        minOrderQuantity: 3,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Warm Winter Jacket",
        slug: "warm-winter-jacket",
        description: "Insulated winter jacket with faux fur hood lining. Water-resistant outer shell keeps you dry and warm.",
        shortDescription: "Insulated winter jacket",
        category: "jackets",
        retailPrice: 6999,
        wholesalePrice: 5599,
        compareAtPrice: 8499,
        images: [
          { url: "/placeholder.svg", alt: "Warm Winter Jacket", order: 0 },
        ],
        variants: [
          { sku: "WWJ-S-BLK", size: "S", color: "Black", colorHex: "#000000", stockQuantity: 20, lowStockThreshold: 5 },
          { sku: "WWJ-M-BLK", size: "M", color: "Black", colorHex: "#000000", stockQuantity: 25, lowStockThreshold: 5 },
          { sku: "WWJ-L-BLK", size: "L", color: "Black", colorHex: "#000000", stockQuantity: 18, lowStockThreshold: 5 },
          { sku: "WWJ-XL-BLK", size: "XL", color: "Black", colorHex: "#000000", stockQuantity: 10, lowStockThreshold: 5 },
          { sku: "WWJ-S-OLV", size: "S", color: "Olive", colorHex: "#556B2F", stockQuantity: 15, lowStockThreshold: 5 },
          { sku: "WWJ-M-OLV", size: "M", color: "Olive", colorHex: "#556B2F", stockQuantity: 20, lowStockThreshold: 5 },
        ],
        tags: ["winter", "jacket", "warm", "waterproof"],
        featured: true,
        bestseller: true,
        newArrival: false,
        minOrderQuantity: 3,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Cozy Knit Beanie",
        slug: "cozy-knit-beanie",
        description: "Soft knit beanie with fleece lining for extra warmth. One size fits most.",
        shortDescription: "Fleece-lined knit beanie",
        category: "accessories",
        retailPrice: 599,
        wholesalePrice: 479,
        compareAtPrice: 799,
        images: [
          { url: "/placeholder.svg", alt: "Cozy Knit Beanie", order: 0 },
        ],
        variants: [
          { sku: "CKB-OS-BLK", size: "One Size", color: "Black", colorHex: "#000000", stockQuantity: 50, lowStockThreshold: 10 },
          { sku: "CKB-OS-GRY", size: "One Size", color: "Grey", colorHex: "#808080", stockQuantity: 45, lowStockThreshold: 10 },
          { sku: "CKB-OS-RED", size: "One Size", color: "Red", colorHex: "#DC143C", stockQuantity: 35, lowStockThreshold: 10 },
          { sku: "CKB-OS-NVY", size: "One Size", color: "Navy", colorHex: "#1a237e", stockQuantity: 40, lowStockThreshold: 10 },
        ],
        tags: ["winter", "beanie", "accessories", "warm"],
        featured: false,
        bestseller: false,
        newArrival: true,
        minOrderQuantity: 10,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Wool Blend Scarf",
        slug: "wool-blend-scarf",
        description: "Long wool blend scarf with fringe detail. Perfect accessory for layering.",
        shortDescription: "Wool blend scarf with fringe",
        category: "accessories",
        retailPrice: 899,
        wholesalePrice: 719,
        images: [
          { url: "/placeholder.svg", alt: "Wool Blend Scarf", order: 0 },
        ],
        variants: [
          { sku: "WBS-OS-BRG", size: "One Size", color: "Burgundy", colorHex: "#800020", stockQuantity: 30, lowStockThreshold: 8 },
          { sku: "WBS-OS-CML", size: "One Size", color: "Camel", colorHex: "#C19A6B", stockQuantity: 28, lowStockThreshold: 8 },
          { sku: "WBS-OS-CHR", size: "One Size", color: "Charcoal", colorHex: "#36454F", stockQuantity: 35, lowStockThreshold: 8 },
        ],
        tags: ["winter", "scarf", "accessories", "wool"],
        featured: false,
        bestseller: true,
        newArrival: false,
        minOrderQuantity: 10,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Fleece Lined Gloves",
        slug: "fleece-lined-gloves",
        description: "Touchscreen-compatible fleece lined gloves. Stay connected while staying warm.",
        shortDescription: "Touchscreen fleece gloves",
        category: "accessories",
        retailPrice: 699,
        wholesalePrice: 559,
        images: [
          { url: "/placeholder.svg", alt: "Fleece Lined Gloves", order: 0 },
        ],
        variants: [
          { sku: "FLG-S-BLK", size: "S", color: "Black", colorHex: "#000000", stockQuantity: 40, lowStockThreshold: 10 },
          { sku: "FLG-M-BLK", size: "M", color: "Black", colorHex: "#000000", stockQuantity: 50, lowStockThreshold: 10 },
          { sku: "FLG-L-BLK", size: "L", color: "Black", colorHex: "#000000", stockQuantity: 35, lowStockThreshold: 10 },
        ],
        tags: ["winter", "gloves", "accessories", "touchscreen"],
        featured: false,
        bestseller: false,
        newArrival: true,
        minOrderQuantity: 12,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Men's Thermal Henley",
        slug: "mens-thermal-henley",
        description: "Classic thermal henley shirt with button placket. Ideal base layer for cold weather.",
        shortDescription: "Thermal henley base layer",
        category: "mens",
        retailPrice: 1299,
        wholesalePrice: 1039,
        compareAtPrice: 1599,
        images: [
          { url: "/placeholder.svg", alt: "Men's Thermal Henley", order: 0 },
        ],
        variants: [
          { sku: "MTH-S-WHT", size: "S", color: "White", colorHex: "#FFFFFF", stockQuantity: 25, lowStockThreshold: 5 },
          { sku: "MTH-M-WHT", size: "M", color: "White", colorHex: "#FFFFFF", stockQuantity: 30, lowStockThreshold: 5 },
          { sku: "MTH-L-WHT", size: "L", color: "White", colorHex: "#FFFFFF", stockQuantity: 28, lowStockThreshold: 5 },
          { sku: "MTH-XL-WHT", size: "XL", color: "White", colorHex: "#FFFFFF", stockQuantity: 20, lowStockThreshold: 5 },
          { sku: "MTH-S-CHR", size: "S", color: "Charcoal", colorHex: "#36454F", stockQuantity: 22, lowStockThreshold: 5 },
          { sku: "MTH-M-CHR", size: "M", color: "Charcoal", colorHex: "#36454F", stockQuantity: 28, lowStockThreshold: 5 },
          { sku: "MTH-L-CHR", size: "L", color: "Charcoal", colorHex: "#36454F", stockQuantity: 25, lowStockThreshold: 5 },
        ],
        tags: ["winter", "thermal", "mens", "base layer"],
        featured: false,
        bestseller: true,
        newArrival: false,
        minOrderQuantity: 6,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Women's Puffer Vest",
        slug: "womens-puffer-vest",
        description: "Lightweight but warm puffer vest with stand collar. Perfect for layering on cool days.",
        shortDescription: "Lightweight puffer vest",
        category: "womens",
        retailPrice: 2499,
        wholesalePrice: 1999,
        compareAtPrice: 2999,
        images: [
          { url: "/placeholder.svg", alt: "Women's Puffer Vest", order: 0 },
        ],
        variants: [
          { sku: "WPV-XS-BLK", size: "XS", color: "Black", colorHex: "#000000", stockQuantity: 15, lowStockThreshold: 4 },
          { sku: "WPV-S-BLK", size: "S", color: "Black", colorHex: "#000000", stockQuantity: 20, lowStockThreshold: 4 },
          { sku: "WPV-M-BLK", size: "M", color: "Black", colorHex: "#000000", stockQuantity: 22, lowStockThreshold: 4 },
          { sku: "WPV-L-BLK", size: "L", color: "Black", colorHex: "#000000", stockQuantity: 18, lowStockThreshold: 4 },
          { sku: "WPV-XS-RSE", size: "XS", color: "Rose", colorHex: "#FF007F", stockQuantity: 12, lowStockThreshold: 4 },
          { sku: "WPV-S-RSE", size: "S", color: "Rose", colorHex: "#FF007F", stockQuantity: 15, lowStockThreshold: 4 },
          { sku: "WPV-M-RSE", size: "M", color: "Rose", colorHex: "#FF007F", stockQuantity: 18, lowStockThreshold: 4 },
        ],
        tags: ["winter", "vest", "womens", "puffer"],
        featured: true,
        bestseller: false,
        newArrival: true,
        minOrderQuantity: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const insertedIds = [];
    for (const product of products) {
      const id = await ctx.db.insert("products", product);
      insertedIds.push(id);
    }

    return { success: true, count: insertedIds.length, ids: insertedIds };
  },
});

// Create a sample admin user
export const createAdminUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if admin exists
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();

    if (existingAdmin) {
      return { success: false, message: "Admin already exists", userId: existingAdmin._id };
    }

    const userId = await ctx.db.insert("users", {
      clerkId: "admin_placeholder",
      email: "admin@nidhisweaters.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      shippingAddresses: [],
      emailNotifications: true,
      smsNotifications: false,
      createdAt: Date.now(),
    });

    return { success: true, userId };
  },
});

// Promote an existing user to admin by email
// SECURITY: Requires caller to already be an admin
// First admin must be created via direct database edit in Convex Dashboard
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

export const promoteToAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Only existing admins can promote other users
    await requireAdmin(ctx);

    // Find target user by email
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!targetUser) {
      return {
        success: false,
        message: `User with email ${args.email} not found. They need to sign up first.`,
      };
    }

    if (targetUser.role === "admin") {
      return {
        success: false,
        message: `User ${args.email} is already an admin.`,
        userId: targetUser._id,
      };
    }

    // Promote to admin
    await ctx.db.patch(targetUser._id, { role: "admin" });

    return {
      success: true,
      message: `Successfully promoted ${args.email} to admin.`,
      userId: targetUser._id,
    };
  },
});
