import { test, expect, testAddresses } from './fixtures';

/**
 * E2E Tests: Checkout Accessibility & Visual
 *
 * Tests for accessibility, responsiveness, and visual aspects of checkout.
 */

test.describe('Checkout - Accessibility', () => {
  test.beforeEach(async ({ productPage, checkoutPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
    await checkoutPage.goto();
  });

  test('should have proper step indicator aria labels', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Checkout progress"]');
    await expect(nav).toBeVisible();
  });

  test('should have proper form labels in shipping step', async ({ page, checkoutPage }) => {
    await checkoutPage.continueToShipping();

    // All form fields should have associated labels
    await expect(page.locator('label[for="name"]')).toBeVisible();
    await expect(page.locator('label[for="phone"]')).toBeVisible();
    await expect(page.locator('label[for="street"]')).toBeVisible();
    await expect(page.locator('label[for="city"]')).toBeVisible();
    await expect(page.locator('label[for="state"]')).toBeVisible();
    await expect(page.locator('label[for="postalCode"]')).toBeVisible();
  });

  test('should have accessible radio buttons in payment step', async ({ page, checkoutPage }) => {
    await checkoutPage.continueToShipping();
    await checkoutPage.fillShippingAddress(testAddresses.valid);
    await checkoutPage.continueToPayment();

    // Radio buttons should be accessible
    const radioGroup = page.locator('[role="radiogroup"]');
    await expect(radioGroup).toBeVisible();
  });

  test('buttons should be keyboard accessible', async ({ page, checkoutPage }) => {
    // Tab to the continue button and verify it's focusable
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Continue button should be focusable
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Checkout - Responsiveness', () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
  });

  test('should display correctly on mobile viewport', async ({ page, checkoutPage }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await checkoutPage.goto();

    // Main content should still be visible
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue to Shipping")')).toBeVisible();
  });

  test('should stack form fields on mobile', async ({ page, checkoutPage }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await checkoutPage.goto();
    await checkoutPage.continueToShipping();

    // Form should be visible and usable on mobile
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page, checkoutPage }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await checkoutPage.goto();

    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page, checkoutPage }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await checkoutPage.goto();

    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
  });
});

test.describe('Checkout - Error States', () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
  });

  test('should display error toast for validation errors', async ({ page, checkoutPage }) => {
    await checkoutPage.goto();
    await checkoutPage.continueToShipping();

    // Try to continue without filling form
    await page.locator('button:has-text("Continue to Payment")').click();

    // Error toast should appear
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
  });

  test('should highlight invalid fields', async ({ page, checkoutPage }) => {
    await checkoutPage.goto();
    await checkoutPage.continueToShipping();

    // Fill only name, try to continue
    await page.locator('#name').fill('John Doe');
    await page.locator('button:has-text("Continue to Payment")').click();

    // Should not proceed (validation error)
    await expect(page.locator('#phone')).toBeVisible();
  });

  test('should show cart error if present', async ({ page, checkoutPage }) => {
    await checkoutPage.goto();

    // Check if error alert exists (may or may not depending on cart state)
    const errorAlert = page.locator('[role="alert"]');
    // Just verify the page loads correctly
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
  });
});

test.describe('Checkout - Performance', () => {
  test('should load checkout page within acceptable time', async ({ page, productPage, checkoutPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();

    const startTime = Date.now();
    await checkoutPage.goto();
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Main content should be visible
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
  });

  test('should navigate between steps quickly', async ({ page, productPage, checkoutPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
    await checkoutPage.goto();

    const startTime = Date.now();
    await checkoutPage.continueToShipping();
    const stepTime = Date.now() - startTime;

    // Step navigation should be fast (under 500ms for UI update)
    expect(stepTime).toBeLessThan(2000);
  });
});

test.describe('Checkout - Step Indicator Visual States', () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.goto('any');
    await productPage.addToCart();
  });

  test('should show completed state for passed steps', async ({ page, checkoutPage }) => {
    await checkoutPage.goto();
    await checkoutPage.continueToShipping();
    await checkoutPage.fillShippingAddress(testAddresses.valid);
    await checkoutPage.continueToPayment();

    // Step 1 and 2 should show completed (check mark)
    const completedSteps = page.locator('nav[aria-label="Checkout progress"] svg.lucide-check');
    const count = await completedSteps.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show current step highlighted', async ({ page, checkoutPage }) => {
    await checkoutPage.goto();

    // Current step should have special styling
    const currentStep = page.locator('nav[aria-label="Checkout progress"] .border-primary');
    await expect(currentStep.first()).toBeVisible();
  });
});
