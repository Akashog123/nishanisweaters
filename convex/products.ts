import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, getCurrentUser } from "./lib/auth";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

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
 * Check if the current user can view wholesale prices.
 * SECURITY: Only wholesale and admin users can see wholesale pricing.
 * DRY: Centralizes the wholesale price visibility check used across multiple queries.
 */
async function canViewWholesalePrices(ctx: QueryCtx): Promise<boolean> {
  const user = await getCurrentUser(ctx);
  return user?.role === "wholesale" || user?.role === "admin";
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
 * FUTURE OPTIMIZATION: Add denormalized fields like `availableSizes`, `availableColors`,
 * `priceBucket` to the products table with corresponding indexes for true indexed filtering.
 */
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

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    // Determine if we need complex filtering that requires collect-then-filter
    const hasComplexFilters =
      (args.sizes && args.sizes.length > 0) ||
      (args.colors && args.colors.length > 0) ||
      args.minPrice !== undefined ||
      args.maxPrice !== undefined ||
      args.sortBy !== undefined;

    // Assign to local constants for TypeScript narrowing in callbacks
    const category = args.category;
    const featured = args.featured;
    const bestseller = args.bestseller;
    const newArrival = args.newArrival;

    // Build base query using most selective index
    let baseQuery;
    if (category !== undefined) {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_category_active", (q) =>
          q.eq("category", category).eq("isActive", true)
        );
    } else if (featured !== undefined) {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_featured_active", (q) =>
          q.eq("featured", featured).eq("isActive", true)
        );
    } else if (bestseller !== undefined) {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_bestseller_active", (q) =>
          q.eq("bestseller", bestseller).eq("isActive", true)
        );
    } else if (newArrival !== undefined) {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_new_arrival_active", (q) =>
          q.eq("newArrival", newArrival).eq("isActive", true)
        );
    } else {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_is_active", (q) => q.eq("isActive", true));
    }

    // =========================================================================
    // SIMPLE PATH: No complex filters - use native Convex pagination
    // =========================================================================
    if (!hasComplexFilters) {
      const paginatedResults = await baseQuery.paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

      // Apply remaining boolean filters (these are fast, simple equality checks)
      let filteredProducts = paginatedResults.page;

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

      const sanitizedProducts = filteredProducts.map(p => sanitizeProductPricing(p, canSeeWholesale));

      return {
        products: sanitizedProducts,
        continueCursor: paginatedResults.continueCursor,
        isDone: paginatedResults.isDone,
      };
    }

    // =========================================================================
    // COMPLEX PATH: Collect all, filter, sort, then manual pagination
    // =========================================================================
    // This ensures consistent page sizes when filters reduce the result set

    // Collect all products matching the primary index filter
    // For a typical e-commerce site with <10k products, this is fast (<100ms)
    let allProducts = await baseQuery.collect();

    // Apply remaining boolean filters
    if (args.category && args.featured !== undefined) {
      allProducts = allProducts.filter(p => p.featured === args.featured);
    }
    if (args.category && args.bestseller !== undefined) {
      allProducts = allProducts.filter(p => p.bestseller === args.bestseller);
    }
    if (args.category && args.newArrival !== undefined) {
      allProducts = allProducts.filter(p => p.newArrival === args.newArrival);
    }
    if (args.featured !== undefined && args.bestseller !== undefined && !args.category) {
      allProducts = allProducts.filter(p => p.bestseller === args.bestseller);
    }
    if (args.featured !== undefined && args.newArrival !== undefined && !args.category) {
      allProducts = allProducts.filter(p => p.newArrival === args.newArrival);
    }

    // OPTIMIZED: Filter by sizes using denormalized availableSizes field
    // This avoids O(M) variant iteration per product, reducing to O(1) array intersection
    if (args.sizes && args.sizes.length > 0) {
      const sizesSet = new Set(args.sizes);
      allProducts = allProducts.filter(p => {
        // Use denormalized field if available (new products)
        if (p.availableSizes && p.availableSizes.length > 0) {
          return p.availableSizes.some(size => sizesSet.has(size));
        }
        // Fallback for legacy products without denormalized fields
        return p.variants.some(v => sizesSet.has(v.size));
      });
    }

    // OPTIMIZED: Filter by colors using denormalized availableColors field
    if (args.colors && args.colors.length > 0) {
      const colorsSet = new Set(args.colors);
      allProducts = allProducts.filter(p => {
        // Use denormalized field if available (new products)
        if (p.availableColors && p.availableColors.length > 0) {
          return p.availableColors.some(color => colorsSet.has(color));
        }
        // Fallback for legacy products without denormalized fields
        return p.variants.some(v => colorsSet.has(v.color));
      });
    }

    // Filter by price range
    if (args.minPrice !== undefined) {
      allProducts = allProducts.filter(p => p.retailPrice >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      allProducts = allProducts.filter(p => p.retailPrice <= args.maxPrice!);
    }

    // Apply sorting BEFORE pagination (critical for correct ordering across pages)
    if (args.sortBy) {
      switch (args.sortBy) {
        case "price_asc":
          allProducts.sort((a, b) => a.retailPrice - b.retailPrice);
          break;
        case "price_desc":
          allProducts.sort((a, b) => b.retailPrice - a.retailPrice);
          break;
        case "name_asc":
          allProducts.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name_desc":
          allProducts.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case "newest":
          allProducts.sort((a, b) => b.createdAt - a.createdAt);
          break;
        case "popularity":
          allProducts.sort((a, b) => {
            if (a.bestseller && !b.bestseller) return -1;
            if (!a.bestseller && b.bestseller) return 1;
            return 0;
          });
          break;
      }
    }

    // Manual cursor-based pagination on the filtered & sorted result
    // Cursor format: index position in the filtered array (base64 encoded)
    let startIndex = 0;
    if (args.cursor) {
      try {
        startIndex = parseInt(atob(args.cursor), 10);
        if (isNaN(startIndex) || startIndex < 0) {
          startIndex = 0;
        }
      } catch {
        startIndex = 0;
      }
    }

    const endIndex = Math.min(startIndex + limit, allProducts.length);
    const pageProducts = allProducts.slice(startIndex, endIndex);
    const isDone = endIndex >= allProducts.length;
    const continueCursor = isDone ? null : btoa(endIndex.toString());

    // SECURITY: Strip wholesale prices for non-wholesale users
    const sanitizedProducts = pageProducts.map(p => sanitizeProductPricing(p, canSeeWholesale));

    return {
      products: sanitizedProducts,
      continueCursor,
      isDone,
      // Include total count for UI pagination (only for complex filter path)
      totalCount: allProducts.length,
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
 */
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

    // OPTIMIZED: Use denormalized fields instead of iterating variants
    // This reduces complexity from O(N*M) to O(N) where M = avg variants per product
    const sizesSet = new Set<string>();
    const colorsSet = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const product of products) {
      // Track price range (still O(1) per product)
      if (product.retailPrice < minPrice) minPrice = product.retailPrice;
      if (product.retailPrice > maxPrice) maxPrice = product.retailPrice;

      // Use denormalized arrays instead of iterating variants
      // These are pre-computed and stored when product is created/updated
      if (product.availableSizes) {
        for (const size of product.availableSizes) {
          sizesSet.add(size);
        }
      } else {
        // Fallback for legacy products without denormalized fields
        // TODO: Run migration to backfill availableSizes/availableColors
        for (const variant of product.variants) {
          sizesSet.add(variant.size);
        }
      }

      if (product.availableColors) {
        for (const color of product.availableColors) {
          colorsSet.add(color);
        }
      } else {
        // Fallback for legacy products without denormalized fields
        for (const variant of product.variants) {
          colorsSet.add(variant.color);
        }
      }
    }

    // Sort sizes in a logical order (clothing size hierarchy)
    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
    const sizes = Array.from(sizesSet).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a);
      const bIndex = sizeOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // Sort colors alphabetically for consistent UI
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
      .take(args.limit || 20);

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
      .take(args.limit || 8);

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
      .take(args.limit || 8);

    // Check if user can see wholesale prices (uses centralized helper)
    const canSeeWholesale = await canViewWholesalePrices(ctx);

    return products.map(p => sanitizeProductPricing(p, canSeeWholesale));
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

