/**
 * Sentry Configuration
 *
 * Initializes Sentry error tracking for production environments.
 * Includes browser tracing for performance monitoring with intelligent sampling.
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
  /** Sample rate for performance tracing (0.0 - 1.0) - used as fallback */
  tracesSampleRate?: number;
  /** Sample rate for session replays (0.0 - 1.0) */
  replaysSessionSampleRate?: number;
  /** Sample rate for session replays when an error occurs (0.0 - 1.0) */
  replaysOnErrorSampleRate?: number;
  /** Sample rate for performance profiling (0.0 - 1.0) */
  profilesSampleRate?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Default Sentry configuration values
 */
const DEFAULT_CONFIG: Required<Omit<SentryConfig, 'dsn' | 'environment'>> = {
  tracesSampleRate: 0.1, // 10% of transactions (fallback)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  profilesSampleRate: 0.1, // 10% of traced transactions get profiling
  debug: false,
};

/**
 * Trace propagation targets for distributed tracing
 * These are the services that should receive trace context headers
 */
const TRACE_PROPAGATION_TARGETS: (string | RegExp)[] = [
  // Convex backend
  /^https:\/\/.*\.convex\.cloud/,
  /^https:\/\/.*\.convex\.dev/,
  // Razorpay payment gateway
  /^https:\/\/api\.razorpay\.com/,
  /^https:\/\/checkout\.razorpay\.com/,
  // Clerk authentication
  /^https:\/\/.*\.clerk\.accounts\.dev/,
  /^https:\/\/clerk\..*\.com/,
  // Same origin requests
  'localhost',
  /^\//,
];

/**
 * PII fields to mask in session replays
 */
const PII_SELECTORS = [
  // Form inputs with sensitive data
  'input[type="password"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[name*="card"]',
  'input[name*="cvv"]',
  'input[name*="cvc"]',
  'input[name*="expiry"]',
  'input[name*="phone"]',
  'input[name*="address"]',
  'input[name*="zip"]',
  'input[name*="postal"]',
  'input[name*="pan"]',
  // Specific field identifiers
  '[data-sensitive]',
  '[data-pii]',
  '.pii-field',
  '.sensitive-data',
  // Payment related
  '.razorpay-container',
  '#razorpay-container',
  '[class*="payment"]',
  // User profile data
  '.user-email',
  '.user-phone',
  '.user-address',
];

/**
 * Intelligent trace sampler based on transaction context
 *
 * Sampling strategy:
 * - 100% for payment transactions (critical path)
 * - 50% for checkout flow
 * - 25% for page loads
 * - 10% for everything else
 */
