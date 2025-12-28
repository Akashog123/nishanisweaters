import { query, mutation, type Cursor } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, getCurrentUser } from "./lib/auth";
import { Doc } from "./_generated/dataModel";

/**
 * Strip wholesale pricing from product data for non-wholesale users.
 * SECURITY: Prevents price leakage to unauthorized users.
 */
function sanitizeProductPricing<T extends Doc<"products">>(
  product: T,
  canSeeWholesalePrices: boolean
): Omit<T, "wholesalePriceTier1" | "wholesalePriceTier2" | "wholesalePriceTier3"> & {
  wholesalePriceTier1?: number;
  wholesalePriceTier2?: number;
  wholesalePriceTier3?: number;
} {
  if (canSeeWholesalePrices) {
    return product;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { wholesalePriceTier1, wholesalePriceTier2, wholesalePriceTier3, ...rest } = product;
  return rest;
}

// Query: Get all products with filtering and pagination
export const listProducts = query({
  args: {
    category: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    bestseller: v.optional(v.boolean()),
    newArrival: v.optional(v.boolean()),
    // New filter options
    sizes: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    sortBy: v.optional(v.union(
      v.literal("price_asc"),
      v.literal("price_desc"),
      v.literal("name_asc"),
      v.literal("name_desc"),
      v.literal("newest"),
      v.literal("popularity")
    )),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Check if user can see wholesale prices
    const currentUser = await getCurrentUser(ctx);
    const canSeeWholesalePrices = currentUser?.role === "wholesale" || currentUser?.role === "admin";

    // Use compound indexes for efficient filtering
    // Priority: category > featured > bestseller > newArrival > isActive
    let query;

    // Assign to local constants for TypeScript narrowing in callbacks
    const category = args.category;
    const featured = args.featured;
    const bestseller = args.bestseller;
    const newArrival = args.newArrival;

    if (category !== undefined) {
      // Use by_category_active compound index
      query = ctx.db
        .query("products")
        .withIndex("by_category_active", (q) =>
          q.eq("category", category).eq("isActive", true)
        );
    } else if (featured !== undefined) {
      // Use by_featured_active compound index
      query = ctx.db
        .query("products")
        .withIndex("by_featured_active", (q) =>
          q.eq("featured", featured).eq("isActive", true)
        );
    } else if (bestseller !== undefined) {
      // Use by_bestseller_active compound index
      query = ctx.db
        .query("products")
        .withIndex("by_bestseller_active", (q) =>
          q.eq("bestseller", bestseller).eq("isActive", true)
        );
    } else if (newArrival !== undefined) {
      // Use by_new_arrival_active compound index
      query = ctx.db
        .query("products")
        .withIndex("by_new_arrival_active", (q) =>
          q.eq("newArrival", newArrival).eq("isActive", true)
        );
    } else {
      // Default: just filter by isActive using index
      query = ctx.db
        .query("products")
        .withIndex("by_is_active", (q) => q.eq("isActive", true));
    }

    // Apply pagination with cursor
    const paginatedResults = await query.paginate({
      numItems: limit,
      cursor: args.cursor ?? null,
    });

    // Additional in-memory filtering for combined filters
    // (when multiple filter flags are specified)
    let filteredProducts = paginatedResults.page;

    // Apply remaining filters that weren't used as the primary index
    if (args.category && args.featured !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.featured === args.featured);
    }
    if (args.category && args.bestseller !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.bestseller === args.bestseller);
    }
    if (args.category && args.newArrival !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.newArrival === args.newArrival);
    }
    if (args.featured !== undefined && args.bestseller !== undefined && !args.category) {
      filteredProducts = filteredProducts.filter(p => p.bestseller === args.bestseller);
    }
    if (args.featured !== undefined && args.newArrival !== undefined && !args.category) {
      filteredProducts = filteredProducts.filter(p => p.newArrival === args.newArrival);
    }

    // Filter by sizes (check if product has any variant with the specified sizes)
    if (args.sizes && args.sizes.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        p.variants.some(v => args.sizes!.includes(v.size))
      );
    }

    // Filter by colors (check if product has any variant with the specified colors)
    if (args.colors && args.colors.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        p.variants.some(v => args.colors!.includes(v.color))
      );
    }

    // Filter by price range
    if (args.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.retailPrice >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.retailPrice <= args.maxPrice!);
    }

    // Apply sorting
    if (args.sortBy) {
      switch (args.sortBy) {
        case "price_asc":
          filteredProducts.sort((a, b) => a.retailPrice - b.retailPrice);
          break;
        case "price_desc":
          filteredProducts.sort((a, b) => b.retailPrice - a.retailPrice);
          break;
        case "name_asc":
          filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name_desc":
          filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case "newest":
          filteredProducts.sort((a, b) => b.createdAt - a.createdAt);
          break;
        case "popularity":
          // Sort by bestseller first, then by any other metric
          filteredProducts.sort((a, b) => {
            if (a.bestseller && !b.bestseller) return -1;
            if (!a.bestseller && b.bestseller) return 1;
            return 0;
          });
          break;
      }
    }

    // SECURITY: Strip wholesale prices for non-wholesale users
    const sanitizedProducts = filteredProducts.map(p => sanitizeProductPricing(p, canSeeWholesalePrices));

    return {
      products: sanitizedProducts,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

// Query: Get available filter options from all active products
export const getFilterOptions = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all active products (optionally filtered by category)
    let query;
    if (args.category) {
      query = ctx.db
        .query("products")
        .withIndex("by_category_active", (q) =>
          q.eq("category", args.category!).eq("isActive", true)
        );
    } else {
      query = ctx.db
        .query("products")
        .withIndex("by_is_active", (q) => q.eq("isActive", true));
    }

    const products = await query.collect();

    // Extract unique sizes and colors from all variants
    const sizesSet = new Set<string>();
    const colorsSet = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const product of products) {
      // Track price range
      if (product.retailPrice < minPrice) minPrice = product.retailPrice;
      if (product.retailPrice > maxPrice) maxPrice = product.retailPrice;

      // Extract sizes and colors from variants
      for (const variant of product.variants) {
        sizesSet.add(variant.size);
        colorsSet.add(variant.color);
      }
    }

    // Sort sizes in a logical order
    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
    const sizes = Array.from(sizesSet).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a);
      const bIndex = sizeOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // Sort colors alphabetically
    const colors = Array.from(colorsSet).sort();

    return {
      sizes,
      colors,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === 0 ? 10000 : maxPrice,
      },
    };
  },
});

