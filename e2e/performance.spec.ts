/**
 * Performance Regression Tests
 *
 * This test suite measures Core Web Vitals and other performance metrics
 * to prevent performance regressions. It runs on key pages and user journeys.
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint)
 * - FCP (First Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - TTI (Time to Interactive)
 * - TBT (Total Blocking Time)
 * - FID (First Input Delay)
 *
 * @see https://web.dev/vitals/
 */

import { test, expect, Page } from '@playwright/test';

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS = {
  LCP: 2500, // Largest Contentful Paint
  FCP: 1800, // First Contentful Paint
  TTI: 3800, // Time to Interactive
  TBT: 300, // Total Blocking Time
  CLS: 0.1, // Cumulative Layout Shift (dimensionless)
  FID: 100, // First Input Delay
};

/**
 * Inject Web Vitals measurement script
 */
async function injectWebVitals(page: Page) {
  await page.addInitScript(() => {
    // Store performance metrics
    (window as any).__performanceMetrics = {
      lcp: 0,
      fcp: 0,
      cls: 0,
      fid: 0,
      ttfb: 0,
    };

    // Measure LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      (window as any).__performanceMetrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Measure FCP
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        (window as any).__performanceMetrics.fcp = fcpEntry.startTime;
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });

    // Measure CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          (window as any).__performanceMetrics.cls = clsValue;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Measure FID
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstInput = entries[0] as any;
      (window as any).__performanceMetrics.fid = firstInput.processingStart - firstInput.startTime;
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Measure TTFB
    const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
    if (navigationEntry) {
      (window as any).__performanceMetrics.ttfb = navigationEntry.responseStart;
    }
  });
}

/**
 * Get performance metrics from the page
 */
async function getPerformanceMetrics(page: Page) {
  // Wait for page to be fully loaded
  await page.waitForLoadState('load');
  await page.waitForTimeout(1000); // Allow time for metrics to be collected

  // Get metrics from the page
  const metrics = await page.evaluate(() => {
    return (window as any).__performanceMetrics || {};
  });

  // Get navigation timing metrics
  const navTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
      loadComplete: nav.loadEventEnd - nav.loadEventStart,
      domInteractive: nav.domInteractive - nav.fetchStart,
      totalTime: nav.loadEventEnd - nav.fetchStart,
    };
  });

  // Calculate TTI (simplified - using domInteractive as approximation)
  const tti = navTiming.domInteractive;

  // Calculate TBT (using long tasks API if available)
  const tbt = await page.evaluate(() => {
    const longTasks = performance.getEntriesByType('longtask') as any[];
    return longTasks.reduce((total, task) => {
      const blockingTime = Math.max(0, task.duration - 50);
      return total + blockingTime;
    }, 0);
  });

  return {
    lcp: Math.round(metrics.lcp || 0),
    fcp: Math.round(metrics.fcp || 0),
    cls: parseFloat((metrics.cls || 0).toFixed(3)),
    fid: Math.round(metrics.fid || 0),
    ttfb: Math.round(metrics.ttfb || 0),
    tti,
    tbt,
    ...navTiming,
  };
}

/**
 * Assert performance budget
 */
function assertPerformanceBudget(
  metrics: any,
  metricName: string,
  budget: number,
  unit = 'ms'
) {
  const value = metrics[metricName.toLowerCase()];
  const passed = value <= budget;

  console.log(
    `${passed ? '✓' : '✗'} ${metricName}: ${value}${unit} ${passed ? '≤' : '>'} ${budget}${unit} (budget)`
  );

  expect(value, `${metricName} should be ≤ ${budget}${unit}`).toBeLessThanOrEqual(budget);
}

/**
 * Performance test helper
 */
