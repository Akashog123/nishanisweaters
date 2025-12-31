/**
 * Payment utility functions for Razorpay integration
 *
 * These utilities are extracted from the Convex backend to enable
 * client-side validation and testing.
 */

import crypto from "crypto";

/**
 * Generates HMAC-SHA256 signature for Razorpay payment verification.
 * This is the same algorithm used by Razorpay's backend verification.
 *
 * @param orderId - The Razorpay order ID
 * @param paymentId - The Razorpay payment ID
 * @param secret - The Razorpay key secret
 * @returns The computed HMAC-SHA256 signature in hex format
 */
export function generatePaymentSignature(
  orderId: string,
  paymentId: string,
  secret: string
): string {
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Verifies a Razorpay payment signature.
 *
 * @param orderId - The Razorpay order ID
 * @param paymentId - The Razorpay payment ID
 * @param signature - The signature provided by Razorpay
 * @param secret - The Razorpay key secret
 * @returns true if the signature is valid, false otherwise
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generatePaymentSignature(orderId, paymentId, secret);
  return expectedSignature === signature;
}

/**
 * Generates HMAC-SHA256 signature for Razorpay webhook verification.
 *
 * @param payload - The raw webhook payload string
 * @param secret - The Razorpay webhook secret
 * @returns The computed HMAC-SHA256 signature in hex format
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifies a Razorpay webhook signature.
 *
 * @param payload - The raw webhook payload string
 * @param signature - The signature from the X-Razorpay-Signature header
 * @param secret - The Razorpay webhook secret
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return expectedSignature === signature;
}

/**
 * Parses a Razorpay webhook event and extracts relevant data.
 *
 * @param payload - The raw webhook payload string
 * @returns The parsed event object or null if parsing fails
 */
export function parseWebhookEvent(payload: string): RazorpayWebhookEvent | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Type definitions for Razorpay webhook events
 */
export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        notes?: Record<string, string>;
      };
    };
  };
}

/**
 * Validates an amount for Razorpay (must be in paise and a positive integer).
 *
 * @param amount - The amount to validate
 * @returns true if the amount is valid for Razorpay
 */
export function isValidRazorpayAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/**
 * Converts INR to paise (Razorpay uses paise for amounts).
 *
 * @param inr - The amount in INR
 * @returns The amount in paise
 */
export function inrToPaise(inr: number): number {
  return Math.round(inr * 100);
}

/**
 * Converts paise to INR.
 *
 * @param paise - The amount in paise
 * @returns The amount in INR
 */
export function paiseToInr(paise: number): number {
  return paise / 100;
}
