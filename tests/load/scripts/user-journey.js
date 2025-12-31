/**
 * Full User Journey Load Test
 *
 * Simulates complete e-commerce user journeys:
 * 1. Land on homepage
 * 2. Browse products
 * 3. View product details
 * 4. Add items to cart
 * 5. Proceed to checkout
 *
 * This test provides the most realistic simulation of user behavior
 * with proper think times and realistic action sequences.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { getConfig, randomThinkTime, testData } from '../lib/config.js';
import {
  get,
  post,
  validateResponse,
  parseJSON,
  extractProducts,
  humanDelay,
  log,
} from '../lib/helpers.js';

// Get environment configuration
const config = getConfig();
const { urls } = config;

// Custom metrics for user journey
const journeyDuration = new Trend('journey_duration_ms');
const journeySuccess = new Rate('journey_success_rate');
const conversionRate = new Rate('conversion_rate');
const bounceRate = new Rate('bounce_rate');
const cartAbandonmentRate = new Rate('cart_abandonment_rate');
const pageLoadTimes = new Trend('page_load_times_ms');
const apiResponseTimes = new Trend('api_response_times_ms');
const journeyErrors = new Counter('journey_errors');
const journeySteps = new Counter('journey_steps_completed');

// Test options
export const options = {
  scenarios: {
    user_journey: config.scenarios.normal,
  },
  thresholds: {
    'journey_duration_ms': ['p(95)<120000'], // Full journey under 2 minutes
    'journey_success_rate': ['rate>0.90'],
    'page_load_times_ms': ['p(95)<2000'],
    'api_response_times_ms': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
    ...config.thresholds,
  },
};

// User behavior patterns (probability-based)
const behaviors = {
  // Probability of bouncing after homepage (leaving without browsing)
  bounceAfterHomepage: 0.15, // 15%

  // Probability of viewing product details from list
  viewProductDetail: 0.60, // 60%

  // Probability of adding to cart after viewing details
  addToCart: 0.40, // 40%

  // Probability of proceeding to checkout after cart
  proceedToCheckout: 0.50, // 50%

  // Probability of completing checkout (without payment)
  completeCheckout: 0.30, // 30% (of those who start checkout)

  // Probability of browsing multiple categories
  browseMultipleCategories: 0.40, // 40%

  // Probability of using search
  useSearch: 0.25, // 25%

  // Probability of using filters
  useFilters: 0.35, // 35%
};

// Setup function
export function setup() {
  log(`Starting full user journey load test on ${config.env} environment`);
  log('Simulating realistic e-commerce user behavior');

  // Pre-fetch products for journey
  const productsResponse = post(
    `${urls.convexApi}/api/query`,
    {
      path: 'products:listProducts',
      args: { limit: 50 },
      format: 'json',
    },
    { endpoint: 'setup', type: 'setup' }
  );

  const products = extractProducts(productsResponse);

  return {
    startTime: Date.now(),
    products: products.slice(0, 30),
  };
}

// Main user journey
export default function (data) {
  const { products } = data;
  const journeyStart = Date.now();
  const sessionId = testData.generateSessionId();

  let journeyCompleted = false;
  let reachedCart = false;
  let reachedCheckout = false;
  let completed = false;

  // Track products viewed and added
  const viewedProducts = [];
  const cartItems = [];

  try {
    // ========================================
    // Step 1: Homepage Landing
    // ========================================
    group('1. Homepage Landing', () => {
      const start = Date.now();

      // Load main document
      const htmlResponse = get(urls.frontend, {
        endpoint: 'homepage',
        type: 'document',
      });

      pageLoadTimes.add(Date.now() - start);

      const valid = check(htmlResponse, {
        'homepage loaded': (r) => r.status === 200,
      });

      if (!valid) {
        throw new Error('Homepage failed to load');
      }

      journeySteps.add(1);

      // Load homepage data
      const apiStart = Date.now();
      http.batch([
        {
          method: 'POST',
          url: `${urls.convexApi}/api/query`,
          body: JSON.stringify({
            path: 'products:getFeaturedProducts',
            args: { limit: 8 },
            format: 'json',
          }),
          params: { headers: { 'Content-Type': 'application/json' } },
        },
        {
          method: 'POST',
          url: `${urls.convexApi}/api/query`,
          body: JSON.stringify({
            path: 'products:getBestsellerProducts',
            args: { limit: 8 },
            format: 'json',
          }),
          params: { headers: { 'Content-Type': 'application/json' } },
        },
      ]);
      apiResponseTimes.add(Date.now() - apiStart);
    });

    sleep(randomThinkTime('browse'));

    // Check for bounce
    if (Math.random() < behaviors.bounceAfterHomepage) {
      bounceRate.add(1);
      journeyCompleted = true;
      return;
    }
    bounceRate.add(0);

    // ========================================
    // Step 2: Browse Products
    // ========================================
    group('2. Browse Products', () => {
      // Decide whether to search or browse categories
      if (Math.random() < behaviors.useSearch) {
        // Use search
        const searchTerms = ['silk', 'cotton', 'party', 'casual'];
        const searchTerm = testData.randomFrom(searchTerms);

        const start = Date.now();
        const response = post(
          `${urls.convexApi}/api/query`,
          {
            path: 'products:searchProducts',
            args: { searchTerm, limit: 12 },
            format: 'json',
          },
          { endpoint: 'search', type: 'api' }
        );
        apiResponseTimes.add(Date.now() - start);

        check(response, { 'search returned results': (r) => r.status === 200 });
      } else {
        // Browse by category
        const category = testData.randomFrom(testData.categories);

        const start = Date.now();
        const response = post(
          `${urls.convexApi}/api/query`,
          {
            path: 'products:listProducts',
            args: { category, limit: 20 },
            format: 'json',
          },
          { endpoint: 'products_list', type: 'api' }
        );
        apiResponseTimes.add(Date.now() - start);

        check(response, { 'product list loaded': (r) => r.status === 200 });
      }

      journeySteps.add(1);
    });

    sleep(randomThinkTime('browse'));

    // Optional: Apply filters
    if (Math.random() < behaviors.useFilters) {
      group('2a. Apply Filters', () => {
        const size = testData.randomFrom(testData.sizes);
        const sortBy = testData.randomFrom(testData.sortOptions);

        const start = Date.now();
        post(
          `${urls.convexApi}/api/query`,
          {
            path: 'products:listProducts',
            args: { sizes: [size], sortBy, limit: 20 },
            format: 'json',
          },
          { endpoint: 'filtered_list', type: 'api' }
        );
        apiResponseTimes.add(Date.now() - start);
      });

      sleep(randomThinkTime('decide'));
    }

    // ========================================
    // Step 3: View Product Details
    // ========================================
    if (Math.random() < behaviors.viewProductDetail && products.length > 0) {
      group('3. View Product Details', () => {
        // View 1-3 products
        const numToView = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numToView && i < products.length; i++) {
          const product = products[i];
          viewedProducts.push(product);

          const start = Date.now();
          const response = post(
            `${urls.convexApi}/api/query`,
            {
              path: 'products:getProductById',
              args: { productId: product._id },
              format: 'json',
            },
            { endpoint: 'product_detail', type: 'api' }
          );
          apiResponseTimes.add(Date.now() - start);

          check(response, { 'product detail loaded': (r) => r.status === 200 });

          sleep(randomThinkTime('read')); // Time spent reading product details
        }

        journeySteps.add(1);
      });
    }

    // ========================================
    // Step 4: Add to Cart
    // ========================================
    if (Math.random() < behaviors.addToCart && viewedProducts.length > 0) {
      group('4. Add to Cart', () => {
        // Add 1-2 items to cart
        const numToAdd = Math.min(Math.floor(Math.random() * 2) + 1, viewedProducts.length);

        for (let i = 0; i < numToAdd; i++) {
          const product = viewedProducts[i];
          const variant = product.variants && product.variants.length > 0
            ? testData.randomFrom(product.variants)
            : { sku: 'DEFAULT' };

          const start = Date.now();
          const response = post(
            `${urls.convexApi}/api/mutation`,
            {
              path: 'cart:addToCart',
              args: {
                sessionId,
                productId: product._id,
                variantSku: variant.sku,
                quantity: Math.floor(Math.random() * 2) + 1,
              },
              format: 'json',
            },
            { endpoint: 'add_to_cart', type: 'mutation' }
          );
          apiResponseTimes.add(Date.now() - start);

          if (response.status === 200) {
            cartItems.push({
              productId: product._id,
              variantSku: variant.sku,
              quantity: 1,
            });
          }

          humanDelay('click');
        }

        reachedCart = true;
        journeySteps.add(1);
      });

      sleep(randomThinkTime('browse'));

      // View cart
      group('4a. View Cart', () => {
        const start = Date.now();
        post(
          `${urls.convexApi}/api/query`,
          {
            path: 'cart:getCart',
            args: { sessionId },
            format: 'json',
          },
          { endpoint: 'get_cart', type: 'api' }
        );
        apiResponseTimes.add(Date.now() - start);
      });

      sleep(randomThinkTime('decide'));
    }

    // ========================================
    // Step 5: Checkout
    // ========================================
    if (reachedCart && Math.random() < behaviors.proceedToCheckout && cartItems.length > 0) {
      group('5. Checkout', () => {
        reachedCheckout = true;

        // Order preview
        const previewStart = Date.now();
        const previewResponse = post(
          `${urls.convexApi}/api/query`,
          {
            path: 'orders:getOrderPreview',
            args: { items: cartItems },
            format: 'json',
          },
          { endpoint: 'order_preview', type: 'api' }
        );
        apiResponseTimes.add(Date.now() - previewStart);

        check(previewResponse, { 'order preview loaded': (r) => r.status === 200 });

        journeySteps.add(1);

        // Simulate filling checkout form
        sleep(randomThinkTime('checkout'));

        // Complete checkout (for authenticated users)
        if (Math.random() < behaviors.completeCheckout) {
          const shippingAddress = testData.generateAddress();

          const orderStart = Date.now();
          const orderResponse = post(
            `${urls.convexApi}/api/mutation`,
            {
              path: 'orders:createOrder',
              args: {
                items: cartItems,
                shippingAddress,
                paymentMethod: 'invoice',
                customerNotes: 'Load test order',
              },
              format: 'json',
            },
            { endpoint: 'order_create', type: 'mutation' }
          );
          apiResponseTimes.add(Date.now() - orderStart);

          // 200 = success, 401 = unauthenticated (expected for guest)
          if (orderResponse.status === 200) {
            completed = true;
            conversionRate.add(1);
          } else {
            conversionRate.add(0);
          }
        }
      });
    }

    // Track cart abandonment
    if (reachedCart && !reachedCheckout) {
      cartAbandonmentRate.add(1);
    } else if (reachedCart) {
      cartAbandonmentRate.add(0);
    }

    journeyCompleted = true;
    journeySuccess.add(1);

  } catch (error) {
    journeySuccess.add(0);
    journeyErrors.add(1);
    log(`Journey failed: ${error.message}`, 'error');
  } finally {
    // Record journey duration
    journeyDuration.add(Date.now() - journeyStart);

    // Cleanup: clear cart
    post(
      `${urls.convexApi}/api/mutation`,
      {
        path: 'cart:clearCart',
        args: { sessionId },
        format: 'json',
      },
      { endpoint: 'cleanup', type: 'mutation' }
    );
  }
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  log(`Full user journey load test completed in ${duration.toFixed(1)} seconds`);
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': generateSummary(data),
    'tests/load/results/journey-summary.json': JSON.stringify(data, null, 2),
  };
}

function generateSummary(data) {
  const metrics = data.metrics || {};
  let output = '\n=== Full User Journey Load Test Summary ===\n\n';

  output += '--- Performance Metrics ---\n';
  const perfMetrics = [
    { name: 'journey_duration_ms', label: 'Journey Duration' },
    { name: 'page_load_times_ms', label: 'Page Load Times' },
    { name: 'api_response_times_ms', label: 'API Response Times' },
  ];

  for (const { name, label } of perfMetrics) {
    const m = metrics[name];
    if (m && m.values && m.values['p(95)'] !== undefined) {
      output += `${label}: p50=${(m.values.med / 1000).toFixed(2)}s, p95=${(m.values['p(95)'] / 1000).toFixed(2)}s\n`;
    }
  }

  output += '\n--- Business Metrics ---\n';
  const bizMetrics = [
    { name: 'journey_success_rate', label: 'Journey Success Rate' },
    { name: 'bounce_rate', label: 'Bounce Rate' },
    { name: 'conversion_rate', label: 'Conversion Rate' },
    { name: 'cart_abandonment_rate', label: 'Cart Abandonment' },
  ];

  for (const { name, label } of bizMetrics) {
    const m = metrics[name];
    if (m && m.values && m.values.rate !== undefined) {
      output += `${label}: ${(m.values.rate * 100).toFixed(2)}%\n`;
    }
  }

  const steps = metrics['journey_steps_completed'];
  if (steps && steps.values && steps.values.count !== undefined) {
    output += `Total Steps Completed: ${steps.values.count}\n`;
  }

  return output;
}
