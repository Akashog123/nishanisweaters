/**
 * Service Level Indicators (SLI) and Service Level Objectives (SLO) Definitions
 *
 * This module defines the SLIs, SLOs, and error budgets for the Nidhi Sweaters
 * e-commerce application. These metrics form the foundation of reliability
 * engineering practices and drive alerting decisions.
 *
 * @see https://sre.google/sre-book/service-level-objectives/
 */

// =============================================================================
// SLI Definitions
// =============================================================================

/**
 * Service Level Indicator definition
 */
export interface SLIDefinition {
  /** Unique identifier for the SLI */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this SLI measures */
  description: string;
  /** How this SLI is calculated */
  calculation: string;
  /** Metric name in Sentry/monitoring system */
  metricName: string;
  /** Unit of measurement */
  unit: 'percentage' | 'milliseconds' | 'ratio' | 'count';
  /** Category of service */
  category: 'availability' | 'latency' | 'quality' | 'throughput';
  /** Tags for filtering in dashboards */
  tags: string[];
}

/**
 * Core SLI Definitions for Nidhi Sweaters E-Commerce Platform
 */
export const SLI_DEFINITIONS: Record<string, SLIDefinition> = {
  // -------------------------------------------------------------------------
  // Availability SLIs
  // -------------------------------------------------------------------------

  CHECKOUT_AVAILABILITY: {
    id: 'checkout_availability',
    name: 'Checkout Availability',
    description: 'Percentage of checkout requests that complete successfully without server errors',
    calculation: '(successful_checkout_requests / total_checkout_requests) * 100',
    metricName: 'ecommerce.checkout.availability',
    unit: 'percentage',
    category: 'availability',
    tags: ['critical', 'checkout', 'revenue'],
  },

  API_AVAILABILITY: {
    id: 'api_availability',
    name: 'API Availability',
    description: 'Percentage of API requests that return non-5xx responses',
    calculation: '(requests - 5xx_responses) / requests * 100',
    metricName: 'convex.api.availability',
    unit: 'percentage',
    category: 'availability',
    tags: ['infrastructure', 'backend'],
  },

  PAYMENT_GATEWAY_AVAILABILITY: {
    id: 'payment_gateway_availability',
    name: 'Payment Gateway Availability',
    description: 'Percentage of payment requests that reach Razorpay successfully',
    calculation: '(successful_payment_connections / total_payment_attempts) * 100',
    metricName: 'ecommerce.payment.gateway_availability',
    unit: 'percentage',
    category: 'availability',
    tags: ['critical', 'payment', 'revenue'],
  },

  // -------------------------------------------------------------------------
  // Payment Success SLIs
  // -------------------------------------------------------------------------

  PAYMENT_SUCCESS_RATE: {
    id: 'payment_success_rate',
    name: 'Payment Success Rate',
    description: 'Percentage of initiated payments that complete successfully',
    calculation: '(successful_payments / initiated_payments) * 100',
    metricName: 'ecommerce.payment.success_rate',
    unit: 'percentage',
    category: 'quality',
    tags: ['critical', 'payment', 'revenue'],
  },

  PAYMENT_VERIFICATION_SUCCESS: {
    id: 'payment_verification_success',
    name: 'Payment Verification Success',
    description: 'Percentage of payment verifications that pass signature validation',
    calculation: '(verified_payments / total_verification_attempts) * 100',
    metricName: 'ecommerce.payment.verification_success',
    unit: 'percentage',
    category: 'quality',
    tags: ['security', 'payment'],
  },

  // -------------------------------------------------------------------------
  // Latency SLIs
  // -------------------------------------------------------------------------

  PAGE_LOAD_LCP: {
    id: 'page_load_lcp',
    name: 'Largest Contentful Paint (LCP)',
    description: 'Time until the largest content element is rendered',
    calculation: 'p75(LCP) across all page loads',
    metricName: 'web_vitals.lcp',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['performance', 'user-experience', 'core-web-vitals'],
  },

  PAGE_LOAD_FCP: {
    id: 'page_load_fcp',
    name: 'First Contentful Paint (FCP)',
    description: 'Time until first content is painted',
    calculation: 'p75(FCP) across all page loads',
    metricName: 'web_vitals.fcp',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['performance', 'user-experience', 'core-web-vitals'],
  },

  INTERACTION_INP: {
    id: 'interaction_inp',
    name: 'Interaction to Next Paint (INP)',
    description: 'Responsiveness to user interactions',
    calculation: 'p75(INP) across all interactions',
    metricName: 'web_vitals.inp',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['performance', 'user-experience', 'core-web-vitals'],
  },

  API_LATENCY_P50: {
    id: 'api_latency_p50',
    name: 'API Latency (p50)',
    description: 'Median API response time',
    calculation: 'p50(response_time) for all API calls',
    metricName: 'convex.api.latency.p50',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['performance', 'backend'],
  },

  API_LATENCY_P95: {
    id: 'api_latency_p95',
    name: 'API Latency (p95)',
    description: '95th percentile API response time',
    calculation: 'p95(response_time) for all API calls',
    metricName: 'convex.api.latency.p95',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['performance', 'backend'],
  },

  API_LATENCY_P99: {
    id: 'api_latency_p99',
    name: 'API Latency (p99)',
    description: '99th percentile API response time',
    calculation: 'p99(response_time) for all API calls',
    metricName: 'convex.api.latency.p99',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['performance', 'backend'],
  },

  CHECKOUT_LATENCY: {
    id: 'checkout_latency',
    name: 'Checkout Flow Latency',
    description: 'Time from checkout initiation to order confirmation',
    calculation: 'p95(checkout_duration)',
    metricName: 'ecommerce.checkout.latency',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['critical', 'checkout', 'user-experience'],
  },

  PAYMENT_LATENCY: {
    id: 'payment_latency',
    name: 'Payment Processing Latency',
    description: 'Time from payment initiation to confirmation',
    calculation: 'p95(payment_duration)',
    metricName: 'ecommerce.payment.latency',
    unit: 'milliseconds',
    category: 'latency',
    tags: ['critical', 'payment'],
  },

  // -------------------------------------------------------------------------
  // Quality SLIs
  // -------------------------------------------------------------------------

  LAYOUT_SHIFT_CLS: {
    id: 'layout_shift_cls',
    name: 'Cumulative Layout Shift (CLS)',
    description: 'Visual stability score measuring unexpected layout shifts',
    calculation: 'p75(CLS) across all page loads',
    metricName: 'web_vitals.cls',
    unit: 'ratio',
    category: 'quality',
    tags: ['performance', 'user-experience', 'core-web-vitals'],
  },

  ERROR_RATE: {
    id: 'error_rate',
    name: 'JavaScript Error Rate',
    description: 'Percentage of sessions with unhandled JavaScript errors',
    calculation: '(sessions_with_errors / total_sessions) * 100',
    metricName: 'sentry.error_rate',
    unit: 'percentage',
    category: 'quality',
    tags: ['errors', 'frontend'],
  },

  CART_ABANDONMENT_RATE: {
    id: 'cart_abandonment_rate',
    name: 'Cart Abandonment Rate',
    description: 'Percentage of carts that do not complete checkout',
    calculation: '(abandoned_carts / carts_with_items) * 100',
    metricName: 'ecommerce.cart.abandonment_rate',
    unit: 'percentage',
    category: 'quality',
    tags: ['business', 'conversion'],
  },

  // -------------------------------------------------------------------------
  // Throughput SLIs
  // -------------------------------------------------------------------------

  ORDERS_PER_HOUR: {
    id: 'orders_per_hour',
    name: 'Orders Per Hour',
    description: 'Number of successfully completed orders per hour',
    calculation: 'count(completed_orders) per hour',
    metricName: 'ecommerce.orders.throughput',
    unit: 'count',
    category: 'throughput',
    tags: ['business', 'revenue'],
  },

  CONCURRENT_CHECKOUTS: {
    id: 'concurrent_checkouts',
    name: 'Concurrent Checkouts',
    description: 'Number of simultaneous active checkout sessions',
    calculation: 'gauge(active_checkouts)',
    metricName: 'ecommerce.checkout.concurrent',
    unit: 'count',
    category: 'throughput',
    tags: ['capacity', 'checkout'],
  },
} as const;

