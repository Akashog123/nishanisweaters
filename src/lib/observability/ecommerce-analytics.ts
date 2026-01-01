/**
 * E-Commerce Analytics Module
 *
 * Tracks e-commerce specific events and funnel metrics for conversion optimization.
 * Reports to Sentry with proper categorization for monitoring and alerting.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/performance/
 */

import * as Sentry from '@sentry/react';
import { logger } from '../logger';
import { metrics } from './sentry-metrics-compat';

/**
 * Checkout funnel step definitions
 */
export const CHECKOUT_STEPS = {
  CART_VIEW: { order: 1, name: 'cart_view', label: 'Cart Viewed' },
  CHECKOUT_START: { order: 2, name: 'checkout_start', label: 'Checkout Started' },
  SHIPPING_INFO: { order: 3, name: 'shipping_info', label: 'Shipping Info Entered' },
  PAYMENT_METHOD: { order: 4, name: 'payment_method', label: 'Payment Method Selected' },
  PAYMENT_INIT: { order: 5, name: 'payment_init', label: 'Payment Initiated' },
  PAYMENT_SUCCESS: { order: 6, name: 'payment_success', label: 'Payment Successful' },
  ORDER_CONFIRMED: { order: 7, name: 'order_confirmed', label: 'Order Confirmed' },
} as const;

export type CheckoutStep = keyof typeof CHECKOUT_STEPS;

/**
 * Product event types
 */
export type ProductEventType =
  | 'view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'quick_view'
  | 'share';

/**
 * Product data for tracking
 */
export interface ProductData {
  productId: string;
  name: string;
  category?: string;
  price: number;
  quantity?: number;
  variant?: string;
  brand?: string;
}

/**
 * Cart data for tracking
 */
export interface CartData {
  cartId?: string;
  itemCount: number;
  totalValue: number;
  currency?: string;
}

/**
 * Payment event data
 */
export interface PaymentData {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gateway?: string;
}

/**
 * Promo code event data
 */
export interface PromoCodeData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applied: boolean;
  error?: string;
}

/**
 * Session storage key for funnel tracking
 */
const FUNNEL_SESSION_KEY = 'ecommerce_funnel_session';

/**
 * Get or create a funnel session
 */
