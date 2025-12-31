/**
 * Enhanced Web Vitals Tracking with User Segments and Performance Budgets
 *
 * Extends core web vitals tracking with:
 * - User segment tagging (retail vs wholesale)
 * - Page-specific tracking and analysis
 * - Performance budget enforcement
 * - Automated alerting on budget violations
 *
 * @see https://web.dev/vitals/
 */

import * as Sentry from '@sentry/react';
import { logger } from '../logger';
import {
  PERFORMANCE_THRESHOLDS,
  reportCustomMetric,
} from './web-vitals';
import { SLO_DEFINITIONS, USER_SEGMENT_MODIFIERS } from './sli-slo-definitions';

// =============================================================================
// User Segment Context
// =============================================================================

/**
 * User segment types
 */
export type UserSegment = 'retail' | 'wholesale' | 'anonymous';

/**
 * Current user segment context
 */
let currentUserSegment: UserSegment = 'anonymous';

/**
 * Set the current user segment for performance tracking
 *
 * Call this when user authentication state changes or when user type is determined.
 *
 * @param segment - The user segment (retail, wholesale, or anonymous)
 *
 * @example
 * ```typescript
 * // After user login
 * setUserSegment(user.role === 'wholesale' ? 'wholesale' : 'retail');
 *
 * // On logout
 * setUserSegment('anonymous');
 * ```
 */
export function setUserSegment(segment: UserSegment): void {
  currentUserSegment = segment;

  // Update Sentry context
  Sentry.setTag('user_segment', segment);

  logger.debug('User segment updated for performance tracking', { segment });
}

/**
 * Get the current user segment
 */
export function getUserSegment(): UserSegment {
  return currentUserSegment;
}

// =============================================================================
// Page-Specific Tracking
// =============================================================================

/**
 * Page configuration for performance tracking
 */
export interface PageConfig {
  /** Page identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** URL pattern to match */
  pattern: RegExp;
  /** Page category */
  category: 'landing' | 'product' | 'checkout' | 'account' | 'admin' | 'other';
  /** Custom LCP threshold for this page */
  lcpThreshold?: number;
  /** Custom INP threshold for this page */
  inpThreshold?: number;
  /** Priority for performance monitoring */
  priority: 'critical' | 'high' | 'normal' | 'low';
}

/**
 * Page configurations for the application
 */
export const PAGE_CONFIGS: PageConfig[] = [
  {
    id: 'home',
    name: 'Home Page',
    pattern: /^\/$/,
    category: 'landing',
    lcpThreshold: 2000, // Stricter for landing page
    priority: 'critical',
  },
  {
    id: 'products_list',
    name: 'Products List',
    pattern: /^\/products\/?$/,
    category: 'product',
    lcpThreshold: 2500,
    priority: 'high',
  },
  {
    id: 'product_detail',
    name: 'Product Detail',
    pattern: /^\/products\/[^/]+\/?$/,
    category: 'product',
    lcpThreshold: 2500,
    priority: 'high',
  },
  {
    id: 'cart',
    name: 'Shopping Cart',
    pattern: /^\/cart\/?$/,
    category: 'checkout',
    lcpThreshold: 2000,
    inpThreshold: 150, // Stricter for interactive cart
    priority: 'critical',
  },
  {
    id: 'checkout',
    name: 'Checkout',
    pattern: /^\/checkout\/?/,
    category: 'checkout',
    lcpThreshold: 2000,
    inpThreshold: 150,
    priority: 'critical',
  },
  {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    pattern: /^\/order-confirmation\/?/,
    category: 'checkout',
    priority: 'high',
  },
  {
    id: 'order_history',
    name: 'Order History',
    pattern: /^\/orders\/?$/,
    category: 'account',
    priority: 'normal',
  },
  {
    id: 'wishlist',
    name: 'Wishlist',
    pattern: /^\/wishlist\/?$/,
    category: 'account',
    priority: 'normal',
  },
  {
    id: 'wholesale_dashboard',
    name: 'Wholesale Dashboard',
    pattern: /^\/wholesale\/?/,
    category: 'account',
    priority: 'high',
  },
  {
    id: 'admin',
    name: 'Admin Panel',
    pattern: /^\/admin\/?/,
    category: 'admin',
    priority: 'low',
  },
];

/**
 * Get page configuration for a given path
 */
export function getPageConfig(path: string): PageConfig | undefined {
  return PAGE_CONFIGS.find(config => config.pattern.test(path));
}