// =============================================================================
// SLO Definitions
// =============================================================================

/**
 * Service Level Objective definition
 */
export interface SLODefinition {
  /** Reference to the SLI this objective measures */
  sliId: string;
  /** Human-readable name */
  name: string;
  /** Target value for the SLO */
  target: number;
  /** Comparison operator */
  operator: '>=' | '<=' | '>' | '<' | '=';
  /** Rolling window for measurement */
  window: '1h' | '24h' | '7d' | '28d' | '30d';
  /** Priority level for alerting */
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  /** Error budget in the same unit as the SLI */
  errorBudget: number;
  /** Burn rate thresholds for alerting */
  burnRateThresholds: {
    critical: number; // Fast burn - page immediately
    warning: number;  // Slow burn - alert within hours
  };
  /** Owner team for escalation */
  owner: string;
  /** Escalation path */
  escalation: string[];
}

/**
 * Service Level Objectives for Nidhi Sweaters E-Commerce Platform
 *
 * Objectives are set based on:
 * - Industry standards for e-commerce
 * - Business criticality of the service
 * - Historical performance data
 * - User experience research
 */
export const SLO_DEFINITIONS: Record<string, SLODefinition> = {
  // -------------------------------------------------------------------------
  // Critical Path SLOs (P1 - Page immediately on breach)
  // -------------------------------------------------------------------------

  CHECKOUT_AVAILABILITY_SLO: {
    sliId: 'checkout_availability',
    name: 'Checkout Availability SLO',
    target: 99.9,
    operator: '>=',
    window: '28d',
    priority: 'P1',
    errorBudget: 0.1, // 43.2 minutes per month
    burnRateThresholds: {
      critical: 14.4, // 2% budget consumed in 1 hour
      warning: 6,     // 5% budget consumed in 6 hours
    },
    owner: 'platform-team',
    escalation: ['on-call-engineer', 'engineering-manager', 'cto'],
  },

  PAYMENT_SUCCESS_RATE_SLO: {
    sliId: 'payment_success_rate',
    name: 'Payment Success Rate SLO',
    target: 99.5,
    operator: '>=',
    window: '28d',
    priority: 'P1',
    errorBudget: 0.5, // 0.5% of payments can fail
    burnRateThresholds: {
      critical: 14.4,
      warning: 6,
    },
    owner: 'payments-team',
    escalation: ['on-call-engineer', 'payments-lead', 'cto'],
  },

  PAYMENT_GATEWAY_AVAILABILITY_SLO: {
    sliId: 'payment_gateway_availability',
    name: 'Payment Gateway Availability SLO',
    target: 99.95,
    operator: '>=',
    window: '28d',
    priority: 'P1',
    errorBudget: 0.05,
    burnRateThresholds: {
      critical: 14.4,
      warning: 6,
    },
    owner: 'payments-team',
    escalation: ['on-call-engineer', 'payments-lead', 'cto'],
  },

  // -------------------------------------------------------------------------
  // High Priority SLOs (P2 - Respond within 15 minutes)
  // -------------------------------------------------------------------------

  API_AVAILABILITY_SLO: {
    sliId: 'api_availability',
    name: 'API Availability SLO',
    target: 99.9,
    operator: '>=',
    window: '28d',
    priority: 'P2',
    errorBudget: 0.1,
    burnRateThresholds: {
      critical: 14.4,
      warning: 6,
    },
    owner: 'platform-team',
    escalation: ['on-call-engineer', 'engineering-manager'],
  },

  PAGE_LOAD_LCP_SLO: {
    sliId: 'page_load_lcp',
    name: 'LCP Performance SLO',
    target: 2500, // 2.5 seconds - "good" threshold per Google
    operator: '<=',
    window: '7d',
    priority: 'P2',
    errorBudget: 500, // Allow up to 3000ms at p75
    burnRateThresholds: {
      critical: 10,
      warning: 5,
    },
    owner: 'frontend-team',
    escalation: ['on-call-engineer', 'frontend-lead'],
  },

  API_LATENCY_P95_SLO: {
    sliId: 'api_latency_p95',
    name: 'API Latency P95 SLO',
    target: 500, // 500ms
    operator: '<=',
    window: '7d',
    priority: 'P2',
    errorBudget: 200, // Allow up to 700ms at p95
    burnRateThresholds: {
      critical: 10,
      warning: 5,
    },
    owner: 'platform-team',
    escalation: ['on-call-engineer', 'engineering-manager'],
  },

  // -------------------------------------------------------------------------
  // Medium Priority SLOs (P3 - Respond within 4 hours)
  // -------------------------------------------------------------------------

  INTERACTION_INP_SLO: {
    sliId: 'interaction_inp',
    name: 'INP Performance SLO',
    target: 200, // 200ms - "good" threshold per Google
    operator: '<=',
    window: '7d',
    priority: 'P3',
    errorBudget: 100, // Allow up to 300ms
    burnRateThresholds: {
      critical: 8,
      warning: 4,
    },
    owner: 'frontend-team',
    escalation: ['frontend-lead'],
  },

  LAYOUT_SHIFT_CLS_SLO: {
    sliId: 'layout_shift_cls',
    name: 'CLS Performance SLO',
    target: 0.1, // "good" threshold per Google
    operator: '<=',
    window: '7d',
    priority: 'P3',
    errorBudget: 0.05, // Allow up to 0.15
    burnRateThresholds: {
      critical: 8,
      warning: 4,
    },
    owner: 'frontend-team',
    escalation: ['frontend-lead'],
  },

  ERROR_RATE_SLO: {
    sliId: 'error_rate',
    name: 'Error Rate SLO',
    target: 1, // Less than 1% of sessions with errors
    operator: '<=',
    window: '7d',
    priority: 'P3',
    errorBudget: 0.5, // Allow up to 1.5%
    burnRateThresholds: {
      critical: 8,
      warning: 4,
    },
    owner: 'frontend-team',
    escalation: ['on-call-engineer', 'frontend-lead'],
  },

  // -------------------------------------------------------------------------
  // Low Priority SLOs (P4 - Business hours response)
  // -------------------------------------------------------------------------

  CART_ABANDONMENT_RATE_SLO: {
    sliId: 'cart_abandonment_rate',
    name: 'Cart Abandonment Rate SLO',
    target: 70, // Industry average is ~70%
    operator: '<=',
    window: '7d',
    priority: 'P4',
    errorBudget: 10, // Allow up to 80%
    burnRateThresholds: {
      critical: 5,
      warning: 2,
    },
    owner: 'product-team',
    escalation: ['product-manager'],
  },

  CHECKOUT_LATENCY_SLO: {
    sliId: 'checkout_latency',
    name: 'Checkout Latency SLO',
    target: 3000, // 3 seconds for full checkout flow
    operator: '<=',
    window: '7d',
    priority: 'P3',
    errorBudget: 1000, // Allow up to 4 seconds
    burnRateThresholds: {
      critical: 8,
      warning: 4,
    },
    owner: 'platform-team',
    escalation: ['on-call-engineer'],
  },
} as const;

