/**
 * Load Testing Configuration Library
 *
 * Centralized configuration for k6 load tests.
 * Provides environment-specific settings, thresholds, and helper functions.
 */

// Environment detection - defaults to staging
const ENV = __ENV.TEST_ENV || 'staging';

// Base URLs by environment
const BASE_URLS = {
  staging: {
    frontend: __ENV.STAGING_FRONTEND_URL || 'https://staging.your-app.vercel.app',
    convexHttp: __ENV.STAGING_CONVEX_URL || 'https://staging-your-app.convex.site',
    convexApi: __ENV.STAGING_CONVEX_API || 'https://staging-your-app.convex.cloud',
  },
  production: {
    frontend: __ENV.PROD_FRONTEND_URL || 'https://your-app.vercel.app',
    convexHttp: __ENV.PROD_CONVEX_URL || 'https://your-app.convex.site',
    convexApi: __ENV.PROD_CONVEX_API || 'https://your-app.convex.cloud',
  },
  local: {
    frontend: 'http://localhost:5173',
    convexHttp: 'http://localhost:3000',
    convexApi: 'http://localhost:3000',
  },
};

// Performance thresholds (SLOs)
export const thresholds = {
  // Response time thresholds
  http_req_duration: [
    'p(50)<500',   // 50% of requests should be under 500ms
    'p(90)<1000',  // 90% of requests should be under 1s
    'p(95)<1500',  // 95% of requests should be under 1.5s
    'p(99)<2000',  // 99% of requests should be under 2s
    'max<5000',    // No request should take more than 5s
  ],

  // Error rate threshold
  http_req_failed: ['rate<0.01'], // Less than 1% error rate

  // Throughput (requests per second)
  http_reqs: ['rate>10'], // Minimum 10 requests per second

  // Custom thresholds for specific endpoints
  'http_req_duration{endpoint:homepage}': ['p(95)<800'],
  'http_req_duration{endpoint:products_list}': ['p(95)<1000'],
  'http_req_duration{endpoint:product_detail}': ['p(95)<600'],
  'http_req_duration{endpoint:add_to_cart}': ['p(95)<500'],
  'http_req_duration{endpoint:checkout}': ['p(95)<1500'],
  'http_req_duration{endpoint:health}': ['p(95)<100'],

  // Web Vitals proxies (measured via browser tests)
  'http_req_duration{type:document}': ['p(95)<1000'], // LCP proxy
  'http_req_duration{type:api}': ['p(95)<500'],       // FID proxy
};

// Load scenarios configuration
export const scenarios = {
  // Normal traffic simulation
  normal: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },  // Warm up
      { duration: '5m', target: 50 },  // Ramp to normal load
      { duration: '10m', target: 50 }, // Sustain normal load
      { duration: '2m', target: 0 },   // Ramp down
    ],
    gracefulRampDown: '30s',
  },

  // Peak traffic simulation (e.g., sale events)
  peak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Quick ramp up
      { duration: '3m', target: 200 },  // Ramp to peak
      { duration: '10m', target: 200 }, // Sustain peak load
      { duration: '3m', target: 50 },   // Gradual decrease
      { duration: '2m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '1m',
  },

  // Stress test - find breaking points
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },  // Initial ramp
      { duration: '3m', target: 200 },  // Increase load
      { duration: '3m', target: 300 },  // Continue increasing
      { duration: '3m', target: 400 },  // Near stress point
      { duration: '5m', target: 500 },  // Maximum stress
      { duration: '2m', target: 250 },  // Recovery test
      { duration: '2m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '2m',
  },

  // Spike test - sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },   // Normal load
      { duration: '10s', target: 300 }, // Sudden spike
      { duration: '3m', target: 300 },  // Sustain spike
      { duration: '10s', target: 50 },  // Sudden drop
      { duration: '2m', target: 50 },   // Recovery
      { duration: '1m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '30s',
  },

  // Soak test - long duration for memory leaks
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '60m',
    gracefulStop: '5m',
  },

  // Smoke test - quick sanity check
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '1m',
  },
};

// Get configuration for current environment
export function getConfig() {
  const urls = BASE_URLS[ENV] || BASE_URLS.staging;
  return {
    env: ENV,
    urls,
    thresholds,
    scenarios,
  };
}

// Think time simulation (realistic user behavior)
export const thinkTime = {
  min: 1,    // Minimum 1 second between actions
  max: 5,    // Maximum 5 seconds between actions
  browse: { min: 2, max: 8 },      // Browsing products
  read: { min: 3, max: 10 },       // Reading product details
  decide: { min: 1, max: 3 },      // Decision-making
  checkout: { min: 5, max: 15 },   // Filling checkout form
};

// Helper to generate random think time
export function randomThinkTime(type = 'default') {
  const times = thinkTime[type] || thinkTime;
  const min = times.min || 1;
  const max = times.max || 5;
  return Math.random() * (max - min) + min;
}

// Test data generators
export const testData = {
  // Random product categories
  categories: ['sarees', 'kurtas', 'lehengas', 'accessories'],

  // Random product filters
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
  colors: ['Red', 'Blue', 'Green', 'Black', 'White', 'Pink', 'Yellow'],
  sortOptions: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'popularity'],

  // Generate random shipping address
  generateAddress: () => ({
    name: `Test User ${Math.floor(Math.random() * 10000)}`,
    phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
    street: `${Math.floor(Math.random() * 999) + 1} Test Street`,
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: `40000${Math.floor(Math.random() * 9)}`,
    country: 'India',
  }),

  // Get random item from array
  randomFrom: (arr) => arr[Math.floor(Math.random() * arr.length)],

  // Generate session ID (UUID v4 format for guest carts)
  generateSessionId: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
};

// HTTP request defaults
export const httpDefaults = {
  timeout: '30s',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'k6-load-test/1.0',
  },
};

// Convex-specific helpers
export const convex = {
  // Format Convex query/mutation request
  formatRequest: (functionPath, args = {}) => ({
    path: functionPath,
    args,
    format: 'json',
  }),

  // Parse Convex response
  parseResponse: (response) => {
    try {
      const body = JSON.parse(response.body);
      return body.value || body;
    } catch {
      return null;
    }
  },
};

export default {
  getConfig,
  thresholds,
  scenarios,
  thinkTime,
  randomThinkTime,
  testData,
  httpDefaults,
  convex,
};
