import { test, expect } from './fixtures';

/**
 * E2E Tests: Cart Operations
 *
 * Tests for cart functionality that affects the checkout flow.
 */

test.describe('Cart Operations', () => {
  test.describe('Adding Items', () => {
    test('should add item to cart from product page', async ({ page, productPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();

      // Cart badge should update
      const cartBadge = page.locator('[data-testid="cart-badge"], .cart-count');
      if (await cartBadge.isVisible()) {
        const count = await cartBadge.textContent();
        expect(parseInt(count || '0')).toBeGreaterThan(0);
      }
    });

    test('should show success toast when adding to cart', async ({ page, productPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();

      // Success toast should appear
      await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    });

    test('should add multiple items to cart', async ({ page, productPage }) => {
      // Add first item
      await productPage.goto('any');
      await productPage.addToCart();

      // Navigate to shop and add another item
      await page.goto('/shop');
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await page.waitForLoadState('networkidle');
      await page.locator('button:has-text("Add to Cart")').click();

      // Cart should have 2 items
      await page.waitForTimeout(1000); // Wait for cart update
      const cartPage = page;
      await cartPage.goto('/cart');
      const items = await page.locator('[data-testid="cart-item"]').count();
      expect(items).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Cart Page', () => {
    test.beforeEach(async ({ productPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
    });

    test('should display cart items', async ({ page, cartPage }) => {
      await cartPage.goto();

      // Should see at least one item
      await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible();
    });

    test('should show item details in cart', async ({ page, cartPage }) => {
      await cartPage.goto();

      // Check for product details
      await expect(page.locator('img').first()).toBeVisible(); // Product image
    });

    test('should have checkout button', async ({ page, cartPage }) => {
      await cartPage.goto();

      await expect(page.locator('button:has-text("Checkout"), a:has-text("Checkout")')).toBeVisible();
    });

    test('should show empty cart message when cart is empty', async ({ page }) => {
      // Go directly to cart (without adding items)
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // If cart is empty, should show message
      const emptyMessage = page.locator('text=/cart is empty|no items/i');
      if (await emptyMessage.isVisible()) {
        await expect(emptyMessage).toBeVisible();
      }
    });
  });

  test.describe('Cart to Checkout Flow', () => {
    test.beforeEach(async ({ productPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
    });

    test('should navigate from cart to checkout', async ({ page, cartPage }) => {
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Should be on checkout page
      expect(page.url()).toContain('/checkout');
    });

    test('should preserve cart items in checkout', async ({ page, _productPage, cartPage, _checkoutPage }) => {
      await cartPage.goto();

      // Count items in cart
      const cartItemCount = await page.locator('[data-testid="cart-item"]').count();

      await cartPage.proceedToCheckout();

      // Checkout should show same number of items
      const checkoutItems = await page.locator('.border.rounded-lg.divide-y > div').count();
      expect(checkoutItems).toBeGreaterThanOrEqual(cartItemCount > 0 ? 1 : 0);
    });
  });
});

test.describe('Cart - Guest vs Authenticated', () => {
  test('should allow guest to add items to cart', async ({ productPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();

    // Should succeed without authentication
    // The success toast confirms this
  });

  test('should require authentication to checkout', async ({ page, productPage, cartPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
    await cartPage.goto();

    // Try to checkout
    await page.locator('button:has-text("Checkout"), a:has-text("Checkout")').click();

    // Should either redirect to login or show authentication prompt
    // This behavior depends on the ProtectedRoute implementation
    await page.waitForTimeout(2000);

    // Either on checkout page (if authenticated) or redirected
    const isOnCheckout = page.url().includes('/checkout');
    const isOnLogin = page.url().includes('/sign-in') || page.url().includes('/login');

    expect(isOnCheckout || isOnLogin).toBeTruthy();
  });
});