// =============================================================================
// Error Budget Calculations
// =============================================================================

/**
 * Calculate error budget consumption
 */
export interface ErrorBudgetStatus {
  sloId: string;
  totalBudget: number;
  consumed: number;
  remaining: number;
  consumedPercentage: number;
  burnRate: number; // Current burn rate multiplier
  projectedExhaustion: Date | null; // When budget will be exhausted at current rate
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
}

/**
 * Calculate the error budget status for an SLO
 *
 * @param sloId - The SLO identifier
 * @param currentValue - Current measured value
 * @param windowStartTime - Start of the measurement window
 * @returns Error budget status
 */
export function calculateErrorBudgetStatus(
  sloId: string,
  currentValue: number,
  windowStartTime: Date
): ErrorBudgetStatus | null {
  const slo = SLO_DEFINITIONS[sloId];
  if (!slo) return null;

  const sli = SLI_DEFINITIONS[slo.sliId];
  if (!sli) return null;

  // Calculate total budget based on window
  const windowDays = getWindowDays(slo.window);
  const totalBudget = slo.errorBudget;

  // Calculate consumed budget
  let consumed: number;
  if (slo.operator === '>=' || slo.operator === '>') {
    // For availability-type SLOs
    consumed = Math.max(0, slo.target - currentValue);
  } else {
    // For latency-type SLOs
    consumed = Math.max(0, currentValue - slo.target);
  }

  const remaining = Math.max(0, totalBudget - consumed);
  const consumedPercentage = (consumed / totalBudget) * 100;

  // Calculate burn rate
  const now = new Date();
  const elapsedMs = now.getTime() - windowStartTime.getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const expectedConsumption = (elapsedMs / windowMs) * totalBudget;
  const burnRate = expectedConsumption > 0 ? consumed / expectedConsumption : 0;

  // Project exhaustion date
  let projectedExhaustion: Date | null = null;
  if (burnRate > 1 && remaining > 0) {
    const remainingMs = (remaining / consumed) * elapsedMs;
    projectedExhaustion = new Date(now.getTime() + remainingMs);
  }

  // Determine status
  let status: ErrorBudgetStatus['status'];
  if (remaining <= 0) {
    status = 'exhausted';
  } else if (burnRate >= slo.burnRateThresholds.critical) {
    status = 'critical';
  } else if (burnRate >= slo.burnRateThresholds.warning) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return {
    sloId,
    totalBudget,
    consumed,
    remaining,
    consumedPercentage,
    burnRate,
    projectedExhaustion,
    status,
  };
}

