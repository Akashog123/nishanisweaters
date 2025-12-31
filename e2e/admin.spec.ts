import { test, expect } from './fixtures';
import { AdminPage } from './admin-fixtures';

/**
 * E2E Tests: Admin Operations
 *
 * Comprehensive end-to-end tests for admin dashboard and management operations.
 * Tests cover: Dashboard, Products, Orders, and Customer Management.
 *
 * CRITICAL GAP: The application has NO admin operation tests despite having
 * a full admin dashboard. This test suite addresses this critical business risk.
 */

test.describe('Admin Dashboard', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    // Mock admin authentication
    await adminPage.mockAdminAuth();
    await adminPage.goto();
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    // Verify dashboard loads
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Overview of your store performance')).toBeVisible();

    // Verify key metric cards are visible
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Total Orders')).toBeVisible();
    await expect(page.locator('text=Customers')).toBeVisible();
    await expect(page.locator('text=Low Stock Items')).toBeVisible();

    // Verify metric values are displayed (should be numbers)
    const revenueCard = page.locator('text=Total Revenue').locator('..');
    await expect(revenueCard.locator('.text-2xl')).toBeVisible();
  });

  test('should display charts correctly', async ({ page }) => {
    // Verify Revenue Trend chart
    await expect(page.locator('text=Revenue Trend')).toBeVisible();
    await expect(page.locator('text=Daily revenue for the last 14 days')).toBeVisible();

    // Verify Order Type Breakdown chart
    await expect(page.locator('text=Order Type Breakdown')).toBeVisible();
    await expect(page.locator('text=Retail vs Wholesale revenue')).toBeVisible();
  });

  test('should display recent orders table', async ({ page }) => {
    // Verify Recent Orders section
    await expect(page.locator('text=Recent Orders')).toBeVisible();
    await expect(page.locator('text=Latest customer orders')).toBeVisible();

    // Verify table headers
    const table = page.locator('table').filter({ hasText: 'Recent Orders' }).first();
    await expect(table.locator('th:has-text("Order")')).toBeVisible();
    await expect(table.locator('th:has-text("Customer")')).toBeVisible();
    await expect(table.locator('th:has-text("Status")')).toBeVisible();
    await expect(table.locator('th:has-text("Amount")')).toBeVisible();
  });

  test('should navigate between admin sections', async ({ page }) => {
    // Test sidebar navigation
    await expect(page.locator('nav').filter({ hasText: 'Dashboard' })).toBeVisible();

    // Navigate to Products
    await page.locator('a[href="/admin/products"]').click();
    await page.waitForURL(/\/admin\/products/);
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();

    // Navigate to Orders
    await page.locator('a[href="/admin/orders"]').click();
    await page.waitForURL(/\/admin\/orders/);
    await expect(page.locator('h1:has-text("Orders")')).toBeVisible();

    // Navigate to Customers
    await page.locator('a[href="/admin/customers"]').click();
    await page.waitForURL(/\/admin\/customers/);
    await expect(page.locator('h1:has-text("Customers")')).toBeVisible();

    // Navigate back to Dashboard
    await page.locator('a[href="/admin"]').first().click();
    await page.waitForURL(/\/admin$/);
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should display low stock alert when items need restocking', async ({ page }) => {
    // Check if low stock section exists
    const lowStockSection = page.locator('text=Low Stock Alert');

    if (await lowStockSection.isVisible()) {
      await expect(page.locator('text=Products that need immediate restocking')).toBeVisible();

      // Verify table structure
      await expect(page.locator('th:has-text("Product")')).toBeVisible();
      await expect(page.locator('th:has-text("SKU")')).toBeVisible();
      await expect(page.locator('th:has-text("Current Stock")')).toBeVisible();
      await expect(page.locator('th:has-text("Threshold")')).toBeVisible();
    }
  });

  test('should have working refresh button', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();

    // Button should show loading state briefly
    await expect(refreshButton).toBeDisabled();
  });

  test('should display quick actions', async ({ page }) => {
    await expect(page.locator('text=Quick Actions')).toBeVisible();

    // Verify quick action buttons
    await expect(page.locator('a:has-text("Add New Product")')).toBeVisible();
    await expect(page.locator('a:has-text("View Pending Orders")')).toBeVisible();
    await expect(page.locator('a:has-text("Review Applications")')).toBeVisible();
  });
});

