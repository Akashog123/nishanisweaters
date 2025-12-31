import { test as base, expect, Page } from '@playwright/test';

/**
 * E2E Test Fixtures
 *
 * Provides reusable page objects and utilities for checkout flow testing.
 */

// ============================================
// PAGE OBJECTS
// ============================================

/**
 * Product Page Object
 */
export class ProductPage {
  constructor(private page: Page) {}

  async goto(productId: string = 'any') {
    if (productId === 'any') {
      // Navigate to shop and select first product
      await this.page.goto('/shop');
      await this.page.waitForLoadState('networkidle');
      await this.page.locator('[data-testid="product-card"]').first().click();
    } else {
      await this.page.goto(`/product/${productId}`);
    }
    await this.page.waitForLoadState('networkidle');
  }

  async selectSize(size: string) {
    await this.page.locator(`button:has-text("${size}")`).click();
  }

  async selectColor(color: string) {
    await this.page.locator(`button[title="${color}"], button[aria-label*="${color}"]`).first().click();
  }

  async addToCart() {
    await this.page.locator('button:has-text("Add to Cart")').click();
    // Wait for toast confirmation
    await expect(this.page.locator('text=added to cart')).toBeVisible({ timeout: 5000 });
  }

  async setQuantity(quantity: number) {
    const input = this.page.locator('input[type="number"]');
    await input.fill(quantity.toString());
  }
}

/**
 * Cart Page Object
 */
export class CartPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('networkidle');
  }

  async getItemCount() {
    const items = await this.page.locator('[data-testid="cart-item"]').count();
    return items;
  }

  async updateQuantity(index: number, quantity: number) {
    const item = this.page.locator('[data-testid="cart-item"]').nth(index);
    const input = item.locator('input[type="number"]');
    await input.fill(quantity.toString());
  }

  async removeItem(index: number) {
    const item = this.page.locator('[data-testid="cart-item"]').nth(index);
    await item.locator('button[aria-label="Remove"]').click();
  }

  async proceedToCheckout() {
    await this.page.locator('button:has-text("Checkout"), a:has-text("Checkout")').click();
    await this.page.waitForURL(/\/checkout/);
  }

  async isEmpty() {
    return await this.page.locator('text=Your cart is empty').isVisible();
  }
}

/**
 * Checkout Page Object
 */
export class CheckoutPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/checkout');
    await this.page.waitForLoadState('networkidle');
  }

  // Step Navigation
  async getCurrentStep() {
    const stepIndicator = this.page.locator('nav[aria-label="Checkout progress"]');
    const activeStep = await stepIndicator.locator('.bg-primary\\/10, .border-primary').first().textContent();
    return activeStep?.trim();
  }

  async continueToShipping() {
    await this.page.locator('button:has-text("Continue to Shipping")').click();
  }

  async continueToPayment() {
    await this.page.locator('button:has-text("Continue to Payment")').click();
  }

  async reviewOrder() {
    await this.page.locator('button:has-text("Review Order")').click();
  }

  async goBack() {
    await this.page.locator('button:has-text("Back")').click();
  }

  // Step 1: Cart Review
  async verifyCartItems(expectedCount: number) {
    const items = await this.page.locator('.border.rounded-lg.divide-y > div').count();
    expect(items).toBe(expectedCount);
  }

  // Step 2: Shipping
  async fillShippingAddress(address: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  }) {
    await this.page.locator('#name').fill(address.name);
    await this.page.locator('#phone').fill(address.phone);
    await this.page.locator('#street').fill(address.street);
    await this.page.locator('#city').fill(address.city);
    await this.page.locator('#state').fill(address.state);
    await this.page.locator('#postalCode').fill(address.postalCode);
    if (address.country) {
      await this.page.locator('#country').fill(address.country);
    }
  }

  async verifyShippingValidation() {
    // Try to continue without filling address
    await this.page.locator('button:has-text("Continue to Payment")').click();
    // Should show validation error
    await expect(this.page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
  }

  // Step 3: Payment
  async selectPaymentMethod(method: 'razorpay' | 'invoice') {
    await this.page.locator(`#${method}`).click();
  }

  async addOrderNotes(notes: string) {
    await this.page.locator('textarea[placeholder*="special instructions"]').fill(notes);
  }

  // Step 4: Review & Place
  async verifyOrderSummary() {
    await expect(this.page.locator('text=Order Items')).toBeVisible();
    await expect(this.page.locator('text=Shipping Address')).toBeVisible();
    await expect(this.page.locator('text=Payment Method')).toBeVisible();
    await expect(this.page.locator('text=Order Total')).toBeVisible();
  }

  async getTotal() {
    const totalElement = this.page.locator('.font-bold.text-lg >> nth=1');
    const totalText = await totalElement.textContent();
    return totalText;
  }

  async placeOrder() {
    await this.page.locator('button:has-text("Place Order")').click();
  }

  async isLoading() {
    return await this.page.locator('button:has-text("Processing")').isVisible();
  }
}

/**
 * Order Confirmation Page Object
 */
export class OrderConfirmationPage {
  constructor(private page: Page) {}

  async isOnConfirmationPage() {
    return this.page.url().includes('/order-confirmation');
  }

  async getOrderNumber() {
    const orderNumber = await this.page.locator('text=/NW-\\d+-\\d+/').textContent();
    return orderNumber;
  }

  async verifySuccessMessage() {
    await expect(this.page.locator('text=/order.*confirmed|thank you/i')).toBeVisible();
  }
}

// ============================================
// TEST DATA
// ============================================

export const testAddresses = {
  valid: {
    name: 'John Doe',
    phone: '9876543210',
    street: '123 Test Street, Apartment 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  },
  invalidPhone: {
    name: 'John Doe',
    phone: '123', // Invalid - too short
    street: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  },
  invalidPostal: {
    name: 'John Doe',
    phone: '9876543210',
    street: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '12345', // Invalid - should be 6 digits
    country: 'India',
  },
};

// ============================================
// EXTENDED TEST TYPE
// ============================================

type TestFixtures = {
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  confirmationPage: OrderConfirmationPage;
};

export const test = base.extend<TestFixtures>({
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  confirmationPage: async ({ page }, use) => {
    await use(new OrderConfirmationPage(page));
  },
});

export { expect } from '@playwright/test';
