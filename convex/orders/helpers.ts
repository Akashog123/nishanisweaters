/**
 * Orders Module Helper Functions
 *
 * Shared utility functions and constants for order management
 */

// Valid order status transitions
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};

// Helper to validate status transition
export function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  const validNextStates = VALID_STATUS_TRANSITIONS[fromStatus] || [];
  return validNextStates.includes(toStatus);
}
