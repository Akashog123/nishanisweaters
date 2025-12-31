import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireOwnership, getCurrentUser as getCurrentUserFromAuth } from "./lib/auth";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import {
  validatePhone,
  validatePostalCode,
  validateRequiredString,
  validateOptionalPhone,
  validateOptionalEmail,
} from "./lib/validation";

// Mutation: Create or update user from Clerk webhook
export const syncUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        lastLoginAt: Date.now(),
      });
      return existingUser._id;
    } else {
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        role: "customer",
        shippingAddresses: [],
        emailNotifications: true,
        smsNotifications: false,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });
      return userId;
    }
  },
});

// Public mutation for user sync (called from frontend on sign-in)
// SECURITY: Uses server-side identity verification - never trust client-provided clerkId
export const upsertUser = mutation({
  args: {
    // Only accept optional profile data - clerkId/email come from server-side identity
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Get identity from server-side Clerk verification
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to sync your profile",
      });
    }

    // Use verified identity data - never trust client-provided values
    const clerkId = identity.subject;
    const email = identity.email || "";
    const firstName = args.firstName || identity.givenName || identity.name?.split(" ")[0] || "";
    const lastName = args.lastName || identity.familyName || "";

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email,
        firstName: firstName || existingUser.firstName,
        lastName: lastName || existingUser.lastName,
        lastLoginAt: Date.now(),
      });
      return existingUser._id;
    } else {
      const userId = await ctx.db.insert("users", {
        clerkId,
        email,
        firstName,
        lastName,
        role: "customer",
        shippingAddresses: [],
        emailNotifications: true,
        smsNotifications: false,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });

      // Send welcome email to new users
      if (email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
          to: email,
          customerName: firstName || "Valued Customer",
        });
      }

      return userId;
    }
  },
});

// Query: Get user by Clerk ID using server-side identity verification
// SECURITY: Never accepts client-provided clerkId - uses server-side identity only
// This is an alias for getCurrentUser - use getCurrentUser instead for clarity
export const getUserByClerkId = query({
  args: {},
  handler: async (ctx) => {
    // SECURITY: Get identity from server-side Clerk verification
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Use verified server-side identity - never trust client-provided clerkId
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Query: Get current user using server-side identity verification
// SECURITY: Never accepts client-provided clerkId - uses server-side identity only
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // SECURITY: Get identity from server-side Clerk verification
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Use verified server-side identity - never trust client-provided clerkId
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Query: Get current user profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    // Get user from server-side identity (secure)
    return await getCurrentUserFromAuth(ctx);
  },
});

// Mutation: Update user profile
export const updateUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    smsNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(user._id, args);
    return user._id;
  },
});

// Mutation: Add shipping address
// SECURITY: Server-side validation for phone and postal code
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
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    // Server-side validation using shared utilities
    const cleanPhone = validatePhone(args.phone);
    const cleanPostalCode = validatePostalCode(args.postalCode);
    const name = validateRequiredString(args.name, "Name", 2);
    const street = validateRequiredString(args.street, "Street address", 5);
    const city = validateRequiredString(args.city, "City");
    const state = validateRequiredString(args.state, "State");
    const country = validateRequiredString(args.country, "Country");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const newAddress = {
      id: crypto.randomUUID(),
      name,
      phone: cleanPhone,
      street,
      city,
      state,
      postalCode: cleanPostalCode,
      country,
      isDefault: args.isDefault,
    };

    let updatedAddresses = [...user.shippingAddresses];

    // If new address is default, unset other defaults
    if (args.isDefault) {
      updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
    }

    updatedAddresses.push(newAddress);

    await ctx.db.patch(user._id, { shippingAddresses: updatedAddresses });
    return newAddress.id;
  },
});

// Mutation: Update shipping address
// SECURITY: Server-side validation for phone and postal code
export const updateShippingAddress = mutation({
  args: {
    addressId: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    // Server-side validation using shared utilities
    const cleanPhone = validateOptionalPhone(args.phone);
    const cleanPostalCode = args.postalCode ? validatePostalCode(args.postalCode) : undefined;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify address belongs to user
    const addressExists = user.shippingAddresses.some(addr => addr.id === args.addressId);
    if (!addressExists) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Address not found",
      });
    }

    const updatedAddresses = user.shippingAddresses.map(addr => {
      if (addr.id === args.addressId) {
        return {
          ...addr,
          ...(args.name && { name: args.name.trim() }),
          ...(cleanPhone && { phone: cleanPhone }),
          ...(args.street && { street: args.street.trim() }),
          ...(args.city && { city: args.city.trim() }),
          ...(args.state && { state: args.state.trim() }),
          ...(cleanPostalCode && { postalCode: cleanPostalCode }),
          ...(args.country && { country: args.country.trim() }),
          ...(args.isDefault !== undefined && { isDefault: args.isDefault }),
        };
      }
      // If setting this address as default, unset others
      if (args.isDefault) {
        return { ...addr, isDefault: false };
      }
      return addr;
    });

    await ctx.db.patch(user._id, { shippingAddresses: updatedAddresses });
  },
});

// Mutation: Delete shipping address
export const deleteShippingAddress = mutation({
  args: {
    addressId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const updatedAddresses = user.shippingAddresses.filter(
      addr => addr.id !== args.addressId
    );

    await ctx.db.patch(user._id, { shippingAddresses: updatedAddresses });
  },
});

// Query: Get all users (Admin only)
// PERFORMANCE: Uses pagination and role index instead of full table scan
export const listUsers = query({
  args: {
    role: v.optional(v.union(
      v.literal("customer"),
      v.literal("wholesale"),
      v.literal("admin")
    )),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || 50;
    let query;

    // Use role index if filtering by role
    if (args.role) {
      query = ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role as "customer" | "wholesale" | "admin"));
    } else {
      query = ctx.db.query("users");
    }

    // Apply pagination
    const paginatedResults = await query.paginate({
      numItems: limit,
      cursor: args.cursor ?? null,
    });

    return {
      users: paginatedResults.page,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

// Mutation: Update user role (Admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("customer"), v.literal("wholesale"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Mutation: Approve wholesale application (Admin only)
// Note: Wholesale tier system has been removed. Wholesale users get a flat wholesalePrice.
export const approveWholesale = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    // Fetch the user to update
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Validate that user has a pending wholesale application
    if (user.wholesaleStatus !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: `Cannot process wholesale application: user status is '${user.wholesaleStatus || "none"}', expected 'pending'`,
      });
    }

    // Update user based on approval status
    if (args.status === "approved") {
      await ctx.db.patch(args.userId, {
        wholesaleStatus: "approved",
        role: "wholesale",
        wholesaleApprovedAt: Date.now(),
      });
    } else {
      // Rejected - keep role as customer
      await ctx.db.patch(args.userId, {
        wholesaleStatus: "rejected",
        role: "customer",
        wholesaleRejectionReason: args.rejectionReason,
      });
    }

    return { success: true, status: args.status };
  },
});
