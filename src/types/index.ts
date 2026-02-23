/**
 * Core TypeScript types and interfaces for the application.
 * These provide strict typing for products, orders, cart, users, and API responses.
 */

import type { Id } from "../../convex/_generated/dataModel";

// ============================================================================
// Address Types
// ============================================================================

/** Base address structure used throughout the application */
export interface Address {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Shipping address with unique identifier and default flag */
export interface ShippingAddress extends Address {
  id: string;
  isDefault: boolean;
}

/** Business address for wholesale customers */
export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ============================================================================
// Product Types
// ============================================================================

/** Product image with metadata */
export interface ProductImage {
  url: string;
  storageId?: string;
  alt: string;
  order: number;
}

/** Product video with optional thumbnail */
export interface ProductVideo {
  youtubeId: string;
  title?: string;
  thumbnail: string;
  order: number;
}

/** Product variant with inventory tracking */
export interface ProductVariant {
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number;
}

/** Complete product structure from Convex database */
export interface ConvexProduct {
  _id: Id<"products">;
  _creationTime: number;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  retailPrice: number;
  wholesalePrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  images: ProductImage[];
  videos?: ProductVideo[];
  variants: ProductVariant[];
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  minOrderQuantity?: number;
  averageRating?: number;
  reviewCount?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  hasLowStock?: boolean;
}

/** Local product type for static data */
export interface LocalProduct {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  category: string;
  gender: "men" | "women" | "unisex";
}

// ============================================================================
// User Types
// ============================================================================

/** User roles in the system */
export type UserRole = "customer" | "wholesale" | "admin";

/** Wholesale application/account status */
export type WholesaleStatus = "pending" | "approved" | "rejected" | "suspended";

/** Complete user profile from Convex database */
export interface ConvexUser {
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  companyName?: string;
  businessEmail?: string;
  gstNumber?: string;
  businessAddress?: BusinessAddress;
  website?: string;
  wholesaleStatus?: WholesaleStatus;
  shippingAddresses: ShippingAddress[];
  emailNotifications: boolean;
  smsNotifications: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

// ============================================================================
// Cart Types
// ============================================================================

/** Cart item stored in local context (uses string prices for display) */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
}

/** Cart item in Convex database (uses numeric prices) */
export interface ConvexCartItem {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  addedAt: number;
}

/** Complete cart from Convex database */
export interface ConvexCart {
  _id: Id<"cart">;
  _creationTime: number;
  userId?: string;
  sessionId?: string;
  items: ConvexCartItem[];
  lastModified: number;
  expiresAt: number;
}

// ============================================================================
// Order Types
// ============================================================================

/** Order type classification */
export type OrderType = "retail" | "wholesale";

/** Payment methods supported */
export type PaymentMethod = "razorpay" | "invoice" | "bank_transfer";

/** Payment status tracking */
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "refund_pending"
  | "refund_failed";

/** Dispute status for chargebacks */
export type DisputeStatus =
  | "created"
  | "under_review"
  | "action_required"
  | "won"
  | "lost"
  | "closed";

/** Order fulfillment status */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

/** Order item with product snapshot */
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

/** Complete order from Convex database */
export interface ConvexOrder {
  _id: Id<"orders">;
  _creationTime: number;
  orderNumber: string;
  userId: string;
  userEmail: string;
  orderType: OrderType;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  // Dispute tracking (chargebacks)
  disputeStatus?: DisputeStatus;
  disputeId?: string;
  disputeReason?: string;
  disputeCreatedAt?: number;
  disputeResolvedAt?: number;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippedAt?: number;
  deliveredAt?: number;
  customerNotes?: string;
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
}

/** Order status history entry */
export interface OrderStatusHistoryEntry {
  _id: Id<"orderStatusHistory">;
  _creationTime: number;
  orderId: Id<"orders">;
  fromStatus?: string;
  toStatus: string;
  changedBy: string;
  notes?: string;
  timestamp: number;
}

// ============================================================================
// Order Update Types (for Convex mutations)
// ============================================================================

/** Fields that can be updated when changing payment status */
export interface PaymentStatusUpdate {
  paymentStatus: PaymentStatus;
  updatedAt: number;
  razorpayPaymentId?: string;
  orderStatus?: OrderStatus;
}

/** Fields that can be updated when changing order status */
export interface OrderStatusUpdate {
  orderStatus: OrderStatus;
  updatedAt: number;
  trackingNumber?: string;
  shippingCarrier?: string;
  adminNotes?: string;
  shippedAt?: number;
  deliveredAt?: number;
}

// ============================================================================
// Wishlist Types
// ============================================================================

/** Wishlist item entry */
export interface WishlistItem {
  productId: Id<"products">;
  addedAt: number;
}

/** Complete wishlist from Convex database */
export interface ConvexWishlist {
  _id: Id<"wishlist">;
  _creationTime: number;
  userId: string;
  items: WishlistItem[];
  updatedAt: number;
}

// ============================================================================
// Inventory Types
// ============================================================================

/** Inventory change type classification */
export type InventoryChangeType = "restock" | "sale" | "return" | "adjustment" | "damaged";

/** Inventory log entry */
export interface InventoryLogEntry {
  _id: Id<"inventoryLogs">;
  _creationTime: number;
  productId: Id<"products">;
  variantSku: string;
  changeType: InventoryChangeType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason?: string;
  orderId?: Id<"orders">;
  changedBy: string;
  timestamp: number;
}

// ============================================================================
// Review Types
// ============================================================================

/** Review status */
export type ReviewStatus = "pending" | "approved" | "rejected";

/** Product review from Convex database */
export interface ConvexReview {
  _id: Id<"reviews">;
  _creationTime: number;
  productId: Id<"products">;
  userId: string;
  orderId?: Id<"orders">;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isVerifiedByAdmin: boolean;
  helpfulCount: number;
  status: ReviewStatus;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Newsletter Types
// ============================================================================

/** Newsletter subscriber from Convex database */
export interface NewsletterSubscriber {
  _id: Id<"newsletterSubscribers">;
  _creationTime: number;
  email: string;
  isSubscribed: boolean;
  subscribedAt?: number;
  unsubscribedAt?: number;
  tags: string[];
  source?: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Generic API success response */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/** Generic API error response */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/** Combined API response type */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Utility Types
// ============================================================================

/** Make specific properties optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific properties required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Extract non-undefined type */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};
