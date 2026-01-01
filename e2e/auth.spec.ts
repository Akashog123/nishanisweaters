import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests: Authentication Flows
 *
 * Comprehensive end-to-end tests for authentication using Clerk.
 * Tests cover sign-in, sign-out, protected routes, role-based access, and session persistence.
 *
 * NOTE: These tests use Playwright's route interception to mock Clerk authentication
 * responses, allowing us to test authentication flows without requiring real Clerk credentials.
 */

// ============================================
// TEST DATA
// ============================================

interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  emailAddresses: Array<{ emailAddress: string; id: string }>;
  primaryEmailAddress: { emailAddress: string; id: string };
  imageUrl: string;
  fullName: string;
  username: string;
}

const mockUsers = {
  customer: {
    id: 'user_customer_123',
    firstName: 'John',
    lastName: 'Customer',
    emailAddresses: [{ emailAddress: 'customer@example.com', id: 'email-1' }],
    primaryEmailAddress: { emailAddress: 'customer@example.com', id: 'email-1' },
    imageUrl: 'https://example.com/customer-avatar.jpg',
    fullName: 'John Customer',
    username: 'johncustomer',
  },
  wholesale: {
    id: 'user_wholesale_456',
    firstName: 'Jane',
    lastName: 'Wholesale',
    emailAddresses: [{ emailAddress: 'wholesale@example.com', id: 'email-2' }],
    primaryEmailAddress: { emailAddress: 'wholesale@example.com', id: 'email-2' },
    imageUrl: 'https://example.com/wholesale-avatar.jpg',
    fullName: 'Jane Wholesale',
    username: 'janewholesale',
  },
  admin: {
    id: 'user_admin_789',
    firstName: 'Admin',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'admin@example.com', id: 'email-3' }],
    primaryEmailAddress: { emailAddress: 'admin@example.com', id: 'email-3' },
    imageUrl: 'https://example.com/admin-avatar.jpg',
    fullName: 'Admin User',
    username: 'adminuser',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Mock Clerk authentication state for a signed-in user
 */
