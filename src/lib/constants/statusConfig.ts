/**
 * Status Configuration Constants
 *
 * Centralized configuration for order and payment statuses used throughout
 * the application. This eliminates duplication and ensures consistency
 * across admin dashboard, order lists, and customer-facing pages.
 *
 * SOLID Principle: Single Source of Truth
 * - All status-related display logic references these configs
 * - Changes propagate automatically to all consuming components
 */

// Badge variant types from shadcn/ui
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface StatusConfig {
  /** Badge variant for styling */
  variant: BadgeVariant;
  /** Human-readable label */
  label: string;
  /** Optional color class for text/icons */
  color?: string;
  /** Optional description for tooltips */
  description?: string;
}

/**
 * Order Status Configuration
 * Maps order status values to display properties
 */
export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    variant: "outline",
    label: "Pending",
    color: "text-yellow-600",
    description: "Order received, awaiting payment confirmation",
  },
  confirmed: {
    variant: "secondary",
    label: "Confirmed",
    color: "text-blue-600",
    description: "Payment confirmed, preparing for processing",
  },
  processing: {
    variant: "secondary",
    label: "Processing",
    color: "text-blue-600",
    description: "Order is being prepared for shipment",
  },
  shipped: {
    variant: "default",
    label: "Shipped",
    color: "text-green-600",
    description: "Order has been shipped to customer",
  },
  delivered: {
    variant: "default",
    label: "Delivered",
    color: "text-green-700",
    description: "Order successfully delivered",
  },
  cancelled: {
    variant: "destructive",
    label: "Cancelled",
    color: "text-red-600",
    description: "Order was cancelled",
  },
  refunded: {
    variant: "destructive",
    label: "Refunded",
    color: "text-red-600",
    description: "Order was refunded",
  },
} as const;

/**
 * Payment Status Configuration
 * Maps payment status values to display properties
 */
export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    variant: "outline",
    label: "Pending",
    color: "text-yellow-600",
    description: "Payment not yet received",
  },
  paid: {
    variant: "default",
    label: "Paid",
    color: "text-green-600",
    description: "Payment successfully processed",
  },
  failed: {
    variant: "destructive",
    label: "Failed",
    color: "text-red-600",
    description: "Payment failed to process",
  },
  refunded: {
    variant: "destructive",
    label: "Refunded",
    color: "text-red-600",
    description: "Full refund processed",
  },
  partially_refunded: {
    variant: "secondary",
    label: "Partial Refund",
    color: "text-orange-600",
    description: "Partial refund processed",
  },
  disputed: {
    variant: "destructive",
    label: "Disputed",
    color: "text-red-700",
    description: "Payment under dispute - action required",
  },
  refund_pending: {
    variant: "outline",
    label: "Refund Pending",
    color: "text-yellow-600",
    description: "Refund is being processed",
  },
  refund_failed: {
    variant: "destructive",
    label: "Refund Failed",
    color: "text-red-600",
    description: "Refund processing failed",
  },
} as const;

/**
 * Dispute Status Configuration
 * Maps dispute status values to display properties
 */
export const DISPUTE_STATUS_CONFIG: Record<string, StatusConfig> = {
  created: {
    variant: "destructive",
    label: "New Dispute",
    color: "text-red-600",
    description: "Dispute just created - requires attention",
  },
  under_review: {
    variant: "secondary",
    label: "Under Review",
    color: "text-blue-600",
    description: "Dispute is being reviewed by payment provider",
  },
  action_required: {
    variant: "destructive",
    label: "Action Required",
    color: "text-red-700",
    description: "Immediate action required to respond to dispute",
  },
  won: {
    variant: "default",
    label: "Won",
    color: "text-green-600",
    description: "Dispute resolved in merchant's favor",
  },
  lost: {
    variant: "destructive",
    label: "Lost",
    color: "text-red-600",
    description: "Dispute resolved in customer's favor",
  },
  closed: {
    variant: "secondary",
    label: "Closed",
    color: "text-gray-600",
    description: "Dispute closed",
  },
} as const;

/**
 * Stock Status Configuration
 * Maps stock status values to display properties
 */
export const STOCK_STATUS_CONFIG: Record<string, StatusConfig> = {
  in_stock: {
    variant: "default",
    label: "In Stock",
    color: "text-green-600",
  },
  low_stock: {
    variant: "secondary",
    label: "Low Stock",
    color: "text-amber-600",
  },
  out_of_stock: {
    variant: "destructive",
    label: "Out of Stock",
    color: "text-red-600",
  },
} as const;

/**
 * Helper function to get status config with fallback
 */
export function getStatusConfig(
  status: string,
  configMap: Record<string, StatusConfig>
): StatusConfig {
  return (
    configMap[status] || {
      variant: "outline" as const,
      label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
      color: "text-gray-600",
    }
  );
}

/**
 * Helper to get order status config
 */
export function getOrderStatusConfig(status: string): StatusConfig {
  return getStatusConfig(status, ORDER_STATUS_CONFIG);
}

/**
 * Helper to get payment status config
 */
export function getPaymentStatusConfig(status: string): StatusConfig {
  return getStatusConfig(status, PAYMENT_STATUS_CONFIG);
}

/**
 * Helper to get dispute status config
 */
export function getDisputeStatusConfig(status: string): StatusConfig {
  return getStatusConfig(status, DISPUTE_STATUS_CONFIG);
}