// Query: Get single product by slug
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!product) {
      return null;
    }

    // Check if user can see wholesale prices
    const currentUser = await getCurrentUser(ctx);
    const canSeeWholesalePrices = currentUser?.role === "wholesale" || currentUser?.role === "admin";

    return sanitizeProductPricing(product, canSeeWholesalePrices);
  },
});

// Query: Get single product by ID
export const getProductById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);

    if (!product) {
      return null;
    }

    // Check if user can see wholesale prices
    const currentUser = await getCurrentUser(ctx);
    const canSeeWholesalePrices = currentUser?.role === "wholesale" || currentUser?.role === "admin";

    return sanitizeProductPricing(product, canSeeWholesalePrices);
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
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_products", (q) => {
        let search = q.search("name", args.searchTerm);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        return search.eq("isActive", true);
      })
      .take(args.limit || 20);

    // Check if user can see wholesale prices
    const currentUser = await getCurrentUser(ctx);
    const canSeeWholesalePrices = currentUser?.role === "wholesale" || currentUser?.role === "admin";

    return results.map(p => sanitizeProductPricing(p, canSeeWholesalePrices));
  },
});

// Query: Get featured products
export const getFeaturedProducts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Use compound index by_featured_active for efficient query
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured_active", (q) => q.eq("featured", true).eq("isActive", true))
      .take(args.limit || 8);

    // Check if user can see wholesale prices
    const currentUser = await getCurrentUser(ctx);
    const canSeeWholesalePrices = currentUser?.role === "wholesale" || currentUser?.role === "admin";

    return products.map(p => sanitizeProductPricing(p, canSeeWholesalePrices));
  },
});

// Query: Get bestseller products
export const getBestsellerProducts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Use compound index by_bestseller_active for efficient query
    const products = await ctx.db
      .query("products")
      .withIndex("by_bestseller_active", (q) => q.eq("bestseller", true).eq("isActive", true))
      .take(args.limit || 8);

    // Check if user can see wholesale prices
    const currentUser = await getCurrentUser(ctx);
    const canSeeWholesalePrices = currentUser?.role === "wholesale" || currentUser?.role === "admin";

    return products.map(p => sanitizeProductPricing(p, canSeeWholesalePrices));
  },
});