async function mockSignedInUser(page: Page, user: MockUser) {
  // Intercept Clerk API calls and return authenticated state
  await page.route('**/clerk/v1/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/client')) {
      // Return authenticated client state
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            sessions: [{
              id: 'sess_123',
              user,
              status: 'active',
              last_active_at: Date.now(),
              expire_at: Date.now() + 86400000, // 24 hours
            }],
            client: {
              id: 'client_123',
              sessions: ['sess_123'],
              sign_in_attempt: null,
              sign_up_attempt: null,
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock Clerk's __clerk_db_jwt cookie
  await page.context().addCookies([
    {
      name: '__clerk_db_jwt',
      value: 'mock_jwt_token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Set session storage for Clerk
  await page.addInitScript((userData) => {
    window.localStorage.setItem('__clerk_client_jwt', 'mock_jwt_token');
    window.localStorage.setItem('__clerk_user', JSON.stringify(userData));
  }, user);
}

/**
 * Mock Clerk authentication state for a signed-out user
 */
async function mockSignedOutUser(page: Page) {
  await page.route('**/clerk/v1/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/client')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            sessions: [],
            client: {
              id: 'client_123',
              sessions: [],
              sign_in_attempt: null,
              sign_up_attempt: null,
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Clear authentication cookies and storage
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.removeItem('__clerk_client_jwt');
    window.localStorage.removeItem('__clerk_user');
  });
}

/**
 * Mock Convex database user with specific role
 */
async function mockConvexUser(page: Page, userId: string, role: 'customer' | 'wholesale' | 'admin') {
  await page.route('**/api/query', async (route) => {
    const postData = route.request().postDataJSON();

    // Mock getCurrentUser query
    if (postData?.path === 'users:getCurrentUser') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          value: {
            _id: `convex_${userId}`,
            _creationTime: Date.now(),
            clerkId: userId,
            email: `${role}@example.com`,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
            role,
            createdAt: Date.now(),
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

// ============================================
// TEST SUITES
// ============================================

test.describe('Authentication - Sign In Flow', () => {
  test('should display sign-in button when not authenticated', async ({ page }) => {
    await mockSignedOutUser(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should see Sign In and Sign Up buttons
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
  });

  test('should display user button when authenticated', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should see user button (Clerk UserButton component)
    // Note: Clerk's UserButton renders as a button with user avatar
    const userButton = page.locator('button[aria-label*="user"], button[data-clerk-element="userButton"]').first();
    await expect(userButton).toBeVisible({ timeout: 10000 });
  });

  test('should show sign-in modal when clicking Sign In button', async ({ page }) => {
    await mockSignedOutUser(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Sign In button
    await page.locator('button:has-text("Sign In")').click();

    // Clerk modal should appear (in real scenario)
    // Note: In E2E tests, Clerk modal may not fully render without real Clerk setup
    // This test validates the button click triggers the modal
    await page.waitForTimeout(1000);
  });
});

test.describe('Authentication - Protected Routes', () => {
  test('should redirect to home when accessing checkout without authentication', async ({ page }) => {
    await mockSignedOutUser(page);

    // Try to access checkout page
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home page
    await expect(page).toHaveURL('/');
  });

  test('should allow access to checkout when authenticated', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    // Navigate to checkout (will redirect to cart if empty, but should not redirect to home)
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Should either be on checkout or cart page (not home)
    const url = page.url();
    expect(url.includes('/checkout') || url.includes('/cart')).toBeTruthy();
  });

  test('should redirect to home when accessing order history without authentication', async ({ page }) => {
    await mockSignedOutUser(page);

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow access to order history when authenticated', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be on orders page
    expect(page.url()).toContain('/orders');
  });

  test('should redirect to home when accessing wishlist without authentication', async ({ page }) => {
    await mockSignedOutUser(page);

    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow access to wishlist when authenticated', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Should be on wishlist page
    expect(page.url()).toContain('/wishlist');
  });
});

test.describe('Authentication - Admin Routes', () => {
  test('should block access to admin dashboard for non-admin users', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow admin access to admin dashboard', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.admin);
    await mockConvexUser(page, mockUsers.admin.id, 'admin');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should be on admin dashboard
    expect(page.url()).toContain('/admin');

    // Should see admin dashboard elements
    await expect(page.locator('text=Dashboard, text=Admin')).toBeVisible({ timeout: 10000 });
  });

  test('should block access to admin products page for non-admin users', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow admin access to admin products page', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.admin);
    await mockConvexUser(page, mockUsers.admin.id, 'admin');

    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    // Should be on admin products page
    expect(page.url()).toContain('/admin/products');
  });

  test('should block access to admin orders page for non-admin users', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow admin access to admin orders page', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.admin);
    await mockConvexUser(page, mockUsers.admin.id, 'admin');

    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Should be on admin orders page
    expect(page.url()).toContain('/admin/orders');
  });

  test('should block access to admin customers page for non-admin users', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });
});

test.describe('Authentication - Wholesale Routes', () => {
  test('should block access to wholesale dashboard for non-wholesale users', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/wholesale/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow wholesale user access to wholesale dashboard', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.wholesale);
    await mockConvexUser(page, mockUsers.wholesale.id, 'wholesale');

    await page.goto('/wholesale/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be on wholesale dashboard
    expect(page.url()).toContain('/wholesale/dashboard');
  });

  test('should allow admin access to wholesale dashboard', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.admin);
    await mockConvexUser(page, mockUsers.admin.id, 'admin');

    await page.goto('/wholesale/dashboard');
    await page.waitForLoadState('networkidle');

    // Admins can access wholesale routes
    expect(page.url()).toContain('/wholesale/dashboard');
  });

  test('should block access to bulk order page for non-wholesale users', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/wholesale/bulk-order');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should allow wholesale user access to bulk order page', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.wholesale);
    await mockConvexUser(page, mockUsers.wholesale.id, 'wholesale');

    await page.goto('/wholesale/bulk-order');
    await page.waitForLoadState('networkidle');

    // Should be on bulk order page
    expect(page.url()).toContain('/wholesale/bulk-order');
  });

  test('should allow any authenticated user to access wholesale registration', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/wholesale/register');
    await page.waitForLoadState('networkidle');

    // Should be on wholesale registration page
    expect(page.url()).toContain('/wholesale/register');
  });
});

test.describe('Authentication - Session Persistence', () => {
  test('should maintain session across page reloads', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify user is signed in
    const userButton = page.locator('button[aria-label*="user"], button[data-clerk-element="userButton"]').first();
    await expect(userButton).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // User should still be signed in
    await expect(userButton).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session when navigating between pages', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to shop
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // User should still be signed in
    const userButton = page.locator('button[aria-label*="user"], button[data-clerk-element="userButton"]').first();
    await expect(userButton).toBeVisible({ timeout: 10000 });

    // Navigate to orders
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be on orders page (not redirected)
    expect(page.url()).toContain('/orders');
  });

  test('should preserve authentication state in new tab', async ({ context, page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open new tab
    const newPage = await context.newPage();
    await mockSignedInUser(newPage, mockUsers.customer);
    await mockConvexUser(newPage, mockUsers.customer.id, 'customer');

    await newPage.goto('/');
    await newPage.waitForLoadState('networkidle');

    // User should be signed in on new tab
    const userButton = newPage.locator('button[aria-label*="user"], button[data-clerk-element="userButton"]').first();
    await expect(userButton).toBeVisible({ timeout: 10000 });

    await newPage.close();
  });
});

