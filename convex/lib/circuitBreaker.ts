/**
 * Circuit Breaker Pattern Implementation
 *
 * Implements the circuit breaker pattern for external service calls (payment gateway, etc.)
 * to prevent cascading failures and provide graceful degradation.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit is tripped, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered
 *
 * In Convex, we use the database to persist circuit breaker state since
 * actions run in stateless Node.js environments.
 */

import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

// ============================================
// TYPES
// ============================================

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  /** Service identifier (e.g., "razorpay", "email_provider") */
  serviceName: string;
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (half-open) */
  resetTimeoutMs: number;
  /** Number of successful requests in half-open to close circuit */
  successThreshold: number;
}

export interface CircuitBreakerState {
  serviceName: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const CIRCUIT_BREAKER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  razorpay: {
    serviceName: "razorpay",
    failureThreshold: 5,         // Open after 5 consecutive failures
    resetTimeoutMs: 30000,       // Try again after 30 seconds
    successThreshold: 2,         // Close after 2 successes in half-open
  },
  email: {
    serviceName: "email",
    failureThreshold: 3,
    resetTimeoutMs: 60000,       // 1 minute
    successThreshold: 1,
  },
};

// ============================================
// IN-MEMORY FALLBACK (for action context without DB access)
// ============================================

// In-memory cache for circuit breaker state
// Used as fallback when database is not accessible
const circuitStateCache = new Map<string, CircuitBreakerState>();

function getDefaultState(serviceName: string): CircuitBreakerState {
  return {
    serviceName,
    state: "closed",
    failureCount: 0,
    successCount: 0,
    lastFailureTime: null,
    lastSuccessTime: null,
    lastStateChange: Date.now(),
  };
}

// ============================================
// CIRCUIT BREAKER FUNCTIONS
// ============================================

/**
 * Check if a request should be allowed through the circuit breaker.
 * This is a quick check that doesn't modify state.
 */
export function canExecute(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig
): { allowed: boolean; reason?: string } {
  const now = Date.now();

  switch (state.state) {
    case "closed":
      return { allowed: true };

    case "open":
      // Check if reset timeout has elapsed
      if (state.lastFailureTime && now - state.lastFailureTime >= config.resetTimeoutMs) {
        // Transition to half-open (handled by recordSuccess/recordFailure)
        return { allowed: true, reason: "Testing recovery (half-open)" };
      }
      return {
        allowed: false,
        reason: `Circuit open for ${config.serviceName}. Retry after ${
          config.resetTimeoutMs - (now - (state.lastFailureTime || now))
        }ms`,
      };

    case "half_open":
      // Allow limited requests to test recovery
      return { allowed: true, reason: "Testing recovery (half-open)" };

    default:
      return { allowed: true };
  }
}

/**
 * Record a successful request and update circuit state.
 */
export function recordSuccess(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig
): CircuitBreakerState {
  const now = Date.now();
  const newState = { ...state };

  newState.lastSuccessTime = now;
  newState.successCount += 1;
  newState.failureCount = 0; // Reset failure count on success

  switch (state.state) {
    case "half_open":
      // Check if we've hit the success threshold
      if (newState.successCount >= config.successThreshold) {
        newState.state = "closed";
        newState.lastStateChange = now;
        newState.successCount = 0;
      }
      break;

    case "closed":
      // Already closed, just reset counters
      break;

    case "open":
      // Shouldn't happen, but handle gracefully
      newState.state = "half_open";
      newState.lastStateChange = now;
      break;
  }

  return newState;
}

/**
 * Record a failed request and update circuit state.
 */
export function recordFailure(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig
): CircuitBreakerState {
  const now = Date.now();
  const newState = { ...state };

  newState.lastFailureTime = now;
  newState.failureCount += 1;
  newState.successCount = 0; // Reset success count on failure

  switch (state.state) {
    case "closed":
      // Check if we should open the circuit
      if (newState.failureCount >= config.failureThreshold) {
        newState.state = "open";
        newState.lastStateChange = now;
      }
      break;

    case "half_open":
      // Any failure in half-open immediately opens the circuit
      newState.state = "open";
      newState.lastStateChange = now;
      newState.failureCount = config.failureThreshold; // Max out to prevent quick re-entry
      break;

    case "open":
      // Already open, just update failure time
      break;
  }

  return newState;
}

/**
 * Update state for half-open transition check.
 */
export function checkHalfOpenTransition(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig
): CircuitBreakerState {
  const now = Date.now();

  if (
    state.state === "open" &&
    state.lastFailureTime &&
    now - state.lastFailureTime >= config.resetTimeoutMs
  ) {
    return {
      ...state,
      state: "half_open",
      lastStateChange: now,
      successCount: 0,
    };
  }

  return state;
}

