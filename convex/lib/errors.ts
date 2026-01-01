/**
 * Error Factory Module
 *
 * Centralized error creation with consistent error codes and messages.
 * This ensures all Convex errors follow the same structure and makes
 * error handling predictable across the application.
 *
 * USAGE:
 * Instead of: throw new ConvexError({ code: "NOT_FOUND", message: "..." })
 * Use:        throw notFound("Order")
 *
 * BENEFITS:
 * - Consistent error codes across the codebase
 * - Type-safe error creation
 * - Centralized error messages for easy localization
 * - Reduced boilerplate
 */

import { ConvexError } from "convex/values";

// ============================================
// ERROR CODES REGISTRY
// ============================================

/**
 * All error codes used in the application.
 * Adding a new code here makes it available throughout the system.
 */
export const ErrorCodes = {
  // Generic errors
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // Authentication errors
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  // Order errors
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_ALREADY_PAID: "ORDER_ALREADY_PAID",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",

  // Payment errors
  PAYMENT_ERROR: "PAYMENT_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Promo code errors
  INVALID_CODE: "INVALID_CODE",
  INACTIVE_CODE: "INACTIVE_CODE",
  CODE_NOT_STARTED: "CODE_NOT_STARTED",
  EXPIRED: "EXPIRED",
  LIMIT_REACHED: "LIMIT_REACHED",
  USER_LIMIT: "USER_LIMIT",
  EMPTY_CART: "EMPTY_CART",
  MIN_NOT_MET: "MIN_NOT_MET",
  CATEGORY_NOT_APPLICABLE: "CATEGORY_NOT_APPLICABLE",
  DUPLICATE_CODE: "DUPLICATE_CODE",
  INVALID_CODE_FORMAT: "INVALID_CODE_FORMAT",
  INVALID_DISCOUNT: "INVALID_DISCOUNT",
  INVALID_DATES: "INVALID_DATES",

  // Cart errors
  CART_NOT_FOUND: "CART_NOT_FOUND",

  // Product errors
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// ============================================
// DEFAULT ERROR MESSAGES
// ============================================

const DEFAULT_MESSAGES: Partial<Record<ErrorCode, string>> = {
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Authentication required. Please sign in to continue.",
  FORBIDDEN: "Access denied. You don't have permission to perform this action.",
  VALIDATION_ERROR: "Validation failed",
  CONFIGURATION_ERROR: "System configuration error",
  INTERNAL_ERROR: "An internal error occurred",
  USER_NOT_FOUND: "User profile not found. Please complete registration.",
  ORDER_NOT_FOUND: "Order not found",
  ORDER_ALREADY_PAID: "This order has already been paid",
  ORDER_CANCELLED: "Cannot perform action on a cancelled order",
  PAYMENT_ERROR: "Payment processing failed. Please try again.",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try again.",
  INVALID_CODE: "Invalid promo code",
  INACTIVE_CODE: "This promo code is no longer active",
  EXPIRED: "This promo code has expired",
  LIMIT_REACHED: "This promo code has reached its usage limit",
  USER_LIMIT: "You have already used this promo code",
  EMPTY_CART: "Your cart is empty",
  CART_NOT_FOUND: "Cart not found",
  PRODUCT_NOT_FOUND: "Product not found",
  VARIANT_NOT_FOUND: "Product variant not found",
  INSUFFICIENT_STOCK: "Insufficient stock available",
};

// ============================================
// ERROR DETAILS TYPE
// ============================================

export interface ErrorDetails {
  field?: string;
  userRole?: string;
  requiredRole?: string;
  currentStatus?: string;
  validStatuses?: string[];
}

// ============================================
// CORE ERROR FACTORY
// ============================================

/**
 * Creates a ConvexError with consistent structure.
 *
 * @param code - Error code from ErrorCodes
 * @param customMessage - Optional custom message (overrides default)
 * @param details - Optional additional error details
 */
export function createError(
  code: ErrorCode,
  customMessage?: string,
  details?: ErrorDetails
): ConvexError<{ code: string; message: string; field?: string; userRole?: string; requiredRole?: string; currentStatus?: string; validStatuses?: string[] }> {
  const message = customMessage || DEFAULT_MESSAGES[code] || `Error: ${code}`;

  return new ConvexError({
    code,
    message,
    ...(details?.field && { field: details.field }),
    ...(details?.userRole && { userRole: details.userRole }),
    ...(details?.requiredRole && { requiredRole: details.requiredRole }),
    ...(details?.currentStatus && { currentStatus: details.currentStatus }),
    ...(details?.validStatuses && { validStatuses: details.validStatuses }),
  });
}

// ============================================
// CONVENIENCE ERROR FACTORIES
// ============================================

/**
 * Resource not found error.
 * @param resource - Name of the resource (e.g., "Order", "User", "Product")
 */
export function notFound(resource = "Resource"): ConvexError<{ code: string; message: string }> {
  return createError("NOT_FOUND", `${resource} not found`);
}

/**
 * Authentication required error.
 * @param message - Optional custom message
 */
export function unauthorized(message?: string): ConvexError<{ code: string; message: string }> {
  return createError("UNAUTHORIZED", message);
}

/**
 * Access denied error.
 * @param message - Optional custom message explaining why access was denied
 */
export function forbidden(message?: string): ConvexError<{ code: string; message: string }> {
  return createError("FORBIDDEN", message);
}

/**
 * Access denied due to role requirements.
 * @param requiredRole - The role that was required
 * @param userRole - The user's current role
 */
export function forbiddenRole(
  requiredRole: string,
  userRole: string
) {
  const capitalizedRole = requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1);
  return createError(
    "FORBIDDEN",
    `Access denied. ${capitalizedRole} role required.`,
    { userRole, requiredRole }
  );
}

