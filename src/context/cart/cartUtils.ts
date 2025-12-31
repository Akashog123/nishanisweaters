/**
 * Cart Utility Functions
 *
 * Helper functions for cart operations including retry logic,
 * error handling, and operation ID generation.
 */

// ============================================
// OPERATION ID GENERATION
// ============================================

/**
 * Generate a unique operation ID for tracking optimistic updates
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// RETRY CONFIGURATION & LOGIC
// ============================================

/**
 * Retry configuration for cart mutations
 * Uses exponential backoff with jitter to avoid thundering herd
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
} as const;

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * Example:
 * - Attempt 0: ~1000ms (1s)
 * - Attempt 1: ~2000ms (2s)
 * - Attempt 2: ~4000ms (4s)
 * - Attempt 3: ~5000ms (capped at max)
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay
  );
  // Add 20% jitter to prevent synchronized retries
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}

/**
 * Determine if an error is transient and should be retried
 *
 * Transient errors include:
 * - Network connectivity issues
 * - Timeouts
 * - Rate limiting (429)
 * - Service unavailable (503)
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("temporarily") ||
      message.includes("503") ||
      message.includes("429")
    );
  }
  return false;
}

// ============================================
// ERROR MESSAGE MAPPING
// ============================================

/**
 * Map technical errors to user-friendly messages
 *
 * This is important for UX - users shouldn't see stack traces
 * or technical jargon when something goes wrong.
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Map specific error types to friendly messages
    const errorMappings: [string, string][] = [
      ["Insufficient stock", "Sorry, not enough stock available"],
      ["Product not found", "This product is no longer available"],
      ["Variant not found", "This size/color combination is no longer available"],
      ["Cart not found", "Your cart session has expired. Please refresh the page."],
      ["network", "Connection issue. Please check your internet and try again."],
      ["timeout", "Connection issue. Please check your internet and try again."],
      ["rate limit", "Too many requests. Please wait a moment and try again."],
    ];

    for (const [pattern, friendlyMessage] of errorMappings) {
      if (message.includes(pattern)) {
        return friendlyMessage;
      }
    }

    // If it's already a user-friendly message, return it
    if (!message.includes("Error") && message.length < 100) {
      return message;
    }
  }

  return "Something went wrong. Please try again.";
}
