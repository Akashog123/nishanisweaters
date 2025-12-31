import { Page } from '@playwright/test';

/**
 * Admin Test Fixtures
 *
 * Provides reusable page objects and utilities for admin operations testing.
 * Includes authentication mocking and navigation helpers.
 */

/**
 * Admin Page Object
 *
 * Centralized page object for all admin operations including:
 * - Dashboard navigation
 * - Product management
 * - Order management
 * - Customer management
 * - Authentication mocking
 */
export class AdminPage {
  constructor(private page: Page) {}

  /**
   * Mock admin authentication
   *
   * Sets up route interception to bypass Clerk authentication
   * and simulate an authenticated admin user session.
   */
  async mockAdminAuth() {
    // Mock Clerk authentication endpoints
    await this.page.route('**/api.clerk.com/**', async (route) => {
      const url = route.request().url();

      // Mock session endpoint
      if (url.includes('/sessions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'sess_mock_admin',
            user_id: 'user_mock_admin',
            status: 'active',
            last_active_at: Date.now(),
            expire_at: Date.now() + 86400000, // 24 hours
          }),
        });
        return;
      }

      // Mock user endpoint
      if (url.includes('/users')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user_mock_admin',
            email_addresses: [
              {
                email_address: 'admin@test.com',
                id: 'email_mock',
              },
            ],
            first_name: 'Admin',
            last_name: 'User',
            public_metadata: {
              role: 'admin',
            },
          }),
        });
        return;
      }

      // Default: continue with request
      await route.continue();
    });

    // Mock Convex authentication check
    await this.page.route('**/api/convex/**', async (route) => {
      const url = route.request().url();

      // Allow most Convex requests to go through
      // but intercept auth checks if needed
      if (url.includes('auth') || url.includes('user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            role: 'admin',
            isAuthenticated: true,
          }),
        });
        return;
      }

      await route.continue();
    });

    // Set local storage to simulate authenticated session
    await this.page.addInitScript(() => {
      // Mock Clerk session in localStorage
      localStorage.setItem(
        '__clerk_db_jwt',
        JSON.stringify({
          token: 'mock_jwt_token',
          expiresAt: Date.now() + 86400000,
        })
      );

      // Mock user data
      localStorage.setItem(
        '__clerk_user',
        JSON.stringify({
          id: 'user_mock_admin',
          email: 'admin@test.com',
          role: 'admin',
        })
      );
    });
  }

  /**
   * Navigate to admin dashboard
   */
  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to products management page
   */
  async gotoProducts() {
    await this.page.goto('/admin/products');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to orders management page
   */
  async gotoOrders() {
    await this.page.goto('/admin/orders');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to customers management page
   */
  async gotoCustomers() {
    await this.page.goto('/admin/customers');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to wholesale applications page
   */
  async gotoWholesale() {
    await this.page.goto('/admin/wholesale');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to settings page
   */
  async gotoSettings() {
    await this.page.goto('/admin/settings');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search for items in the current admin page
   */
  async search(query: string) {
    const searchInput = this.page.locator('input[placeholder*="Search"]');
    await searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    const searchInput = this.page.locator('input[placeholder*="Search"]');
    await searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the count of items in a table
   */
  async getTableRowCount(): Promise<number> {
    const table = this.page.locator('table').first();
    const rows = table.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Click on a specific table row by index
   */
  async clickTableRow(index: number) {
    const table = this.page.locator('table').first();
    const row = table.locator('tbody tr').nth(index);
    await row.click();
  }

  /**
   * Get text content from a specific table cell
   */
  async getTableCellText(rowIndex: number, columnIndex: number): Promise<string> {
    const table = this.page.locator('table').first();
    const cell = table.locator('tbody tr').nth(rowIndex).locator('td').nth(columnIndex);
    return (await cell.textContent()) || '';
  }

  /**
   * Navigate to next page in pagination
   */
  async goToNextPage() {
    const nextButton = this.page.locator('button:has-text("Next")');
    await nextButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to previous page in pagination
   */
  async goToPreviousPage() {
    const prevButton = this.page.locator('button:has-text("Previous")');
    await prevButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if pagination exists
   */
  async hasPagination(): Promise<boolean> {
    const nextButton = this.page.locator('button:has-text("Next")');
    return await nextButton.isVisible();
  }

  /**
   * Open a dialog/modal by clicking a button
   */
  async openDialog(buttonText: string) {
    await this.page.locator(`button:has-text("${buttonText}")`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Close the currently open dialog
   */
  async closeDialog() {
    const cancelButton = this.page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      // Try to click the X button or overlay
      const closeButton = this.page.locator('[aria-label="Close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Select a filter option from a dropdown
   */
  async selectFilter(filterName: string, optionText: string) {
    // Click the filter dropdown
    const filterButton = this.page.locator(`button:has-text("${filterName}")`).first();
    await filterButton.click();

    // Select the option
    await this.page.locator(`text=${optionText}`).first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click on a stat card to filter by that status
   */
  async clickStatCard(cardTitle: string) {
    const card = this.page.locator(`text=${cardTitle}`).locator('..').locator('..');
    await card.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify if a toast notification is visible
   */
  async hasToast(): Promise<boolean> {
    const toast = this.page.locator('[data-sonner-toast]');
    return await toast.isVisible();
  }

  /**
   * Get toast message text
   */
  async getToastMessage(): Promise<string> {
    const toast = this.page.locator('[data-sonner-toast]');
    return (await toast.textContent()) || '';
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading() {
    // Wait for any loading spinners to disappear
    const spinner = this.page.locator('.animate-spin');
    if (await spinner.isVisible()) {
      await spinner.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Check if user is on admin page
   */
  async isOnAdminPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/admin');
  }

  /**
   * Get current page title
   */
  async getPageTitle(): Promise<string> {
    const title = this.page.locator('h1').first();
    return (await title.textContent()) || '';
  }

  /**
   * Verify admin sidebar is visible
   */
  async hasSidebar(): Promise<boolean> {
    const sidebar = this.page.locator('nav').filter({ hasText: 'Dashboard' });
    return await sidebar.isVisible();
  }

  /**
   * Click on sidebar navigation item
   */
  async clickSidebarItem(itemText: string) {
    const sidebarItem = this.page.locator(`nav a:has-text("${itemText}")`);
    await sidebarItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get metric value from dashboard card
   */
  async getMetricValue(metricName: string): Promise<string> {
    const card = this.page.locator(`text=${metricName}`).locator('..');
    const value = card.locator('.text-2xl').first();
    return (await value.textContent()) || '';
  }

  /**
   * Check if a specific section is visible
   */
  async isSectionVisible(sectionTitle: string): Promise<boolean> {
    const section = this.page.locator(`text=${sectionTitle}`);
    return await section.isVisible();
  }

  /**
   * Fill a form field by label
   */
  async fillFormField(label: string, value: string) {
    const field = this.page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea').first();
    await field.fill(value);
  }

  /**
   * Submit a form
   */
  async submitForm(buttonText: string = 'Submit') {
    const submitButton = this.page.locator(`button:has-text("${buttonText}")`);
    await submitButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if a button is disabled
   */
  async isButtonDisabled(buttonText: string): Promise<boolean> {
    const button = this.page.locator(`button:has-text("${buttonText}")`);
    return await button.isDisabled();
  }

  /**
   * Get all table headers
   */
  async getTableHeaders(): Promise<string[]> {
    const table = this.page.locator('table').first();
    const headers = table.locator('th');
    const count = await headers.count();
    const headerTexts: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      if (text) {
        headerTexts.push(text.trim());
      }
    }

    return headerTexts;
  }

  /**
   * Check if empty state is displayed
   */
  async hasEmptyState(): Promise<boolean> {
    const emptyState = this.page.locator('text=No orders found, text=No products found, text=No users found');
    return await emptyState.isVisible();
  }

  /**
   * Refresh the current page
   */
  async refresh() {
    const refreshButton = this.page.locator('button:has-text("Refresh")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await this.page.waitForTimeout(1000);
    } else {
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
    }
  }
}

/**
 * Test data generators for admin operations
 */
export const adminTestData = {
  /**
   * Generate mock product data
   */
  mockProduct: {
    name: 'Test Product',
    slug: 'test-product',
    description: 'This is a test product for E2E testing',
    shortDescription: 'Test product',
    category: 'shawls',
    retailPrice: 2999,
    wholesalePrice: 2499,
    minOrderQuantity: 10,
    featured: false,
    bestseller: false,
    newArrival: true,
  },

  /**
   * Generate mock order data
   */
  mockOrder: {
    orderNumber: 'NW-TEST-001',
    userEmail: 'test@example.com',
    orderStatus: 'pending' as const,
    paymentStatus: 'paid' as const,
    orderType: 'retail' as const,
    total: 2999,
  },

  /**
   * Generate mock customer data
   */
  mockCustomer: {
    email: 'customer@test.com',
    firstName: 'Test',
    lastName: 'Customer',
    role: 'customer' as const,
    phone: '9876543210',
  },

  /**
   * Generate mock admin user
   */
  mockAdmin: {
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    clerkId: 'user_mock_admin',
  },
};

/**
 * Helper function to wait for table to load
 */
export async function waitForTableLoad(page: Page, timeout: number = 5000) {
  const table = page.locator('table').first();
  await table.waitFor({ state: 'visible', timeout });

  // Wait for at least one row or empty state
  const hasRows = await table.locator('tbody tr').count() > 0;
  const hasEmptyState = await page.locator('text=No orders found, text=No products found, text=No users found').isVisible();

  if (!hasRows && !hasEmptyState) {
    await page.waitForTimeout(1000);
  }
}

/**
 * Helper function to verify admin access
 */
export async function verifyAdminAccess(page: Page): Promise<boolean> {
  const url = page.url();
  const hasAdminLayout = await page.locator('nav').filter({ hasText: 'Dashboard' }).isVisible();

  return url.includes('/admin') && hasAdminLayout;
}

/**
 * Helper function to count items in a stat card
 */
export async function getStatCardValue(page: Page, cardTitle: string): Promise<number> {
  const card = page.locator(`text=${cardTitle}`).locator('..');
  const value = card.locator('.text-2xl').first();
  const text = await value.textContent();

  if (!text) return 0;

  // Extract number from text (handles "123", "1,234", etc.)
  const number = text.replace(/[^0-9]/g, '');
  return parseInt(number, 10) || 0;
}

/**
 * Helper function to verify chart is rendered
 */
export async function verifyChartRendered(page: Page, chartTitle: string): Promise<boolean> {
  const chartSection = page.locator(`text=${chartTitle}`).locator('..');

  // Check if chart container exists
  const hasChart = await chartSection.locator('svg, canvas').isVisible();

  return hasChart;
}
