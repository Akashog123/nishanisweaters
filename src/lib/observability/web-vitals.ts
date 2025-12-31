/**
 * Core Web Vitals Tracking
 *
 * Tracks essential performance metrics and reports them to Sentry.
 * Includes device context, connection info, and performance thresholds.
 *
 * @see https://web.dev/vitals/
 * @see https://docs.sentry.io/platforms/javascript/guides/react/performance/
 */

import * as Sentry from '@sentry/react';
import { onLCP, onCLS, onFCP, onTTFB, onINP, type Metric } from 'web-vitals';
import { logger } from '../logger';

/**
 * Performance thresholds based on Web Vitals recommendations
 * @see https://web.dev/vitals/#core-web-vitals
 */
export const PERFORMANCE_THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
    unit: 'ms',
    description: 'Largest Contentful Paint',
  },
  // FID removed in web-vitals v5+ - use INP instead
  INP: {
    good: 200,
    needsImprovement: 500,
    unit: 'ms',
    description: 'Interaction to Next Paint',
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    unit: 'score',
    description: 'Cumulative Layout Shift',
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    unit: 'ms',
    description: 'First Contentful Paint',
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
    unit: 'ms',
    description: 'Time to First Byte',
  },
} as const;

type MetricName = keyof typeof PERFORMANCE_THRESHOLDS;
type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Get the rating for a metric value
 */