function getFunnelSession(): { sessionId: string; steps: string[]; startTime: number } {
  try {
    const stored = sessionStorage.getItem(FUNNEL_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Session storage not available or corrupted
  }

  const newSession = {
    sessionId: `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    steps: [] as string[],
    startTime: Date.now(),
  };

  try {
    sessionStorage.setItem(FUNNEL_SESSION_KEY, JSON.stringify(newSession));
  } catch {
    // Session storage not available
  }

  return newSession;
}

/**
 * Update funnel session with new step
 */
function updateFunnelSession(step: string): void {
  try {
    const session = getFunnelSession();
    if (!session.steps.includes(step)) {
      session.steps.push(step);
      sessionStorage.setItem(FUNNEL_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Session storage not available
  }
}

/**
 * Calculate drop-off rate for a funnel step
 */
function calculateDropOffRate(currentStep: CheckoutStep): number {
  const session = getFunnelSession();
  const currentOrder = CHECKOUT_STEPS[currentStep].order;
  const previousStep = Object.entries(CHECKOUT_STEPS).find(
    ([, value]) => value.order === currentOrder - 1
  );

  if (!previousStep) return 0;

  const previousStepName = previousStep[1].name;
  const hasPreviousStep = session.steps.includes(previousStepName);

  // If user didn't go through previous step, this is a drop-off
  return hasPreviousStep ? 0 : 1;
}

/**
 * Get common tags for e-commerce events
 */
function getCommonTags(): Record<string, string> {
  return {
    page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
    referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'unknown',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Track a product event
 */
export function trackProductEvent(
  eventType: ProductEventType,
  product: ProductData,
  additionalData?: Record<string, unknown>
): void {
  const metricName = `ecommerce.product.${eventType}`;

  try {
    // Increment event counter
    metrics.increment(metricName, 1, {
      tags: {
        product_id: product.productId,
        category: product.category || 'uncategorized',
        ...getCommonTags(),
      },
    });

    // Track product value for revenue attribution
    if (eventType === 'add_to_cart' || eventType === 'view') {
      metrics.distribution(`ecommerce.product.value.${eventType}`, product.price, {
        unit: 'none', // Currency value
        tags: {
          product_id: product.productId,
          category: product.category || 'uncategorized',
        },
      });
    }

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'ecommerce',
      message: `Product ${eventType}: ${product.name}`,
      level: 'info',
      data: {
        productId: product.productId,
        price: product.price,
        quantity: product.quantity,
        ...additionalData,
      },
    });

    logger.debug(`Product event tracked: ${eventType}`, {
      productId: product.productId,
      name: product.name,
    });
  } catch (error) {
    logger.error('Failed to track product event', error, { eventType, productId: product.productId });
  }
}

/**
 * Track a checkout funnel step
 */
export function trackCheckoutStep(
  step: CheckoutStep,
  cartData?: CartData,
  additionalData?: Record<string, unknown>
): void {
  const stepInfo = CHECKOUT_STEPS[step];

  try {
    // Update session
    updateFunnelSession(stepInfo.name);

    // Increment step counter
    metrics.increment(`ecommerce.funnel.${stepInfo.name}`, 1, {
      tags: {
        step_order: stepInfo.order.toString(),
        ...getCommonTags(),
      },
    });

    // Track drop-off rate
    const dropOffRate = calculateDropOffRate(step);
    if (dropOffRate > 0) {
      metrics.increment('ecommerce.funnel.drop_off', 1, {
        tags: {
          from_step: stepInfo.name,
          step_order: stepInfo.order.toString(),
        },
      });
    }

    // Track cart value at this step
    if (cartData) {
      metrics.distribution(`ecommerce.funnel.cart_value.${stepInfo.name}`, cartData.totalValue, {
        unit: 'none',
        tags: {
          item_count: cartData.itemCount.toString(),
        },
      });
    }

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: 'ecommerce.funnel',
      message: stepInfo.label,
      level: 'info',
      data: {
        step: stepInfo.name,
        order: stepInfo.order,
        cartValue: cartData?.totalValue,
        itemCount: cartData?.itemCount,
        ...additionalData,
      },
    });

    logger.info(`Checkout step tracked: ${stepInfo.label}`, {
      step: stepInfo.name,
      cartValue: cartData?.totalValue,
    });
  } catch (error) {
    logger.error('Failed to track checkout step', error, { step });
  }
}

/**
 * Track payment initiation
 */
export function trackPaymentInit(payment: PaymentData): void {
  try {
    metrics.increment('ecommerce.payment.initiated', 1, {
      tags: {
        payment_method: payment.paymentMethod,
        gateway: payment.gateway || 'unknown',
        ...getCommonTags(),
      },
    });

    metrics.distribution('ecommerce.payment.amount.initiated', payment.amount, {
      unit: 'none',
      tags: {
        currency: payment.currency,
        payment_method: payment.paymentMethod,
      },
    });

    // Start a Sentry transaction for payment tracking
    Sentry.startSpan(
      {
        name: 'payment.processing',
        op: 'payment',
        attributes: {
          'payment.order_id': payment.orderId,
          'payment.method': payment.paymentMethod,
          'payment.amount': payment.amount,
        },
      },
      () => {
        // Span will be ended when payment completes
      }
    );

    Sentry.addBreadcrumb({
      category: 'ecommerce.payment',
      message: 'Payment initiated',
      level: 'info',
      data: {
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.paymentMethod,
      },
    });

    logger.info('Payment initiated', {
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.paymentMethod,
    });
  } catch (error) {
    logger.error('Failed to track payment initiation', error);
  }
}

/**
 * Track payment success
 */
export function trackPaymentSuccess(payment: PaymentData, transactionId?: string): void {
  try {
    metrics.increment('ecommerce.payment.success', 1, {
      tags: {
        payment_method: payment.paymentMethod,
        gateway: payment.gateway || 'unknown',
        ...getCommonTags(),
      },
    });

    metrics.distribution('ecommerce.payment.amount.success', payment.amount, {
      unit: 'none',
      tags: {
        currency: payment.currency,
        payment_method: payment.paymentMethod,
      },
    });

    // Track revenue
    metrics.distribution('ecommerce.revenue', payment.amount, {
      unit: 'none',
      tags: {
        currency: payment.currency,
        payment_method: payment.paymentMethod,
      },
    });

    Sentry.addBreadcrumb({
      category: 'ecommerce.payment',
      message: 'Payment successful',
      level: 'info',
      data: {
        orderId: payment.orderId,
        amount: payment.amount,
        transactionId,
      },
    });

    // Clear funnel session on successful payment
    try {
      sessionStorage.removeItem(FUNNEL_SESSION_KEY);
    } catch {
      // Session storage not available
    }

    logger.info('Payment successful', {
      orderId: payment.orderId,
      amount: payment.amount,
      transactionId,
    });
  } catch (error) {
    logger.error('Failed to track payment success', error);
  }
}

/**
 * Track payment failure
 */
export function trackPaymentFailure(
  payment: PaymentData,
  errorCode: string,
  errorMessage: string
): void {
  try {
    metrics.increment('ecommerce.payment.failure', 1, {
      tags: {
        payment_method: payment.paymentMethod,
        gateway: payment.gateway || 'unknown',
        error_code: errorCode,
        ...getCommonTags(),
      },
    });

    metrics.distribution('ecommerce.payment.amount.failed', payment.amount, {
      unit: 'none',
      tags: {
        currency: payment.currency,
        error_code: errorCode,
      },
    });

    // Log as warning for alerting
    Sentry.captureMessage(`Payment failed: ${errorMessage}`, {
      level: 'warning',
      tags: {
        category: 'payment_failure',
        error_code: errorCode,
      },
      extra: {
        orderId: payment.orderId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
      },
    });

    Sentry.addBreadcrumb({
      category: 'ecommerce.payment',
      message: 'Payment failed',
      level: 'error',
      data: {
        orderId: payment.orderId,
        errorCode,
        errorMessage,
      },
    });

    logger.warn('Payment failed', {
      orderId: payment.orderId,
      errorCode,
      errorMessage,
    });
  } catch (error) {
    logger.error('Failed to track payment failure', error);
  }
}

/**
 * Track promo code usage
 */
export function trackPromoCode(promoData: PromoCodeData): void {
  try {
    const status = promoData.applied ? 'applied' : 'failed';

    metrics.increment(`ecommerce.promo_code.${status}`, 1, {
      tags: {
        code: promoData.code.toUpperCase(),
        discount_type: promoData.discountType,
        ...getCommonTags(),
      },
    });

    if (promoData.applied) {
      metrics.distribution('ecommerce.promo_code.discount_value', promoData.discountValue, {
        unit: 'none',
        tags: {
          discount_type: promoData.discountType,
          code: promoData.code.toUpperCase(),
        },
      });
    }

    Sentry.addBreadcrumb({
      category: 'ecommerce.promo',
      message: `Promo code ${status}: ${promoData.code}`,
      level: promoData.applied ? 'info' : 'warning',
      data: {
        code: promoData.code,
        discountType: promoData.discountType,
        discountValue: promoData.discountValue,
        error: promoData.error,
      },
    });

    logger.debug(`Promo code ${status}`, {
      code: promoData.code,
      discountValue: promoData.discountValue,
    });
  } catch (error) {
    logger.error('Failed to track promo code', error);
  }
}

/**
 * Cart abandonment tracking state
 */
let cartAbandonmentTimer: ReturnType<typeof setTimeout> | null = null;
let lastCartActivity: number = 0;

/**
 * Track cart abandonment risk based on idle time
 *
 * Call this when user is on cart/checkout pages.
 * Triggers warning after specified idle time.
 *
 * @param cartData - Current cart data
 * @param idleThresholdMs - Idle time threshold in ms (default: 5 minutes)
 */
export function trackCartAbandonmentRisk(
  cartData: CartData,
  idleThresholdMs: number = 5 * 60 * 1000
): void {
  lastCartActivity = Date.now();

  // Clear existing timer
  if (cartAbandonmentTimer) {
    clearTimeout(cartAbandonmentTimer);
  }

  // Set new timer
  cartAbandonmentTimer = setTimeout(() => {
    const idleTime = Date.now() - lastCartActivity;

    metrics.increment('ecommerce.cart.abandonment_risk', 1, {
      tags: {
        idle_time_bucket: getIdleTimeBucket(idleTime),
        item_count: cartData.itemCount.toString(),
        value_bucket: getValueBucket(cartData.totalValue),
        ...getCommonTags(),
      },
    });

    Sentry.addBreadcrumb({
      category: 'ecommerce.cart',
      message: 'Cart abandonment risk detected',
      level: 'warning',
      data: {
        idleTimeMs: idleTime,
        cartValue: cartData.totalValue,
        itemCount: cartData.itemCount,
      },
    });

    logger.warn('Cart abandonment risk detected', {
      idleTimeMs: idleTime,
      cartValue: cartData.totalValue,
    });
  }, idleThresholdMs);
}

/**
 * Reset cart abandonment tracking (call on cart activity)
 */
export function resetCartAbandonmentTracking(): void {
  lastCartActivity = Date.now();
}

/**
 * Clear cart abandonment tracking (call when leaving cart page)
 */
export function clearCartAbandonmentTracking(): void {
  if (cartAbandonmentTimer) {
    clearTimeout(cartAbandonmentTimer);
    cartAbandonmentTimer = null;
  }
}

/**
 * Get idle time bucket for aggregation
 */
function getIdleTimeBucket(idleTimeMs: number): string {
  const minutes = idleTimeMs / (60 * 1000);
  if (minutes < 5) return '0-5min';
  if (minutes < 10) return '5-10min';
  if (minutes < 15) return '10-15min';
  return '15+min';
}

/**
 * Get cart value bucket for aggregation
 */
function getValueBucket(value: number): string {
  if (value < 1000) return 'low';
  if (value < 5000) return 'medium';
  if (value < 10000) return 'high';
  return 'very-high';
}

/**
 * Track search event
 */
export function trackSearch(query: string, resultCount: number, filters?: Record<string, string>): void {
  try {
    metrics.increment('ecommerce.search', 1, {
      tags: {
        has_results: resultCount > 0 ? 'true' : 'false',
        result_bucket: resultCount === 0 ? 'none' : resultCount < 10 ? 'few' : 'many',
        ...getCommonTags(),
      },
    });

    metrics.distribution('ecommerce.search.result_count', resultCount, {
      unit: 'none',
      tags: {
        ...filters,
      },
    });

    // Track zero-result searches for product gap analysis
    if (resultCount === 0) {
      Sentry.addBreadcrumb({
        category: 'ecommerce.search',
        message: `Zero results for: ${query}`,
        level: 'warning',
        data: {
          query,
          filters,
        },
      });
    }

    logger.debug('Search tracked', { query, resultCount });
  } catch (error) {
    logger.error('Failed to track search', error);
  }
}

/**
 * Track filter usage
 */
export function trackFilterUsage(filterType: string, filterValue: string): void {
  try {
    metrics.increment('ecommerce.filter.applied', 1, {
      tags: {
        filter_type: filterType,
        filter_value: filterValue,
        ...getCommonTags(),
      },
    });

    logger.debug('Filter applied', { filterType, filterValue });
  } catch (error) {
    logger.error('Failed to track filter usage', error);
  }
}
