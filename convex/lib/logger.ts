/**
 * Structured Logger for Convex Backend Functions
 *
 * Provides consistent, structured logging across all Convex backend functions.
 * In production, these logs are captured by Convex's logging infrastructure
 * and can be viewed in the Convex dashboard.
 *
 * Features:
 * - Structured JSON logging for easy parsing and filtering
 * - ISO timestamps for correlation
 * - Context objects for additional metadata
 * - Debug logs suppressed in production
 * - Scoped loggers for component-specific prefixes
 *
 * @example
 * ```typescript
 * import { logger } from './lib/logger';
 *
 * logger.debug('Processing cart', { cartId: '123' });
 * logger.info('Order created', { orderId: '456', total: 1500 });
 * logger.warn('Low stock detected', { productId: '789', remaining: 5 });
 * logger.error('Payment failed', error, { orderId: '456' });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Check if we're in production mode
 * In Convex, NODE_ENV is 'production' when deployed
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Format a structured log entry
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Log a debug message (development only)
 * Suppressed in production to reduce log volume
 */
function debug(message: string, context?: LogContext): void {
  if (!isProduction()) {
    console.debug(formatLog('debug', message, context));
  }
}

/**
 * Log an informational message
 * Always logged for operational visibility
 */
function info(message: string, context?: LogContext): void {
  console.info(formatLog('info', message, context));
}

/**
 * Log a warning message
 * Used for non-critical issues that should be monitored
 */
function warn(message: string, context?: LogContext): void {
  console.warn(formatLog('warn', message, context));
}

/**
 * Log an error message with optional error object
 * Captures stack trace when error object is provided
 *
 * @param message - Error description
 * @param errorObj - The error object (optional)
 * @param context - Additional context
 */
function error(
  message: string,
  errorObj?: Error | unknown,
  context?: LogContext
): void {
  const errorContext =
    errorObj instanceof Error
      ? { ...context, error: errorObj.message, stack: errorObj.stack }
      : errorObj !== undefined
        ? { ...context, error: String(errorObj) }
        : context;

  console.error(formatLog('error', message, errorContext));
}

/**
 * Create a scoped logger with a prefix
 * Useful for module-specific logging
 *
 * @example
 * ```typescript
 * const paymentLogger = logger.scope('Payments');
 * paymentLogger.info('Payment initiated', { orderId: '123' });
 * // Output: [2024-01-15T10:30:00.000Z] [INFO] [Payments] Payment initiated {"orderId":"123"}
 * ```
 */
function scope(prefix: string) {
  return {
    debug: (msg: string, ctx?: LogContext) => debug(`[${prefix}] ${msg}`, ctx),
    info: (msg: string, ctx?: LogContext) => info(`[${prefix}] ${msg}`, ctx),
    warn: (msg: string, ctx?: LogContext) => warn(`[${prefix}] ${msg}`, ctx),
    error: (msg: string, errObj?: Error | unknown, ctx?: LogContext) =>
      error(`[${prefix}] ${msg}`, errObj, ctx),
  };
}

/**
 * Main logger object for Convex backend
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  scope,
};

export default logger;
