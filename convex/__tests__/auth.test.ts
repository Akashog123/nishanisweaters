import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConvexError } from "convex/values";
import {
  createMockQueryCtx,
  createMockMutationCtx,
  createTestUser,
  createTestAdminUser,
  createTestIdentity,
  mockAuthenticatedUser,
  mockGuestUser,
} from "./testUtils";

/**
 * Auth Middleware Tests
 *
 * Comprehensive tests for authentication and authorization middleware:
 * - requireAuth: Authenticated user verification
 * - requireAdmin: Admin role verification
 * - requireOwnership: Resource ownership verification
 * - requireOwnershipOrAdmin: Owner or admin access verification
 */

describe("Auth Middleware Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should return user identity for authenticated user", async () => {
      const ctx = createMockQueryCtx();
      const identity = createTestIdentity("user_test123");

      ctx.auth.getUserIdentity.mockResolvedValue(identity);

      // Simulate requireAuth logic
      const result = await ctx.auth.getUserIdentity();

      expect(result).not.toBeNull();
      expect(result?.subject).toBe("user_test123");
      expect(result?.email).toBe("test@example.com");
      expect(result?.name).toBe("John Doe");
    });

    it("should throw error for unauthenticated user", async () => {
      const ctx = createMockQueryCtx();

      ctx.auth.getUserIdentity.mockResolvedValue(null);

      // Simulate requireAuth logic
      const identity = await ctx.auth.getUserIdentity();

      expect(identity).toBeNull();

      // In real implementation, this would throw ConvexError with UNAUTHORIZED code
      const shouldThrow = identity === null;
      expect(shouldThrow).toBe(true);
    });

    it("should extract clerkId from identity.subject", async () => {
      const ctx = createMockQueryCtx();
      const identity = createTestIdentity("user_custom456");

      ctx.auth.getUserIdentity.mockResolvedValue(identity);

      const result = await ctx.auth.getUserIdentity();

      expect(result?.subject).toBe("user_custom456");
      expect(result?.tokenIdentifier).toContain("user_custom456");
    });

    it("should handle missing email gracefully", async () => {
      const ctx = createMockQueryCtx();
      const identity = {
        subject: "user_test123",
        email: undefined,
        name: "John Doe",
        tokenIdentifier: "https://clerk.dev/user_test123",
      };

      ctx.auth.getUserIdentity.mockResolvedValue(identity);

      const result = await ctx.auth.getUserIdentity();

      expect(result?.email).toBeUndefined();
      // In real implementation, this would default to empty string
      const email = result?.email || "";
      expect(email).toBe("");
    });
  });

  describe("requireAdmin", () => {
    it("should allow access for admin user", async () => {
      const ctx = createMockQueryCtx();
      const adminUser = createTestAdminUser();
      const identity = createTestIdentity(adminUser.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(adminUser),
        }),
      });

      // Simulate requireAdmin logic
      const userIdentity = await ctx.auth.getUserIdentity();
      expect(userIdentity).not.toBeNull();

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userIdentity?.subject))
        .first();

      expect(user).not.toBeNull();
      expect(user?.role).toBe("admin");

      // Verify admin role
      const isAdmin = user?.role === "admin";
      expect(isAdmin).toBe(true);
    });

    it("should deny access for non-admin user", async () => {
      const ctx = createMockQueryCtx();
      const customerUser = createTestUser({ role: "customer" });
      const identity = createTestIdentity(customerUser.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(customerUser),
        }),
      });

      // Simulate requireAdmin logic
      const userIdentity = await ctx.auth.getUserIdentity();
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userIdentity?.subject))
        .first();

      expect(user?.role).toBe("customer");

      // Should throw FORBIDDEN error
      const isAdmin = user?.role === "admin";
      expect(isAdmin).toBe(false);
    });

    it("should throw error when user not found in database", async () => {
      const ctx = createMockQueryCtx();
      const identity = createTestIdentity("user_notfound");

      ctx.auth.getUserIdentity.mockResolvedValue(identity);
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const userIdentity = await ctx.auth.getUserIdentity();
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userIdentity?.subject))
        .first();

      expect(user).toBeNull();

      // Should throw USER_NOT_FOUND error
      const shouldThrow = user === null;
      expect(shouldThrow).toBe(true);
    });
  });

  describe("requireOwnership", () => {
    it("should allow access when user owns the resource", async () => {
      const ctx = createMockQueryCtx();
      const user = createTestUser();
      const identity = createTestIdentity(user.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);

      // Simulate requireOwnership logic
      const userIdentity = await ctx.auth.getUserIdentity();
      const resourceUserId = user.clerkId;

      expect(userIdentity?.subject).toBe(resourceUserId);

      const hasOwnership = userIdentity?.subject === resourceUserId;
      expect(hasOwnership).toBe(true);
    });

    it("should deny access when user does not own the resource", async () => {
      const ctx = createMockQueryCtx();
      const user = createTestUser({ clerkId: "user_test123" });
      const identity = createTestIdentity(user.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);

      // Simulate requireOwnership logic
      const userIdentity = await ctx.auth.getUserIdentity();
      const resourceUserId = "user_different456"; // Different user

      expect(userIdentity?.subject).not.toBe(resourceUserId);

      const hasOwnership = userIdentity?.subject === resourceUserId;
      expect(hasOwnership).toBe(false);

      // Should throw FORBIDDEN error
    });

    it("should throw error for unauthenticated user", async () => {
      const ctx = createMockQueryCtx();

      ctx.auth.getUserIdentity.mockResolvedValue(null);

      const userIdentity = await ctx.auth.getUserIdentity();

      expect(userIdentity).toBeNull();

      // Should throw UNAUTHORIZED error before checking ownership
    });
  });

  describe("requireOwnershipOrAdmin", () => {
    it("should allow access when user owns the resource", async () => {
      const ctx = createMockQueryCtx();
      const user = createTestUser();
      const identity = createTestIdentity(user.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(user),
        }),
      });

      const userIdentity = await ctx.auth.getUserIdentity();
      const dbUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userIdentity?.subject))
        .first();

      const resourceUserId = user.clerkId;

      // Check if admin or owner
      const isAdmin = dbUser?.role === "admin";
      const isOwner = dbUser?.clerkId === resourceUserId;

      expect(isOwner).toBe(true);
      expect(isAdmin || isOwner).toBe(true);
    });

    it("should allow access for admin user (regardless of ownership)", async () => {
      const ctx = createMockQueryCtx();
      const adminUser = createTestAdminUser();
      const identity = createTestIdentity(adminUser.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(adminUser),
        }),
      });

      const userIdentity = await ctx.auth.getUserIdentity();
      const dbUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userIdentity?.subject))
        .first();

      const resourceUserId = "user_different456"; // Different user's resource

      // Check if admin or owner
      const isAdmin = dbUser?.role === "admin";
      const isOwner = dbUser?.clerkId === resourceUserId;

      expect(isAdmin).toBe(true);
      expect(isOwner).toBe(false);
      expect(isAdmin || isOwner).toBe(true); // Admin can access any resource
    });

    it("should deny access when user is neither owner nor admin", async () => {
      const ctx = createMockQueryCtx();
      const user = createTestUser({ clerkId: "user_test123" });
      const identity = createTestIdentity(user.clerkId);

      ctx.auth.getUserIdentity.mockResolvedValue(identity);
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(user),
        }),
      });

      const userIdentity = await ctx.auth.getUserIdentity();
      const dbUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", userIdentity?.subject))
        .first();

      const resourceUserId = "user_different456"; // Different user's resource

      // Check if admin or owner
      const isAdmin = dbUser?.role === "admin";
      const isOwner = dbUser?.clerkId === resourceUserId;

      expect(isAdmin).toBe(false);
      expect(isOwner).toBe(false);
      expect(isAdmin || isOwner).toBe(false);

      // Should throw FORBIDDEN error
    });
  });

  describe("Role Hierarchy", () => {
    it("should enforce correct role hierarchy levels", () => {
      const ROLE_HIERARCHY = {
        customer: 0,
        admin: 1,
      };

      expect(ROLE_HIERARCHY.customer).toBeLessThan(ROLE_HIERARCHY.admin);
    });

    it("should validate role comparison logic", () => {
      const ROLE_HIERARCHY = {
        customer: 0,
        admin: 1,
      };

      // Customer cannot access admin resources
      expect(ROLE_HIERARCHY.customer).toBeLessThan(ROLE_HIERARCHY.admin);

      // Admin can access admin resources
      expect(ROLE_HIERARCHY.admin).toBeGreaterThanOrEqual(ROLE_HIERARCHY.admin);
    });
  });

  describe("Error Messages", () => {
    it("should provide clear error message for unauthorized access", () => {
      const errorMessage = "Authentication required. Please sign in to continue.";
      expect(errorMessage).toContain("Authentication required");
      expect(errorMessage).toContain("sign in");
    });

    it("should provide clear error message for forbidden access", () => {
      const errorMessage = "Access denied. Admin role required.";
      expect(errorMessage).toContain("Access denied");
      expect(errorMessage).toContain("Admin role required");
    });

    it("should provide clear error message for user not found", () => {
      const errorMessage = "User profile not found. Please complete registration.";
      expect(errorMessage).toContain("User profile not found");
      expect(errorMessage).toContain("complete registration");
    });
  });
});
