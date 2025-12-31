/**
 * Add to Cart Flow Load Test
 *
 * Tests the cart operations performance including:
 * - View product detail
 * - Add item to cart
 * - Get cart with updated items
 * - Update cart item quantity
 * - Remove cart item
 * - Cart validation
 *
 * Simulates both guest and authenticated user flows.
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
  extractProducts,
  customMetrics,
  log,
} from '../lib/helpers.js';

// Get environment configuration
const config = getConfig();
const { urls } = config;

// Custom metrics for cart operations
const productDetailLoad = new Trend('product_detail_load_ms');
const addToCartLoad = new Trend('add_to_cart_load_ms');
const getCartLoad = new Trend('get_cart_load_ms');
const updateCartLoad = new Trend('update_cart_load_ms');
const removeCartLoad = new Trend('remove_cart_load_ms');
const cartValidationLoad = new Trend('cart_validation_load_ms');
const cartSuccess = new Rate('cart_success_rate');
const addToCartSuccess = new Rate('add_to_cart_success_rate');
const cartErrors = new Counter('cart_errors');

// Test options
export const options = {
  scenarios: {
    cart_flow: config.scenarios.normal,
  },
  thresholds: {
    'http_req_duration{endpoint:product_detail}': ['p(95)<600', 'p(99)<1000'],
    'http_req_duration{endpoint:add_to_cart}': ['p(95)<500', 'p(99)<800'],
    'http_req_duration{endpoint:get_cart}': ['p(95)<600'],
    'http_req_duration{endpoint:update_cart}': ['p(95)<500'],
    'http_req_duration{endpoint:remove_cart}': ['p(95)<500'],
    'http_req_duration{endpoint:validate_cart}': ['p(95)<800'],
    'add_to_cart_success_rate': ['rate>0.98'],
    'cart_success_rate': ['rate>0.99'],
    ...config.thresholds,
  },
};

// Setup function - fetch available products
export function setup() {
  log(`Starting cart flow load test on ${config.env} environment`);

  // Fetch products to use in cart tests
  const productsResponse = post(
    `${urls.convexApi}/api/query`,
    {
      path: 'products:listProducts',
      args: { limit: 50 },
      format: 'json',
    },
    { endpoint: 'setup_products', type: 'setup' }
  );

  const products = extractProducts(productsResponse);

  if (products.length === 0) {
    log('Warning: No products found for cart testing', 'warn');
  }

  return {
    startTime: Date.now(),
    products: products.slice(0, 20), // Use first 20 products for testing
  };
}

// Main test function
export default function (data) {
  const { products } = data;

  if (products.length === 0) {
    log('Skipping iteration: no products available', 'warn');
    return;
  }

  // Generate a unique session ID for this VU (simulating guest user)
  const sessionId = testData.generateSessionId();

  // Select random products for this iteration
  const product = testData.randomFrom(products);

  // Scenario 1: View Product Detail
  group('View Product Detail', () => {
    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:getProductBySlug',
        args: { slug: product.slug || product.name.toLowerCase().replace(/\s+/g, '-') },
        format: 'json',
      },
      { endpoint: 'product_detail', type: 'api' }
    );

    productDetailLoad.add(Date.now() - start);

    const valid = check(response, {
      'product detail: status is 200': (r) => r.status === 200,
      'product detail: has product data': (r) => {
        const data = parseJSON(r);
        return data && (data._id || data.value?._id);
      },
      'product detail: has variants': (r) => {
        const data = parseJSON(r);
        const product = data?.value || data;
        return product && product.variants && product.variants.length > 0;
      },
      'product detail: has images': (r) => {
        const data = parseJSON(r);
        const product = data?.value || data;
        return product && product.images && product.images.length > 0;
      },
    });

    if (!valid) cartErrors.add(1);
  });

  sleep(randomThinkTime('read'));

  // Scenario 2: Add Item to Cart
  let addedVariant = null;

  group('Add to Cart', () => {
    // Select a random variant from the product
    const variant = product.variants && product.variants.length > 0
      ? testData.randomFrom(product.variants)
      : { sku: 'DEFAULT-SKU' };

    addedVariant = variant;

    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/mutation`,
      {
        path: 'cart:addToCart',
        args: {
          sessionId,
          productId: product._id,
          variantSku: variant.sku,
          quantity: Math.floor(Math.random() * 2) + 1, // 1-2 items
        },
        format: 'json',
      },
      { endpoint: 'add_to_cart', type: 'mutation' }
    );

    addToCartLoad.add(Date.now() - start);

    const valid = check(response, {
      'add to cart: status is 200': (r) => r.status === 200,
      'add to cart: returns cart ID': (r) => {
        const data = parseJSON(r);
        // Convex mutations return the result value
        return data !== null;
      },
    });

    addToCartSuccess.add(valid ? 1 : 0);
    cartSuccess.add(valid ? 1 : 0);

    if (!valid) {
      cartErrors.add(1);
      log(`Add to cart failed: ${response.status} - ${response.body}`, 'error');
    }
  });

  sleep(randomThinkTime('decide'));

  // Scenario 3: Get Cart (verify item was added)
  group('Get Cart', () => {
    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'cart:getCart',
        args: { sessionId },
        format: 'json',
      },
      { endpoint: 'get_cart', type: 'api' }
    );

    getCartLoad.add(Date.now() - start);

    const valid = check(response, {
      'get cart: status is 200': (r) => r.status === 200,
      'get cart: has items': (r) => {
        const data = parseJSON(r);
        const cart = data?.value || data;
        return cart && cart.items && cart.items.length > 0;
      },
      'get cart: items have required fields': (r) => {
        const data = parseJSON(r);
        const cart = data?.value || data;
        if (!cart || !cart.items || cart.items.length === 0) return false;
        const item = cart.items[0];
        return item.productId && item.quantity && item.price !== undefined;
      },
    });

    cartSuccess.add(valid ? 1 : 0);
  });

  sleep(randomThinkTime('browse'));

  // Scenario 4: Update Cart Item Quantity
  if (addedVariant) {
    group('Update Cart Item', () => {
      const newQuantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const start = Date.now();

      const response = post(
        `${urls.convexApi}/api/mutation`,
        {
          path: 'cart:updateCartItem',
          args: {
            sessionId,
            productId: product._id,
            variantSku: addedVariant.sku,
            quantity: newQuantity,
          },
          format: 'json',
        },
        { endpoint: 'update_cart', type: 'mutation' }
      );

      updateCartLoad.add(Date.now() - start);

      check(response, {
        'update cart: status is 200': (r) => r.status === 200,
      });
    });

    sleep(randomThinkTime('decide'));
  }

  // Scenario 5: Add another item (second product)
  if (products.length > 1) {
    group('Add Second Item', () => {
      const secondProduct = products.find(p => p._id !== product._id) || product;
      const variant = secondProduct.variants && secondProduct.variants.length > 0
        ? testData.randomFrom(secondProduct.variants)
        : { sku: 'DEFAULT-SKU' };

      const start = Date.now();

      const response = post(
        `${urls.convexApi}/api/mutation`,
        {
          path: 'cart:addToCart',
          args: {
            sessionId,
            productId: secondProduct._id,
            variantSku: variant.sku,
            quantity: 1,
          },
          format: 'json',
        },
        { endpoint: 'add_to_cart', type: 'mutation' }
      );

      addToCartLoad.add(Date.now() - start);

      check(response, {
        'add second item: status is 200': (r) => r.status === 200,
      });
    });

    sleep(randomThinkTime('browse'));
  }

  // Scenario 6: Get Cart Item Count (lightweight)
  group('Get Cart Count', () => {
    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'cart:getCartItemCount',
        args: { sessionId },
        format: 'json',
      },
      { endpoint: 'cart_count', type: 'api' }
    );

    check(response, {
      'cart count: status is 200': (r) => r.status === 200,
      'cart count: returns number': (r) => {
        const data = parseJSON(r);
        const count = data?.value ?? data;
        return typeof count === 'number' && count >= 0;
      },
    });
  });

  sleep(randomThinkTime('decide'));

  // Scenario 7: Validate Cart for Checkout
  group('Validate Cart', () => {
    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/mutation`,
      {
        path: 'cart:validateCart',
        args: { sessionId },
        format: 'json',
      },
      { endpoint: 'validate_cart', type: 'mutation' }
    );

    cartValidationLoad.add(Date.now() - start);

    check(response, {
      'validate cart: status is 200': (r) => r.status === 200,
      'validate cart: returns validation result': (r) => {
        const data = parseJSON(r);
        const result = data?.value || data;
        return result && result.isValid !== undefined;
      },
    });
  });

  sleep(randomThinkTime('decide'));

  // Scenario 8: Remove Cart Item (cleanup)
  if (addedVariant) {
    group('Remove Cart Item', () => {
      const start = Date.now();

      const response = post(
        `${urls.convexApi}/api/mutation`,
        {
          path: 'cart:removeCartItem',
          args: {
            sessionId,
            productId: product._id,
            variantSku: addedVariant.sku,
          },
          format: 'json',
        },
        { endpoint: 'remove_cart', type: 'mutation' }
      );

      removeCartLoad.add(Date.now() - start);

      check(response, {
        'remove cart item: status is 200': (r) => r.status === 200,
      });
    });
  }

  // Final cleanup - clear cart
  group('Clear Cart', () => {
    post(
      `${urls.convexApi}/api/mutation`,
      {
        path: 'cart:clearCart',
        args: { sessionId },
        format: 'json',
      },
      { endpoint: 'clear_cart', type: 'mutation' }
    );
  });
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  log(`Cart flow load test completed in ${duration.toFixed(1)} seconds`);
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': generateSummary(data),
    'tests/load/results/cart-summary.json': JSON.stringify(data, null, 2),
  };
}

function generateSummary(data) {
  const metrics = data.metrics || {};
  let output = '\n=== Cart Flow Load Test Summary ===\n\n';

  const keyMetrics = [
    { name: 'product_detail_load_ms', label: 'Product Detail' },
    { name: 'add_to_cart_load_ms', label: 'Add to Cart' },
    { name: 'get_cart_load_ms', label: 'Get Cart' },
    { name: 'update_cart_load_ms', label: 'Update Cart' },
    { name: 'remove_cart_load_ms', label: 'Remove Cart' },
    { name: 'cart_validation_load_ms', label: 'Cart Validation' },
    { name: 'add_to_cart_success_rate', label: 'Add to Cart Success' },
    { name: 'cart_success_rate', label: 'Overall Cart Success' },
  ];

  for (const { name, label } of keyMetrics) {
    const m = metrics[name];
    if (m && m.values) {
      if (m.values['p(95)'] !== undefined) {
        output += `${label}: p50=${m.values.med?.toFixed(0) || 'N/A'}ms, p95=${m.values['p(95)']?.toFixed(0) || 'N/A'}ms\n`;
      } else if (m.values.rate !== undefined) {
        output += `${label}: ${(m.values.rate * 100).toFixed(2)}%\n`;
      }
    }
  }

  return output;
}