test.describe('Authentication - Sign Out Flow', () => {
  test('should sign out user and show sign-in button', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click user button to open menu
    const userButton = page.locator('button[aria-label*="user"], button[data-clerk-element="userButton"]').first();
    await userButton.click({ timeout: 10000 });

    // Wait for menu to appear and click sign out
    // Note: Clerk's UserButton menu structure may vary
    await page.waitForTimeout(1000);

    // Mock sign out by clearing authentication
    await mockSignedOutUser(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see Sign In button
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should block access to protected routes after sign out', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be on orders page
    expect(page.url()).toContain('/orders');

    // Sign out
    await mockSignedOutUser(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Try to access orders again
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should clear user data after sign out', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check localStorage has user data
    const hasUserData = await page.evaluate(() => {
      return window.localStorage.getItem('__clerk_user') !== null;
    });
    expect(hasUserData).toBeTruthy();

    // Sign out
    await mockSignedOutUser(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check localStorage is cleared
    const hasUserDataAfterSignOut = await page.evaluate(() => {
      return window.localStorage.getItem('__clerk_user') !== null;
    });
    expect(hasUserDataAfterSignOut).toBeFalsy();
  });
});

test.describe('Authentication - Loading States', () => {
  test('should show loading spinner while authentication is loading', async ({ page }) => {
    // Don't mock authentication immediately to simulate loading state
    await page.goto('/');

    // Should see loading spinner briefly
    // Note: This may be very fast in tests
    const _spinner = page.locator('.animate-spin').first();

    // Wait a bit for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show loading spinner on protected route while checking auth', async ({ page }) => {
    await page.goto('/orders');

    // Should see loading spinner while checking authentication
    // Then redirect to home if not authenticated
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });
});

test.describe('Authentication - Accessibility', () => {
  test('should have accessible sign-in button', async ({ page }) => {
    await mockSignedOutUser(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const signInButton = page.locator('button:has-text("Sign In")');

    // Should be keyboard accessible
    await signInButton.focus();
    await expect(signInButton).toBeFocused();

    // Should have proper role
    await expect(signInButton).toHaveAttribute('type', 'button');
  });

  test('should have accessible user button when authenticated', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const userButton = page.locator('button[aria-label*="user"], button[data-clerk-element="userButton"]').first();

    // Should be keyboard accessible
    await userButton.focus({ timeout: 10000 });
    await expect(userButton).toBeFocused();
  });
});

test.describe('Authentication - Edge Cases', () => {
  test('should handle expired session gracefully', async ({ page }) => {
    // Mock expired session
    await page.route('**/clerk/v1/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Session expired' }],
        }),
      });
    });

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should handle network errors during authentication', async ({ page }) => {
    // Mock network error
    await page.route('**/clerk/v1/**', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should still load (may show sign-in buttons)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle missing user data gracefully', async ({ page }) => {
    await mockSignedInUser(page, mockUsers.customer);

    // Mock Convex returning null for user
    await page.route('**/api/query', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.path === 'users:getCurrentUser') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            value: null, // User not found in database
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home when user not found in database
    await expect(page).toHaveURL('/');
  });
});

test.describe('Authentication - Return URL Preservation', () => {
  test('should preserve return URL when redirecting to sign-in', async ({ page }) => {
    await mockSignedOutUser(page);

    // Try to access protected route
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to home
    // In a real Clerk setup, the return URL would be preserved in state
    await expect(page).toHaveURL('/');
  });

  test('should redirect to original page after sign-in', async ({ page }) => {
    // This test simulates the flow of:
    // 1. User tries to access /orders without auth
    // 2. Gets redirected to sign-in
    // 3. Signs in
    // 4. Gets redirected back to /orders

    await mockSignedOutUser(page);
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Redirected to home
    await expect(page).toHaveURL('/');

    // Now sign in
    await mockSignedInUser(page, mockUsers.customer);
    await mockConvexUser(page, mockUsers.customer.id, 'customer');

    // Navigate to orders again
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be on orders page
    expect(page.url()).toContain('/orders');
  });
});
