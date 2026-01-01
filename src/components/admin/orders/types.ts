import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  OrderStatus,
  PaymentStatus,
  OrderType,
  OrderStatusFilter,
  PaymentStatusFilter,
  OrderTypeFilter,
} from "@/lib/constants/orderStatus";

// Re-export status types for convenience
export type {
  OrderStatus,
  PaymentStatus,
  OrderType,
  OrderStatusFilter,
  PaymentStatusFilter,
  OrderTypeFilter,
};

// Order item type
export interface OrderItem {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPrice: number;
  subtotal: number;
}

// Shipping address type
export interface ShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Order type from Convex document
export type Order = Doc<"orders">;

// Props for order-related components
export interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (
    orderId: Id<"orders">,
    status: string,
    trackingNumber?: string,
    shippingCarrier?: string,
    adminNotes?: string
  ) => Promise<void>;
}

export interface OrderFiltersProps {
  searchQuery: string;
  statusFilter: OrderStatusFilter;
  paymentFilter: PaymentStatusFilter;
  typeFilter: OrderTypeFilter;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: OrderStatusFilter) => void;
  onPaymentChange: (payment: PaymentStatusFilter) => void;
  onTypeChange: (type: OrderTypeFilter) => void;
}

export interface OrdersTableProps {
  orders: Order[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onViewOrder: (order: Order) => void;
}

export interface OrderStatsCardsProps {
  counts: {
    all: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    disputed: number;
  };
  statusFilter: OrderStatusFilter;
  paymentFilter: PaymentStatusFilter;
  onFilterChange: (status: OrderStatusFilter, payment: PaymentStatusFilter) => void;
}
