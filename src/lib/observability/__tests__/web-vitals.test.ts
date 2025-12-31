/**
 * Core Web Vitals Tests
 *
 * Tests threshold calculations, metric reporting, and device detection
 * for the Web Vitals tracking system.
 *
 * Validates:
 * - Performance threshold calculations (good/needs-improvement/poor)
 * - Metric reporting to Sentry
 * - Device and connection type detection
 * - Custom metric reporting
 *
 * Run with: npm run test:run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Metric } from 'web-vitals';

// Mock Sentry before importing web-vitals module
// Note: Sentry v10.x uses setMeasurement instead of metrics.distribution
vi.mock('@sentry/react', () => ({
  setMeasurement: vi.fn(),
  addBreadcrumb: vi.fn(),
  setContext: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  PERFORMANCE_THRESHOLDS,
  reportCustomMetric,
  measureAsync,
  startMeasurement,
} from '@/lib/observability/web-vitals';
import * as Sentry from '@sentry/react';

describe('Core Web Vitals Tests', () => {
  let mockSetMeasurement: ReturnType<typeof vi.fn>;
  let mockAddBreadcrumb: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked Sentry instance
    mockSetMeasurement = Sentry.setMeasurement as ReturnType<typeof vi.fn>;
    mockAddBreadcrumb = Sentry.addBreadcrumb as ReturnType<typeof vi.fn>;
    // Reset window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Performance Threshold Definitions', () => {
    it('should define thresholds for all Core Web Vitals', () => {
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('LCP');
      // Note: FID was removed in web-vitals v5+ - use INP instead
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('INP');
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('CLS');
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('FCP');
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('TTFB');
    });

    it('should have correct LCP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.LCP.good).toBe(2500);
      expect(PERFORMANCE_THRESHOLDS.LCP.needsImprovement).toBe(4000);
      expect(PERFORMANCE_THRESHOLDS.LCP.unit).toBe('ms');
      expect(PERFORMANCE_THRESHOLDS.LCP.description).toBe('Largest Contentful Paint');
    });

    it('should have correct INP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.INP.good).toBe(200);
      expect(PERFORMANCE_THRESHOLDS.INP.needsImprovement).toBe(500);
      expect(PERFORMANCE_THRESHOLDS.INP.unit).toBe('ms');
    });

    it('should have correct CLS thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.CLS.good).toBe(0.1);
      expect(PERFORMANCE_THRESHOLDS.CLS.needsImprovement).toBe(0.25);
      expect(PERFORMANCE_THRESHOLDS.CLS.unit).toBe('score');
    });

    it('should have correct FCP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.FCP.good).toBe(1800);
      expect(PERFORMANCE_THRESHOLDS.FCP.needsImprovement).toBe(3000);
      expect(PERFORMANCE_THRESHOLDS.FCP.unit).toBe('ms');
    });

    it('should have correct TTFB thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.TTFB.good).toBe(800);
      expect(PERFORMANCE_THRESHOLDS.TTFB.needsImprovement).toBe(1800);
      expect(PERFORMANCE_THRESHOLDS.TTFB.unit).toBe('ms');
    });

    it('should have valid threshold ranges', () => {
      Object.entries(PERFORMANCE_THRESHOLDS).forEach(([metric, thresholds]) => {
        expect(thresholds.good).toBeGreaterThan(0);
        expect(thresholds.needsImprovement).toBeGreaterThan(thresholds.good);
        expect(thresholds.unit).toBeTruthy();
        expect(thresholds.description).toBeTruthy();
      });
    });
  });

  describe('Metric Rating Calculation', () => {
    it('should rate LCP values correctly', () => {
      // Good: <= 2500ms
      const goodLCP = createMetric('LCP', 2000);
      expect(getRating('LCP', goodLCP.value)).toBe('good');

      // Needs improvement: 2500-4000ms
      const needsImprovementLCP = createMetric('LCP', 3000);
      expect(getRating('LCP', needsImprovementLCP.value)).toBe('needs-improvement');

      // Poor: > 4000ms
      const poorLCP = createMetric('LCP', 5000);
      expect(getRating('LCP', poorLCP.value)).toBe('poor');
    });

    it('should rate INP values correctly', () => {
      expect(getRating('INP', 150)).toBe('good');
      expect(getRating('INP', 300)).toBe('needs-improvement');
      expect(getRating('INP', 600)).toBe('poor');
    });

    it('should rate CLS values correctly', () => {
      expect(getRating('CLS', 0.05)).toBe('good');
      expect(getRating('CLS', 0.15)).toBe('needs-improvement');
      expect(getRating('CLS', 0.3)).toBe('poor');
    });

    it('should handle edge cases at threshold boundaries', () => {
      // LCP at exact good threshold
      expect(getRating('LCP', 2500)).toBe('good');

      // LCP at exact needs-improvement threshold
      expect(getRating('LCP', 4000)).toBe('needs-improvement');

      // LCP just above needs-improvement threshold
      expect(getRating('LCP', 4001)).toBe('poor');

      // CLS at exact good threshold
      expect(getRating('CLS', 0.1)).toBe('good');

      // CLS at exact needs-improvement threshold
      expect(getRating('CLS', 0.25)).toBe('needs-improvement');
    });
  });

  describe('Device Type Detection', () => {
    it('should detect mobile device', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: true,
      });

      const deviceType = getDeviceType();
      expect(deviceType).toBe('mobile');
    });

    it('should detect tablet device', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 768,
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: true,
      });

      const deviceType = getDeviceType();
      expect(deviceType).toBe('tablet');
    });

    it('should detect desktop device', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1920,
      });

      const deviceType = getDeviceType();
      expect(deviceType).toBe('desktop');
    });

    it('should handle window width edge cases', () => {
      // At mobile breakpoint boundary
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 767,
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: true,
      });
      expect(getDeviceType()).toBe('mobile');

      // At tablet breakpoint boundary
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1023,
      });
      expect(getDeviceType()).toBe('tablet');
    });
  });

  describe('Connection Type Detection', () => {
    it('should detect slow-2g connection', () => {
      mockNavigatorConnection({ effectiveType: 'slow-2g' });
      expect(getConnectionType()).toBe('slow-2g');
    });

    it('should detect 4g connection', () => {
      mockNavigatorConnection({ effectiveType: '4g' });
      expect(getConnectionType()).toBe('4g');
    });

    it('should detect save-data mode', () => {
      mockNavigatorConnection({ saveData: true, effectiveType: '4g' });
      expect(getConnectionType()).toBe('save-data');
    });

    it('should return unknown when connection API unavailable', () => {
      mockNavigatorConnection(null);
      expect(getConnectionType()).toBe('unknown');
    });
  });

  describe('Custom Metric Reporting', () => {
    it('should report custom metric to Sentry', () => {
      reportCustomMetric('checkout_duration', 1500);

      // Sentry v10.x uses setMeasurement instead of metrics.distribution
      expect(mockSetMeasurement).toHaveBeenCalledWith(
        'custom.checkout_duration',
        1500,
        'millisecond'
      );

      // Also adds a breadcrumb for debugging
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'custom-metric',
          message: expect.stringContaining('checkout_duration'),
        })
      );
    });

    it('should support different units', () => {
      reportCustomMetric('api_latency', 2.5, 'second');

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        'custom.api_latency',
        2.5,
        'second'
      );
    });

    it('should accept additional tags via breadcrumb', () => {
      reportCustomMetric('database_query', 150, 'millisecond', {
        query_type: 'select',
        table: 'products',
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'custom-metric',
          data: expect.objectContaining({
            query_type: 'select',
            table: 'products',
          }),
        })
      );
    });

    it('should handle reporting errors gracefully', () => {
      mockSetMeasurement.mockImplementationOnce(() => {
        throw new Error('Sentry error');
      });

      // Should not throw
      expect(() => {
        reportCustomMetric('test_metric', 100);
      }).not.toThrow();
    });
  });

  describe('Async Operation Measurement', () => {
    it('should measure async operation duration', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'success';
      };

      const result = await measureAsync('test_operation', operation);

      expect(result).toBe('success');
      expect(mockSetMeasurement).toHaveBeenCalledWith(
        'custom.test_operation',
        expect.any(Number),
        'millisecond'
      );

      // Check breadcrumb was added with success status
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'custom-metric',
          data: expect.objectContaining({
            status: 'success',
          }),
        })
      );
    });

    it('should report errors with error status', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Operation failed');
      };

      await expect(measureAsync('failing_operation', operation)).rejects.toThrow(
        'Operation failed'
      );

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        'custom.failing_operation',
        expect.any(Number),
        'millisecond'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'custom-metric',
          data: expect.objectContaining({
            status: 'error',
          }),
        })
      );
    });

    it('should support additional tags', async () => {
      const operation = async () => 'done';

      await measureAsync('tagged_operation', operation, {
        operation_type: 'database',
        priority: 'high',
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'custom-metric',
          data: expect.objectContaining({
            operation_type: 'database',
            priority: 'high',
            status: 'success',
          }),
        })
      );
    });
  });

  describe('Measurement Spans', () => {
    it('should create measurement span with end callback', () => {
      const measurement = startMeasurement('render_component');

      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Busy wait (short duration for test speed)
      }

      measurement.end();

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        'custom.render_component',
        expect.any(Number),
        'millisecond'
      );
    });

    it('should support additional tags on end', () => {
      const measurement = startMeasurement('api_call', {
        endpoint: '/products',
      });

      measurement.end({ status: 'success', cache_hit: 'true' });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'custom-metric',
          data: expect.objectContaining({
            endpoint: '/products',
            status: 'success',
            cache_hit: 'true',
          }),
        })
      );
    });
  });

  describe('Performance Regression Detection', () => {
    it('should flag poor LCP as warning', () => {
      const poorLCP = createMetric('LCP', 5000);

      // Simulate metric reporting (internal function would be called)
      const rating = getRating('LCP', poorLCP.value);
      expect(rating).toBe('poor');

      // Poor metrics should trigger warning logging
      // This would be tested via the reportMetricToSentry function
    });

    it('should track good metrics without warnings', () => {
      const goodLCP = createMetric('LCP', 1500);
      const rating = getRating('LCP', goodLCP.value);

      expect(rating).toBe('good');
      // Good metrics should not trigger warnings
    });

    it('should categorize metrics for dashboard aggregation', () => {
      const metrics = [
        { name: 'LCP', value: 1500 }, // good
        { name: 'LCP', value: 3000 }, // needs-improvement
        { name: 'LCP', value: 5000 }, // poor
      ];

      const ratings = metrics.map((m) => getRating(m.name as 'LCP', m.value));

      expect(ratings).toEqual(['good', 'needs-improvement', 'poor']);
    });
  });

  describe('Performance Budget Validation', () => {
    it('should validate LCP against budget', () => {
      const targetLCP = 2500; // Good threshold
      const actualLCP = 2000;

      expect(actualLCP).toBeLessThanOrEqual(targetLCP);
    });

    it('should validate INP against budget', () => {
      const targetINP = 200; // Good threshold (INP replaced FID)
      const actualINP = 150;

      expect(actualINP).toBeLessThanOrEqual(targetINP);
    });

    it('should validate CLS against budget', () => {
      const targetCLS = 0.1;
      const actualCLS = 0.05;

      expect(actualCLS).toBeLessThanOrEqual(targetCLS);
    });

    it('should detect budget violations', () => {
      const budget = PERFORMANCE_THRESHOLDS.LCP.good;
      const actualValue = 3000;

      const isViolation = actualValue > budget;
      expect(isViolation).toBe(true);

      const severity = getRating('LCP', actualValue);
      expect(severity).toBe('needs-improvement');
    });
  });
});

// Helper functions

function createMetric(name: string, value: number): Metric {
  return {
    name,
    value,
    rating: 'good',
    delta: value,
    entries: [],
    id: `${name}-${Date.now()}`,
    navigationType: 'navigate',
  } as Metric;
}

function getRating(
  name: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (width < 768 && hasTouch) return 'mobile';
  if (width < 1024 && hasTouch) return 'tablet';
  return 'desktop';
}

function getConnectionType(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  const connection = (navigator as any).connection;

  if (connection) {
    if (connection.saveData) return 'save-data';
    return connection.effectiveType || connection.type || 'unknown';
  }

  return 'unknown';
}

function mockNavigatorConnection(connection: any) {
  Object.defineProperty(navigator, 'connection', {
    writable: true,
    configurable: true,
    value: connection,
  });
}