// ============================================
// ACTION-COMPATIBLE WRAPPER
// ============================================

/**
 * Circuit breaker wrapper for use in Convex actions.
 * Since actions can call mutations, we use the database for state persistence.
 */
export async function withCircuitBreaker<T>(
  ctx: ActionCtx,
  config: CircuitBreakerConfig,
  operation: () => Promise<T>
): Promise<{ success: true; result: T } | { success: false; error: string; circuitOpen: boolean }> {
  // Get current state from database via internal query
  let state: CircuitBreakerState;
  try {
    state = await ctx.runQuery(internal.circuitBreakerState.getState, {
      serviceName: config.serviceName,
    });
  } catch {
    // Fallback to in-memory if database query fails
    state = circuitStateCache.get(config.serviceName) || getDefaultState(config.serviceName);
  }

  // Check for half-open transition
  state = checkHalfOpenTransition(state, config);

  // Check if request is allowed
  const { allowed, reason } = canExecute(state, config);

  if (!allowed) {
    return {
      success: false,
      error: reason || `Circuit breaker open for ${config.serviceName}`,
      circuitOpen: true,
    };
  }

  try {
    // Execute the operation
    const result = await operation();

    // Record success
    const newState = recordSuccess(state, config);

    // Persist state
    try {
      await ctx.runMutation(internal.circuitBreakerState.setState, {
        serviceName: config.serviceName,
        state: newState.state,
        failureCount: newState.failureCount,
        successCount: newState.successCount,
        lastFailureTime: newState.lastFailureTime,
        lastSuccessTime: newState.lastSuccessTime,
        lastStateChange: newState.lastStateChange,
      });
    } catch {
      // Fallback to in-memory
      circuitStateCache.set(config.serviceName, newState);
    }

    return { success: true, result };
  } catch (error) {
    // Record failure
    const newState = recordFailure(state, config);

    // Persist state
    try {
      await ctx.runMutation(internal.circuitBreakerState.setState, {
        serviceName: config.serviceName,
        state: newState.state,
        failureCount: newState.failureCount,
        successCount: newState.successCount,
        lastFailureTime: newState.lastFailureTime,
        lastSuccessTime: newState.lastSuccessTime,
        lastStateChange: newState.lastStateChange,
      });
    } catch {
      // Fallback to in-memory
      circuitStateCache.set(config.serviceName, newState);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      circuitOpen: newState.state === "open",
    };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Create a circuit breaker wrapper for a specific service.
 */
export function createCircuitBreaker(serviceName: keyof typeof CIRCUIT_BREAKER_CONFIGS) {
  const config = CIRCUIT_BREAKER_CONFIGS[serviceName];

  return {
    config,

    /**
     * Execute an operation with circuit breaker protection.
     */
    execute: <T>(ctx: ActionCtx, operation: () => Promise<T>) =>
      withCircuitBreaker(ctx, config, operation),

    /**
     * Get the current circuit state (for monitoring).
     */
    getState: async (ctx: ActionCtx): Promise<CircuitBreakerState> => {
      try {
        return await ctx.runQuery(internal.circuitBreakerState.getState, {
          serviceName: config.serviceName,
        });
      } catch {
        return circuitStateCache.get(serviceName) || getDefaultState(serviceName);
      }
    },
  };
}

// Pre-configured circuit breakers
export const razorpayCircuitBreaker = createCircuitBreaker("razorpay");
export const emailCircuitBreaker = createCircuitBreaker("email");

// ============================================
// TIMEOUT UTILITIES
// ============================================

/** Default timeout for external API calls (10 seconds) */
export const DEFAULT_API_TIMEOUT_MS = 10000;

/** Timeout for payment gateway operations (15 seconds - critical path) */
export const PAYMENT_TIMEOUT_MS = 15000;

/**
 * Wrap a promise with a timeout.
 * If the promise doesn't resolve within the specified time, it rejects with a timeout error.
 *
 * PERFORMANCE: Prevents slow external APIs from blocking user requests indefinitely.
 * This is especially important for payment gateways where delays can cause poor UX.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = "Operation"
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Execute an operation with both circuit breaker protection and timeout.
 * Use this for external API calls that need both resilience patterns.
 */
export async function withCircuitBreakerAndTimeout<T>(
  ctx: ActionCtx,
  config: CircuitBreakerConfig,
  operation: () => Promise<T>,
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
  operationName = "External API call"
): Promise<{ success: true; result: T } | { success: false; error: string; circuitOpen: boolean }> {
  return withCircuitBreaker(ctx, config, () =>
    withTimeout(operation(), timeoutMs, operationName)
  );
}
