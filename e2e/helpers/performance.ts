/**
 * Performance Testing Utilities
 *
 * Shared utilities and helpers for performance testing across the test suite.
 */

import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
  tbt: number; // Total Blocking Time
  domContentLoaded: number;
  loadComplete: number;
  domInteractive: number;
  totalTime: number;
}

export interface ResourceTiming {
  name: string;
  type: string;
  size: number;
  duration: number;
  startTime: number;
}

/**
 * Inject Web Vitals measurement script into the page
 */
export async function injectWebVitalsScript(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Initialize performance metrics storage
    (window as any).__performanceMetrics = {
      lcp: 0,
      fcp: 0,
      cls: 0,
      fid: 0,
      ttfb: 0,
      navigationStart: performance.timeOrigin || performance.timing?.navigationStart || 0,
    };

    // Measure Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      (window as any).__performanceMetrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Measure First Contentful Paint (FCP)
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        (window as any).__performanceMetrics.fcp = fcpEntry.startTime;
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });

    // Measure Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        // Only count layout shifts that weren't caused by user input
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          (window as any).__performanceMetrics.cls = clsValue;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Measure First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstInput = entries[0] as any;
      if (firstInput) {
        (window as any).__performanceMetrics.fid =
          firstInput.processingStart - firstInput.startTime;
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Measure Time to First Byte (TTFB)
    const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
    if (navigationEntry) {
      (window as any).__performanceMetrics.ttfb = navigationEntry.responseStart;
    }
  });
}

/**
 * Collect comprehensive performance metrics from the page
 */
export async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  // Wait for page to be fully loaded
  await page.waitForLoadState('load');

  // Give time for metrics to be collected
  await page.waitForTimeout(1000);

  // Get Web Vitals metrics
  const webVitals = await page.evaluate(() => {
    return (window as any).__performanceMetrics || {};
  });

  // Get navigation timing metrics
  const navTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!nav) {
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        domInteractive: 0,
        totalTime: 0,
      };
    }
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
      loadComplete: nav.loadEventEnd - nav.loadEventStart,
      domInteractive: nav.domInteractive - nav.fetchStart,
      totalTime: nav.loadEventEnd - nav.fetchStart,
    };
  });

  // Calculate Total Blocking Time (TBT)
  const tbt = await page.evaluate(() => {
    const longTasks = performance.getEntriesByType('longtask') as any[];
    return longTasks.reduce((total, task) => {
      // Tasks over 50ms are considered blocking
      const blockingTime = Math.max(0, task.duration - 50);
      return total + blockingTime;
    }, 0);
  });

  return {
    lcp: Math.round(webVitals.lcp || 0),
    fcp: Math.round(webVitals.fcp || 0),
    cls: parseFloat((webVitals.cls || 0).toFixed(3)),
    fid: Math.round(webVitals.fid || 0),
    ttfb: Math.round(webVitals.ttfb || 0),
    tti: Math.round(navTiming.domInteractive),
    tbt: Math.round(tbt),
    domContentLoaded: Math.round(navTiming.domContentLoaded),
    loadComplete: Math.round(navTiming.loadComplete),
    domInteractive: Math.round(navTiming.domInteractive),
    totalTime: Math.round(navTiming.totalTime),
  };
}

/**
 * Collect resource timing information
 */
export async function collectResourceTiming(page: Page): Promise<ResourceTiming[]> {
  return await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.map((resource) => ({
      name: resource.name.split('/').pop() || resource.name,
      type: resource.initiatorType,
      size: resource.transferSize,
      duration: Math.round(resource.duration),
      startTime: Math.round(resource.startTime),
    }));
  });
}

/**
 * Get JavaScript bundle sizes
 */
export async function getJavaScriptBundles(page: Page) {
  const resources = await collectResourceTiming(page);
  const jsResources = resources.filter((r) => r.name.endsWith('.js'));

  const totalSize = jsResources.reduce((sum, r) => sum + r.size, 0);

  return {
    bundles: jsResources,
    totalSize,
    totalSizeKB: Math.round(totalSize / 1024),
    count: jsResources.length,
  };
}

/**
 * Get CSS bundle sizes
 */
export async function getCSSBundles(page: Page) {
  const resources = await collectResourceTiming(page);
  const cssResources = resources.filter((r) => r.name.endsWith('.css'));

  const totalSize = cssResources.reduce((sum, r) => sum + r.size, 0);

  return {
    bundles: cssResources,
    totalSize,
    totalSizeKB: Math.round(totalSize / 1024),
    count: cssResources.length,
  };
}

/**
 * Get image loading metrics
 */
