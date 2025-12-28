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
