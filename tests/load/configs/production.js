/**
 * Production Environment Configuration
 *
 * Conservative settings for production load testing.
 * Uses strict thresholds and limited load scenarios.
 *
 * WARNING: Only run smoke tests in production.
 * Heavy load tests should be run in staging.
 */

// Production URLs
export const urls = {
  frontend: __ENV.PROD_FRONTEND_URL || 'https://your-app.vercel.app',
  convexHttp: __ENV.PROD_CONVEX_URL || 'https://your-app.convex.site',
  convexApi: __ENV.PROD_CONVEX_API || 'https://your-app.convex.cloud',
};

// Production scenarios (very conservative)
export const productionScenarios = {
  // Smoke test only - verify basic functionality
  smoke: {
    executor: 'constant-vus',
    vus: 2,
    duration: '1m',
  },
  // Light monitoring test
  monitoring: {
    executor: 'constant-vus',
    vus: 1,
    duration: '5m',
  },
  // DO NOT run these in production without explicit approval
  normal: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '2m', target: 20 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
};

// Production thresholds (strict)
export const productionThresholds = {
  // Response time thresholds (strict for production SLAs)
  http_req_duration: [
    'p(50)<400',
    'p(90)<800',
    'p(95)<1000',
    'p(99)<1500',
    'max<3000',
  ],
  http_req_failed: ['rate<0.005'], // Less than 0.5% error rate
  http_reqs: ['rate>10'], // Minimum throughput

  // Critical endpoint thresholds
  'http_req_duration{endpoint:homepage}': ['p(95)<600', 'p(99)<1000'],
  'http_req_duration{endpoint:products_list}': ['p(95)<800', 'p(99)<1500'],
  'http_req_duration{endpoint:product_detail}': ['p(95)<500', 'p(99)<800'],
  'http_req_duration{endpoint:add_to_cart}': ['p(95)<400', 'p(99)<700'],
  'http_req_duration{endpoint:checkout}': ['p(95)<1200', 'p(99)<2000'],
  'http_req_duration{endpoint:health}': ['p(95)<50', 'p(99)<100'],

  // Business-critical metrics
  'add_to_cart_success_rate': ['rate>0.995'],
  'checkout_success_rate': ['rate>0.99'],
  'journey_success_rate': ['rate>0.95'],
};

// Rate limiting for production tests
export const rateLimits = {
  maxVUs: 20, // Never exceed 20 VUs in production
  maxDuration: '5m', // Never run longer than 5 minutes
  cooldownPeriod: '10m', // Wait 10 minutes between tests
};

export default {
  env: 'production',
  urls,
  scenarios: productionScenarios,
  thresholds: productionThresholds,
  rateLimits,
};