/**
 * Get current page configuration
 */
export function getCurrentPageConfig(): PageConfig | undefined {
  if (typeof window === 'undefined') return undefined;
  return getPageConfig(window.location.pathname);
}

// =============================================================================
// Performance Budgets
// =============================================================================

/**
 * Performance budget definition
 */
export interface PerformanceBudget {
  /** Metric name */
  metric: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
  /** Budget threshold value */
  budget: number;
  /** Budget for specific user segments (optional) */
  segmentBudgets?: Partial<Record<UserSegment, number>>;
  /** Budget for specific pages (optional) */
  pageBudgets?: Record<string, number>;
  /** Action when budget is exceeded */
  onExceed: 'warn' | 'alert' | 'block';
  /** Tolerance percentage before triggering action */
  tolerance: number;
}

/**
 * Default performance budgets
 */
export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  {
    metric: 'LCP',
    budget: 2500,
    segmentBudgets: {
      wholesale: 2000, // Stricter for wholesale users
    },
    pageBudgets: {
      home: 2000,
      cart: 2000,
      checkout: 2000,
    },
    onExceed: 'alert',
    tolerance: 10, // 10% tolerance
  },
  {
    metric: 'INP',
    budget: 200,
    segmentBudgets: {
      wholesale: 150,
    },
    pageBudgets: {
      cart: 150,
      checkout: 150,
    },
    onExceed: 'warn',
    tolerance: 15,
  },
  {
    metric: 'CLS',
    budget: 0.1,
    onExceed: 'warn',
    tolerance: 20,
  },
  {
    metric: 'FCP',
    budget: 1800,
    pageBudgets: {
      home: 1500,
    },
    onExceed: 'warn',
    tolerance: 15,
  },
  {
    metric: 'TTFB',
    budget: 800,
    onExceed: 'warn',
    tolerance: 20,
  },
];

/**
 * Get the effective budget for a metric
 */
export function getEffectiveBudget(
  metric: PerformanceBudget['metric'],
  pageId?: string,
  segment?: UserSegment
): number {
  const budgetConfig = PERFORMANCE_BUDGETS.find(b => b.metric === metric);
  if (!budgetConfig) {
    return PERFORMANCE_THRESHOLDS[metric].good;
  }

  // Check page-specific budget first
  if (pageId && budgetConfig.pageBudgets?.[pageId]) {
    return budgetConfig.pageBudgets[pageId];
  }

  // Check segment-specific budget
  const effectiveSegment = segment || currentUserSegment;
  if (effectiveSegment !== 'anonymous' && budgetConfig.segmentBudgets?.[effectiveSegment]) {
    return budgetConfig.segmentBudgets[effectiveSegment]!;
  }

  // Return default budget
  return budgetConfig.budget;
}

/**
 * Budget violation result
 */
export interface BudgetViolation {
  metric: string;
  value: number;
  budget: number;
  exceededBy: number;
  exceededByPercent: number;
  severity: 'warning' | 'critical';
  pageId?: string;
  segment: UserSegment;
}

/**
 * Check if a metric value violates the performance budget
 */
export function checkBudgetViolation(
  metric: PerformanceBudget['metric'],
  value: number,
  pageId?: string,
  segment?: UserSegment
): BudgetViolation | null {
  const budget = getEffectiveBudget(metric, pageId, segment);
  const budgetConfig = PERFORMANCE_BUDGETS.find(b => b.metric === metric);
  const tolerance = budgetConfig?.tolerance || 10;

  // Check if value exceeds budget
  let isViolation: boolean;
  let exceededBy: number;

  if (metric === 'CLS') {
    // CLS is a score, not milliseconds
    isViolation = value > budget;
    exceededBy = value - budget;
  } else {
    isViolation = value > budget;
    exceededBy = value - budget;
  }

  if (!isViolation) {
    return null;
  }

  const exceededByPercent = (exceededBy / budget) * 100;

  // Determine severity based on how much budget is exceeded
  const severity: BudgetViolation['severity'] =
    exceededByPercent > tolerance * 2 ? 'critical' : 'warning';

  return {
    metric,
    value,
    budget,
    exceededBy,
    exceededByPercent,
    severity,
    pageId,
    segment: segment || currentUserSegment,
  };
}

/**
 * Report a budget violation to monitoring systems
 */