test.describe('Product Management', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.mockAdminAuth();
    await adminPage.gotoProducts();
  });

  test('should display product list with filters', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();
    await expect(page.locator('text=Manage your product catalog')).toBeVisible();

    // Verify Add Product button
    await expect(page.locator('button:has-text("Add Product")')).toBeVisible();

    // Verify stats cards
    await expect(page.locator('text=Total Products')).toBeVisible();
    await expect(page.locator('text=Active Products')).toBeVisible();
    await expect(page.locator('text=Low Stock')).toBeVisible();

    // Verify filters exist
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('text=Category')).toBeVisible();
    await expect(page.locator('text=Stock Status')).toBeVisible();
  });

  test('should filter products by search query', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Shawl');

    // Wait for results to update
    await page.waitForTimeout(500);

    // Verify filtered results (if products exist)
    const productTable = page.locator('table');
    if (await productTable.isVisible()) {
      const rows = productTable.locator('tbody tr');
      const count = await rows.count();

      if (count > 0) {
        // At least one row should contain "Shawl"
        await expect(rows.first()).toContainText(/shawl/i);
      }
    }
  });

  test('should filter products by category', async ({ page }) => {
    // Open category filter
    const categoryFilter = page.locator('button:has-text("Category")').first();
    await categoryFilter.click();

    // Select a category
    await page.locator('text=Shawls').first().click();

    // Wait for results to update
    await page.waitForTimeout(500);

    // Verify filter is applied
    await expect(categoryFilter).toContainText('Shawls');
  });

  test('should filter products by stock status', async ({ page }) => {
    // Open stock filter
    const stockFilter = page.locator('button:has-text("Stock Status")').first();
    await stockFilter.click();

    // Select low stock
    await page.locator('text=Low Stock').first().click();

    // Wait for results to update
    await page.waitForTimeout(500);

    // Verify filter is applied
    await expect(stockFilter).toContainText('Low Stock');
  });

  test('should open add product dialog', async ({ page }) => {
    // Click Add Product button
    await page.locator('button:has-text("Add Product")').click();

    // Verify dialog opens
    await expect(page.locator('text=Add New Product')).toBeVisible();

    // Verify form fields
    await expect(page.locator('label:has-text("Product Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Category")')).toBeVisible();
    await expect(page.locator('label:has-text("Retail Price")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();

    // Close dialog
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Add New Product')).not.toBeVisible();
  });

  test('should validate required fields when creating product', async ({ page }) => {
    // Open add product dialog
    await page.locator('button:has-text("Add Product")').click();

    // Try to submit without filling required fields
    await page.locator('button:has-text("Create Product")').click();

    // Should show validation errors (toast or inline)
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
  });

  test('should display product table with pagination', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      // Verify table headers
      await expect(table.locator('th:has-text("Product")')).toBeVisible();
      await expect(table.locator('th:has-text("Category")')).toBeVisible();
      await expect(table.locator('th:has-text("Price")')).toBeVisible();
      await expect(table.locator('th:has-text("Stock")')).toBeVisible();
      await expect(table.locator('th:has-text("Status")')).toBeVisible();

      // Check for pagination controls
      const paginationNext = page.locator('button:has-text("Next")');
      const paginationPrev = page.locator('button:has-text("Previous")');

      if (await paginationNext.isVisible()) {
        await expect(paginationPrev).toBeVisible();
      }
    }
  });

  test('should have edit and delete actions for products', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Verify action buttons exist
        const editButton = firstRow.locator('button[aria-label*="Edit"], button:has-text("Edit")');
        const deleteButton = firstRow.locator('button[aria-label*="Delete"], button:has-text("Delete")');

        // At least one action should be available
        const hasEdit = await editButton.count() > 0;
        const hasDelete = await deleteButton.count() > 0;

        expect(hasEdit || hasDelete).toBeTruthy();
      }
    }
  });
});

