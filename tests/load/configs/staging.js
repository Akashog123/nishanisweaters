/**
 * Staging Environment Configuration
 *
 * Safe environment for running load tests without affecting production.
 * Uses staging URLs and relaxed thresholds.
 */

import { scenarios, thresholds } from '../lib/config.js';

// Staging-specific URLs
export const urls = {
  frontend: __ENV.STAGING_FRONTEND_URL || 'https://staging.your-app.vercel.app',
  convexHttp: __ENV.STAGING_CONVEX_URL || 'https://staging-your-app.convex.site',
  convexApi: __ENV.STAGING_CONVEX_API || 'https://staging-your-app.convex.cloud',
};

// Staging scenarios (can run heavier tests)
export const stagingScenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 3,
    duration: '30s',
  },
  normal: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  peak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '1m',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 100 },
      { duration: '2m', target: 300 },
      { duration: '2m', target: 500 },
      { duration: '3m', target: 500 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '2m',
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '5s', target: 400 },
      { duration: '1m', target: 400 },
      { duration: '5s', target: 50 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '30m',
    gracefulStop: '5m',
  },
};

// Staging thresholds (slightly relaxed compared to production)
export const stagingThresholds = {
  // Response time thresholds (10% more lenient than production)
  http_req_duration: [
    'p(50)<550',
    'p(90)<1100',
    'p(95)<1650',
    'p(99)<2200',
    'max<6000',
  ],
  http_req_failed: ['rate<0.02'], // Allow up to 2% error rate
  http_reqs: ['rate>5'], // Lower throughput requirement

  // Endpoint-specific (staging)
  'http_req_duration{endpoint:homepage}': ['p(95)<1000'],
  'http_req_duration{endpoint:products_list}': ['p(95)<1200'],
  'http_req_duration{endpoint:product_detail}': ['p(95)<800'],
  'http_req_duration{endpoint:add_to_cart}': ['p(95)<700'],
  'http_req_duration{endpoint:checkout}': ['p(95)<2000'],
  'http_req_duration{endpoint:health}': ['p(95)<200'],
};

export default {
  env: 'staging',
  urls,
  scenarios: stagingScenarios,
  thresholds: stagingThresholds,
};