export function reportBudgetViolation(violation: BudgetViolation): void {
  const budgetConfig = PERFORMANCE_BUDGETS.find(b => b.metric === violation.metric);

  // Log the violation
  logger.warn(`Performance budget exceeded: ${violation.metric}`, {
    value: violation.value,
    budget: violation.budget,
    exceededBy: violation.exceededBy,
    exceededByPercent: violation.exceededByPercent.toFixed(1),
    pageId: violation.pageId,
    segment: violation.segment,
  });

  // Report to Sentry
  Sentry.metrics.increment('performance.budget.violation', 1, {
    tags: {
      metric: violation.metric,
      severity: violation.severity,
      page_id: violation.pageId || 'unknown',
      user_segment: violation.segment,
    },
  });

  // Add breadcrumb
  Sentry.addBreadcrumb({
    category: 'performance.budget',
    message: `${violation.metric} budget exceeded by ${violation.exceededByPercent.toFixed(1)}%`,
    level: violation.severity === 'critical' ? 'error' : 'warning',
    data: {
      value: violation.value,
      budget: violation.budget,
      pageId: violation.pageId,
      segment: violation.segment,
    },
  });

  // Send alert if configured
  if (budgetConfig?.onExceed === 'alert' && violation.severity === 'critical') {
    Sentry.captureMessage(
      `Performance budget critically exceeded: ${violation.metric} = ${violation.value} (budget: ${violation.budget})`,
      {
        level: 'warning',
        tags: {
          category: 'performance_budget',
          metric: violation.metric,
          page_id: violation.pageId || 'unknown',
        },
        extra: {
          violation,
        },
      }
    );
  }
}

// =============================================================================
// Enhanced Metric Reporting
// =============================================================================

/**
 * Enhanced metric context
 */
export interface EnhancedMetricContext {
  /** User segment */
  userSegment: UserSegment;
  /** Page configuration */
  pageConfig?: PageConfig;
  /** Device type */
  deviceType: 'mobile' | 'tablet' | 'desktop';
  /** Connection type */
  connectionType: string;
  /** Navigation type */
  navigationType?: string;
  /** Is first visit */
  isFirstVisit: boolean;
  /** Session ID */
  sessionId?: string;
}

/**
 * Get current context for enhanced reporting
 */
export function getEnhancedContext(): EnhancedMetricContext {
  const isFirstVisit = !sessionStorage.getItem('has_visited');
  if (!sessionStorage.getItem('has_visited')) {
    try {
      sessionStorage.setItem('has_visited', 'true');
    } catch {
      // Session storage not available
    }
  }

  return {
    userSegment: currentUserSegment,
    pageConfig: getCurrentPageConfig(),
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
    isFirstVisit,
    sessionId: getSessionId(),
  };
}

/**
 * Get device type
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (width < 768 && hasTouch) return 'mobile';
  if (width < 1024 && hasTouch) return 'tablet';
  return 'desktop';
}

/**
 * Get connection type
 */
function getConnectionType(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      type?: string;
      saveData?: boolean;
    };
  }).connection;

  if (connection) {
    if (connection.saveData) return 'save-data';
    return connection.effectiveType || connection.type || 'unknown';
  }

  return 'unknown';
}

/**
 * Get or create session ID
 */