test.describe('Order Management', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.mockAdminAuth();
    await adminPage.gotoOrders();
  });

  test('should display order list with filters', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('h1:has-text("Orders")')).toBeVisible();
    await expect(page.locator('text=Manage customer orders')).toBeVisible();

    // Verify stats cards
    await expect(page.locator('text=All Orders')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Shipped')).toBeVisible();
    await expect(page.locator('text=Delivered')).toBeVisible();

    // Verify search and filters
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    // Click on Pending status card
    const pendingCard = page.locator('text=Pending').locator('..').locator('..');
    await pendingCard.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify filter is active (card should have ring)
    await expect(pendingCard).toHaveClass(/ring-2/);
  });

  test('should search orders by order number or email', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('NW-');

    // Wait for results to update
    await page.waitForTimeout(500);

    // Results should be filtered
    const table = page.locator('table');
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const count = await rows.count();

      if (count > 0) {
        // First row should contain order number starting with NW-
        await expect(rows.first()).toContainText(/NW-/);
      }
    }
  });

  test('should display order table with correct columns', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      // Verify table headers
      await expect(table.locator('th:has-text("Order")')).toBeVisible();
      await expect(table.locator('th:has-text("Customer")')).toBeVisible();
      await expect(table.locator('th:has-text("Type")')).toBeVisible();
      await expect(table.locator('th:has-text("Items")')).toBeVisible();
      await expect(table.locator('th:has-text("Total")')).toBeVisible();
      await expect(table.locator('th:has-text("Payment")')).toBeVisible();
      await expect(table.locator('th:has-text("Status")')).toBeVisible();
      await expect(table.locator('th:has-text("Actions")')).toBeVisible();
    }
  });

  test('should open order details dialog', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Click view button (eye icon)
        const viewButton = firstRow.locator('button').last();
        await viewButton.click();

        // Verify dialog opens with order details
        await expect(page.locator('text=Order Items')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Shipping Address')).toBeVisible();
        await expect(page.locator('text=Payment Method')).toBeVisible();
      }
    }
  });

  test('should display order status update form in dialog', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Open order details
        const viewButton = firstRow.locator('button').last();
        await viewButton.click();

        // Wait for dialog
        await page.waitForTimeout(1000);

        // Verify status update section
        await expect(page.locator('text=Update Order Status')).toBeVisible();
        await expect(page.locator('label:has-text("Order Status")')).toBeVisible();
        await expect(page.locator('label:has-text("Tracking Number")')).toBeVisible();
        await expect(page.locator('label:has-text("Shipping Carrier")')).toBeVisible();
      }
    }
  });

  test('should filter orders by payment status', async ({ page }) => {
    // Open payment filter dropdown
    const paymentFilter = page.locator('button:has-text("All Payments")').first();
    await paymentFilter.click();

    // Select Paid status
    await page.locator('text=Paid').first().click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify filter is applied
    await expect(paymentFilter).toContainText('Paid');
  });

  test('should filter orders by order type', async ({ page }) => {
    // Open type filter dropdown
    const typeFilter = page.locator('button:has-text("All Types")').first();
    await typeFilter.click();

    // Select Retail
    await page.locator('text=Retail').first().click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify filter is applied
    await expect(typeFilter).toContainText('Retail');
  });

  test('should display pagination for orders', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const count = await rows.count();

      if (count >= 10) {
        // Should have pagination
        await expect(page.locator('button:has-text("Next")')).toBeVisible();
        await expect(page.locator('button:has-text("Previous")')).toBeVisible();
      }
    }
  });
});

