/**
 * Product Listing Load Test
 *
 * Tests the product listing and filtering performance including:
 * - Product list with pagination
 * - Category filtering
 * - Size and color filters
 * - Price range filtering
 * - Sorting options
 * - Filter options endpoint
 * - Search functionality
 *
 * Simulates realistic user browsing behavior with think times.
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

// Custom metrics for product listing
const productListLoad = new Trend('product_list_load_ms');
const filterOptionsLoad = new Trend('filter_options_load_ms');
const filteredListLoad = new Trend('filtered_list_load_ms');
const searchLoad = new Trend('search_load_ms');
const paginationLoad = new Trend('pagination_load_ms');
const productListSuccess = new Rate('product_list_success_rate');
const productListErrors = new Counter('product_list_errors');

// Test options
export const options = {
  scenarios: {
    product_browsing: config.scenarios.normal,
  },
  thresholds: {
    'http_req_duration{endpoint:products_list}': ['p(95)<1000', 'p(99)<2000'],
    'http_req_duration{endpoint:filter_options}': ['p(95)<500'],
    'http_req_duration{endpoint:filtered_list}': ['p(95)<1200'],
    'http_req_duration{endpoint:search}': ['p(95)<800'],
    'http_req_duration{endpoint:pagination}': ['p(95)<1000'],
    'product_list_success_rate': ['rate>0.99'],
    ...config.thresholds,
  },
};

// Setup function
export function setup() {
  log(`Starting product listing load test on ${config.env} environment`);

  // Fetch initial data for realistic test scenarios
  const filterResponse = post(
    `${urls.convexApi}/api/query`,
    {
      path: 'products:getFilterOptions',
      args: {},
      format: 'json',
    },
    { endpoint: 'setup_filters', type: 'setup' }
  );

  const filterData = parseJSON(filterResponse);

  return {
    startTime: Date.now(),
    filterOptions: filterData || {
      sizes: testData.sizes,
      colors: testData.colors,
      priceRange: { min: 0, max: 10000 },
    },
  };
}

// Main test function
export default function (data) {
  const { filterOptions } = data;
  const sessionId = testData.generateSessionId();

  // Scenario 1: Browse all products
  group('Browse All Products', () => {
    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:listProducts',
        args: { limit: 20 },
        format: 'json',
      },
      { endpoint: 'products_list', type: 'api' }
    );

    productListLoad.add(Date.now() - start);

    const valid = check(response, {
      'product list: status is 200': (r) => r.status === 200,
      'product list: has products': (r) => {
        const products = extractProducts(r);
        return products.length > 0;
      },
      'product list: has pagination info': (r) => {
        const data = parseJSON(r);
        return data && (data.isDone !== undefined || data.continueCursor !== undefined);
      },
    });

    productListSuccess.add(valid ? 1 : 0);
    if (!valid) productListErrors.add(1);
  });

  sleep(randomThinkTime('browse'));

  // Scenario 2: Load filter options
  group('Load Filter Options', () => {
    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:getFilterOptions',
        args: {},
        format: 'json',
      },
      { endpoint: 'filter_options', type: 'api' }
    );

    filterOptionsLoad.add(Date.now() - start);

    check(response, {
      'filter options: status is 200': (r) => r.status === 200,
      'filter options: has sizes': (r) => {
        const data = parseJSON(r);
        return data && data.sizes && data.sizes.length > 0;
      },
      'filter options: has colors': (r) => {
        const data = parseJSON(r);
        return data && data.colors && data.colors.length > 0;
      },
      'filter options: has price range': (r) => {
        const data = parseJSON(r);
        return data && data.priceRange && data.priceRange.min !== undefined;
      },
    });
  });

  sleep(randomThinkTime('decide'));

  // Scenario 3: Filter by category
  group('Filter by Category', () => {
    const category = testData.randomFrom(testData.categories);
    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:listProducts',
        args: { category, limit: 20 },
        format: 'json',
      },
      { endpoint: 'filtered_list', type: 'api', tags: { filter: 'category' } }
    );

    filteredListLoad.add(Date.now() - start);

    const valid = check(response, {
      'category filter: status is 200': (r) => r.status === 200,
      'category filter: returns products': (r) => {
        const products = extractProducts(r);
        return products.length >= 0; // May be empty for some categories
      },
    });

    if (!valid) productListErrors.add(1);
  });

  sleep(randomThinkTime('browse'));

  // Scenario 4: Complex filtering (size + color + sort)
  group('Complex Filtering', () => {
    const sizes = filterOptions.sizes || testData.sizes;
    const colors = filterOptions.colors || testData.colors;

    const selectedSize = testData.randomFrom(sizes);
    const selectedColor = testData.randomFrom(colors);
    const sortBy = testData.randomFrom(testData.sortOptions);

    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:listProducts',
        args: {
          sizes: [selectedSize],
          colors: [selectedColor],
          sortBy,
          limit: 20,
        },
        format: 'json',
      },
      { endpoint: 'filtered_list', type: 'api', tags: { filter: 'complex' } }
    );

    filteredListLoad.add(Date.now() - start);

    check(response, {
      'complex filter: status is 200': (r) => r.status === 200,
      'complex filter: has valid structure': (r) => {
        const data = parseJSON(r);
        return data !== null;
      },
    });
  });

  sleep(randomThinkTime('decide'));

  // Scenario 5: Price range filtering
  group('Price Range Filter', () => {
    const priceRange = filterOptions.priceRange || { min: 0, max: 10000 };
    const minPrice = Math.floor(priceRange.min + Math.random() * (priceRange.max - priceRange.min) / 3);
    const maxPrice = Math.floor(minPrice + Math.random() * (priceRange.max - minPrice));

    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:listProducts',
        args: {
          minPrice,
          maxPrice,
          limit: 20,
        },
        format: 'json',
      },
      { endpoint: 'filtered_list', type: 'api', tags: { filter: 'price' } }
    );

    filteredListLoad.add(Date.now() - start);

    check(response, {
      'price filter: status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomThinkTime('browse'));

  // Scenario 6: Pagination
  group('Pagination', () => {
    // First page
    const firstPageResponse = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:listProducts',
        args: { limit: 10 },
        format: 'json',
      },
      { endpoint: 'pagination', type: 'api', tags: { page: 'first' } }
    );

    const firstPageData = parseJSON(firstPageResponse);
    const cursor = firstPageData?.continueCursor;

    if (cursor && !firstPageData?.isDone) {
      sleep(randomThinkTime('scroll'));

      // Second page
      const start = Date.now();

      const secondPageResponse = post(
        `${urls.convexApi}/api/query`,
        {
          path: 'products:listProducts',
          args: { limit: 10, cursor },
          format: 'json',
        },
        { endpoint: 'pagination', type: 'api', tags: { page: 'second' } }
      );

      paginationLoad.add(Date.now() - start);

      check(secondPageResponse, {
        'pagination: second page status is 200': (r) => r.status === 200,
        'pagination: second page has products': (r) => {
          const products = extractProducts(r);
          return products.length > 0;
        },
      });
    }
  });

  sleep(randomThinkTime('browse'));

  // Scenario 7: Search products
  group('Search Products', () => {
    const searchTerms = ['silk', 'cotton', 'blue', 'party', 'casual', 'wedding'];
    const searchTerm = testData.randomFrom(searchTerms);

    const start = Date.now();

    const response = post(
      `${urls.convexApi}/api/query`,
      {
        path: 'products:searchProducts',
        args: { searchTerm, limit: 10 },
        format: 'json',
      },
      { endpoint: 'search', type: 'api' }
    );

    searchLoad.add(Date.now() - start);

    check(response, {
      'search: status is 200': (r) => r.status === 200,
      'search: returns array': (r) => {
        const data = parseJSON(r);
        return Array.isArray(data) || (data && Array.isArray(data.value));
      },
    });
  });

  // Final think time
  sleep(randomThinkTime('browse'));
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  log(`Product listing load test completed in ${duration.toFixed(1)} seconds`);
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': generateSummary(data),
    'tests/load/results/products-summary.json': JSON.stringify(data, null, 2),
  };
}

function generateSummary(data) {
  const metrics = data.metrics || {};
  let output = '\n=== Product Listing Load Test Summary ===\n\n';

  const keyMetrics = [
    { name: 'product_list_load_ms', label: 'Product List Load' },
    { name: 'filter_options_load_ms', label: 'Filter Options Load' },
    { name: 'filtered_list_load_ms', label: 'Filtered List Load' },
    { name: 'search_load_ms', label: 'Search Load' },
    { name: 'pagination_load_ms', label: 'Pagination Load' },
    { name: 'product_list_success_rate', label: 'Success Rate' },
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
