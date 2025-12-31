/**
 * Load Testing Helper Functions
 *
 * Common utilities for k6 load tests including:
 * - HTTP request wrappers with tagging
 * - Response validation
 * - Metrics collection
 * - Error handling
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomThinkTime, httpDefaults } from './config.js';

// Custom metrics
export const customMetrics = {
  // Error counters by type
  errors: new Counter('custom_errors'),
  apiErrors: new Counter('api_errors'),
  validationErrors: new Counter('validation_errors'),

  // Success rates by endpoint
  homepageSuccess: new Rate('homepage_success_rate'),
  productsSuccess: new Rate('products_success_rate'),
  cartSuccess: new Rate('cart_success_rate'),
  checkoutSuccess: new Rate('checkout_success_rate'),

  // Custom timing trends
  lcpProxy: new Trend('lcp_proxy_ms'),
  ttfbTrend: new Trend('ttfb_ms'),
  apiLatency: new Trend('api_latency_ms'),

  // Business metrics
  addToCartRate: new Rate('add_to_cart_rate'),
  checkoutStartRate: new Rate('checkout_start_rate'),
  orderCompletionRate: new Rate('order_completion_rate'),
};

/**
 * Make an HTTP GET request with standard tagging and validation
 */
export function get(url, options = {}) {
  const endpoint = options.endpoint || 'unknown';
  const type = options.type || 'api';

  const params = {
    ...httpDefaults,
    headers: {
      ...httpDefaults.headers,
      ...(options.headers || {}),
    },
    tags: {
      endpoint,
      type,
      ...(options.tags || {}),
    },
    timeout: options.timeout || httpDefaults.timeout,
  };

  const response = http.get(url, params);

  // Record TTFB
  if (response.timings) {
    customMetrics.ttfbTrend.add(response.timings.waiting);
  }

  return response;
}

/**
 * Make an HTTP POST request with standard tagging and validation
 */
export function post(url, body, options = {}) {
  const endpoint = options.endpoint || 'unknown';
  const type = options.type || 'api';

  const params = {
    headers: {
      ...httpDefaults.headers,
      ...(options.headers || {}),
    },
    tags: {
      endpoint,
      type,
      ...(options.tags || {}),
    },
    timeout: options.timeout || httpDefaults.timeout,
  };

  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const response = http.post(url, payload, params);

  // Record API latency
  if (response.timings) {
    customMetrics.apiLatency.add(response.timings.duration);
  }

  return response;
}

/**
 * Validate HTTP response with common checks
 */
export function validateResponse(response, options = {}) {
  const {
    expectedStatus = 200,
    name = 'response',
    checkBody = true,
    requiredFields = [],
  } = options;

  const checks = {
    [`${name}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  };

  if (checkBody) {
    checks[`${name}: has body`] = (r) => r.body && r.body.length > 0;
  }

  // Check for required fields in JSON response
  if (requiredFields.length > 0) {
    checks[`${name}: has required fields`] = (r) => {
      try {
        const body = JSON.parse(r.body);
        return requiredFields.every(field => body.hasOwnProperty(field));
      } catch {
        return false;
      }
    };
  }

  const result = check(response, checks);

  if (!result) {
    customMetrics.errors.add(1);
    if (response.status >= 400) {
      customMetrics.apiErrors.add(1);
    }
  }

  return result;
}

/**
 * Parse JSON response safely
 */
export function parseJSON(response) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    customMetrics.validationErrors.add(1);
    return null;
  }
}

/**
 * Execute a user journey step with think time
 */
export function step(name, fn, thinkTimeType = 'default') {
  return group(name, () => {
    const result = fn();
    sleep(randomThinkTime(thinkTimeType));
    return result;
  });
}

/**
 * Retry a function with exponential backoff
 */
export function retry(fn, maxRetries = 3, baseDelay = 1) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = fn();
      if (result) return result;
    } catch (e) {
      lastError = e;
    }

    if (attempt < maxRetries - 1) {
      sleep(baseDelay * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Simulate realistic user behavior with random pauses
 */
export function humanDelay(action = 'default') {
  const delays = {
    click: { min: 0.1, max: 0.5 },
    scroll: { min: 0.5, max: 2 },
    read: { min: 2, max: 10 },
    type: { min: 1, max: 3 },
    think: { min: 1, max: 5 },
    default: { min: 0.5, max: 2 },
  };

  const delay = delays[action] || delays.default;
  sleep(Math.random() * (delay.max - delay.min) + delay.min);
}

/**
 * Generate batch requests for parallel execution
 */
export function batch(requests) {
  return http.batch(requests.map(req => ({
    method: req.method || 'GET',
    url: req.url,
    body: req.body ? JSON.stringify(req.body) : null,
    params: {
      headers: {
        ...httpDefaults.headers,
        ...(req.headers || {}),
      },
      tags: req.tags || {},
    },
  })));
}

/**
 * Create a Convex API request URL
 */
export function convexUrl(baseUrl, functionPath) {
  // Convex uses a specific URL pattern for API calls
  return `${baseUrl}/api/query`;
}

/**
 * Make a Convex query request
 */
export function convexQuery(baseUrl, functionPath, args = {}, options = {}) {
  const url = `${baseUrl}/api/query`;
  const body = {
    path: functionPath,
    args,
    format: 'json',
  };

  return post(url, body, {
    endpoint: functionPath.split(':').pop(),
    type: 'convex_query',
    ...options,
  });
}

/**
 * Make a Convex mutation request
 */
export function convexMutation(baseUrl, functionPath, args = {}, options = {}) {
  const url = `${baseUrl}/api/mutation`;
  const body = {
    path: functionPath,
    args,
    format: 'json',
  };

  return post(url, body, {
    endpoint: functionPath.split(':').pop(),
    type: 'convex_mutation',
    ...options,
  });
}

/**
 * Extract product data from Convex response
 */
export function extractProducts(response) {
  const data = parseJSON(response);
  if (!data) return [];

  // Handle paginated response format
  if (data.products) return data.products;
  if (Array.isArray(data)) return data;
  if (data.value && data.value.products) return data.value.products;
  if (data.value && Array.isArray(data.value)) return data.value;

  return [];
}

/**
 * Log test progress (visible in k6 output)
 */
export function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
    debug: '[DEBUG]',
  }[level] || '[INFO]';

  console.log(`${prefix} ${timestamp}: ${message}`);
}

export default {
  customMetrics,
  get,
  post,
  validateResponse,
  parseJSON,
  step,
  retry,
  humanDelay,
  batch,
  convexUrl,
  convexQuery,
  convexMutation,
  extractProducts,
  log,
};