function getMetricRating(name: MetricName, value: number): MetricRating {
  const threshold = PERFORMANCE_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Detect device type based on screen size and touch capability
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
 * Get connection type from Navigator API
 */
function getConnectionType(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  // Use the Network Information API if available
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
 * Get the current page path
 */
function getPagePath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

/**
 * Report a metric to Sentry with full context
 */
function reportMetricToSentry(metric: Metric): void {
  const name = metric.name as MetricName;
  const threshold = PERFORMANCE_THRESHOLDS[name];

  if (!threshold) {
    logger.warn('Unknown metric type received', { metricName: metric.name });
    return;
  }

  const rating = getMetricRating(name, metric.value);
  const deviceType = getDeviceType();
  const connectionType = getConnectionType();
  const pagePath = getPagePath();

  // Create context data for Sentry
  const contextData = {
    metric_name: name,
    value: metric.value,
    rating,
    device_type: deviceType,
    connection_type: connectionType,
    page_path: pagePath,
    navigation_type: metric.navigationType || 'unknown',
    threshold_good: threshold.good,
    threshold_needs_improvement: threshold.needsImprovement,
  };

  try {
    // Add breadcrumb for all web vitals (useful for debugging)
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${name}: ${metric.value.toFixed(2)}${threshold.unit === 'ms' ? 'ms' : ''} (${rating})`,
      level: rating === 'poor' ? 'warning' : 'info',
      data: contextData,
    });

    // Set measurement on the current transaction/span if available
    // This is the Sentry v10.x compatible way to report metrics
    Sentry.setMeasurement(
      `web_vitals.${name.toLowerCase()}`,
      metric.value,
      threshold.unit === 'score' ? 'none' : 'millisecond'
    );

    // Log poor metrics as warnings for visibility
    if (rating === 'poor') {
      logger.warn(`Poor ${threshold.description} (${name}) detected`, {
        value: metric.value,
        threshold: threshold.needsImprovement,
        rating,
        deviceType,
        connectionType,
        pagePath,
        metricId: metric.id,
      });

      // Set context for poor performance debugging
      Sentry.setContext('web_vitals_poor', {
        [name]: contextData,
      });
    }

    // Log good metrics at debug level
    if (rating === 'good') {
      logger.debug(`Good ${threshold.description} (${name})`, {
        value: metric.value,
        rating,
      });
    }
  } catch (error) {
    logger.error('Failed to report web vital to Sentry', error, { metric: name });
  }
}

/**
 * Web Vitals tracking state
 */
let isInitialized = false;

/**
 * Initialize Core Web Vitals tracking
 *
 * Automatically tracks all Core Web Vitals and reports them to Sentry.
 * Should be called after Sentry is initialized.
 *
 * @example
 * ```typescript
 * import { initWebVitals } from '@/lib/observability/web-vitals';
 *
 * // In main.tsx after Sentry init
 * initWebVitals();
 * ```
 */
export function initWebVitals(): void {
  if (isInitialized) {
    logger.debug('Web Vitals already initialized, skipping');
    return;
  }

  if (typeof window === 'undefined') {
    logger.debug('Window not available, skipping Web Vitals initialization');
    return;
  }

  try {
    // Core Web Vitals (the essential three)
    // Note: FID was deprecated in web-vitals v5+, replaced by INP
    onLCP(reportMetricToSentry);
    onCLS(reportMetricToSentry);

    // Additional useful metrics
    onFCP(reportMetricToSentry);
    onTTFB(reportMetricToSentry);
    onINP(reportMetricToSentry);

    isInitialized = true;

    logger.info('Web Vitals tracking initialized', {
      deviceType: getDeviceType(),
      connectionType: getConnectionType(),
      pagePath: getPagePath(),
    });

    // Add initialization breadcrumb
    Sentry.addBreadcrumb({
      category: 'observability',
      message: 'Web Vitals tracking initialized',
      level: 'info',
      data: {
        deviceType: getDeviceType(),
        connectionType: getConnectionType(),
      },
    });
  } catch (error) {
    logger.error('Failed to initialize Web Vitals tracking', error);
  }
}

/**
 * Check if Web Vitals tracking is initialized
 */
export function isWebVitalsInitialized(): boolean {
  return isInitialized;
}

/**
 * Get performance thresholds for external use (e.g., dashboards)
 */
export function getPerformanceThresholds(): typeof PERFORMANCE_THRESHOLDS {
  return PERFORMANCE_THRESHOLDS;
}

/**
 * Manually report a custom performance metric
 *
 * @param name - Metric name (will be prefixed with 'custom.')
 * @param value - Metric value
 * @param unit - Unit of measurement
 * @param tags - Additional tags
 */
export function reportCustomMetric(
  name: string,
  value: number,
  unit: 'millisecond' | 'second' | 'none' = 'millisecond',
  tags?: Record<string, string>
): void {
  try {
    // Use setMeasurement for Sentry v10.x compatibility
    Sentry.setMeasurement(`custom.${name}`, value, unit);

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'custom-metric',
      message: `${name}: ${value}${unit === 'millisecond' ? 'ms' : unit === 'second' ? 's' : ''}`,
      level: 'info',
      data: {
        value,
        unit,
        device_type: getDeviceType(),
        connection_type: getConnectionType(),
        page_path: getPagePath(),
        ...tags,
      },
    });
  } catch (error) {
    logger.error('Failed to report custom metric', error, { metricName: name });
  }
}

/**
 * Measure and report the duration of an async operation
 *
 * @param name - Operation name
 * @param operation - Async function to measure
 * @param tags - Additional tags
 * @returns The result of the operation
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    reportCustomMetric(name, duration, 'millisecond', {
      status: 'success',
      ...tags,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    reportCustomMetric(name, duration, 'millisecond', {
      status: 'error',
      ...tags,
    });

    throw error;
  }
}

/**
 * Create a performance measurement span
 *
 * @param name - Span name
 * @returns Object with end() method to complete the measurement
 */
export function startMeasurement(name: string, tags?: Record<string, string>): {
  end: (additionalTags?: Record<string, string>) => void;
} {
  const startTime = performance.now();

  return {
    end: (additionalTags?: Record<string, string>) => {
      const duration = performance.now() - startTime;
      reportCustomMetric(name, duration, 'millisecond', {
        ...tags,
        ...additionalTags,
      });
    },
  };
}
