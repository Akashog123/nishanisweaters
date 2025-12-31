# Load Testing Infrastructure

Comprehensive load testing infrastructure for the Blockhaus e-commerce application using k6.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Suites](#test-suites)
- [Test Scenarios](#test-scenarios)
- [Performance Thresholds](#performance-thresholds)
- [Configuration](#configuration)
- [CI/CD Integration](#cicd-integration)
- [Analyzing Results](#analyzing-results)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This load testing infrastructure is designed to validate the performance of the React + Convex e-commerce application under various load conditions.

### Technology Stack

- **k6**: Modern load testing tool with JavaScript scripting
- **Convex**: Serverless backend with WebSocket-based real-time data
- **Vercel**: Frontend hosting platform
- **GitHub Actions**: CI/CD automation

### Test Coverage

| User Journey | Test File | Description |
|--------------|-----------|-------------|
| Homepage | `homepage.js` | LCP measurement, featured products, bestsellers |
| Product Listing | `products.js` | Filters, sorting, pagination, search |
| Add to Cart | `cart.js` | Product detail, cart operations, validation |
| Checkout | `checkout.js` | Order preview, pricing, order creation |
| Full Journey | `user-journey.js` | Complete e-commerce flow with realistic behavior |

## Quick Start

### Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6

   # Windows (via Chocolatey)
   choco install k6

   # Linux (Debian/Ubuntu)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
     --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
     sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```

2. Configure environment variables:
   ```bash
   # Create .env.local file
   cp tests/load/.env.example tests/load/.env.local

   # Edit with your staging URLs
   STAGING_FRONTEND_URL=https://staging.your-app.vercel.app
   STAGING_CONVEX_API=https://staging-your-app.convex.cloud
   STAGING_CONVEX_URL=https://staging-your-app.convex.site
   ```

### Running Tests

```bash
# Smoke test (quick validation)
k6 run tests/load/scripts/homepage.js --vus 3 --duration 30s

# Normal load test
k6 run tests/load/scripts/homepage.js

# With custom scenario
k6 run tests/load/scripts/homepage.js -e SCENARIO=peak

# All tests sequentially
npm run test:load

# Specific test with output
k6 run tests/load/scripts/cart.js --out json=results.json
```

## Test Suites

### Homepage Load Test (`homepage.js`)

Tests the homepage performance including:
- Initial HTML document load (LCP proxy)
- Featured products API call
- Bestseller products API call
- New arrivals API call

**Key Metrics:**
- `homepage_lcp_ms`: Largest Contentful Paint proxy
- `homepage_ttfb_ms`: Time to First Byte
- `homepage_success_rate`: Overall success rate

```bash
k6 run tests/load/scripts/homepage.js
```

### Product Listing Test (`products.js`)

Tests product browsing and filtering:
- Browse all products
- Category filtering
- Size and color filters
- Price range filtering
- Sorting options
- Pagination
- Search functionality

**Key Metrics:**
- `product_list_load_ms`: Product list load time
- `filter_options_load_ms`: Filter options load time
- `search_load_ms`: Search response time

```bash
k6 run tests/load/scripts/products.js
```

### Cart Flow Test (`cart.js`)

Tests cart operations:
- View product detail
- Add item to cart
- Get cart contents
- Update cart item quantity
- Remove cart item
- Cart validation

**Key Metrics:**
- `add_to_cart_load_ms`: Add to cart response time
- `get_cart_load_ms`: Get cart response time
- `add_to_cart_success_rate`: Cart operation success rate

```bash
k6 run tests/load/scripts/cart.js
```

### Checkout Flow Test (`checkout.js`)

Tests the checkout process:
- Order preview (pricing calculation)
- Promo code validation
- Address validation simulation
- Order creation (without actual payment)

**Note:** Does not trigger actual Razorpay payments.

**Key Metrics:**
- `order_preview_load_ms`: Order preview response time
- `order_create_load_ms`: Order creation response time
- `checkout_success_rate`: Checkout success rate

```bash
k6 run tests/load/scripts/checkout.js
```

### Full User Journey Test (`user-journey.js`)

Simulates complete e-commerce user journeys with realistic behavior patterns:
1. Land on homepage
2. Browse products (with search or category)
3. View product details
4. Add items to cart
5. Proceed to checkout

**Behavior Simulation:**
- 15% bounce rate after homepage
- 60% view product details
- 40% add to cart
- 50% proceed to checkout
- 30% complete checkout

**Key Metrics:**
- `journey_duration_ms`: Full journey time
- `conversion_rate`: Users completing purchase
- `cart_abandonment_rate`: Cart abandonment percentage

```bash
k6 run tests/load/scripts/user-journey.js
```

## Test Scenarios

### Smoke Test
Quick validation that everything works.
```bash
k6 run script.js --vus 3 --duration 30s
```

### Normal Load (50 VUs)
Simulates typical traffic patterns.
```
Duration: ~19 minutes
VUs: Ramps from 0 -> 10 -> 50 -> 50 -> 0
```

### Peak Load (200 VUs)
Simulates sale events or marketing campaigns.
```
Duration: ~20 minutes
VUs: Ramps from 0 -> 50 -> 200 -> 200 -> 50 -> 0
```

### Stress Test (500 VUs)
Finds breaking points and maximum capacity.
```
Duration: ~20 minutes
VUs: Ramps from 0 -> 100 -> 200 -> 300 -> 400 -> 500 -> 250 -> 0
```

### Spike Test
Tests sudden traffic surges.
```
Duration: ~7 minutes
VUs: 50 -> spike to 300 -> return to 50
```

### Soak Test
Tests for memory leaks over extended periods.
```
Duration: 60 minutes
VUs: Constant 50
```

## Performance Thresholds

### Response Time SLOs

| Metric | P50 | P90 | P95 | P99 | Max |
|--------|-----|-----|-----|-----|-----|
| HTTP Request Duration | <500ms | <1000ms | <1500ms | <2000ms | <5000ms |

### Endpoint-Specific Thresholds

| Endpoint | P95 Target |
|----------|------------|
| Homepage | <800ms |
| Product List | <1000ms |
| Product Detail | <600ms |
| Add to Cart | <500ms |
| Checkout | <1500ms |
| Health Check | <100ms |

### Error Rate

- **Target:** <1% error rate
- **Critical:** >2% triggers alert

### Throughput

- **Minimum:** 10 requests/second

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TEST_ENV` | Environment: `local`, `staging`, `production` | Yes |
| `STAGING_FRONTEND_URL` | Staging frontend URL | Yes (for staging) |
| `STAGING_CONVEX_API` | Staging Convex API URL | Yes (for staging) |
| `STAGING_CONVEX_URL` | Staging Convex HTTP URL | Yes (for staging) |
| `PROD_FRONTEND_URL` | Production frontend URL | For production tests |
| `PROD_CONVEX_API` | Production Convex API URL | For production tests |

### Configuration Files

- `configs/staging.js`: Staging environment settings (heavier tests allowed)
- `configs/production.js`: Production settings (conservative)
- `configs/local.js`: Local development settings

## CI/CD Integration

### GitHub Actions Workflow

The performance tests are integrated into `.github/workflows/performance.yml`:

1. **On Pull Request**: Runs smoke tests only
2. **On Push to Main**: Runs full test suite
3. **Scheduled (Daily)**: Runs comprehensive tests
4. **Manual Trigger**: Select test type and scenario

### Manual Trigger Options

From GitHub Actions, you can manually run tests with:
- **Test Type**: all, lighthouse, bundle-size, load-test
- **Load Test Scenario**: smoke, normal, peak, stress
- **Load Test Suite**: all, homepage, products, cart, checkout, user-journey

### Required Secrets

Configure these in GitHub repository settings:

```
STAGING_FRONTEND_URL
STAGING_CONVEX_API
STAGING_CONVEX_URL
PROD_FRONTEND_URL (optional)
PROD_CONVEX_API (optional)
```

## Analyzing Results

### JSON Output

```bash
# Generate JSON output
k6 run tests/load/scripts/homepage.js --out json=results.json

# Generate summary JSON
k6 run tests/load/scripts/homepage.js --summary-export=summary.json
```

### Key Metrics to Monitor

1. **Response Time Percentiles**
   - P50: Median user experience
   - P95: Worst case for most users
   - P99: Edge cases

2. **Error Rates**
   - `http_req_failed`: HTTP errors
   - Custom error counters per endpoint

3. **Throughput**
   - `http_reqs`: Requests per second
   - `iterations`: Completed user journeys

4. **Business Metrics**
   - `conversion_rate`: Completed checkouts
   - `cart_abandonment_rate`: Left at cart
   - `bounce_rate`: Left immediately

### Grafana Cloud Integration (Optional)

```bash
# Stream results to Grafana Cloud
k6 run tests/load/scripts/homepage.js \
  --out cloud \
  -e K6_CLOUD_PROJECT_ID=<project-id> \
  -e K6_CLOUD_TOKEN=<token>
```

## Best Practices

### Before Running Tests

1. **Notify stakeholders** before running peak/stress tests
2. **Verify staging environment** is isolated from production
3. **Check baseline metrics** to compare against
4. **Ensure test data exists** (products, etc.)

### Test Design

1. **Use realistic think times** between actions
2. **Randomize data** to avoid caching effects
3. **Start with smoke tests** before heavy loads
4. **Ramp up gradually** to identify breaking points

### Production Testing

1. **NEVER run stress tests in production**
2. **Only smoke tests** with explicit approval
3. **Monitor production metrics** during tests
4. **Have rollback plan** ready

### After Testing

1. **Clean up test data** (carts, orders)
2. **Document findings** in performance reports
3. **Track trends** over time
4. **Create tickets** for performance issues

## Troubleshooting

### Common Issues

**1. Tests fail immediately**
```bash
# Check if URLs are configured correctly
echo $STAGING_FRONTEND_URL
echo $STAGING_CONVEX_API

# Verify connectivity
curl -I $STAGING_FRONTEND_URL
```

**2. All requests fail with 401**
- Check if authentication is required
- For authenticated tests, set `TEST_USER_TOKEN`

**3. High error rates on cart/checkout**
- Products may not exist in staging
- Run seed script first: `npm run convex:seed`

**4. k6 runs out of memory**
```bash
# Reduce VUs or duration
k6 run script.js --vus 10 --duration 1m
```

**5. Convex rate limiting**
- Reduce request rate
- Add longer think times
- Check Convex dashboard for limits

### Debug Mode

```bash
# Run single iteration with verbose output
k6 run tests/load/scripts/homepage.js \
  --vus 1 \
  --iterations 1 \
  --http-debug=full
```

### Get Help

- [k6 Documentation](https://k6.io/docs/)
- [Convex Documentation](https://docs.convex.dev/)
- [Performance Runbook](../PERFORMANCE_RUNBOOK.md)

## File Structure

```
tests/load/
|-- README.md                 # This file
|-- configs/
|   |-- staging.js            # Staging configuration
|   |-- production.js         # Production configuration
|   |-- local.js              # Local development configuration
|-- lib/
|   |-- config.js             # Shared configuration and utilities
|   |-- helpers.js            # Test helper functions
|-- scripts/
|   |-- homepage.js           # Homepage load test
|   |-- products.js           # Product listing load test
|   |-- cart.js               # Cart flow load test
|   |-- checkout.js           # Checkout flow load test
|   |-- user-journey.js       # Full user journey test
|-- results/                  # Test results (gitignored)
```
