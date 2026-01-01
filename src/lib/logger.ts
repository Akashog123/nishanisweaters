/**
 * Production-safe Logging Utility
 *
 * Provides structured logging that:
 * - Uses console.* in development for debugging
 * - Routes errors to Sentry in production
 * - Suppresses non-essential logs in production
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('User clicked button', { buttonId: 'submit' });
 * logger.info('Order created', { orderId: '123' });
 * logger.warn('API rate limit approaching', { remaining: 10 });
 * logger.error('Payment failed', new Error('Card declined'), { userId: '123' });
 * ```
 */

import { captureError, captureMessage, addBreadcrumb, isSentryInitialized } from './sentry';


interface LogContext {
  [key: string]: unknown;
}

/**
 * Check if we're in development mode
 */
const isDevelopment = (): boolean => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Format log message with context
 */
function formatMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  return `${message} ${JSON.stringify(context)}`;
}

/**
 * Log a debug message (development only)
 */
function debug(message: string, context?: LogContext): void {
  if (isDevelopment()) {
    console.debug(`[DEBUG] ${formatMessage(message, context)}`);
  }
  // Add breadcrumb for Sentry context even if not logging
  if (isSentryInitialized()) {
    addBreadcrumb(message, 'debug', context);
  }
}

/**
 * Log an informational message
 */
function info(message: string, context?: LogContext): void {
  if (isDevelopment()) {
    console.info(`[INFO] ${formatMessage(message, context)}`);
  }
  // Add breadcrumb for Sentry context
  if (isSentryInitialized()) {
    addBreadcrumb(message, 'info', context);
  }
}

/**
 * Log a warning message
 */
function warn(message: string, context?: LogContext): void {
  if (isDevelopment()) {
    console.warn(`[WARN] ${formatMessage(message, context)}`);
  } else if (isSentryInitialized()) {
    // In production, send warnings to Sentry
    captureMessage(message, 'warning', context);
  }
}

/**
 * Log an error message and optionally capture to Sentry
 *
 * @param message - Error description
 * @param error - The error object (optional)
 * @param context - Additional context
 */
function error(message: string, errorObj?: Error | unknown, context?: LogContext): void {
  const fullContext = {
    ...context,
    message,
  };

  if (isDevelopment()) {
    console.error(`[ERROR] ${message}`, errorObj, context);
  }

  // Always send errors to Sentry in production
  if (isSentryInitialized()) {
    if (errorObj instanceof Error) {
      captureError(errorObj, fullContext);
    } else if (errorObj) {
      // Convert non-Error to Error for Sentry
      const syntheticError = new Error(message);
      captureError(syntheticError, { ...fullContext, originalError: errorObj });
    } else {
      captureMessage(message, 'error', fullContext);
    }
  }
}

/**
 * Create a scoped logger with a prefix
 *
 * @example
 * ```typescript
 * const componentLogger = logger.scope('UserProfile');
 * componentLogger.info('Loaded'); // [UserProfile] Loaded
 * ```
 */
function scope(prefix: string) {
  return {
    debug: (message: string, context?: LogContext) => debug(`[${prefix}] ${message}`, context),
    info: (message: string, context?: LogContext) => info(`[${prefix}] ${message}`, context),
    warn: (message: string, context?: LogContext) => warn(`[${prefix}] ${message}`, context),
    error: (message: string, errorObj?: Error | unknown, context?: LogContext) =>
      error(`[${prefix}] ${message}`, errorObj, context),
  };
}

/**
 * Main logger object
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  scope,
};

// Default export
export default logger;
