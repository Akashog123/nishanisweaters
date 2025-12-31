/**
 * Homepage Load Test
 *
 * Tests the homepage loading performance including:
 * - Initial page load (LCP proxy measurement)
 * - Featured products query
 * - Bestseller products query
 * - New arrivals query
 * - Hero section assets
 *
 * Metrics tracked:
 * - Response times (p50, p90, p95, p99)
 * - Error rates
 * - Throughput
 * - LCP proxy (document load time)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { getConfig, randomThinkTime, testData } from '../lib/config.js';
import {
  get,
  post,
  validateResponse,
  parseJSON,
  customMetrics,
  log,
} from '../lib/helpers.js';

// Get environment configuration
const config = getConfig();
const { urls } = config;

// Custom metrics for homepage
const homepageLCP = new Trend('homepage_lcp_ms');
const homepageTTFB = new Trend('homepage_ttfb_ms');
const homepageFeaturedLoad = new Trend('homepage_featured_load_ms');
const homepageBestsellerLoad = new Trend('homepage_bestseller_load_ms');
const homepageNewArrivalsLoad = new Trend('homepage_new_arrivals_load_ms');
const homepageSuccess = new Rate('homepage_success_rate');
const homepageErrors = new Counter('homepage_errors');

// Test options - can be overridden by CLI
export const options = {
  scenarios: {
    homepage: config.scenarios.normal,
  },
  thresholds: {
    // Homepage-specific thresholds
    'http_req_duration{endpoint:homepage}': ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{endpoint:featured_products}': ['p(95)<600'],
    'http_req_duration{endpoint:bestseller_products}': ['p(95)<600'],
    'http_req_duration{endpoint:new_arrivals}': ['p(95)<600'],
    'homepage_lcp_ms': ['p(95)<2500'],  // Core Web Vitals LCP target
    'homepage_ttfb_ms': ['p(95)<600'],
    'homepage_success_rate': ['rate>0.99'],
    ...config.thresholds,
  },
};

// Setup function - runs once before test
export function setup() {
  log(`Starting homepage load test on ${config.env} environment`);
  log(`Frontend URL: ${urls.frontend}`);
  log(`Convex API URL: ${urls.convexApi}`);

  // Verify endpoints are reachable
  const healthCheck = get(`${urls.convexHttp}/health`, {
    endpoint: 'health',
    type: 'healthcheck',
  });

  if (healthCheck.status !== 200) {
    log(`Health check failed: ${healthCheck.status}`, 'warn');
  }

  return { startTime: Date.now() };
}

// Main test function - executed for each VU iteration
export default function (data) {
  group('Homepage Load', () => {
    // Step 1: Load the main HTML document (LCP proxy)
    const documentStart = Date.now();
    const htmlResponse = get(urls.frontend, {
      endpoint: 'homepage',
      type: 'document',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const documentLoadTime = Date.now() - documentStart;
    homepageLCP.add(documentLoadTime);
    homepageTTFB.add(htmlResponse.timings?.waiting || 0);

    const htmlValid = check(htmlResponse, {
      'homepage: status is 200': (r) => r.status === 200,
      'homepage: has content': (r) => r.body && r.body.length > 0,
      'homepage: has React root': (r) => r.body.includes('id="root"'),
    });

    if (!htmlValid) {
      homepageErrors.add(1);
      homepageSuccess.add(0);
      return;
    }

    // Brief pause to simulate browser parsing
    sleep(0.1);

    // Step 2: Load API data in parallel (simulating React component mounting)
    const apiStart = Date.now();

    // Simulate Convex queries that would fire on homepage mount
    // These simulate the WebSocket-based Convex subscriptions
    const responses = http.batch([
      {
        method: 'POST',
        url: `${urls.convexApi}/api/query`,
        body: JSON.stringify({
          path: 'products:getFeaturedProducts',
          args: { limit: 8 },
          format: 'json',
        }),
        params: {
          headers: { 'Content-Type': 'application/json' },
          tags: { endpoint: 'featured_products', type: 'api' },
        },
      },
      {
        method: 'POST',
        url: `${urls.convexApi}/api/query`,
        body: JSON.stringify({
          path: 'products:getBestsellerProducts',
          args: { limit: 8 },
          format: 'json',
        }),
        params: {
          headers: { 'Content-Type': 'application/json' },
          tags: { endpoint: 'bestseller_products', type: 'api' },
        },
      },
      {
        method: 'POST',
        url: `${urls.convexApi}/api/query`,
        body: JSON.stringify({
          path: 'products:listProducts',
          args: { newArrival: true, limit: 6 },
          format: 'json',
        }),
        params: {
          headers: { 'Content-Type': 'application/json' },
          tags: { endpoint: 'new_arrivals', type: 'api' },
        },
      },
    ]);

    const apiLoadTime = Date.now() - apiStart;

    // Validate featured products response
    const featuredValid = check(responses[0], {
      'featured products: status is 200': (r) => r.status === 200,
      'featured products: has data': (r) => {
        const data = parseJSON(r);
        return data && (Array.isArray(data) || data.products);
      },
    });

    if (featuredValid && responses[0].timings) {
      homepageFeaturedLoad.add(responses[0].timings.duration);
    }

    // Validate bestseller products response
    const bestsellerValid = check(responses[1], {
      'bestseller products: status is 200': (r) => r.status === 200,
      'bestseller products: has data': (r) => {
        const data = parseJSON(r);
        return data && (Array.isArray(data) || data.products);
      },
    });

    if (bestsellerValid && responses[1].timings) {
      homepageBestsellerLoad.add(responses[1].timings.duration);
    }

    // Validate new arrivals response
    const newArrivalsValid = check(responses[2], {
      'new arrivals: status is 200': (r) => r.status === 200,
      'new arrivals: has data': (r) => {
        const data = parseJSON(r);
        return data && (Array.isArray(data) || data.products);
      },
    });

    if (newArrivalsValid && responses[2].timings) {
      homepageNewArrivalsLoad.add(responses[2].timings.duration);
    }

    // Calculate overall success
    const allSuccessful = htmlValid && featuredValid && bestsellerValid && newArrivalsValid;
    homepageSuccess.add(allSuccessful ? 1 : 0);

    if (!allSuccessful) {
      homepageErrors.add(1);
    }

    // Log progress for debugging
    if (__VU === 1 && __ITER % 10 === 0) {
      log(`Homepage iteration ${__ITER}: LCP=${documentLoadTime}ms, API=${apiLoadTime}ms`);
    }
  });

  // Think time - simulate user viewing homepage
  sleep(randomThinkTime('browse'));
}

// Teardown function - runs once after test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  log(`Homepage load test completed in ${duration.toFixed(1)} seconds`);
}

// Handle summary generation
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'tests/load/results/homepage-summary.json': JSON.stringify(data, null, 2),
  };
}

// Helper for text summary (k6 built-in)
function textSummary(data, options) {
  // k6 provides this automatically, fallback to basic output
  const metrics = data.metrics || {};
  let output = '\n=== Homepage Load Test Summary ===\n\n';

  // Key metrics summary
  const keyMetrics = [
    'homepage_lcp_ms',
    'homepage_ttfb_ms',
    'homepage_success_rate',
    'http_req_duration',
    'http_req_failed',
  ];

  for (const name of keyMetrics) {
    if (metrics[name]) {
      const m = metrics[name];
      if (m.values) {
        if (m.values.p95 !== undefined) {
          output += `${name}: p50=${m.values.med?.toFixed(0) || 'N/A'}ms, p95=${m.values['p(95)']?.toFixed(0) || 'N/A'}ms\n`;
        } else if (m.values.rate !== undefined) {
          output += `${name}: ${(m.values.rate * 100).toFixed(2)}%\n`;
        }
      }
    }
  }

  return output;
}
