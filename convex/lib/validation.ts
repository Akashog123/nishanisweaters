/**
 * Shared Validation Utilities
 *
 * Server-side validation helpers to ensure data integrity.
 * SECURITY: Never trust client-side validation alone.
 */

import { ConvexError } from "convex/values";

// ============================================
// VALIDATION PATTERNS
// ============================================
export const PHONE_REGEX = /^[0-9]{10}$/;
export const POSTAL_CODE_REGEX = /^[0-9]{6}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate phone number (10 digits)
 * @throws ConvexError if invalid
 */
export function validatePhone(phone: string, fieldName = "phone"): string {
  const cleanPhone = phone.replace(/\D/g, "");
  if (!PHONE_REGEX.test(cleanPhone)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `Please enter a valid 10-digit ${fieldName} number`,
      field: fieldName,
    });
  }
  return cleanPhone;
}

/**
 * Validate postal code (6 digits for India)
 * @throws ConvexError if invalid
 */
export function validatePostalCode(postalCode: string): string {
  const cleanCode = postalCode.trim();
  if (!POSTAL_CODE_REGEX.test(cleanCode)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Please enter a valid 6-digit postal code",
      field: "postalCode",
    });
  }
  return cleanCode;
}

/**
 * Validate email address
 * @throws ConvexError if invalid
 */
export function validateEmail(email: string, fieldName = "email"): string {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `Please enter a valid ${fieldName} address`,
      field: fieldName,
    });
  }
  return cleanEmail;
}

/**
 * Validate GST number (Indian format)
 * @throws ConvexError if invalid
 */
export function validateGST(gst: string): string {
  const cleanGST = gst.trim().toUpperCase();
  if (!GST_REGEX.test(cleanGST)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Please enter a valid GST number",
      field: "gstNumber",
    });
  }
  return cleanGST;
}

/**
 * Validate required string with minimum length
 * @throws ConvexError if invalid
 */
export function validateRequiredString(
  value: string,
  fieldName: string,
  minLength = 1
): string {
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message:
        minLength === 1
          ? `${fieldName} is required`
          : `${fieldName} must be at least ${minLength} characters`,
      field: fieldName,
    });
  }
  return trimmed;
}

/**
 * Validate optional email (only validates if provided)
 */
export function validateOptionalEmail(
  email: string | undefined,
  fieldName = "email"
): string | undefined {
  if (!email || email.trim() === "") {
    return undefined;
  }
  return validateEmail(email, fieldName);
}

/**
 * Validate optional phone (only validates if provided)
 */
export function validateOptionalPhone(
  phone: string | undefined,
  fieldName = "phone"
): string | undefined {
  if (!phone || phone.trim() === "") {
    return undefined;
  }
  return validatePhone(phone, fieldName);
}

/**
 * Validate optional GST (only validates if provided)
 */
export function validateOptionalGST(gst: string | undefined): string | undefined {
  if (!gst || gst.trim() === "") {
    return undefined;
  }
  return validateGST(gst);
}

// ============================================
// IP ADDRESS VALIDATION
// ============================================

/** IPv4 address format regex (e.g., "192.168.1.1") */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/** IPv6 address format regex (supports full and compressed formats) */
const IPV6_REGEX = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

/**
 * Validate IP address format (IPv4 or IPv6).
 *
 * This function is designed for webhook endpoints and logging where we need to
 * validate IP addresses extracted from headers like x-forwarded-for.
 *
 * SECURITY CONSIDERATIONS:
 * - Does NOT throw errors (webhook should still process even with invalid IP)
 * - Returns a safe fallback value for invalid IPs
 * - Prevents log injection by validating format
 * - Handles both IPv4 and IPv6 formats
 *
 * @param ip - The IP address string to validate
 * @returns The validated IP address or "invalid-ip" if validation fails
 *
 * @example
 * validateIpAddress("192.168.1.1") // Returns: "192.168.1.1"
 * validateIpAddress("::1") // Returns: "::1"
 * validateIpAddress("2001:db8::1") // Returns: "2001:db8::1"
 * validateIpAddress("not-an-ip") // Returns: "invalid-ip"
 * validateIpAddress("") // Returns: "invalid-ip"
 * validateIpAddress(undefined) // Returns: "invalid-ip"
 */
export function validateIpAddress(ip: string | undefined | null): string {
  // Handle null, undefined, or empty strings
  if (!ip || typeof ip !== "string") {
    return "invalid-ip";
  }

  const trimmed = ip.trim();

  // Empty after trimming
  if (trimmed.length === 0) {
    return "invalid-ip";
  }

  // Check for IPv4 format
  if (IPV4_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Check for IPv6 format
  if (IPV6_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Invalid format - return safe fallback
  return "invalid-ip";
}

// ============================================
// TEXT SANITIZATION
// ============================================

/**
 * Sanitize user-provided text to prevent XSS and injection attacks.
 * Use this for free-form text fields like notes, comments, and descriptions.
 *
 * This function:
 * - Strips HTML tags to prevent XSS
 * - Removes javascript: protocol URLs
 * - Removes inline event handlers (onclick, onerror, etc.)
 * - Enforces maximum length
 *
 * @param text - Raw text input
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized text
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text) return "";

  let sanitized = text
    // Remove HTML tags (prevents stored XSS)
    .replace(/<[^>]*>/g, "")
    // Remove javascript: URLs (prevents XSS via links)
    .replace(/javascript:/gi, "")
    // Remove data: URLs (prevents XSS via data URIs)
    .replace(/data:/gi, "")
    // Remove inline event handlers (onclick, onerror, onload, etc.)
    .replace(/on\w+\s*=/gi, "")
    // Remove expression() CSS hack (IE-specific XSS vector)
    .replace(/expression\s*\(/gi, "")
    .trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// ============================================
// SESSION VALIDATION
// ============================================

/** UUID v4 format regex for session ID validation */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate guest session ID format.
 * Session IDs must be valid UUID v4 format to prevent injection attacks.
 *
 * @param sessionId - The session ID to validate
 * @returns The validated session ID or undefined
 * @throws ConvexError if the format is invalid
 */
export function validateSessionId(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined;

  const trimmed = sessionId.trim();
  if (!UUID_V4_REGEX.test(trimmed)) {
    throw new ConvexError({
      code: "INVALID_SESSION",
      message: "Invalid session format",
    });
  }

  return trimmed;
}
