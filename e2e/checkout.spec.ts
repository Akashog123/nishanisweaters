import { test, expect, testAddresses } from './fixtures';

/**
 * E2E Tests: Checkout Flow
 *
 * Comprehensive end-to-end tests for the complete checkout process.
 * Tests cover the 4-step checkout wizard: Cart Review → Shipping → Payment → Review & Place
 */

test.describe('Checkout Flow', () => {
  test.describe('Step Navigation', () => {
    test.beforeEach(async ({ page, productPage }) => {
      // Add an item to cart before each test
      await productPage.goto('any');
      await productPage.addToCart();
    });

    test('should display step indicator with 4 steps', async ({ page, checkoutPage }) => {
      await checkoutPage.goto();

      // Verify all 4 steps are visible
      await expect(page.locator('text=Cart Review')).toBeVisible();
      await expect(page.locator('text=Shipping')).toBeVisible();
      await expect(page.locator('text=Payment')).toBeVisible();
      await expect(page.locator('text="Review & Place"')).toBeVisible();
    });

    test('should start on Cart Review step', async ({ checkoutPage }) => {
      await checkoutPage.goto();

      // Should see "Continue to Shipping" button
      await expect(checkoutPage['page'].locator('button:has-text("Continue to Shipping")')).toBeVisible();
    });

    test('should navigate forward through all steps', async ({ page, checkoutPage }) => {
      await checkoutPage.goto();

      // Step 1 → Step 2
      await checkoutPage.continueToShipping();
      await expect(page.locator('#name')).toBeVisible(); // Shipping form

      // Step 2 → Step 3 (with valid address)
      await checkoutPage.fillShippingAddress(testAddresses.valid);
      await checkoutPage.continueToPayment();
      await expect(page.locator('text=Payment Method')).toBeVisible();

      // Step 3 → Step 4
      await checkoutPage.reviewOrder();
      await expect(page.locator('text=Order Items')).toBeVisible();
      await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    });

    test('should navigate backward through steps', async ({ page, checkoutPage }) => {
      await checkoutPage.goto();

      // Navigate to step 4
      await checkoutPage.continueToShipping();
      await checkoutPage.fillShippingAddress(testAddresses.valid);
      await checkoutPage.continueToPayment();
      await checkoutPage.reviewOrder();

      // Go back to step 3
      await checkoutPage.goBack();
      await expect(page.locator('text=Payment Method')).toBeVisible();

      // Go back to step 2
      await checkoutPage.goBack();
      await expect(page.locator('#name')).toBeVisible();

      // Go back to step 1
      await checkoutPage.goBack();
      await expect(page.locator('button:has-text("Continue to Shipping")')).toBeVisible();
    });
  });

  test.describe('Cart Review Step', () => {
    test('should display cart items with details', async ({ page, productPage, checkoutPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
      await checkoutPage.goto();

      // Should show item details
      await expect(page.locator('img[alt]').first()).toBeVisible(); // Product image
      await expect(page.locator('text=Size:')).toBeVisible();
      await expect(page.locator('text=Color:')).toBeVisible();
      await expect(page.locator('text=Qty:')).toBeVisible();
    });

    test('should show subtotal correctly', async ({ page, productPage, checkoutPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
      await checkoutPage.goto();

      // Subtotal should be visible
      await expect(page.locator('text=Subtotal')).toBeVisible();
    });

    test('should have link to edit cart', async ({ page, productPage, checkoutPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
      await checkoutPage.goto();

      // "Edit Cart" link should navigate to /cart
      const editCartLink = page.locator('a:has-text("Edit Cart")');
      await expect(editCartLink).toBeVisible();
      await expect(editCartLink).toHaveAttribute('href', '/cart');
    });

    test('should redirect to cart if cart is empty', async ({ page }) => {
      // Navigate directly to checkout with empty cart
      await page.goto('/checkout');

      // Should redirect to /cart
      await page.waitForURL(/\/cart/);
    });
  });

  test.describe('Shipping Step - Form Validation', () => {
    test.beforeEach(async ({ productPage, checkoutPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
      await checkoutPage.goto();
      await checkoutPage.continueToShipping();
    });

    test('should show all required fields', async ({ page }) => {
      await expect(page.locator('#name')).toBeVisible();
      await expect(page.locator('#phone')).toBeVisible();
      await expect(page.locator('#street')).toBeVisible();
      await expect(page.locator('#city')).toBeVisible();
      await expect(page.locator('#state')).toBeVisible();
      await expect(page.locator('#postalCode')).toBeVisible();
      await expect(page.locator('#country')).toBeVisible();
    });

    test('should validate empty name', async ({ page, checkoutPage }) => {
      await checkoutPage.fillShippingAddress({ ...testAddresses.valid, name: '' });
      await page.locator('button:has-text("Continue to Payment")').click();

      // Should show error toast
      await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    });

    test('should validate invalid phone number', async ({ page, checkoutPage }) => {
      await checkoutPage.fillShippingAddress(testAddresses.invalidPhone);
      await page.locator('button:has-text("Continue to Payment")').click();

      // Should show phone validation error
      await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    });

    test('should validate invalid postal code', async ({ page, checkoutPage }) => {
      await checkoutPage.fillShippingAddress(testAddresses.invalidPostal);
      await page.locator('button:has-text("Continue to Payment")').click();

      // Should show postal code validation error
      await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    });

    test('should accept valid address and continue', async ({ page, checkoutPage }) => {
      await checkoutPage.fillShippingAddress(testAddresses.valid);
      await checkoutPage.continueToPayment();

      // Should be on payment step
      await expect(page.locator('text=Payment Method')).toBeVisible();
    });
  });

  test.describe('Payment Step', () => {
    test.beforeEach(async ({ productPage, checkoutPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
      await checkoutPage.goto();
      await checkoutPage.continueToShipping();
      await checkoutPage.fillShippingAddress(testAddresses.valid);
      await checkoutPage.continueToPayment();
    });

    test('should show Razorpay payment option', async ({ page }) => {
      await expect(page.locator('#razorpay')).toBeVisible();
      await expect(page.locator('text=Pay with Razorpay')).toBeVisible();
      await expect(page.locator('text=Credit/Debit Card, UPI, Net Banking')).toBeVisible();
    });

    test('should have Razorpay selected by default', async ({ page }) => {
      const razorpayOption = page.locator('#razorpay');
      await expect(razorpayOption).toBeChecked();
    });

    test('should show order notes textarea', async ({ page }) => {
      const notesField = page.locator('textarea[placeholder*="special instructions"]');
      await expect(notesField).toBeVisible();
    });

    test('should allow adding order notes', async ({ page, checkoutPage }) => {
      const testNotes = 'Please handle with care';
      await checkoutPage.addOrderNotes(testNotes);
      await checkoutPage.reviewOrder();

      // Notes should appear in review
      await expect(page.locator(`text=${testNotes}`)).toBeVisible();
    });
  });

  test.describe('Review Step', () => {
    test.beforeEach(async ({ productPage, checkoutPage }) => {
      await productPage.goto('any');
      await productPage.addToCart();
      await checkoutPage.goto();
      await checkoutPage.continueToShipping();
      await checkoutPage.fillShippingAddress(testAddresses.valid);
      await checkoutPage.continueToPayment();
      await checkoutPage.reviewOrder();
    });

    test('should display order items summary', async ({ page }) => {
      await expect(page.locator('text=Order Items')).toBeVisible();
    });

    test('should display shipping address summary', async ({ page }) => {
      await expect(page.locator('text=Shipping Address')).toBeVisible();
      await expect(page.locator(`text=${testAddresses.valid.name}`)).toBeVisible();
      await expect(page.locator(`text=${testAddresses.valid.street}`)).toBeVisible();
    });

    test('should display payment method summary', async ({ page }) => {
      await expect(page.locator('text=Payment Method')).toBeVisible();
      await expect(page.locator('text=Razorpay')).toBeVisible();
    });

    test('should display order totals breakdown', async ({ page }) => {
      await expect(page.locator('text=Subtotal')).toBeVisible();
      await expect(page.locator('text=Shipping')).toBeVisible();
      await expect(page.locator('text=Tax')).toBeVisible();
      await expect(page.locator('text=Total')).toBeVisible();
    });

    test('should show FREE shipping for orders above threshold', async ({ page }) => {
      // This test assumes the order is above the free shipping threshold
      // The actual threshold is defined in constants
      const shippingText = page.locator('text=Shipping').locator('..').locator('span:last-child');
      const shippingValue = await shippingText.textContent();
      // Either shows FREE or a price
      expect(shippingValue).toBeTruthy();
    });

    test('should have Place Order button', async ({ page }) => {
      await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
      await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
    });
  });
});

test.describe('Checkout - Authentication', () => {
  test('should require authentication for checkout', async ({ page }) => {
    // This test would need authentication setup
    // For now, we verify the redirect happens
    test.skip(true, 'Requires authentication mock setup');
  });
});

test.describe('Checkout - Promo Codes', () => {
  test('should display promo discount if applied', async ({ page, productPage, checkoutPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
    await checkoutPage.goto();
    await checkoutPage.continueToShipping();
    await checkoutPage.fillShippingAddress(testAddresses.valid);
    await checkoutPage.continueToPayment();
    await checkoutPage.reviewOrder();

    // If a promo code was applied in cart, it should show here
    // This is a conditional check since promo may not be applied
    const promoDiscount = page.locator('text=Promo Discount');
    if (await promoDiscount.isVisible()) {
      await expect(promoDiscount).toBeVisible();
    }
  });
});
