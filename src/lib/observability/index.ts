/**
 * Observability Module
 *
 * Central export for all observability utilities including:
 * - Core Web Vitals tracking
 * - Enhanced Web Vitals with user segments and performance budgets
 * - E-commerce analytics
 * - SLI/SLO definitions
 * - Alerting configuration
 * - Custom performance metrics
 *
 * @example
 * ```typescript
 * import {
 *   initWebVitals,
 *   trackProductEvent,
 *   trackCheckoutStep,
 *   measureAsync,
 *   setUserSegment,
 *   checkSLOCompliance,
 * } from '@/lib/observability';
 *
 * // Set user segment for performance tracking
 * setUserSegment(user.role === 'wholesale' ? 'wholesale' : 'retail');
 *
 * // Track product view
 * trackProductEvent('view', {
 *   productId: '123',
 *   name: 'Wool Sweater',
 *   price: 2999,
 *   category: 'Apparel',
 * });
 *
 * // Track checkout step
 * trackCheckoutStep('CHECKOUT_START', {
 *   cartId: 'cart_123',
 *   itemCount: 3,
 *   totalValue: 8999,
 * });
 *
 * // Measure async operation
 * const result = await measureAsync('api.getProducts', async () => {
 *   return await fetchProducts();
 * });
 *
 * // Check SLO compliance
 * const isCompliant = checkSLOCompliance('PAYMENT_SUCCESS_RATE_SLO', 99.7);
 * ```
 */

// Web Vitals exports
export {
  initWebVitals,
  isWebVitalsInitialized,
  getPerformanceThresholds,
  reportCustomMetric,
  measureAsync,
  startMeasurement,
  PERFORMANCE_THRESHOLDS,
} from './web-vitals';

// E-commerce analytics exports
export {
  // Product events
  trackProductEvent,
  type ProductEventType,
  type ProductData,

  // Checkout funnel
  trackCheckoutStep,
  CHECKOUT_STEPS,
  type CheckoutStep,
  type CartData,

  // Payment tracking
  trackPaymentInit,
  trackPaymentSuccess,
  trackPaymentFailure,
  type PaymentData,

  // Promo codes
  trackPromoCode,
  type PromoCodeData,

  // Cart abandonment
  trackCartAbandonmentRisk,
  resetCartAbandonmentTracking,
  clearCartAbandonmentTracking,

  // Search and filters
  trackSearch,
  trackFilterUsage,
} from './ecommerce-analytics';

// SLI/SLO definitions exports
export {
  // SLI definitions
  SLI_DEFINITIONS,
  type SLIDefinition,

  // SLO definitions
  SLO_DEFINITIONS,
  type SLODefinition,

  // Error budget
  calculateErrorBudgetStatus,
  type ErrorBudgetStatus,

  // Compliance helpers
  checkSLOCompliance,
  getSLOsByPriority,
  getSLOsByOwner,
  getSLIForSLO,

  // User segment thresholds
  USER_SEGMENT_MODIFIERS,
  getSegmentAdjustedTarget,
} from './sli-slo-definitions';

// Enhanced Web Vitals exports
export {
  // User segment context
  setUserSegment,
  getUserSegment,
  type UserSegment,

  // Page-specific tracking
  PAGE_CONFIGS,
  getPageConfig,
  getCurrentPageConfig,
  type PageConfig,

  // Performance budgets
  PERFORMANCE_BUDGETS,
  getEffectiveBudget,
  checkBudgetViolation,
  reportBudgetViolation,
  type PerformanceBudget,
  type BudgetViolation,

  // Enhanced reporting
  getEnhancedContext,
  reportEnhancedMetric,
  type EnhancedMetricContext,

  // Session tracking
  recordSessionMetric,
  recordPageView,
  getPerformanceSummary,
  initSessionSummaryReporting,
  type PerformanceSummary,
} from './enhanced-web-vitals';

// Alerting configuration exports
export {
  // Alert rules
  ALL_ALERT_RULES,
  PAYMENT_ALERTS,
  PERFORMANCE_ALERTS,
  ERROR_ALERTS,
  AVAILABILITY_ALERTS,
  BUSINESS_ALERTS,
  type AlertRule,
  type AlertSeverity,

  // Notification channels
  NOTIFICATION_CHANNELS,
  type NotificationChannel,

  // Escalation policies
  ESCALATION_POLICIES,
  type EscalationPolicy,

  // Helper functions
  getAlertsBySeverity,
  getAlertsByCategory,
  getAlertsByTeam,
  getEscalationPolicyForAlert,
  generateSentryAlertConfig,
} from './alerting-config';

/**
 * Quick reference for common tracking patterns:
 *
 * 1. Product View:
 *    trackProductEvent('view', { productId, name, price, category });
 *
 * 2. Add to Cart:
 *    trackProductEvent('add_to_cart', { productId, name, price, quantity });
 *
 * 3. Checkout Steps:
 *    trackCheckoutStep('CART_VIEW', { itemCount, totalValue });
 *    trackCheckoutStep('CHECKOUT_START', { itemCount, totalValue });
 *    trackCheckoutStep('SHIPPING_INFO', { itemCount, totalValue });
 *    trackCheckoutStep('PAYMENT_METHOD', { itemCount, totalValue });
 *    trackCheckoutStep('PAYMENT_INIT', { itemCount, totalValue });
 *    trackCheckoutStep('PAYMENT_SUCCESS', { itemCount, totalValue });
 *    trackCheckoutStep('ORDER_CONFIRMED', { itemCount, totalValue });
 *
 * 4. Payment Flow:
 *    trackPaymentInit({ orderId, amount, currency, paymentMethod, gateway });
 *    trackPaymentSuccess({ orderId, amount, currency, paymentMethod }, transactionId);
 *    trackPaymentFailure({ orderId, amount, currency, paymentMethod }, errorCode, errorMessage);
 *
 * 5. Promo Codes:
 *    trackPromoCode({ code, discountType, discountValue, applied, error });
 *
 * 6. Cart Abandonment:
 *    trackCartAbandonmentRisk({ itemCount, totalValue }, idleThresholdMs);
 *    resetCartAbandonmentTracking(); // On user activity
 *    clearCartAbandonmentTracking(); // On page leave
 *
 * 7. Custom Performance:
 *    const measurement = startMeasurement('operation.name');
 *    // ... do work ...
 *    measurement.end();
 *
 *    // Or for async:
 *    const result = await measureAsync('operation.name', async () => {
 *      return await someAsyncWork();
 *    });
 */
