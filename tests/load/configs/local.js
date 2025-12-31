/**
 * Local Development Configuration
 *
 * Configuration for testing against local development servers.
 * Useful for debugging test scripts before running against staging.
 */

// Local URLs
export const urls = {
  frontend: 'http://localhost:5173',
  convexHttp: 'http://localhost:3000',
  convexApi: 'http://localhost:3000',
};

// Local scenarios (quick iterations)
export const localScenarios = {
  // Quick validation
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '10s',
  },
  // Debug with single VU
  debug: {
    executor: 'per-vu-iterations',
    vus: 1,
    iterations: 1,
    maxDuration: '1m',
  },
  // Light load for local testing
  light: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 5 },
      { duration: '30s', target: 10 },
      { duration: '10s', target: 0 },
    ],
    gracefulRampDown: '5s',
  },
  // Normal load (be careful with local resources)
  normal: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10 },
      { duration: '1m', target: 20 },
      { duration: '10s', target: 0 },
    ],
    gracefulRampDown: '10s',
  },
};

// Local thresholds (very relaxed for development)
export const localThresholds = {
  http_req_duration: [
    'p(95)<3000', // Local can be slow
    'max<10000',
  ],
  http_req_failed: ['rate<0.1'], // Allow up to 10% errors in dev
};

// Debug settings
export const debug = {
  verboseLogging: true,
  printResponses: true,
  saveAllResponses: false,
};

export default {
  env: 'local',
  urls,
  scenarios: localScenarios,
  thresholds: localThresholds,
  debug,
};
