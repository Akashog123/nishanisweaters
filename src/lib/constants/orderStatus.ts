/**
 * Centralized order status configurations.
 * Used across admin order management components.
 */

import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  RefreshCw,
} from "lucide-react";

// Order Status Types
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

// Payment Status Types
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "refund_pending"
  | "refund_failed";

// Order Type
export type OrderType = "retail" | "wholesale";

// Filter types (include "all" option for dropdowns)
export type OrderStatusFilter = OrderStatus | "all";
export type PaymentStatusFilter = PaymentStatus | "all";
export type OrderTypeFilter = OrderType | "all";

// Badge Variant Types
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning";

// Order Status Configuration
export interface OrderStatusConfig {
  variant: BadgeVariant;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pending: { variant: "outline", label: "Pending", icon: Clock },
  confirmed: { variant: "secondary", label: "Confirmed", icon: CheckCircle },
  processing: { variant: "secondary", label: "Processing", icon: Package },
  shipped: { variant: "default", label: "Shipped", icon: Truck },
  delivered: { variant: "default", label: "Delivered", icon: CheckCircle },
  cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
  refunded: { variant: "destructive", label: "Refunded", icon: RefreshCw },
};

// Payment Status Configuration
export interface PaymentStatusConfig {
  variant: BadgeVariant;
  label: string;
}

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, PaymentStatusConfig> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  failed: { variant: "destructive", label: "Failed" },
  refunded: { variant: "destructive", label: "Refunded" },
  partially_refunded: { variant: "secondary", label: "Partial Refund" },
  disputed: { variant: "warning", label: "Disputed" },
  refund_pending: { variant: "outline", label: "Refund Pending" },
  refund_failed: { variant: "destructive", label: "Refund Failed" },
};

// Valid Order Status Transitions
// Defines which statuses can transition to which other statuses
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

// Shipping Carriers
export const SHIPPING_CARRIERS = [
  { value: "delhivery", label: "Delhivery" },
  { value: "bluedart", label: "BlueDart" },
  { value: "dtdc", label: "DTDC" },
  { value: "fedex", label: "FedEx" },
  { value: "other", label: "Other" },
] as const;

export type ShippingCarrier = typeof SHIPPING_CARRIERS[number]["value"];

// Order Status Options for Select dropdowns
export const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

// Payment Status Options for Select dropdowns
export const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All Payments" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "disputed", label: "Disputed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partial Refund" },
  { value: "refund_pending", label: "Refund Pending" },
  { value: "refund_failed", label: "Refund Failed" },
] as const;

// Order Type Options for Select dropdowns
export const ORDER_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
] as const;

// Helper function to get order status config with fallback
export function getOrderStatusConfig(status: string): OrderStatusConfig {
  return ORDER_STATUS_CONFIG[status as OrderStatus] || {
    variant: "outline" as const,
    label: status,
    icon: Clock,
  };
}

// Helper function to get payment status config with fallback
export function getPaymentStatusConfig(status: string): PaymentStatusConfig {
  return PAYMENT_STATUS_CONFIG[status as PaymentStatus] || {
    variant: "outline" as const,
    label: status,
  };
}

// Helper function to check if a status transition is valid
export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const validTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
  return validTransitions.includes(newStatus);
}

// Dispute Status Types
export type DisputeStatus =
  | "open"
  | "under_review"
  | "action_required"
  | "won"
  | "lost"
  | "accepted";

// Dispute Status Configuration
export const DISPUTE_STATUS_CONFIG: Record<DisputeStatus, { variant: BadgeVariant; label: string }> = {
  open: { variant: "warning", label: "Open" },
  under_review: { variant: "secondary", label: "Under Review" },
  action_required: { variant: "destructive", label: "Action Required" },
  won: { variant: "default", label: "Won" },
  lost: { variant: "destructive", label: "Lost" },
  accepted: { variant: "secondary", label: "Accepted" },
};
