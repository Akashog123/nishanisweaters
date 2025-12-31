/**
 * Centralized Validation Utilities
 *
 * Provides consistent validation functions used across the application
 * for form inputs, checkout, and data validation.
 */

// ============================================
// REGION TYPES
// ============================================

export type PhoneRegion = "IN" | "US" | "UK" | "DEFAULT";
export type PostalCodeRegion = "IN" | "US" | "UK" | "CA" | "DEFAULT";
export type Region = "IN" | "US" | "UK" | "CA" | "DEFAULT";

// ============================================
// PHONE VALIDATION
// ============================================

const PHONE_PATTERNS: Record<PhoneRegion, RegExp> = {
  IN: /^[6-9]\d{9}$/, // Indian mobile: 10 digits starting with 6-9
  US: /^[2-9]\d{9}$/, // US: 10 digits, first digit 2-9
  UK: /^[0-9]{10,11}$/, // UK: 10-11 digits
  DEFAULT: /^[0-9]{7,15}$/, // Generic: 7-15 digits
};

/**
 * Validate phone number for a specific region
 *
 * @param phone - Phone number to validate (digits only)
 * @param region - Target region for validation rules
 * @returns true if valid
 */
export function validatePhone(phone: string, region: PhoneRegion = "IN"): boolean {
  // Remove non-digits for validation
  const digitsOnly = phone.replace(/\D/g, "");

  if (!digitsOnly) return false;

  const pattern = PHONE_PATTERNS[region] || PHONE_PATTERNS.DEFAULT;
  return pattern.test(digitsOnly);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string, region: PhoneRegion = "IN"): string {
  const digitsOnly = phone.replace(/\D/g, "");

  if (region === "IN" && digitsOnly.length === 10) {
    return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  }

  if (region === "US" && digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  return phone;
}

// ============================================
// POSTAL CODE VALIDATION
// ============================================

const POSTAL_CODE_PATTERNS: Record<PostalCodeRegion, RegExp> = {
  IN: /^[1-9][0-9]{5}$/, // Indian PIN: 6 digits, first not 0
  US: /^\d{5}(-\d{4})?$/, // US ZIP: 5 digits or 5+4
  UK: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, // UK postcode
  CA: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, // Canadian postal code
  DEFAULT: /^[A-Z0-9]{3,10}$/i, // Generic
};

/**
 * Validate postal code for a specific region
 *
 * @param code - Postal code to validate
 * @param region - Target region for validation rules
 * @returns true if valid
 */
export function validatePostalCode(code: string, region: PostalCodeRegion = "IN"): boolean {
  if (!code || !code.trim()) return false;

  const pattern = POSTAL_CODE_PATTERNS[region] || POSTAL_CODE_PATTERNS.DEFAULT;
  return pattern.test(code.trim());
}

// ============================================
// EMAIL VALIDATION
// ============================================

// Standard email regex that covers most valid cases
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email address
 *
 * @param email - Email address to validate
 * @returns true if valid
 */
export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  return EMAIL_PATTERN.test(email.trim().toLowerCase());
}

// ============================================
// NAME VALIDATION
// ============================================

/**
 * Validate a name field (first name, last name, company name)
 *
 * @param name - Name to validate
 * @param minLength - Minimum length (default: 2)
 * @param maxLength - Maximum length (default: 100)
 * @returns true if valid
 */
export function validateName(
  name: string,
  minLength: number = 2,
  maxLength: number = 100
): boolean {
  if (!name || !name.trim()) return false;
  const trimmed = name.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

// ============================================
// ADDRESS VALIDATION
// ============================================

export interface Address {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof Address, string>>;
}

/**
 * Validate a complete address object
 *
 * @param address - Address object to validate
 * @param region - Region for postal code and phone validation
 * @returns Validation result with isValid flag and field-level errors
 */
export function validateAddress(
  address: Address,
  region: Region = "IN"
): AddressValidationResult {
  const errors: Partial<Record<keyof Address, string>> = {};

  // Name validation
  if (!validateName(address.name)) {
    errors.name = "Please enter a valid name (2-100 characters)";
  }

  // Phone validation
  if (!validatePhone(address.phone, region as PhoneRegion)) {
    errors.phone = "Please enter a valid phone number";
  }

  // Street validation
  if (!address.street || address.street.trim().length < 5) {
    errors.street = "Please enter a valid street address";
  }

  // City validation
  if (!address.city || address.city.trim().length < 2) {
    errors.city = "Please enter a valid city";
  }

  // State validation
  if (!address.state || address.state.trim().length < 2) {
    errors.state = "Please enter a valid state";
  }

  // Postal code validation
  if (!validatePostalCode(address.postalCode, region as PostalCodeRegion)) {
    errors.postalCode = "Please enter a valid postal code";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// GST NUMBER VALIDATION (INDIA-SPECIFIC)
// ============================================

// GST format: 2 digit state code + 10 char PAN + 1 char entity + Z + 1 checksum
const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Validate Indian GST number
 *
 * @param gst - GST number to validate
 * @returns true if valid format
 */
export function validateGST(gst: string): boolean {
  if (!gst || !gst.trim()) return false;
  return GST_PATTERN.test(gst.trim().toUpperCase());
}

// ============================================
// QUANTITY VALIDATION
// ============================================

/**
 * Validate quantity for cart/order operations
 *
 * @param quantity - Quantity to validate
 * @param min - Minimum allowed (default: 1)
 * @param max - Maximum allowed (default: 100)
 * @returns true if valid
 */
export function validateQuantity(
  quantity: number,
  min: number = 1,
  max: number = 100
): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity >= min &&
    quantity <= max
  );
}

// ============================================
// PRICE VALIDATION
// ============================================

/**
 * Validate price value
 *
 * @param price - Price to validate
 * @param minPrice - Minimum allowed (default: 0)
 * @returns true if valid
 */
export function validatePrice(price: number, minPrice: number = 0): boolean {
  return (
    typeof price === "number" &&
    !isNaN(price) &&
    isFinite(price) &&
    price >= minPrice
  );
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns true if valid URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate image URL (must be valid URL with image extension or data URL)
 */
export function validateImageUrl(url: string): boolean {
  if (!url) return false;

  // Allow data URLs for images
  if (url.startsWith("data:image/")) return true;

  // Check if it's a valid URL
  if (!validateUrl(url)) return false;

  // Common image extensions (optional, some CDNs don't use extensions)
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];
  const hasImageExtension = imageExtensions.some((ext) =>
    url.toLowerCase().includes(ext)
  );

  // Allow URLs without extensions (CDN-style)
  return true;
}
