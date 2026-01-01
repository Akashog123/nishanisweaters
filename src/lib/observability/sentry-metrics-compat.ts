/**
 * Sentry Metrics Compatibility Layer
 *
 * The Sentry.metrics API (increment, distribution, gauge, set) was deprecated and
 * removed in Sentry SDK v8+. This module provides no-op fallbacks to maintain
 * backward compatibility while the codebase is migrated to use custom metrics
 * or Sentry spans for performance tracking.
 *
 * @see https://docs.sentry.io/platforms/javascript/tracing/instrumentation/custom-instrumentation/
 *
 * Migration path:
 * 1. For counters: Use Sentry spans with custom attributes or custom logging
 * 2. For distributions: Use Sentry.startSpan() with measurements
 * 3. For real-time metrics: Consider OpenTelemetry integration
 */

import * as Sentry from '@sentry/react';
import { logger } from '../logger';

/**
 * Options for metric recording
 */
interface MetricOptions {
  tags?: Record<string, string | number | boolean>;
  unit?: string;
}

/**
 * Check if we're in development mode for debug logging
 */
const isDev = import.meta.env.DEV;

/**
 * Increment a counter metric
 *
 * This is a no-op fallback since Sentry.metrics.increment() was removed.
 * The metric is logged and added as a breadcrumb for debugging.
 *
 * @param name - Metric name
 * @param value - Increment value (default: 1)
 * @param options - Metric options with tags
 */
export function metricsIncrement(
  name: string,
  value: number = 1,
  options?: MetricOptions
): void {
  // Add as breadcrumb for debugging/tracing
  Sentry.addBreadcrumb({
    category: 'metrics.counter',
    message: `${name}: ${value}`,
    level: 'debug',
    data: options?.tags,
  });

  // Log in development for visibility
  if (isDev) {
    logger.debug(`[Metric] ${name}: +${value}`, options?.tags);
  }
}

/**
 * Record a distribution (histogram) metric
 *
 * This is a no-op fallback since Sentry.metrics.distribution() was removed.
 * The metric is logged and added as a breadcrumb for debugging.
 *
 * @param name - Metric name
 * @param value - Metric value
 * @param options - Metric options with unit and tags
 */
export function metricsDistribution(
  name: string,
  value: number,
  options?: MetricOptions
): void {
  // Add as breadcrumb for debugging/tracing
  Sentry.addBreadcrumb({
    category: 'metrics.distribution',
    message: `${name}: ${value}${options?.unit ? ` ${options.unit}` : ''}`,
    level: 'debug',
    data: options?.tags,
  });

  // Log in development for visibility
  if (isDev) {
    logger.debug(`[Metric] ${name}: ${value}${options?.unit ? ` ${options.unit}` : ''}`, options?.tags);
  }
}

/**
 * Record a gauge metric
 *
 * @param name - Metric name
 * @param value - Gauge value
 * @param options - Metric options with tags
 */
export function metricsGauge(
  name: string,
  value: number,
  options?: MetricOptions
): void {
  Sentry.addBreadcrumb({
    category: 'metrics.gauge',
    message: `${name}: ${value}`,
    level: 'debug',
    data: options?.tags,
  });

  if (isDev) {
    logger.debug(`[Metric Gauge] ${name}: ${value}`, options?.tags);
  }
}

/**
 * Record a set metric (unique values)
 *
 * @param name - Metric name
 * @param value - Set value
 * @param options - Metric options with tags
 */
export function metricsSet(
  name: string,
  value: string | number,
  options?: MetricOptions
): void {
  Sentry.addBreadcrumb({
    category: 'metrics.set',
    message: `${name}: ${value}`,
    level: 'debug',
    data: options?.tags,
  });

  if (isDev) {
    logger.debug(`[Metric Set] ${name}: ${value}`, options?.tags);
  }
}

/**
 * Compatibility wrapper that mimics the old Sentry.metrics API
 *
 * Usage:
 * ```typescript
 * import { metrics } from '@/lib/observability/sentry-metrics-compat';
 *
 * // Instead of: Sentry.metrics.increment('name', 1, { tags: {...} })
 * metrics.increment('name', 1, { tags: {...} })
 * ```
 */
export const metrics = {
  increment: metricsIncrement,
  distribution: metricsDistribution,
  gauge: metricsGauge,
  set: metricsSet,
};

export default metrics;
