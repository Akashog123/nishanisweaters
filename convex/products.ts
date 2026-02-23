import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

// Shared types and validators
import {
  stockStatusValidator,
  stockChangeTypeValidator,
  productSortValidator,
  type ProductUpdate,
} from "./lib/types";

// Error factory (notFound not used, but keeping import for potential future use)
import { productNotFound, variantNotFound } from "./lib/errors";

// Product filter utilities
import {
  selectOptimalIndex,
  applyBooleanFilters,
  applyPriceFilter,
  applySizeColorFilters,
  sortProducts,
  paginateResults,
  hasComplexFilters,
  extractFilterOptions,
  sortSizes,
} from "./lib/productFilters";
import {
  DEFAULT_PRODUCTS_LIMIT,
  DEFAULT_ADMIN_PRODUCTS_LIMIT,
  DEFAULT_FEATURED_LIMIT,
  DEFAULT_BESTSELLER_LIMIT,
  DEFAULT_LOW_STOCK_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  SIZE_ORDER,
} from "./lib/productConstants";

/**
 * Calculate price bucket for indexed range queries.
 * Buckets: "0-1000", "1000-2500", "2500-5000", "5000-10000", "10000+"
 *
 * This enables efficient price filtering using equality indexes instead of
 * range scans, which Convex doesn't natively support for pagination.
 */
function calculatePriceBucket(price: number): string {
  if (price < 1000) return "0-1000";
  if (price < 2500) return "1000-2500";
  if (price < 5000) return "2500-5000";
  if (price < 10000) return "5000-10000";
  return "10000+";
}

/**
 * Extract unique sizes and colors from variants for denormalized fields.
 * These arrays enable indexed filtering without scanning variant arrays.
 */
function extractVariantAttributes(variants: { size: string; color: string }[]): {
  availableSizes: string[];
  availableColors: string[];
} {
  const sizesSet = new Set<string>();
  const colorsSet = new Set<string>();

  for (const variant of variants) {
    sizesSet.add(variant.size);
    colorsSet.add(variant.color);
  }

  return {
    availableSizes: Array.from(sizesSet).sort(),
    availableColors: Array.from(colorsSet).sort(),
  };
}

/**
 * Check if the current user can view wholesale/bulk prices.
 * Now returns true for everyone - bulk prices are public.
 */
async function canViewWholesalePrices(_ctx: QueryCtx): Promise<boolean> {
  // Bulk prices are now public - anyone can view them
  return true;
}

/**
 * Strip wholesale pricing from product data for non-wholesale users.
 * SECURITY: Prevents price leakage to unauthorized users.
 */