/**
 * Validation error for a specific field.
 * @param message - Error message describing the validation failure
 * @param field - Optional field name that failed validation
 */
export function validationError(
  message: string,
  field?: string
) {
  return createError("VALIDATION_ERROR", message, field ? { field } : undefined);
}

/**
 * Order not found error.
 */
export function orderNotFound(): ConvexError<{ code: string; message: string }> {
  return createError("ORDER_NOT_FOUND");
}

/**
 * Invalid order status transition error.
 * @param fromStatus - Current status
 * @param toStatus - Attempted new status
 * @param validStatuses - List of valid next statuses
 */
export function invalidStatusTransition(
  fromStatus: string,
  toStatus: string,
  validStatuses: string[]
) {
  return createError(
    "VALIDATION_ERROR",
    `Invalid status transition from "${fromStatus}" to "${toStatus}". Valid next states: ${validStatuses.join(", ") || "none"}`,
    { currentStatus: fromStatus, validStatuses }
  );
}

/**
 * Product not found error.
 */
export function productNotFound(): ConvexError<{ code: string; message: string }> {
  return createError("NOT_FOUND", "Product not found");
}

/**
 * Variant not found error.
 */
export function variantNotFound(): ConvexError<{ code: string; message: string }> {
  return createError("NOT_FOUND", "Variant not found");
}

/**
 * Promo code error.
 * @param code - Specific promo code error code
 * @param message - Custom message
 */
export function promoCodeError(
  code: Extract<ErrorCode,
    | "INVALID_CODE"
    | "INACTIVE_CODE"
    | "CODE_NOT_STARTED"
    | "EXPIRED"
    | "LIMIT_REACHED"
    | "USER_LIMIT"
    | "MIN_NOT_MET"
    | "CATEGORY_NOT_APPLICABLE"
    | "DUPLICATE_CODE"
    | "INVALID_CODE_FORMAT"
    | "INVALID_DISCOUNT"
    | "INVALID_DATES"
  >,
  message?: string
): ConvexError<{ code: string; message: string }> {
  return createError(code, message);
}

/**
 * Configuration error.
 * @param message - Description of the configuration issue
 */
export function configurationError(
  message: string
): ConvexError<{ code: string; message: string }> {
  return createError("CONFIGURATION_ERROR", message);
}

/**
 * Service unavailable error.
 * @param service - Name of the unavailable service
 */
export function serviceUnavailable(
  service = "Service"
): ConvexError<{ code: string; message: string }> {
  return createError(
    "SERVICE_UNAVAILABLE",
    `${service} is temporarily unavailable. Please try again in a few moments.`
  );
}

/**
 * Payment error.
 * @param message - Optional custom message
 */
export function paymentError(message?: string): ConvexError<{ code: string; message: string }> {
  return createError("PAYMENT_ERROR", message);
}

/**
 * User not found error (for auth flows).
 */
export function userNotFound(): ConvexError<{ code: string; message: string }> {
  return createError("USER_NOT_FOUND");
}

/**
 * Cart-related errors.
 */
export function cartNotFound(): ConvexError<{ code: string; message: string }> {
  return createError("CART_NOT_FOUND");
}

export function emptyCart(): ConvexError<{ code: string; message: string }> {
  return createError("EMPTY_CART");
}
