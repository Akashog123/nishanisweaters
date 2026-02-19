/**
 * Settings Validation Module
 *
 * Provides type-specific validators and error handling for settings values.
 * Extracted from settings.ts to reduce duplication and improve maintainability.
 */

import { ConvexError } from "convex/values";
import type { SettingDefinition } from "./settingsRegistry";

/**
 * Creates a standardized validation error
 */
function createValidationError(message: string): ConvexError<{ code: string; message: string }> {
  return new ConvexError({
    code: "VALIDATION_ERROR",
    message,
  });
}

/**
 * Validates numeric values (number, currency, duration)
 */
function validateNumericValue(
  registry: SettingDefinition,
  value: string,
  numValue: number
): void {
  if (isNaN(numValue)) {
    throw createValidationError(`${registry.label} must be a valid number`);
  }

  if (registry.minValue !== undefined && numValue < registry.minValue) {
    throw createValidationError(
      `${registry.label} must be at least ${registry.minValue}`
    );
  }

  if (registry.maxValue !== undefined && numValue > registry.maxValue) {
    throw createValidationError(
      `${registry.label} must be at most ${registry.maxValue}`
    );
  }
}

/**
 * Validates percentage values (0-1 range)
 */
function validatePercentage(
  registry: SettingDefinition,
  numValue: number
): void {
  if (isNaN(numValue) || numValue < 0 || numValue > 1) {
    throw createValidationError(
      `${registry.label} must be a valid percentage (0-1)`
    );
  }

  if (registry.minValue !== undefined && numValue < registry.minValue) {
    throw createValidationError(
      `${registry.label} must be at least ${registry.minValue * 100}%`
    );
  }

  if (registry.maxValue !== undefined && numValue > registry.maxValue) {
    throw createValidationError(
      `${registry.label} must be at most ${registry.maxValue * 100}%`
    );
  }
}

/**
 * Validates email addresses
 */
function validateEmail(registry: SettingDefinition, value: string): void {
  if (!value.includes("@") || !value.includes(".")) {
    throw createValidationError(
      `${registry.label} must be a valid email address`
    );
  }
}

/**
 * Validates URLs with protocol checking and security enhancements
 */
function validateUrl(registry: SettingDefinition, value: string): void {
  // Allow empty URLs for optional fields (like social links)
  if (value === "") return;

  // Length check to prevent DoS attacks
  if (value.length > 2048) {
    throw createValidationError(
      `${registry.label} URL is too long (max 2048 characters)`
    );
  }

  try {
    const url = new URL(value);
    // Only allow safe protocols to prevent XSS
    if (!["http:", "https:"].includes(url.protocol)) {
      throw createValidationError(
        `${registry.label} must use http or https protocol`
      );
    }
  } catch (e) {
    if (e instanceof ConvexError) throw e;
    throw createValidationError(`${registry.label} must be a valid URL`);
  }
}

/**
 * Validates boolean values
 */
function validateBoolean(registry: SettingDefinition, value: string): void {
  if (value !== "true" && value !== "false") {
    throw createValidationError(`${registry.label} must be true or false`);
  }
}

/**
 * Validates phone numbers
 */
function validatePhone(registry: SettingDefinition, value: string): void {
  // Basic phone validation - allow digits, spaces, +, -, ()
  if (!/^[\d\s+\-()]+$/.test(value) || value.replace(/\D/g, "").length < 10) {
    throw createValidationError(
      `${registry.label} must be a valid phone number`
    );
  }
}

/**
 * Validates string values with XSS prevention and control character filtering
 */
function validateString(registry: SettingDefinition, value: string): void {
  if (!value.trim()) {
    throw createValidationError(`${registry.label} cannot be empty`);
  }

  // Reject control characters (OWASP recommendation)
  // This prevents null bytes and other dangerous control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
    throw createValidationError(
      `${registry.label} contains invalid characters`
    );
  }

  // Check max length (prevent DoS)
  if (value.length > 5000) {
    throw createValidationError(
      `${registry.label} is too long (max 5000 characters)`
    );
  }
}

/**
 * Validates text content (for legal pages, descriptions) with HTML sanitization
 */
function validateText(registry: SettingDefinition, value: string): void {
  if (!value.trim()) {
    // Allow empty for optional text fields
    return;
  }

  // Reject control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
    throw createValidationError(
      `${registry.label} contains invalid characters`
    );
  }

  // Check max length (prevent DoS) - higher limit for text content
  if (value.length > 50000) {
    throw createValidationError(
      `${registry.label} is too long (max 50000 characters)`
    );
  }

  // Check for dangerous HTML patterns (basic XSS prevention)
  // Note: Full sanitization happens on output, this is input validation
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=/gi,
    /data\s*:/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      throw createValidationError(
        `${registry.label} contains potentially dangerous content`
      );
    }
  }
}

/**
 * Validator registry mapping value types to validation functions
 */
type ValidatorFunction = (registry: SettingDefinition, value: string, numValue?: number) => void;

const VALIDATORS: Record<string, ValidatorFunction> = {
  number: (registry, value) => validateNumericValue(registry, value, parseFloat(value)),
  currency: (registry, value) => validateNumericValue(registry, value, parseFloat(value)),
  duration_ms: (registry, value) => validateNumericValue(registry, value, parseFloat(value)),
  duration_hours: (registry, value) => validateNumericValue(registry, value, parseFloat(value)),
  percentage: (registry, value) => validatePercentage(registry, parseFloat(value)),
  email: validateEmail,
  url: validateUrl,
  boolean: validateBoolean,
  phone: validatePhone,
  string: validateString,
  text: validateText,
};

/**
 * Main validation function - validates a setting value based on its type
 * @throws {ConvexError} If validation fails
 */
export function validateSettingValue(
  registry: SettingDefinition,
  value: string
): void {
  const validator = VALIDATORS[registry.valueType];

  if (!validator) {
    throw createValidationError(
      `Unknown value type: ${registry.valueType}`
    );
  }

  validator(registry, value);
}