/**
 * Get window duration in days
 */
function getWindowDays(window: SLODefinition['window']): number {
  const mapping: Record<SLODefinition['window'], number> = {
    '1h': 1 / 24,
    '24h': 1,
    '7d': 7,
    '28d': 28,
    '30d': 30,
  };
  return mapping[window];
}

// =============================================================================
// SLO Compliance Helpers
// =============================================================================

/**
 * Check if a value meets the SLO target
 */
export function checkSLOCompliance(sloId: string, value: number): boolean {
  const slo = SLO_DEFINITIONS[sloId];
  if (!slo) return false;

  switch (slo.operator) {
    case '>=':
      return value >= slo.target;
    case '<=':
      return value <= slo.target;
    case '>':
      return value > slo.target;
    case '<':
      return value < slo.target;
    case '=':
      return value === slo.target;
    default:
      return false;
  }
}

/**
 * Get all SLOs by priority
 */
export function getSLOsByPriority(priority: SLODefinition['priority']): SLODefinition[] {
  return Object.values(SLO_DEFINITIONS).filter(slo => slo.priority === priority);
}

/**
 * Get all SLOs by owner
 */
export function getSLOsByOwner(owner: string): SLODefinition[] {
  return Object.values(SLO_DEFINITIONS).filter(slo => slo.owner === owner);
}