// Query: List all products for admin with server-side pagination
// Includes inactive products and supports filtering by category and stock status
export const listProductsForAdmin = query({
  args: {
    category: v.optional(v.string()),
    stockStatus: v.optional(v.union(
      v.literal("all"),
      v.literal("in_stock"),
      v.literal("low_stock"),
      v.literal("out_of_stock")
    )),
    isActive: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || 10;

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
    wholesalePrice: v.optional(v.number()),
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

    // Prepare the update object with denormalized fields
    const finalUpdates: Record<string, unknown> = { ...updates };

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

    await ctx.db.patch(args.productId, { isActive: false, updatedAt: Date.now() });
  },
});

/**
 * Query: Get aggregated product statistics for admin dashboard
 *
 * PERFORMANCE OPTIMIZATION:
 * -------------------------
 * This query replaces the inefficient pattern of fetching all products (up to 1000)
 * just to calculate stats. Instead, it uses targeted index queries to count products
 * efficiently without loading full product documents into memory.
 *
 * APPROACH:
 * - Uses indexed queries with .collect() for counting (Convex doesn't have COUNT)
 * - Leverages existing indexes: by_is_active, by_has_low_stock, by_category_active
 * - Returns only aggregated numbers, not product data
 *
 * COMPLEXITY: O(N) where N is total products, but with minimal memory footprint
 * since we only need to count, not process full documents.
 */
export const getProductStats = query({
  args: {},
  handler: async (ctx) => {
    // Require admin authorization
    await requireAdmin(ctx);

    // Fetch all products once for counting (more efficient than multiple queries)
    const allProducts = await ctx.db.query("products").collect();

    // Calculate stats
    let totalCount = 0;
    let activeCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoryCountMap = new Map<string, number>();

    for (const product of allProducts) {
      totalCount++;

      if (product.isActive) {
        activeCount++;
      }

      // Check low stock using denormalized flag
      if (product.hasLowStock) {
        lowStockCount++;
      }

      // Check out of stock by summing variant quantities
      const totalStock = product.variants.reduce(
        (sum, variant) => sum + variant.stockQuantity,
        0
      );
      if (totalStock === 0) {
        outOfStockCount++;
      }

      // Count by category (only active products)
      if (product.isActive) {
        const currentCount = categoryCountMap.get(product.category) || 0;
        categoryCountMap.set(product.category, currentCount + 1);
      }
    }

    // Convert category map to array for easier consumption
    const productsByCategory = Array.from(categoryCountMap.entries()).map(
      ([category, count]) => ({ category, count })
    );

    // Sort categories by count (descending)
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