function getSessionId(): string | undefined {
  try {
    let sessionId = sessionStorage.getItem('performance_session_id');
    if (!sessionId) {
      sessionId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performance_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return undefined;
  }
}

/**
 * Report an enhanced metric with full context
 */
export function reportEnhancedMetric(
  metricName: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB' | 'FID',
  value: number,
  additionalTags?: Record<string, string>
): void {
  const context = getEnhancedContext();
  const pageId = context.pageConfig?.id || 'unknown';

  // Build tags
  const tags: Record<string, string> = {
    user_segment: context.userSegment,
    page_id: pageId,
    page_category: context.pageConfig?.category || 'unknown',
    page_priority: context.pageConfig?.priority || 'normal',
    device_type: context.deviceType,
    connection_type: context.connectionType,
    is_first_visit: context.isFirstVisit ? 'true' : 'false',
    ...additionalTags,
  };

  // Report to Sentry
  const unit = metricName === 'CLS' ? 'none' : 'millisecond';
  Sentry.metrics.distribution(`web_vitals.${metricName.toLowerCase()}.enhanced`, value, {
    unit,
    tags,
  });

  // Check budget violation
  if (['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(metricName)) {
    const violation = checkBudgetViolation(
      metricName as PerformanceBudget['metric'],
      value,
      pageId,
      context.userSegment
    );

    if (violation) {
      reportBudgetViolation(violation);
    }
  }

  // Log for debugging
  logger.debug(`Enhanced metric: ${metricName}`, {
    value,
    ...tags,
  });
}

// =============================================================================
// Performance Summary
// =============================================================================

/**
 * Performance summary for the current session
 */
export interface PerformanceSummary {
  timestamp: number;
  userSegment: UserSegment;
  deviceType: string;
  connectionType: string;
  pageViews: number;
  metrics: {
    lcp?: { value: number; rating: string };
    inp?: { value: number; rating: string };
    cls?: { value: number; rating: string };
    fcp?: { value: number; rating: string };
    ttfb?: { value: number; rating: string };
  };
  budgetViolations: BudgetViolation[];
  overallScore: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Collected metrics for the session
 */
const sessionMetrics: {
  lcp?: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  pageViews: number;
  violations: BudgetViolation[];
} = {
  pageViews: 0,
  violations: [],
};

/**
 * Record a metric value for the session summary
 */
export function recordSessionMetric(
  metric: 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb',
  value: number
): void {
  // Keep worst value
  if (sessionMetrics[metric] === undefined || value > sessionMetrics[metric]!) {
    sessionMetrics[metric] = value;
  }
}

/**
 * Record a page view
 */
export function recordPageView(): void {
  sessionMetrics.pageViews++;
}

/**
 * Record a budget violation
 */
export function recordViolation(violation: BudgetViolation): void {
  sessionMetrics.violations.push(violation);
}

/**
 * Get rating for a metric value
 */
function getMetricRating(
  metric: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB',
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Get the current session performance summary
 */
export function getPerformanceSummary(): PerformanceSummary {
  const context = getEnhancedContext();

  const metrics: PerformanceSummary['metrics'] = {};

  if (sessionMetrics.lcp !== undefined) {
    metrics.lcp = {
      value: sessionMetrics.lcp,
      rating: getMetricRating('LCP', sessionMetrics.lcp),
    };
  }
  if (sessionMetrics.inp !== undefined) {
    metrics.inp = {
      value: sessionMetrics.inp,
      rating: getMetricRating('INP', sessionMetrics.inp),
    };
  }
  if (sessionMetrics.cls !== undefined) {
    metrics.cls = {
      value: sessionMetrics.cls,
      rating: getMetricRating('CLS', sessionMetrics.cls),
    };
  }
  if (sessionMetrics.fcp !== undefined) {
    metrics.fcp = {
      value: sessionMetrics.fcp,
      rating: getMetricRating('FCP', sessionMetrics.fcp),
    };
  }
  if (sessionMetrics.ttfb !== undefined) {
    metrics.ttfb = {
      value: sessionMetrics.ttfb,
      rating: getMetricRating('TTFB', sessionMetrics.ttfb),
    };
  }

  // Calculate overall score
  const ratings = Object.values(metrics).map(m => m?.rating).filter(Boolean);
  let overallScore: PerformanceSummary['overallScore'] = 'good';

  if (ratings.includes('poor')) {
    overallScore = 'poor';
  } else if (ratings.includes('needs-improvement')) {
    overallScore = 'needs-improvement';
  }

  return {
    timestamp: Date.now(),
    userSegment: context.userSegment,
    deviceType: context.deviceType,
    connectionType: context.connectionType,
    pageViews: sessionMetrics.pageViews,
    metrics,
    budgetViolations: sessionMetrics.violations,
    overallScore,
  };
}

/**
 * Report session summary on page unload
 */
export function initSessionSummaryReporting(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const summary = getPerformanceSummary();

      // Report summary metrics
      Sentry.metrics.distribution('session.performance.score',
        summary.overallScore === 'good' ? 1 : summary.overallScore === 'needs-improvement' ? 0.5 : 0,
        {
          unit: 'none',
          tags: {
            user_segment: summary.userSegment,
            device_type: summary.deviceType,
            page_views: summary.pageViews.toString(),
          },
        }
      );

      if (summary.budgetViolations.length > 0) {
        Sentry.metrics.increment('session.budget_violations', summary.budgetViolations.length, {
          tags: {
            user_segment: summary.userSegment,
          },
        });
      }

      logger.info('Session performance summary', summary);
    }
  });
}

// =============================================================================
// Exports
// =============================================================================

export {
  PERFORMANCE_THRESHOLDS,
} from './web-vitals';