/**
 * Get SLI for an SLO
 */
export function getSLIForSLO(sloId: string): SLIDefinition | undefined {
  const slo = SLO_DEFINITIONS[sloId];
  if (!slo) return undefined;
  return SLI_DEFINITIONS[slo.sliId];
}

// =============================================================================
// User Segment Thresholds
// =============================================================================

/**
 * Different SLO targets for different user segments
 * Wholesale customers may have stricter requirements due to higher order values
 */
export const USER_SEGMENT_MODIFIERS: Record<string, Record<string, number>> = {
  retail: {
    // Baseline thresholds
    lcp_target: 2500,
    payment_success_target: 99.5,
    checkout_availability_target: 99.9,
  },
  wholesale: {
    // Stricter thresholds for wholesale (higher value customers)
    lcp_target: 2000, // 20% faster
    payment_success_target: 99.9, // Higher success rate
    checkout_availability_target: 99.95, // Higher availability
  },
};

/**
 * Get adjusted SLO target for a user segment
 */
export function getSegmentAdjustedTarget(
  sloId: string,
  segment: 'retail' | 'wholesale'
): number {
  const slo = SLO_DEFINITIONS[sloId];
  if (!slo) return 0;

  const modifierKey = `${slo.sliId.toLowerCase()}_target`;
  const segmentModifiers = USER_SEGMENT_MODIFIERS[segment];

  if (segmentModifiers && modifierKey in segmentModifiers) {
    return segmentModifiers[modifierKey];
  }

  return slo.target;
}
