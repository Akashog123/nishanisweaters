import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  MapPin,
  CreditCard,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/formatting";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded" | "disputed" | "refund_pending" | "refund_failed";

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", icon: RefreshCw },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: RefreshCw },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" }> = {
  pending: { label: "Payment Pending", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  failed: { label: "Payment Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
  partially_refunded: { label: "Partially Refunded", variant: "secondary" },
  disputed: { label: "Under Review", variant: "warning" },
  refund_pending: { label: "Refund Processing", variant: "outline" },
  refund_failed: { label: "Refund Issue", variant: "destructive" },
};

export default function OrderHistory() {
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();

  const orders = useQuery(
    api.orders.getUserOrders,
    isSignedIn ? { limit: 50 } : "skip"
  );

  // Loading state
  if (!isClerkLoaded || orders === undefined) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Sign in to view your orders</CardTitle>
              <CardDescription>
                Access your order history by signing in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Empty state
  if (!orders || orders.length === 0) {
    return (
      <Layout showAnnouncement={false}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h1 className="text-2xl font-bold mb-2">No orders yet</h1>
              <p className="text-muted-foreground mb-6">
                When you place an order, it will appear here.
              </p>
              <Button asChild>
                <Link to="/shop/new-arrival">Start Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showAnnouncement={false}>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold">Order History</h1>
            <p className="text-muted-foreground mt-1">
              {orders.length} order{orders.length !== 1 ? "s" : ""} placed
            </p>
          </div>

          {/* Orders List */}
          <div className="space-y-6">
            {orders.map((order) => {
              const statusConfig = orderStatusConfig[order.orderStatus as OrderStatus];
              const paymentConfig = paymentStatusConfig[order.paymentStatus as PaymentStatus];
              const StatusIcon = statusConfig?.icon || Package;

              return (
                <Card key={order._id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                          <Badge className={statusConfig?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label || order.orderStatus}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={paymentConfig?.variant || "secondary"}>
                          {paymentConfig?.label || order.paymentStatus}
                        </Badge>
                        <span className="text-lg font-bold">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="details" className="border-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <span className="text-sm text-muted-foreground">
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""} - Click to view details
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <CardContent className="pt-0">
                          {/* Order Items */}
                          <div className="space-y-4 mb-6">
                            {order.items.map((item, index) => (
                              <div
                                key={`${item.productId}-${item.variantSku}-${index}`}
                                className="flex gap-4"
                              >
                                <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{item.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Size: {item.size} | Color: {item.color}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Qty: {item.quantity}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(item.unitPrice)} each
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <Separator className="my-4" />

                          {/* Order Summary */}
                          <div className="grid sm:grid-cols-2 gap-6">
                            {/* Shipping Address */}
                            <div>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Shipping Address
                              </h4>
                              <div className="text-sm text-muted-foreground">
                                <p>{order.shippingAddress.name}</p>
                                <p>{order.shippingAddress.phone}</p>
                                <p>{order.shippingAddress.street}</p>
                                <p>
                                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                                  {order.shippingAddress.postalCode}
                                </p>
                                <p>{order.shippingAddress.country}</p>
                              </div>
                            </div>

                            {/* Payment & Tracking */}
                            <div>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Payment & Delivery
                              </h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>
                                  Payment Method:{" "}
                                  <span className="capitalize">
                                    {order.paymentMethod.replace("_", " ")}
                                  </span>
                                </p>
                                {order.trackingNumber && (
                                  <p>
                                    Tracking: <span className="font-mono">{order.trackingNumber}</span>
                                  </p>
                                )}
                                {order.shippingCarrier && (
                                  <p>Carrier: {order.shippingCarrier}</p>
                                )}
                                {order.shippedAt && (
                                  <p>Shipped: {formatDateTime(order.shippedAt)}</p>
                                )}
                                {order.deliveredAt && (
                                  <p>Delivered: {formatDateTime(order.deliveredAt)}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          {/* Price Breakdown */}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping</span>
                              <span>
                                {order.shippingCost === 0 ? "FREE" : formatCurrency(order.shippingCost)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax (18% GST)</span>
                              <span>{formatCurrency(order.tax)}</span>
                            </div>
                            {order.discount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(order.discount)}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-base">
                              <span>Total</span>
                              <span>{formatCurrency(order.total)}</span>
                            </div>
                          </div>

                          {/* Customer Notes */}
                          {order.customerNotes && (
                            <>
                              <Separator className="my-4" />
                              <div>
                                <h4 className="font-medium mb-2">Order Notes</h4>
                                <p className="text-sm text-muted-foreground">{order.customerNotes}</p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
