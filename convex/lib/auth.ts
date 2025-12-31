/**
 * Production-Grade Authorization Middleware
 *
 * Security Features:
 * - Server-side identity verification using Clerk authentication
 * - Role-based access control (RBAC)
 * - Resource ownership verification
 * - Structured error responses with ConvexError
 * - Defense against client-side tampering
 */

import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

type AuthContext = QueryCtx | MutationCtx;
type ActionAuthContext = ActionCtx;

/**
 * User role hierarchy (from lowest to highest privilege)
 */
const ROLE_HIERARCHY = {
  customer: 0,
  wholesale: 1,
  admin: 2,
} as const;

type UserRole = keyof typeof ROLE_HIERARCHY;

/**
 * Gets the authenticated user's Clerk ID from the server-side identity
 * NEVER trust client-provided clerkId - always use identity.subject
 *
 * @throws ConvexError if user is not authenticated
 */
export async function requireAuth(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please sign in to continue.",
    });
  }

  return {
    clerkId: identity.subject,
    email: identity.email || "",
    name: identity.name || "",
    identity,
  };
}

/**
 * Gets the current authenticated user from database
 * Returns null if not authenticated
 */
export async function getCurrentUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}

/**
 * Gets the current authenticated user from database
 *
 * @throws ConvexError if user is not authenticated or not found in database
 */
export async function requireCurrentUser(ctx: AuthContext) {
  const { clerkId } = await requireAuth(ctx);

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();

  if (!user) {
    throw new ConvexError({
      code: "USER_NOT_FOUND",
      message: "User profile not found. Please complete registration.",
    });
  }

  return user;
}

/**
 * Requires user to have a specific role or higher
 *
 * @throws ConvexError if user doesn't have required role
 */
async function requireRole(ctx: AuthContext, requiredRole: UserRole) {
  const user = await requireCurrentUser(ctx);

  const userRoleLevel = ROLE_HIERARCHY[user.role as UserRole] ?? -1;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Access denied. ${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} role required.`,
      details: {
        userRole: user.role,
        requiredRole,
      },
    });
  }

  return user;
}

/**
 * Requires user to have admin role
 *
 * @throws ConvexError if user is not an admin
 */
export async function requireAdmin(ctx: AuthContext) {
  return await requireRole(ctx, "admin");
}

/**
 * Requires user to have wholesale or admin role
 *
 * @throws ConvexError if user is not wholesale or admin
 */
export async function requireWholesale(ctx: AuthContext) {
  return await requireRole(ctx, "wholesale");
}

/**
 * Verifies that the authenticated user owns a specific resource
 *
 * @param ctx - Convex context
 * @param resourceUserId - The userId/clerkId associated with the resource
 * @throws ConvexError if user doesn't own the resource
 */
export async function requireOwnership(ctx: AuthContext, resourceUserId: string) {
  const { clerkId } = await requireAuth(ctx);

  if (clerkId !== resourceUserId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Access denied. You can only access your own resources.",
    });
  }

  return clerkId;
}

/**
 * Checks if the authenticated user owns a resource or is an admin
 * Admins can access any resource
 *
 * @param ctx - Convex context
 * @param resourceUserId - The userId/clerkId associated with the resource
 * @throws ConvexError if user doesn't own the resource and is not an admin
 */
export async function requireOwnershipOrAdmin(ctx: AuthContext, resourceUserId: string) {
  const user = await requireCurrentUser(ctx);

  // Admins can access any resource
  if (user.role === "admin") {
    return user;
  }

  // Non-admins must own the resource
  if (user.clerkId !== resourceUserId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Access denied. You can only access your own resources.",
    });
  }

  return user;
}

/**
 * Validates that a user has approved wholesale status
 *
 * @throws ConvexError if user's wholesale status is not approved
 */
export async function requireApprovedWholesale(ctx: AuthContext) {
  const user = await requireWholesale(ctx);

  if (user.wholesaleStatus !== "approved") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Wholesale account approval required. Your application status: " +
               (user.wholesaleStatus || "not submitted"),
      details: {
        wholesaleStatus: user.wholesaleStatus,
      },
    });
  }

  return user;
}

/**
 * Helper to check if user is authenticated without throwing
 * Useful for optional authentication scenarios
 */
export async function isAuthenticated(ctx: AuthContext): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  return identity !== null;
}

/**
 * Helper to check if current user is admin without throwing
 */
export async function isAdmin(ctx: AuthContext): Promise<boolean> {
  const user = await getCurrentUser(ctx);
  return user?.role === "admin";
}

/**
 * Helper to check if current user is wholesale or admin without throwing
 */
export async function isWholesaleOrAdmin(ctx: AuthContext): Promise<boolean> {
  const user = await getCurrentUser(ctx);
  return user?.role === "wholesale" || user?.role === "admin";
}

// ============================================
// ACTION-SPECIFIC AUTH HELPERS
// Actions have a different context type (ActionCtx) that doesn't have direct DB access
// ============================================

/**
 * Gets the authenticated user's Clerk ID from the server-side identity in an action context
 * NEVER trust client-provided clerkId - always use identity.subject
 *
 * @throws ConvexError if user is not authenticated
 */
export async function requireAuthAction(ctx: ActionAuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please sign in to continue.",
    });
  }

  return {
    clerkId: identity.subject,
    email: identity.email || "",
    name: identity.name || "",
    identity,
  };
}

/**
 * Requires user to have admin role in an action context
 * Note: This requires a database query via runQuery to check the user's role
 *
 * @throws ConvexError if user is not an admin
 */
export async function requireAdminAction(
  ctx: ActionAuthContext,
  runQuery: <T>(query: any, args: any) => Promise<T>
) {
  const { clerkId } = await requireAuthAction(ctx);

  // We need to query the database to check the user's role
  // The caller must provide a way to run queries
  const user = await runQuery("users:getUserByClerkId" as any, { clerkId });

  if (!user || (user as any).role !== "admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Access denied. Admin role required.",
    });
  }

  return user;
}
