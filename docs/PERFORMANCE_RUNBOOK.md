# Performance Optimization Runbook

This runbook documents the performance optimization strategies implemented in the Nidhi Sweaters e-commerce application, along with monitoring procedures and troubleshooting guides.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Performance SLIs/SLOs](#performance-slisslos)
3. [Optimization Summary](#optimization-summary)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Performance Testing](#performance-testing)
7. [Maintenance Procedures](#maintenance-procedures)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Performance Considerations |
|-------|------------|---------------------------|
| Frontend | React 18 + Vite | Code splitting, lazy loading, memoization |
| Backend | Convex (serverless) | Indexed queries, batch operations, real-time subscriptions |
| Payment | Razorpay | Circuit breaker, timeout protection |
| CDN | Vercel Edge | Asset caching, compression, geographic distribution |
| Observability | Sentry + Web Vitals | Error tracking, RUM, distributed tracing |

### Critical User Journeys

1. **Homepage → Product Browse** (LCP target: <2.5s)
2. **Product Detail → Add to Cart** (INP target: <200ms)
3. **Cart → Checkout → Payment** (Revenue-critical, 99.9% availability SLO)
4. **Order Confirmation** (Success tracking, email delivery)

---

## Performance SLIs/SLOs

### Defined SLOs (from `src/lib/observability/sli-slo-definitions.ts`)

| Priority | SLO | Target | Window | Error Budget |
|----------|-----|--------|--------|--------------|
| P1 | Checkout Availability | 99.9% | 28d | 43.2 min/month |
| P1 | Payment Success Rate | 99.5% | 28d | 3.6 hr/month |
| P1 | Payment Gateway Availability | 99.95% | 28d | 21.6 min/month |
| P2 | API Availability | 99.9% | 28d | 43.2 min/month |
| P2 | LCP Performance | ≤2500ms | 7d | - |
| P2 | API Latency p95 | ≤500ms | 7d | - |
| P3 | INP Performance | ≤200ms | 7d | - |
| P3 | CLS Performance | ≤0.1 | 7d | - |
| P3 | Error Rate | ≤1% | 7d | - |

### Segment-Specific Adjustments

Wholesale users have relaxed thresholds (1.2x multiplier) due to:
- Larger order sizes requiring more processing
- Complex pricing calculations
- Higher acceptable latency for bulk operations

---

## Optimization Summary

### Frontend Optimizations

#### 1. Bundle Chunking Strategy (`vite.config.ts`)

```
Vendor chunks for optimal caching:
├── vendor-react (React core) - loaded on every page
├── vendor-radix (UI components) - loaded on every page
├── vendor-clerk (Auth) - loaded on every page
├── vendor-convex (Backend client) - loaded on every page
├── vendor-charts (Admin only) - lazy loaded
├── vendor-forms (Form pages) - lazy loaded
├── vendor-sentry (Error tracking) - deferred loading
├── vendor-carousel (Product pages) - lazy loaded
├── vendor-scroll (Smooth scroll) - lazy loaded
└── vendor-toast (Notifications) - lazy loaded
```

#### 2. Route Lazy Loading (`src/config/routes.ts`)

- **Eager loaded**: Homepage, Shop, ProductDetail, Search (core UX)
- **Lazy loaded**: Cart, Checkout, Orders, Admin, Contact, About

#### 3. Route Prefetching (`src/components/Header.tsx`)

Navigation links prefetch their target pages on hover:
```typescript
onMouseEnter={() => prefetchRoute(link.href)}
```

#### 4. Component Memoization

| Component | Optimization | Impact |
|-----------|--------------|--------|
| CartBadge | Extracted from Header | Prevents full header re-render on cart changes |
| ProductCard | React.memo() | Prevents re-renders in product lists |
| ProductGallery | React.memo() | Prevents re-renders on parent changes |
| Header | memo() | Prevents unnecessary re-renders |

#### 5. Image Optimization

- **Hero images**: `<picture>` with AVIF/WebP/JPG, responsive srcset
- **Product cards**: `loading="lazy"`, explicit dimensions, CSS aspect-ratio
- **Gallery images**: Explicit width/height attributes to prevent CLS

### Backend Optimizations

#### 1. Indexed Queries (`convex/analytics.ts`)

Changed from `.filter()` to `.withIndex()` for:
- `getTopSellingProducts` - uses `by_payment_created` compound index
- `getOrderTypeBreakdown` - uses `by_created_at` index

#### 2. Timeout Protection (`convex/lib/circuitBreaker.ts`)

Added `withTimeout()` wrapper for external API calls:
```typescript
await withTimeout(
  razorpay.orders.create({...}),
  PAYMENT_TIMEOUT_MS, // 15 seconds
  "Razorpay order creation"
);
```

#### 3. Circuit Breaker Pattern

Razorpay calls protected by circuit breaker:
- Opens after 5 consecutive failures
- 30-second reset timeout
- Closes after 2 successes in half-open state

### Observability Instrumentation

#### Checkout Funnel Tracking (`src/pages/Checkout.tsx`)

```typescript
// Tracked events:
trackCheckoutStep("CHECKOUT_START", { itemCount, totalValue });
trackCheckoutStep("CART_VIEW", { itemCount, totalValue });
trackCheckoutStep("SHIPPING_INFO", { itemCount, totalValue });
trackCheckoutStep("PAYMENT_METHOD", { itemCount, totalValue });
trackPaymentInit({ orderId, amount, currency, paymentMethod, gateway });
trackPaymentSuccess({ ... }, transactionId);
trackPaymentFailure({ ... }, errorCode, errorMessage);
trackCheckoutStep("ORDER_CONFIRMED", { itemCount, totalValue });
```

#### User Segment Tracking (`src/hooks/useAuthObservability.ts`)

Sets segment context for all metrics:
- `anonymous` - Not signed in
- `retail` - Regular customer
- `wholesale` - B2B customer

---

## Monitoring & Alerting

### Grafana Dashboards

Located at `src/lib/observability/dashboards/grafana-overview.json`

Panels:
1. **SLO Compliance** - Real-time SLO status
2. **Checkout Funnel** - Conversion at each step
3. **Core Web Vitals** - LCP, CLS, INP trends
4. **Payment Success Rate** - Gateway health
5. **Error Rate** - By category and severity

### Alert Configuration (`src/lib/observability/alerting-config.ts`)

| Category | Example Alerts |
|----------|----------------|
| Payment | Payment success rate < 99%, Gateway errors > 5/min |
| Performance | LCP > 3s for 5+ min, INP > 300ms |
| Errors | Error rate > 5%, New error types detected |
| Availability | Checkout unavailable, API latency p95 > 1s |
| Business | Zero orders for 30+ min, Cart abandonment > 80% |

### Escalation Policy (P1 Critical)

1. **5 min**: Alert to #eng-critical Slack + PagerDuty
2. **15 min**: Escalate to on-call engineer
3. **30 min**: Escalate to engineering manager
4. **60 min**: Escalate to CTO

---

## Troubleshooting Guide

### High LCP (>2.5s)

1. **Check network waterfall** in browser DevTools
2. **Verify CDN cache hit rate** in Vercel dashboard
3. **Check for blocking resources**:
   - Sync scripts in `<head>`
   - Render-blocking CSS
   - Large unoptimized images
4. **Review bundle sizes**: `npm run build` shows chunk sizes

### High CLS (>0.1)

1. **Check for images without dimensions**
2. **Verify dynamic content has placeholder space**
3. **Check for font loading flashes**
4. **Review skeleton loaders for proper sizing**

### Payment Failures

1. **Check circuit breaker state** in Convex logs
2. **Review Razorpay dashboard** for gateway issues
3. **Check timeout errors** - may need to increase `PAYMENT_TIMEOUT_MS`
4. **Verify webhook signature validation**

### Slow Database Queries

1. **Check query is using index**:
   ```typescript
   // Good
   .withIndex("by_payment_created", q => q.eq("paymentStatus", "paid"))

   // Bad - full table scan
   .filter(q => q.eq(q.field("paymentStatus"), "paid"))
   ```
2. **Review compound index order** - matches query pattern
3. **Check for N+1 patterns** - use batch fetching

---

## Performance Testing

### Lighthouse CI

Configuration: `lighthouserc.js`

Run locally:
```bash
npm run build
npx lhci autorun
```

Thresholds:
- Performance: ≥80
- Accessibility: ≥90
- Best Practices: ≥90
- SEO: ≥90

### Load Testing (K6)

Run load tests:
```bash
k6 run tests/load/k6-load-test.js
```

Scenarios:
- **Normal**: Baseline traffic
- **Peak**: 3x normal load
- **Stress**: Find breaking point

### Performance Budgets (`performance-budget.json`)

| Resource | Budget |
|----------|--------|
| JavaScript | 1000 KB |
| CSS | 200 KB |
| Images | 500 KB |
| Fonts | 200 KB |
| Total | 2000 KB |

Check budgets:
```bash
npm run build
node scripts/check-bundle-size.js
```

---

## Maintenance Procedures

### Weekly Tasks

1. **Review error budget consumption** in Grafana
2. **Check Core Web Vitals trends** in Sentry
3. **Review slow queries** in Convex dashboard
4. **Check bundle size trends** in CI artifacts

### Monthly Tasks

1. **Run full load test** and compare to baseline
2. **Review and update SLO targets** based on business needs
3. **Audit new dependencies** for bundle size impact
4. **Update performance budgets** if needed

### Quarterly Tasks

1. **Full performance audit** with Lighthouse
2. **Review observability coverage** gaps
3. **Update runbook** with new learnings
4. **Capacity planning** based on growth

---

## Quick Reference Commands

```bash
# Build and analyze bundle
npm run build

# Check bundle sizes against budget
node scripts/check-bundle-size.js

# Run Lighthouse CI locally
npx lhci autorun

# Run load tests
k6 run tests/load/k6-load-test.js

# Run E2E performance tests
npx playwright test e2e/performance.spec.ts

# Check TypeScript for performance anti-patterns
npx tsc --noEmit
```

---

## Files Modified in This Optimization

| File | Changes |
|------|---------|
| `lighthouserc.js` | Created - CI performance enforcement |
| `convex/analytics.ts` | Fixed to use indexed queries |
| `convex/payments.ts` | Added timeout wrapper |
| `convex/settings.ts` | Batch fetching for settings queries |
| `convex/lib/circuitBreaker.ts` | Added timeout utilities |
| `src/App.tsx` | Integrated useAuthObservability hook |
| `src/pages/Checkout.tsx` | Added funnel instrumentation |
| `src/pages/Shop.tsx` | Memoization, moved functions outside component |
| `src/components/Header.tsx` | Extracted CartBadge, added prefetching |
| `src/components/CartBadge.tsx` | Created - memoized cart count |
| `src/components/ProductGallery.tsx` | Added image dimensions, memoization |
| `src/hooks/useAuthObservability.ts` | Created - user segment tracking |
| `vite.config.ts` | Added carousel, scroll, toast chunks |

---

*Last updated: 2024*
*Maintained by: Engineering Team*