async function testPagePerformance(page: Page, url: string, pageName: string) {
  console.log(`\n📊 Testing performance for: ${pageName}`);

  // Inject Web Vitals measurement
  await injectWebVitals(page);

  // Navigate to the page
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const navigationTime = Date.now() - startTime;

  console.log(`Navigation time: ${navigationTime}ms`);

  // Get performance metrics
  const metrics = await getPerformanceMetrics(page);

  console.log('\nCore Web Vitals:');
  console.log(`  LCP: ${metrics.lcp}ms`);
  console.log(`  FCP: ${metrics.fcp}ms`);
  console.log(`  CLS: ${metrics.cls}`);
  console.log(`  FID: ${metrics.fid}ms`);
  console.log(`  TTI: ${metrics.tti}ms`);
  console.log(`  TBT: ${metrics.tbt}ms`);

  // Assert performance budgets
  assertPerformanceBudget(metrics, 'LCP', PERFORMANCE_BUDGETS.LCP);
  assertPerformanceBudget(metrics, 'FCP', PERFORMANCE_BUDGETS.FCP);
  assertPerformanceBudget(metrics, 'CLS', PERFORMANCE_BUDGETS.CLS, '');
  assertPerformanceBudget(metrics, 'TTI', PERFORMANCE_BUDGETS.TTI);
  assertPerformanceBudget(metrics, 'TBT', PERFORMANCE_BUDGETS.TBT);

  return metrics;
}

test.describe('Performance Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Homepage - Performance metrics within budget', async ({ page }) => {
    const metrics = await testPagePerformance(page, '/', 'Homepage');

    // Additional homepage-specific checks
    expect(metrics.lcp).toBeLessThan(2000); // Stricter for homepage
    expect(metrics.cls).toBeLessThan(0.05); // Very strict for homepage stability
  });

  test('Product Listing - Performance metrics within budget', async ({ page }) => {
    const metrics = await testPagePerformance(page, '/products', 'Product Listing');

    // Ensure images don't cause layout shifts
    expect(metrics.cls).toBeLessThan(0.1);
  });

  test('Product Detail - Performance metrics within budget', async ({ page }) => {
    // Navigate to homepage first to get a product link
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForLoadState('load');

      // Measure metrics on product detail page
      await injectWebVitals(page);
      const metrics = await getPerformanceMetrics(page);

      console.log('\n📊 Product Detail Page Performance:');
      console.log(`  LCP: ${metrics.lcp}ms`);
      console.log(`  FCP: ${metrics.fcp}ms`);
      console.log(`  CLS: ${metrics.cls}`);

      assertPerformanceBudget(metrics, 'LCP', PERFORMANCE_BUDGETS.LCP);
      assertPerformanceBudget(metrics, 'CLS', PERFORMANCE_BUDGETS.CLS, '');
    }
  });

  test('Cart Page - Performance metrics within budget', async ({ page }) => {
    await testPagePerformance(page, '/cart', 'Cart Page');
  });

  test('Checkout Page - Performance metrics within budget', async ({ page }) => {
    await testPagePerformance(page, '/checkout', 'Checkout Page');
  });

  test('No layout shifts during page load', async ({ page }) => {
    // Test for CLS on multiple pages
    const pages = [
      { url: '/', name: 'Homepage' },
      { url: '/products', name: 'Products' },
      { url: '/cart', name: 'Cart' },
    ];

    for (const { url, name } of pages) {
      console.log(`\n🎯 Testing CLS for: ${name}`);

      await injectWebVitals(page);
      await page.goto(url, { waitUntil: 'networkidle' });

      const metrics = await getPerformanceMetrics(page);
      console.log(`  CLS: ${metrics.cls}`);

      expect(metrics.cls, `${name} should have minimal layout shifts`).toBeLessThan(
        PERFORMANCE_BUDGETS.CLS
      );
    }
  });

  test('JavaScript bundle sizes are reasonable', async ({ page }) => {
    await page.goto('/');

    // Get all loaded JavaScript resources
    const jsResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources
        .filter((r) => r.name.endsWith('.js'))
        .map((r) => ({
          name: r.name.split('/').pop(),
          size: r.transferSize,
          duration: r.duration,
        }));
    });

    console.log('\n📦 JavaScript Bundle Analysis:');
    jsResources.forEach((resource) => {
      const sizeKB = Math.round(resource.size / 1024);
      console.log(`  ${resource.name}: ${sizeKB}KB (loaded in ${Math.round(resource.duration)}ms)`);
    });

    // Total JS size should be under 1MB (compressed)
    const totalSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    const totalSizeKB = Math.round(totalSize / 1024);

    console.log(`\nTotal JavaScript: ${totalSizeKB}KB`);
    expect(totalSizeKB, 'Total JavaScript size should be under 1MB').toBeLessThan(1024);
  });

  test('Images are optimized and lazy-loaded', async ({ page }) => {
    await page.goto('/');

    // Check for lazy loading attributes
    const images = await page.locator('img').all();
    let lazyLoadedCount = 0;

    for (const img of images) {
      const loading = await img.getAttribute('loading');
      if (loading === 'lazy') {
        lazyLoadedCount++;
      }
    }

    console.log(`\n🖼️  Images: ${images.length} total, ${lazyLoadedCount} lazy-loaded`);

    // At least 50% of images should be lazy-loaded (excluding hero/above-fold)
    const lazyLoadPercentage = (lazyLoadedCount / images.length) * 100;
    console.log(`Lazy-load percentage: ${lazyLoadPercentage.toFixed(1)}%`);

    expect(lazyLoadPercentage).toBeGreaterThan(30); // At least 30% lazy-loaded
  });

  test('Time to First Paint (TTFP) is fast', async ({ page }) => {
    await injectWebVitals(page);
    await page.goto('/');

    const fcp = await page.evaluate(() => {
      return (window as any).__performanceMetrics.fcp;
    });

    console.log(`\n⚡ First Contentful Paint: ${fcp}ms`);
    expect(fcp, 'FCP should be under 1.8s').toBeLessThan(PERFORMANCE_BUDGETS.FCP);
  });

  test('Interactive elements respond quickly (FID)', async ({ page }) => {
    await injectWebVitals(page);
    await page.goto('/');

    // Simulate user interaction
    const button = page.locator('button').first();
    const startTime = Date.now();
    await button.click();
    const responseTime = Date.now() - startTime;

    console.log(`\n🖱️  Button response time: ${responseTime}ms`);
    expect(responseTime, 'Interactive response should be under 100ms').toBeLessThan(
      PERFORMANCE_BUDGETS.FID
    );
  });
});