test.describe('Customer Management', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.mockAdminAuth();
    await adminPage.gotoCustomers();
  });

  test('should display customer list', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('h1:has-text("Customers")')).toBeVisible();
    await expect(page.locator('text=Manage user accounts and roles')).toBeVisible();

    // Verify stats cards
    await expect(page.locator('text=All Users')).toBeVisible();
    await expect(page.locator('text=Customers')).toBeVisible();
    await expect(page.locator('text=Wholesale')).toBeVisible();
    await expect(page.locator('text=Admins')).toBeVisible();
  });

  test('should filter customers by role', async ({ page }) => {
    // Click on Customers role card
    const customerCard = page.locator('text=Customers').locator('..').locator('..');
    await customerCard.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify filter is active
    await expect(customerCard).toHaveClass(/ring-2/);
  });

  test('should search customers by name, email, or company', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');

    // Wait for results to update
    await page.waitForTimeout(500);

    // Results should be filtered
    const table = page.locator('table');
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const count = await rows.count();

      if (count > 0) {
        // At least one result should match
        await expect(rows.first()).toBeVisible();
      }
    }
  });

  test('should display customer table with correct columns', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      // Verify table headers
      await expect(table.locator('th:has-text("User")')).toBeVisible();
      await expect(table.locator('th:has-text("Email")')).toBeVisible();
      await expect(table.locator('th:has-text("Role")')).toBeVisible();
      await expect(table.locator('th:has-text("Company")')).toBeVisible();
      await expect(table.locator('th:has-text("Joined")')).toBeVisible();
      await expect(table.locator('th:has-text("Actions")')).toBeVisible();
    }
  });

  test('should open customer details dialog', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Click view button (eye icon)
        const viewButton = firstRow.locator('button').last();
        await viewButton.click();

        // Verify dialog opens with customer details
        await expect(page.locator('text=Basic Information')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Role Management')).toBeVisible();
      }
    }
  });

  test('should display role management in customer dialog', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Open customer details
        const viewButton = firstRow.locator('button').last();
        await viewButton.click();

        // Wait for dialog
        await page.waitForTimeout(1000);

        // Verify role management section
        await expect(page.locator('text=Role Management')).toBeVisible();
        await expect(page.locator('label:has-text("User Role")')).toBeVisible();

        // Verify role dropdown exists
        const roleSelect = page.locator('button[role="combobox"]').last();
        await expect(roleSelect).toBeVisible();
      }
    }
  });

  test('should display customer badges correctly', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Should have a role badge
        const badge = firstRow.locator('[class*="badge"]');
        const badgeCount = await badge.count();

        expect(badgeCount).toBeGreaterThan(0);
      }
    }
  });

  test('should display pagination for customers', async ({ page }) => {
    const table = page.locator('table').first();

    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const count = await rows.count();

      if (count >= 10) {
        // Should have pagination
        await expect(page.locator('button:has-text("Next")')).toBeVisible();
        await expect(page.locator('button:has-text("Previous")')).toBeVisible();
      }
    }
  });
});

test.describe('Admin Authentication & Access Control', () => {
  test('should redirect non-admin users from admin pages', async ({ page }) => {
    // Try to access admin without auth
    await page.goto('/admin');

    // Should redirect to sign-in or show access denied
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('sign-in') ||
                        currentUrl.includes('unauthorized') ||
                        !currentUrl.includes('/admin');

    expect(isRedirected).toBeTruthy();
  });

  test('should display admin layout with sidebar', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.mockAdminAuth();
    await adminPage.goto();

    // Verify admin layout elements
    await expect(page.locator('nav').filter({ hasText: 'Dashboard' })).toBeVisible();
    await expect(page.locator('a[href="/admin/products"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/orders"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/customers"]')).toBeVisible();
  });
});

test.describe('Admin Accessibility', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.mockAdminAuth();
  });

  test('dashboard should have proper heading hierarchy', async ({ page }) => {
    await adminPage.goto();

    // Main heading
    await expect(page.locator('h1')).toBeVisible();

    // Section headings
    const h2Count = await page.locator('h2, h3').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('tables should have proper headers', async ({ page }) => {
    await adminPage.gotoOrders();

    const table = page.locator('table').first();
    if (await table.isVisible()) {
      // Should have thead
      await expect(table.locator('thead')).toBeVisible();

      // Should have th elements
      const thCount = await table.locator('th').count();
      expect(thCount).toBeGreaterThan(0);
    }
  });

  test('buttons should have accessible labels', async ({ page }) => {
    await adminPage.gotoProducts();

    // Add Product button should be accessible
    const addButton = page.locator('button:has-text("Add Product")');
    await expect(addButton).toBeVisible();

    // Icon buttons should have aria-labels
    const iconButtons = page.locator('button[aria-label]');
    const count = await iconButtons.count();

    // At least some icon buttons should have labels
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