export async function getImageMetrics(page: Page) {
  const resources = await collectResourceTiming(page);
  const imageResources = resources.filter((r) =>
    /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(r.name)
  );

  const totalSize = imageResources.reduce((sum, r) => sum + r.size, 0);
  const avgLoadTime = imageResources.length
    ? imageResources.reduce((sum, r) => sum + r.duration, 0) / imageResources.length
    : 0;

  return {
    images: imageResources,
    totalSize,
    totalSizeKB: Math.round(totalSize / 1024),
    count: imageResources.length,
    avgLoadTime: Math.round(avgLoadTime),
  };
}

/**
 * Simulate slow network conditions
 */
export async function simulateSlowNetwork(
  page: Page,
  preset: 'slow-3g' | 'fast-3g' | '4g' = 'slow-3g'
) {
  const presets = {
    'slow-3g': {
      downloadThroughput: (500 * 1024) / 8, // 500 Kbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 400, // 400ms RTT
    },
    'fast-3g': {
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
      uploadThroughput: (750 * 1024) / 8, // 750 Kbps
      latency: 150, // 150ms RTT
    },
    '4g': {
      downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps
      uploadThroughput: (3 * 1024 * 1024) / 8, // 3 Mbps
      latency: 20, // 20ms RTT
    },
  };

  const settings = presets[preset];
  const client = await page.context().newCDPSession(page);

  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: settings.downloadThroughput,
    uploadThroughput: settings.uploadThroughput,
    latency: settings.latency,
  });
}

/**
 * Disable network throttling
 */
export async function disableNetworkThrottling(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });
}

/**
 * Print performance metrics to console
 */
export function printPerformanceMetrics(metrics: PerformanceMetrics, pageName: string) {
  console.log(`\n📊 Performance Metrics for: ${pageName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Core Web Vitals:');
  console.log(`  LCP (Largest Contentful Paint): ${metrics.lcp}ms`);
  console.log(`  FCP (First Contentful Paint):   ${metrics.fcp}ms`);
  console.log(`  CLS (Cumulative Layout Shift):  ${metrics.cls}`);
  console.log(`  FID (First Input Delay):        ${metrics.fid}ms`);
  console.log('\nOther Metrics:');
  console.log(`  TTFB (Time to First Byte):      ${metrics.ttfb}ms`);
  console.log(`  TTI (Time to Interactive):      ${metrics.tti}ms`);
  console.log(`  TBT (Total Blocking Time):      ${metrics.tbt}ms`);
  console.log(`  DOM Interactive:                ${metrics.domInteractive}ms`);
  console.log(`  DOM Content Loaded:             ${metrics.domContentLoaded}ms`);
  console.log(`  Load Complete:                  ${metrics.loadComplete}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Generate performance report as JSON
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics,
  resources: ResourceTiming[],
  pageName: string
) {
  return {
    timestamp: new Date().toISOString(),
    page: pageName,
    metrics,
    resources: {
      total: resources.length,
      totalSize: resources.reduce((sum, r) => sum + r.size, 0),
      byType: {
        javascript: resources.filter((r) => r.name.endsWith('.js')).length,
        css: resources.filter((r) => r.name.endsWith('.css')).length,
        images: resources.filter((r) => /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(r.name)).length,
        fonts: resources.filter((r) => /\.(woff2?|eot|ttf|otf)$/i.test(r.name)).length,
      },
    },
  };
}

/**
 * Compare performance metrics against budgets
 */
export function compareAgainstBudgets(
  metrics: PerformanceMetrics,
  budgets: {
    lcp: number;
    fcp: number;
    cls: number;
    fid: number;
    tti: number;
    tbt: number;
  }
) {
  return {
    lcp: { value: metrics.lcp, budget: budgets.lcp, passed: metrics.lcp <= budgets.lcp },
    fcp: { value: metrics.fcp, budget: budgets.fcp, passed: metrics.fcp <= budgets.fcp },
    cls: { value: metrics.cls, budget: budgets.cls, passed: metrics.cls <= budgets.cls },
    fid: { value: metrics.fid, budget: budgets.fid, passed: metrics.fid <= budgets.fid },
    tti: { value: metrics.tti, budget: budgets.tti, passed: metrics.tti <= budgets.tti },
    tbt: { value: metrics.tbt, budget: budgets.tbt, passed: metrics.tbt <= budgets.tbt },
  };
}

/**
 * Wait for all images to load
 */
export async function waitForImages(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
    );
  });
}

/**
 * Measure element rendering time
 */
export async function measureElementRenderTime(page: Page, selector: string): Promise<number> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries as any[]) {
        if (entry.element === element) {
          return entry.renderTime || entry.loadTime;
        }
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    return 0;
  }, selector);
}
