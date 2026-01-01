/**
 * Constants - Barrel Export
 *
 * Centralized exports for all application constants.
 */

export {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  DISPUTE_STATUS_CONFIG,
  STOCK_STATUS_CONFIG,
  getStatusConfig,
  getOrderStatusConfig,
  getPaymentStatusConfig,
  getDisputeStatusConfig,
} from "./statusConfig";

export type { StatusConfig } from "./statusConfig";
