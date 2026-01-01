import { Badge } from "@/components/ui/badge";
import { getOrderStatusConfig, getPaymentStatusConfig, getDisputeStatusConfig } from "@/lib/constants/statusConfig";

/**
 * Status Badge Components
 *
 * Reusable badge components for displaying order, payment, and dispute statuses.
 * Uses the centralized status configuration for consistent styling across the app.
 */

interface StatusBadgeProps {
  status: string;
}

/**
 * OrderStatusBadge - Displays order status with appropriate styling
 */
export function OrderStatusBadge({ status }: StatusBadgeProps) {
  const config = getOrderStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * PaymentStatusBadge - Displays payment status with appropriate styling
 */
export function PaymentStatusBadge({ status }: StatusBadgeProps) {
  const config = getPaymentStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * DisputeStatusBadge - Displays dispute status with appropriate styling
 */
export function DisputeStatusBadge({ status }: StatusBadgeProps) {
  const config = getDisputeStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default OrderStatusBadge;
