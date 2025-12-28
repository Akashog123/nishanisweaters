/**
 * Sentry Configuration
 *
 * Initializes Sentry error tracking for production environments.
 * Includes browser tracing for performance monitoring.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/
 */

import * as Sentry from '@sentry/react';

/**
 * Sentry initialization options
 */
export interface SentryConfig {
  /** Custom DSN override (defaults to VITE_SENTRY_DSN env var) */
  dsn?: string;
  /** Environment name (defaults to import.meta.env.MODE) */
  environment?: string;
  /** Sample rate for performance tracing (0.0 - 1.0) */
  tracesSampleRate?: number;
  /** Sample rate for session replays (0.0 - 1.0) */
  replaysSessionSampleRate?: number;
  /** Sample rate for session replays when an error occurs (0.0 - 1.0) */
  replaysOnErrorSampleRate?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Default Sentry configuration values
 */
const DEFAULT_CONFIG: Required<Omit<SentryConfig, 'dsn' | 'environment'>> = {
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  debug: false,
};

/**
 * Initialize Sentry error tracking
 *
 * Should be called before React renders in main.tsx.
 * Only initializes in production mode unless explicitly configured otherwise.
 *
 * @param config - Optional configuration overrides
 * @returns boolean - Whether Sentry was initialized
 *
 * @example
 * ```typescript
 * // In main.tsx
 * import { initSentry } from '@/lib/sentry';
 * initSentry();
 * ```
 */
export function initSentry(config: SentryConfig = {}): boolean {
  const dsn = config.dsn || import.meta.env.VITE_SENTRY_DSN;
  const environment = config.environment || import.meta.env.MODE;

  // Only initialize in production or if DSN is explicitly provided
  if (!import.meta.env.PROD && !config.dsn) {
    return false;
  }

  // DSN is required for initialization
  if (!dsn) {
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment,

      // Integrations for enhanced error tracking
      integrations: [
        // Browser tracing for performance monitoring
        Sentry.browserTracingIntegration(),

        // Session replay for debugging user interactions
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate ?? DEFAULT_CONFIG.tracesSampleRate,

      // Session Replay
      replaysSessionSampleRate: config.replaysSessionSampleRate ?? DEFAULT_CONFIG.replaysSessionSampleRate,
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? DEFAULT_CONFIG.replaysOnErrorSampleRate,

      // Debug mode
      debug: config.debug ?? DEFAULT_CONFIG.debug,

      // Filter out certain errors
      beforeSend(event, hint) {
        const error = hint.originalException;

        if (error instanceof Error) {
          const message = error.message.toLowerCase();

          // Skip errors from ad blockers or browser extensions
          if (message.includes('script error') && !event.exception?.values?.[0]?.stacktrace) {
            return null;
          }

          // Skip ResizeObserver errors (common browser noise)
          if (message.includes('resizeobserver')) {
            return null;
          }
        }

        return event;
      },

      // Set initial scope
      initialScope: {
        tags: {
          app: 'nishani-woolera',
        },
      },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Sentry is currently initialized
 */
export function isSentryInitialized(): boolean {
  return Sentry.isInitialized();
}

/**
 * Capture an error and send it to Sentry
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): string | undefined {
  if (!isSentryInitialized()) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    return Sentry.captureException(error);
  });
}

/**
 * Capture a message and send it to Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isSentryInitialized()) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    scope.setLevel(level);
    return Sentry.captureMessage(message);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; username?: string } | null): void {
  if (!isSentryInitialized()) {
    return;
  }

  if (user) {
    Sentry.setUser(user);
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add a breadcrumb for debugging context
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>
): void {
  if (!isSentryInitialized()) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
}

// Re-export Sentry for direct access when needed
export { Sentry };
