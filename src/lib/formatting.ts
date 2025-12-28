/**
 * Centralized formatting utilities for the application.
 * Provides consistent formatting for currency, dates, percentages, and more.
 */

/**
 * Formats a number as currency.
 * Defaults to INR (Indian Rupee) with en-IN locale.
 *
 * @param amount - The amount to format
 * @param locale - The locale to use (default: "en-IN")
 * @param currency - The currency code (default: "INR")
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1500) // "₹1,500"
 * formatCurrency(1500.50) // "₹1,501"
 * formatCurrency(1500, "en-US", "USD") // "$1,500"
 */
export function formatCurrency(
  amount: number,
  locale: string = "en-IN",
  currency: string = "INR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date with flexible options.
 * Accepts Date objects, timestamps, or ISO strings.
 *
 * @param date - The date to format (Date object, timestamp, or ISO string)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // "28 Dec, 2025"
 * formatDate(1640000000000) // "20 Dec, 2021"
 * formatDate("2025-12-28") // "28 Dec, 2025"
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "number" || typeof date === "string"
    ? new Date(date)
    : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  return dateObj.toLocaleDateString("en-IN", options ?? defaultOptions);
}

/**
 * Formats a date with time.
 * Accepts Date objects, timestamps, or ISO strings.
 *
 * @param date - The date to format (Date object, timestamp, or ISO string)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTime(new Date()) // "28 Dec, 2025, 10:30"
 * formatDateTime(1640000000000) // "20 Dec, 2021, 21:26"
 */
export function formatDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "number" || typeof date === "string"
    ? new Date(date)
    : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return dateObj.toLocaleString("en-IN", options ?? defaultOptions);
}

/**
 * Formats a date relative to the current time.
 * Returns strings like "2 days ago", "in 3 hours", "just now", etc.
 *
 * @param date - The date to format (Date object, timestamp, or ISO string)
 * @returns Relative time string
 *
 * @example
 * formatRelativeDate(Date.now() - 5000) // "just now"
 * formatRelativeDate(Date.now() - 3600000) // "1 hour ago"
 * formatRelativeDate(Date.now() - 86400000 * 2) // "2 days ago"
 */
export function formatRelativeDate(date: Date | string | number): string {
  const dateObj = typeof date === "number" || typeof date === "string"
    ? new Date(date)
    : date;

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  // Future dates
  if (diffMs < 0) {
    const absDiffSec = Math.abs(diffSec);
    const absDiffMin = Math.abs(diffMin);
    const absDiffHour = Math.abs(diffHour);
    const absDiffDay = Math.abs(diffDay);
    const absDiffWeek = Math.abs(diffWeek);
    const absDiffMonth = Math.abs(diffMonth);
    const absDiffYear = Math.abs(diffYear);

    if (absDiffSec < 60) return "in a few seconds";
    if (absDiffMin < 60) return `in ${absDiffMin} ${absDiffMin === 1 ? "minute" : "minutes"}`;
    if (absDiffHour < 24) return `in ${absDiffHour} ${absDiffHour === 1 ? "hour" : "hours"}`;
    if (absDiffDay < 7) return `in ${absDiffDay} ${absDiffDay === 1 ? "day" : "days"}`;
    if (absDiffWeek < 4) return `in ${absDiffWeek} ${absDiffWeek === 1 ? "week" : "weeks"}`;
    if (absDiffMonth < 12) return `in ${absDiffMonth} ${absDiffMonth === 1 ? "month" : "months"}`;
    return `in ${absDiffYear} ${absDiffYear === 1 ? "year" : "years"}`;
  }

  // Past dates
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return "a few seconds ago";
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
  if (diffWeek < 4) return `${diffWeek} ${diffWeek === 1 ? "week" : "weeks"} ago`;
  if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? "month" : "months"} ago`;
  return `${diffYear} ${diffYear === 1 ? "year" : "years"} ago`;
}

/**
 * Formats a number as a percentage.
 *
 * @param value - The value to format (e.g., 0.25 for 25%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.25) // "25%"
 * formatPercentage(0.3333, 2) // "33.33%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a number with thousand separators.
 *
 * @param value - The number to format
 * @param locale - The locale to use (default: "en-IN")
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1500) // "1,500"
 * formatNumber(1500000) // "15,00,000"
 */
export function formatNumber(value: number, locale: string = "en-IN"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Calculates discount percentage.
 *
 * @param original - The original price
 * @param sale - The sale price
 * @returns Discount percentage as an integer
 *
 * @example
 * calculateDiscount(100, 75) // 25
 */
export function calculateDiscount(original: number, sale: number): number {
  return Math.round(((original - sale) / original) * 100);
}
