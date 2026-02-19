/**
 * Observability Stub Module
 *
 * This module was stubbed out after removing the full observability implementation.
 * All functions are no-ops to prevent errors in dependent code.
 */

export type UserSegment = "anonymous" | "retail" | "wholesale";

/**
 * Checkout step types for tracking checkout funnel progress.
 */
export type CheckoutStep =
  | "CART_VIEW"
  | "SHIPPING_INFO"
  | "PAYMENT_METHOD"
  | "CHECKOUT_START"
  | "PAYMENT_SUCCESS"
  | "ORDER_CONFIRMED";

/**
 * Sets the user segment for observability tracking.
 * No-op in this stub implementation.
 */
export function setUserSegment(_segment: UserSegment): void {
  // Stub: observability module was removed
}

/**
 * Initialize web vitals tracking.
 * No-op in this stub implementation.
 */
export function initWebVitals(): void {
  // Stub: web vitals module was removed
}

/**
 * Track a custom event for analytics.
 * No-op in this stub implementation.
 */
export function trackEvent(_eventName: string, _properties?: Record<string, unknown>): void {
  // Stub: analytics was removed
}

/**
 * Set a custom user property.
 * No-op in this stub implementation.
 */
export function setUserProperty(_name: string, _value: string): void {
  // Stub: user properties tracking was removed
}

/**
 * Track checkout funnel step progression.
 * No-op in this stub implementation.
 */
export function trackCheckoutStep(_step: CheckoutStep, _properties?: Record<string, unknown>): void {
  // Stub: checkout tracking was removed
}

/**
 * Track payment initialization.
 * No-op in this stub implementation.
 */
export function trackPaymentInit(_properties?: Record<string, unknown>): void {
  // Stub: payment tracking was removed
}

/**
 * Track successful payment.
 * No-op in this stub implementation.
 */
export function trackPaymentSuccess(_properties?: Record<string, unknown>): void {
  // Stub: payment tracking was removed
}

/**
 * Track failed payment.
 * No-op in this stub implementation.
 */
export function trackPaymentFailure(_error: string, _properties?: Record<string, unknown>): void {
  // Stub: payment tracking was removed
}

/**
 * Track cart abandonment risk.
 * No-op in this stub implementation.
 */
export function trackCartAbandonmentRisk(_properties?: Record<string, unknown>): void {
  // Stub: abandonment tracking was removed
}

/**
 * Reset cart abandonment tracking timer.
 * No-op in this stub implementation.
 */
export function resetCartAbandonmentTracking(): void {
  // Stub: abandonment tracking was removed
}

/**
 * Clear cart abandonment tracking entirely.
 * No-op in this stub implementation.
 */
export function clearCartAbandonmentTracking(): void {
  // Stub: abandonment tracking was removed
}