// Query: Get low stock products (Admin only)
// Uses denormalized hasLowStock flag for efficient indexed query
export const getLowStockProducts = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || 50;

    // Use the hasLowStock index for efficient querying
    // This requires the hasLowStock flag to be maintained when stock changes
    const paginatedResults = await ctx.db
      .query("products")
      .withIndex("by_has_low_stock", (q) => q.eq("hasLowStock", true))
      .paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

    return {
      products: paginatedResults.page,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

// Mutation: Create product (Admin only)
export const createProduct = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    retailPrice: v.number(),
    wholesalePriceTier1: v.number(),
    wholesalePriceTier2: v.number(),
    wholesalePriceTier3: v.number(),
    compareAtPrice: v.optional(v.number()),
    images: v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.string()),
      alt: v.string(),
      order: v.number(),
    })),
    variants: v.array(v.object({
      sku: v.string(),
      size: v.string(),
      color: v.string(),
      colorHex: v.optional(v.string()),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
    })),
    tags: v.array(v.string()),
    featured: v.boolean(),
    bestseller: v.boolean(),
    newArrival: v.boolean(),
    minOrderQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const now = Date.now();

    // Calculate hasLowStock flag based on variants
    const hasLowStock = args.variants.some(
      variant => variant.stockQuantity <= variant.lowStockThreshold
    );

    const productId = await ctx.db.insert("products", {
      ...args,
      videos: [],
      costPrice: undefined,
      averageRating: undefined,
      reviewCount: 0,
      isActive: true,
      hasLowStock,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.clerkId,
    });

    return productId;
  },
});

// Mutation: Update product (Admin only)
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    retailPrice: v.optional(v.number()),
    wholesalePriceTier1: v.optional(v.number()),
    wholesalePriceTier2: v.optional(v.number()),
    wholesalePriceTier3: v.optional(v.number()),
    images: v.optional(v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.string()),
      alt: v.string(),
      order: v.number(),
    }))),
    variants: v.optional(v.array(v.object({
      sku: v.string(),
      size: v.string(),
      color: v.string(),
      colorHex: v.optional(v.string()),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
    }))),
    tags: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    bestseller: v.optional(v.boolean()),
    newArrival: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const { productId, ...updates } = args;

    const existingProduct = await ctx.db.get(productId);
    if (!existingProduct) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Recalculate hasLowStock if variants are being updated
    let hasLowStock = existingProduct.hasLowStock;
    if (updates.variants) {
      hasLowStock = updates.variants.some(
        variant => variant.stockQuantity <= variant.lowStockThreshold
      );
    }

    await ctx.db.patch(productId, {
      ...updates,
      hasLowStock,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Mutation: Delete product (Admin only)
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    await ctx.db.patch(args.productId, { isActive: false, updatedAt: Date.now() });
  },
});

// Mutation: Update stock quantity (Admin only)
export const updateStockQuantity = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
    changeType: v.union(
      v.literal("restock"),
      v.literal("sale"),
      v.literal("return"),
      v.literal("adjustment"),
      v.literal("damaged")
    ),
    reason: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    const variantIndex = product.variants.findIndex(v => v.sku === args.variantSku);
    if (variantIndex === -1) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Variant not found",
      });
    }

    const variant = product.variants[variantIndex];
    const quantityBefore = variant.stockQuantity;
    const quantityAfter = quantityBefore + args.quantity;

    // Update variant stock
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex] = {
      ...variant,
      stockQuantity: quantityAfter,
    };

    // Recalculate hasLowStock flag based on updated variants
    const hasLowStock = updatedVariants.some(
      v => v.stockQuantity <= v.lowStockThreshold
    );

    await ctx.db.patch(args.productId, {
      variants: updatedVariants,
      hasLowStock,
      updatedAt: Date.now(),
    });

    // Log the inventory change
    await ctx.db.insert("inventoryLogs", {
      productId: args.productId,
      variantSku: args.variantSku,
      changeType: args.changeType,
      quantityBefore,
      quantityChange: args.quantity,
      quantityAfter,
      reason: args.reason,
      orderId: args.orderId,
      changedBy: admin.clerkId,
      timestamp: Date.now(),
    });

    return { quantityBefore, quantityAfter };
  },
});