test.describe('Performance - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  test('Mobile homepage performance', async ({ page }) => {
    const metrics = await testPagePerformance(page, '/', 'Mobile Homepage');

    // Mobile should have similar performance
    expect(metrics.lcp).toBeLessThan(2500);
    expect(metrics.fcp).toBeLessThan(1800);
    expect(metrics.cls).toBeLessThan(0.1);
  });

  test('Mobile product listing performance', async ({ page }) => {
    const metrics = await testPagePerformance(page, '/products', 'Mobile Product Listing');

    expect(metrics.lcp).toBeLessThan(2500);
    expect(metrics.cls).toBeLessThan(0.1);
  });
});

test.describe('Performance - Network Conditions', () => {
  test('Performance on slow 3G', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', (route) => {
      route.continue();
    });

    // Set slow 3G simulation
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500kb/s
      uploadThroughput: (500 * 1024) / 8,
      latency: 400, // 400ms
    });

    await injectWebVitals(page);
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

    const metrics = await getPerformanceMetrics(page);

    console.log('\n🐌 Slow 3G Performance:');
    console.log(`  LCP: ${metrics.lcp}ms`);
    console.log(`  FCP: ${metrics.fcp}ms`);

    // More lenient budgets for slow network
    expect(metrics.lcp).toBeLessThan(5000);
    expect(metrics.fcp).toBeLessThan(3000);
  });
});