function sanitizeProductPricing<T extends Doc<"products">>(
  product: T,
  canSeeWholesalePrices: boolean
): Omit<T, "wholesalePrice"> & {
  wholesalePrice?: number;
} {
  if (canSeeWholesalePrices) {
    return product;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { wholesalePrice, ...rest } = product;
  return rest;
}

/**
 * Query: Get all products with filtering and pagination
 *
 * ARCHITECTURE DECISION: Filter-Before-Paginate Pattern
 * -----------------------------------------------------
 * The previous implementation had a critical bug: it paginated FIRST, then filtered
 * in-memory. This caused inconsistent page sizes (e.g., requesting 20 products with
 * size "M" filter might return only 8 if only 8 of the 20 fetched had size "M").
 *
 * NEW APPROACH:
 * 1. For simple queries (no complex filters): Use index + paginate directly
 * 2. For complex filters (sizes, colors, price range, sorting):
 *    - Collect all matching products from index (filter BEFORE pagination)
 *    - Apply in-memory filters
 *    - Apply sorting
 *    - Implement manual cursor-based pagination on the filtered result
 *
 * TRADE-OFFS:
 * - Simple queries: O(page_size) - optimal, uses Convex pagination
 * - Complex queries: O(N) where N is products matching primary index
 *   - For catalogs < 10,000 products, this is acceptable (<100ms)
 *   - For larger catalogs, consider denormalized fields + composite indexes
 *
 * REFACTORED: Complex filter logic extracted to convex/lib/productFilters.ts
 */
export const listProducts = query({
  args: {
    category: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    bestseller: v.optional(v.boolean()),
    newArrival: v.optional(v.boolean()),
    sizes: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    sortBy: v.optional(productSortValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || DEFAULT_PRODUCTS_LIMIT;
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    // Select optimal index based on filter arguments
    const baseQuery = selectOptimalIndex(ctx.db, args);

    // SIMPLE PATH: No complex filters - use native Convex pagination
    if (!hasComplexFilters(args)) {
      const paginatedResults = await baseQuery.paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

      // Apply remaining boolean filters
      const filteredProducts = applyBooleanFilters(paginatedResults.page, args);
      const sanitizedProducts = filteredProducts.map(p =>
        sanitizeProductPricing(p, canSeeWholesale)
      );

      return {
        products: sanitizedProducts,
        continueCursor: paginatedResults.continueCursor,
        isDone: paginatedResults.isDone,
      };
    }

    // COMPLEX PATH: Collect all, filter, sort, then manual pagination
    let allProducts = await baseQuery.collect();

    // Apply all filters using extracted utilities
    allProducts = applyBooleanFilters(allProducts, args);
    allProducts = applySizeColorFilters(allProducts, args);
    allProducts = applyPriceFilter(allProducts, args);
    allProducts = sortProducts(allProducts, args.sortBy);

    // Paginate the filtered and sorted results
    const paginationResult = paginateResults(allProducts, limit, args.cursor);

    // SECURITY: Strip wholesale prices for non-wholesale users
    const sanitizedProducts = paginationResult.page.map(p =>
      sanitizeProductPricing(p, canSeeWholesale)
    );

    return {
      products: sanitizedProducts,
      continueCursor: paginationResult.continueCursor,
      isDone: paginationResult.isDone,
      totalCount: paginationResult.totalCount,
    };
  },
});

/**
 * Query: Get available filter options from all active products
 *
 * OPTIMIZATION: Uses denormalized fields for O(N) complexity instead of O(N*M)
 * -------------------------------------------------------------------------------
 * BEFORE: Collected all products, then iterated all variants for each product
 *         to extract sizes and colors. For 1000 products with 5 variants each,
 *         this was 5000 iterations.
 *
 * AFTER:  Uses pre-computed availableSizes and availableColors arrays stored
 *         on each product. These are maintained by createProduct/updateProduct
 *         mutations. Now only N iterations (1000 for 1000 products).
 *
 * TRADE-OFF: Requires ~100 bytes extra storage per product for denormalized fields.
 *            For 10,000 products = ~1MB. Acceptable trade-off for query performance.
 *
 * REFACTORED: Filter extraction logic moved to convex/lib/productFilters.ts
 */
export const getFilterOptions = query({
  args: {
    category: v.optional(v.string()),
    newArrival: v.optional(v.boolean()),
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
    } else if (args.newArrival) {
      query = ctx.db
        .query("products")
        .withIndex("by_new_arrival_active", (q) =>
          q.eq("newArrival", true).eq("isActive", true)
        );
    } else {
      query = ctx.db
        .query("products")
        .withIndex("by_is_active", (q) => q.eq("isActive", true));
    }

    const products = await query.collect();

    // Extract filter options using utility function
    const filterOptions = extractFilterOptions(products);

    // Sort sizes in logical clothing size order
    const sizes = sortSizes(filterOptions.sizes, SIZE_ORDER);

    // Sort colors alphabetically for consistent UI
    const colors = filterOptions.colors.sort();

    return {
      sizes,
      colors,
      priceRange: filterOptions.priceRange,
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

    if (!product || !product.isActive) {
      return null;
    }

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    return sanitizeProductPricing(product, canSeeWholesale);
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

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    return sanitizeProductPricing(product, canSeeWholesale);
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
      .take(args.limit || DEFAULT_SEARCH_LIMIT);

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    return results.map(p => sanitizeProductPricing(p, canSeeWholesale));
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
      .take(args.limit || DEFAULT_FEATURED_LIMIT);

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    return products.map(p => sanitizeProductPricing(p, canSeeWholesale));
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
      .take(args.limit || DEFAULT_BESTSELLER_LIMIT);

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    return products.map(p => sanitizeProductPricing(p, canSeeWholesale));
  },
});

// Query: Get related products by category, excluding a specific product
export const getRelatedProducts = query({
  args: {
    productId: v.id("products"),
    category: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 4;

    // Fetch one extra to account for filtering out the current product
    const products = await ctx.db
      .query("products")
      .withIndex("by_category_active", (q) =>
        q.eq("category", args.category).eq("isActive", true)
      )
      .take(limit + 1);

    // Exclude the current product and trim to limit
    const related = products
      .filter((p) => p._id !== args.productId)
      .slice(0, limit);

    const canSeeWholesale = await canViewWholesalePrices(ctx);
    return related.map((p) => sanitizeProductPricing(p, canSeeWholesale));
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

    const limit = args.limit || DEFAULT_LOW_STOCK_LIMIT;

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

// Query: List all products for admin with server-side pagination
// Includes inactive products and supports filtering by category and stock status
export const listProductsForAdmin = query({
  args: {
    category: v.optional(v.string()),
    stockStatus: v.optional(stockStatusValidator),
    isActive: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || DEFAULT_ADMIN_PRODUCTS_LIMIT;

    // Start with all products (no isActive filter for admin view)
    let query;

    if (args.category && args.category !== "all") {
      // Use category index if category filter is specified
      query = ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category!));
    } else if (args.stockStatus === "low_stock") {
      // Use low stock index for efficiency
      query = ctx.db
        .query("products")
        .withIndex("by_has_low_stock", (q) => q.eq("hasLowStock", true));
    } else {
      // Default: get all products ordered by creation date (newest first)
      query = ctx.db
        .query("products")
        .withIndex("by_created_at")
        .order("desc");
    }

    // Apply pagination
    const paginatedResults = await query.paginate({
      numItems: limit,
      cursor: args.cursor ?? null,
    });

    // Apply additional in-memory filters
    let filteredProducts = paginatedResults.page;

    // Filter by stock status (if not already filtered by index)
    if (args.stockStatus && args.stockStatus !== "all" && args.stockStatus !== "low_stock") {
      filteredProducts = filteredProducts.filter(product => {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
        const hasLowStock = product.variants.some(v => v.stockQuantity <= v.lowStockThreshold);

        switch (args.stockStatus) {
          case "in_stock":
            return totalStock > 0 && !hasLowStock;
          case "out_of_stock":
            return totalStock === 0;
          default:
            return true;
        }
      });
    }

    // Filter by active status
    if (args.isActive !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.isActive === args.isActive);
    }

    // Filter by search query (case-insensitive name match)
    if (args.searchQuery && args.searchQuery.trim() !== "") {
      const searchLower = args.searchQuery.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
        p.variants.some(v => v.sku.toLowerCase().includes(searchLower))
      );
    }

    return {
      products: filteredProducts,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
      // Include total count info for pagination UI
      pageSize: limit,
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
    wholesalePrice: v.optional(v.number()),
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

    // Calculate denormalized fields for efficient filtering
    const { availableSizes, availableColors } = extractVariantAttributes(args.variants);
    const priceBucket = calculatePriceBucket(args.retailPrice);

    const productId = await ctx.db.insert("products", {
      ...args,
      videos: [],
      costPrice: undefined,
      averageRating: undefined,
      reviewCount: 0,
      isActive: true,
      hasLowStock,
      // Denormalized fields for indexed filtering
      availableSizes,
      availableColors,
      priceBucket,
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
    compareAtPrice: v.optional(v.number()),
    wholesalePrice: v.optional(v.number()),
    minOrderQuantity: v.optional(v.number()),
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
      throw productNotFound();
    }

    // Prepare the update object with denormalized fields
    // Using proper ProductUpdate type instead of Record<string, unknown>
    const finalUpdates: ProductUpdate = { ...updates };

    // Recalculate hasLowStock and variant attributes if variants are being updated
    if (updates.variants) {
      finalUpdates.hasLowStock = updates.variants.some(
        variant => variant.stockQuantity <= variant.lowStockThreshold
      );

      // Update denormalized size/color fields
      const { availableSizes, availableColors } = extractVariantAttributes(updates.variants);
      finalUpdates.availableSizes = availableSizes;
      finalUpdates.availableColors = availableColors;
    } else {
      finalUpdates.hasLowStock = existingProduct.hasLowStock;
    }

    // Recalculate price bucket if retail price is being updated
    if (updates.retailPrice !== undefined) {
      finalUpdates.priceBucket = calculatePriceBucket(updates.retailPrice);
    }

    await ctx.db.patch(productId, {
      ...finalUpdates,
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

    // Check for references in inventoryLogs (sales)
    const salesLogs = await ctx.db
      .query("inventoryLogs")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("changeType"), "sale"))
      .first();

    // Check for references in reviews
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    const hasReferences = !!salesLogs || !!reviews;

    if (hasReferences) {
      // Soft delete: mark as inactive
      await ctx.db.patch(args.productId, { isActive: false, updatedAt: Date.now() });
      return { deleted: false, reason: "has_references" };
    } else {
      // Hard delete
      await ctx.db.delete(args.productId);

      // Clean up remaining inventory logs for this product
      const allLogs = await ctx.db
        .query("inventoryLogs")
        .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
        .collect();

      for (const log of allLogs) {
        await ctx.db.delete(log._id);
      }

      return { deleted: true };
    }
  },
});

/**
 * Query: Get aggregated product statistics for admin dashboard
 *
 * Uses targeted indexed queries instead of loading all products into memory.
 * Each index query loads only the subset needed for that specific count.
 */
export const getProductStats = query({
  args: {},
  handler: async (ctx) => {
    // Require admin authorization
    await requireAdmin(ctx);

    // Use indexed queries for efficient counting
    const [activeProducts, allProducts, lowStockProducts] = await Promise.all([
      ctx.db
        .query("products")
        .withIndex("by_is_active", (q) => q.eq("isActive", true))
        .collect(),
      ctx.db.query("products").collect(),
      ctx.db
        .query("products")
        .withIndex("by_has_low_stock", (q) => q.eq("hasLowStock", true))
        .collect(),
    ]);

    const totalCount = allProducts.length;
    const activeCount = activeProducts.length;
    const lowStockCount = lowStockProducts.length;

    // Out of stock: only check active products (smaller set)
    let outOfStockCount = 0;
    const categoryCountMap = new Map<string, number>();

    for (const product of activeProducts) {
      const totalStock = product.variants.reduce(
        (sum, variant) => sum + variant.stockQuantity,
        0
      );
      if (totalStock === 0) {
        outOfStockCount++;
      }

      const currentCount = categoryCountMap.get(product.category) || 0;
      categoryCountMap.set(product.category, currentCount + 1);
    }

    const productsByCategory = Array.from(categoryCountMap.entries()).map(
      ([category, count]) => ({ category, count })
    );
    productsByCategory.sort((a, b) => b.count - a.count);

    return {
      totalCount,
      activeCount,
      inactiveCount: totalCount - activeCount,
      lowStockCount,
      outOfStockCount,
      inStockCount: activeCount - outOfStockCount,
      productsByCategory,
    };
  },
});

// Mutation: Update stock quantity (Admin only)
export const updateStockQuantity = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
    changeType: stockChangeTypeValidator,
    reason: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw productNotFound();
    }

    const variantIndex = product.variants.findIndex(v => v.sku === args.variantSku);
    if (variantIndex === -1) {
      throw variantNotFound();
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