function tracesSampler(samplingContext: {
  name?: string;
  parentSampled?: boolean;
  attributes?: Record<string, unknown>;
  transactionContext?: {
    name?: string;
    op?: string;
    tags?: Record<string, string>;
  };
}): number {
  const transactionName = samplingContext.name || samplingContext.transactionContext?.name || '';
  const op = samplingContext.transactionContext?.op || '';

  // Always sample if parent was sampled (distributed tracing continuity)
  if (samplingContext.parentSampled !== undefined) {
    return samplingContext.parentSampled ? 1.0 : 0.0;
  }

  // 100% sampling for payment transactions (critical business flow)
  if (
    transactionName.includes('payment') ||
    transactionName.includes('razorpay') ||
    transactionName.includes('checkout') ||
    op === 'payment'
  ) {
    return 1.0;
  }

  // 50% sampling for checkout flow pages
  if (
    transactionName.includes('/checkout') ||
    transactionName.includes('/cart') ||
    transactionName.includes('/order')
  ) {
    return 0.5;
  }

  // 25% sampling for page loads
  if (op === 'pageload' || op === 'navigation') {
    return 0.25;
  }

  // 15% sampling for HTTP requests
  if (op === 'http.client' || op === 'fetch') {
    return 0.15;
  }

  // 10% sampling for everything else
  return 0.1;
}

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
        Sentry.browserTracingIntegration({
          // Enable route instrumentation for React Router
          enableInp: true,
        }),

        // Session replay for debugging user interactions with PII masking
        Sentry.replayIntegration({
          // Mask all text by default for privacy
          maskAllText: false,
          // Block media loading
          blockAllMedia: false,
          // Mask specific sensitive inputs
          mask: PII_SELECTORS,
          // Block recording in sensitive areas
          block: ['.payment-form', '#razorpay-checkout', '[data-no-record]'],
          // Additional privacy settings
          maskAllInputs: true,
          // Network request capture settings
          networkDetailAllowUrls: [
            window.location.origin,
            /^https:\/\/.*\.convex\.cloud/,
          ],
          networkDetailDenyUrls: [
            /^https:\/\/api\.razorpay\.com/,
            /^https:\/\/.*\.clerk\./,
          ],
        }),

        // Browser profiling for performance insights
        Sentry.browserProfilingIntegration(),
      ],

      // Trace propagation targets for distributed tracing
      tracePropagationTargets: TRACE_PROPAGATION_TARGETS,

      // Intelligent sampling based on transaction type
      tracesSampler,

      // Performance profiling sample rate (relative to traced transactions)
      profilesSampleRate: config.profilesSampleRate ?? DEFAULT_CONFIG.profilesSampleRate,

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

          // Skip network errors that are expected (e.g., user offline)
          if (message.includes('failed to fetch') || message.includes('network error')) {
            // Add tag but don't skip entirely
            event.tags = { ...event.tags, network_error: 'true' };
          }

          // Skip chunk load errors (usually due to deployments)
          if (message.includes('loading chunk') || message.includes('loading css chunk')) {
            event.tags = { ...event.tags, chunk_error: 'true' };
            // Could trigger a page refresh suggestion
          }
        }

        return event;
      },

      // Transaction filtering
      beforeSendTransaction(event) {
        // Filter out health check and monitoring endpoints
        if (event.transaction?.includes('/health') || event.transaction?.includes('/_next')) {
          return null;
        }
        return event;
      },

      // Set initial scope
      initialScope: {
        tags: {
          app: 'nishani-woolera',
          version: import.meta.env.VITE_APP_VERSION || 'unknown',
        },
      },

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || `nishani-woolera@${Date.now()}`,

      // Normalize depth for complex objects
      normalizeDepth: 5,

      // Maximum breadcrumbs to store
      maxBreadcrumbs: 100,

      // Attach stack traces to messages
      attachStacktrace: true,
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
 * Note: Avoid setting PII like full email - use hashed IDs when possible
 */
export function setUserContext(user: { id: string; email?: string; username?: string } | null): void {
  if (!isSentryInitialized()) {
    return;
  }

  if (user) {
    // Hash email for privacy if provided
    Sentry.setUser({
      id: user.id,
      // Only include email in non-production for debugging
      email: import.meta.env.DEV ? user.email : undefined,
      username: user.username,
    });
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

/**
 * Create a custom span for performance tracking
 */
export function startSpan<T>(
  options: {
    name: string;
    op?: string;
    attributes?: Record<string, string | number | boolean>;
  },
  callback: () => T
): T {
  return Sentry.startSpan(options, callback);
}

/**
 * Create an async span for performance tracking
 */
export async function startSpanAsync<T>(
  options: {
    name: string;
    op?: string;
    attributes?: Record<string, string | number | boolean>;
  },
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(options, callback);
}

/**
 * Set custom tags on the current scope
 */
export function setTags(tags: Record<string, string>): void {
  if (!isSentryInitialized()) {
    return;
  }

  Sentry.setTags(tags);
}

/**
 * Set extra context data on the current scope
 */
export function setExtras(extras: Record<string, unknown>): void {
  if (!isSentryInitialized()) {
    return;
  }

  Sentry.setExtras(extras);
}

// Re-export Sentry for direct access when needed
export { Sentry };
