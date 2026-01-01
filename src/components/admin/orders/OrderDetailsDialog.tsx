import { useState, useEffect } from "react";
import { Doc } from "../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Mail, Phone, MapPin } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { logger } from "@/lib/logger";
import {
  getOrderStatusConfig,
  getPaymentStatusConfig,
  ORDER_STATUS_OPTIONS,
  SHIPPING_CARRIERS,
} from "@/lib/constants/orderStatus";
import { OrderItem, OrderDetailsDialogProps } from "./types";

// Order Status Badge Component
export const OrderStatusBadge = ({ status }: { status: string }) => {
  const config = getOrderStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Payment Status Badge Component
export const PaymentStatusBadge = ({ status }: { status: string }) => {
  const config = getPaymentStatusConfig(status);

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Dispute Info Card Component
const DisputeInfoCard = ({ order }: { order: Doc<"orders"> }) => {
  if (!order.disputeStatus) return null;

  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="text-amber-600">Warning</span> Dispute Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge
            variant={
              order.disputeStatus === "action_required"
                ? "destructive"
                : order.disputeStatus === "won"
                  ? "default"
                  : order.disputeStatus === "lost"
                    ? "destructive"
                    : "warning"
            }
          >
            {order.disputeStatus.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
        {order.disputeId && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Dispute ID</span>
            <span className="text-xs font-mono">{order.disputeId}</span>
          </div>
        )}
        {order.disputeReason && (
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Reason</span>
            <span className="text-sm text-right max-w-[200px]">
              {order.disputeReason}
            </span>
          </div>
        )}
        {order.disputeCreatedAt && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Opened</span>
            <span className="text-sm">
              {formatDateTime(order.disputeCreatedAt)}
            </span>
          </div>
        )}
        {order.disputeResolvedAt && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Resolved</span>
            <span className="text-sm">
              {formatDateTime(order.disputeResolvedAt)}
            </span>
          </div>
        )}
        {order.disputeStatus === "action_required" && (
          <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300">
            <strong>Action Required:</strong> Submit evidence in Razorpay
            Dashboard to contest this dispute.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Customer Info Card Component
const CustomerInfoCard = ({ order }: { order: Doc<"orders"> }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <User className="h-4 w-4" />
        Customer
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-1">
      <p className="font-medium">{order.shippingAddress.name}</p>
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <Mail className="h-3 w-3" />
        {order.userEmail}
      </p>
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <Phone className="h-3 w-3" />
        {order.shippingAddress.phone}
      </p>
    </CardContent>
  </Card>
);

// Shipping Address Card Component
const ShippingAddressCard = ({ order }: { order: Doc<"orders"> }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Shipping Address
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm">
      <p>{order.shippingAddress.street}</p>
      <p>
        {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
        {order.shippingAddress.postalCode}
      </p>
      <p>{order.shippingAddress.country}</p>
    </CardContent>
  </Card>
);

// Order Items Table Component
const OrderItemsTable = ({ order }: { order: Doc<"orders"> }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Order Items</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Size/Color</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item: OrderItem, index: number) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-medium">{item.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {item.size} / {item.color}
              </TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unitPrice)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.subtotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Separator className="my-4" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (GST)</span>
          <span>{formatCurrency(order.tax)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>
            {order.shippingCost === 0
              ? "Free"
              : formatCurrency(order.shippingCost)}
          </span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(order.discount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-medium text-base">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Payment Info Card Component
const PaymentInfoCard = ({ order }: { order: Doc<"orders"> }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">Payment</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Method</span>
        <span className="text-sm capitalize">{order.paymentMethod}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Status</span>
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>
      {order.razorpayPaymentId && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Payment ID</span>
          <span className="text-xs font-mono">{order.razorpayPaymentId}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// Shipping Info Card Component
const ShippingInfoCard = ({ order }: { order: Doc<"orders"> }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">Shipping</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Type</span>
        <Badge variant="outline" className="capitalize">
          {order.orderType}
        </Badge>
      </div>
      {order.trackingNumber && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tracking</span>
          <span className="text-sm font-mono">{order.trackingNumber}</span>
        </div>
      )}
      {order.shippingCarrier && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Carrier</span>
          <span className="text-sm">{order.shippingCarrier}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// Main OrderDetailsDialog Component
export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  onUpdateStatus,
}: OrderDetailsDialogProps) {
  const [newStatus, setNewStatus] = useState(order?.orderStatus || "");
  const [trackingNumber, setTrackingNumber] = useState(
    order?.trackingNumber || ""
  );
  const [shippingCarrier, setShippingCarrier] = useState(
    order?.shippingCarrier || ""
  );
  const [adminNotes, setAdminNotes] = useState(order?.adminNotes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setNewStatus(order.orderStatus);
      setTrackingNumber(order.trackingNumber || "");
      setShippingCarrier(order.shippingCarrier || "");
      setAdminNotes(order.adminNotes || "");
    }
  }, [order]);

  if (!order) return null;

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(
        order._id,
        newStatus,
        trackingNumber || undefined,
        shippingCarrier || undefined,
        adminNotes || undefined
      );
      onOpenChange(false);
    } catch (error) {
      logger.error("Error updating status", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order {order.orderNumber}
            <OrderStatusBadge status={order.orderStatus} />
          </DialogTitle>
          <DialogDescription>
            Placed on {formatDateTime(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer & Shipping Address */}
          <div className="grid grid-cols-2 gap-4">
            <CustomerInfoCard order={order} />
            <ShippingAddressCard order={order} />
          </div>

          {/* Order Items */}
          <OrderItemsTable order={order} />

          {/* Payment & Shipping Info */}
          <div className="grid grid-cols-2 gap-4">
            <PaymentInfoCard order={order} />
            <DisputeInfoCard order={order} />
            <ShippingInfoCard order={order} />
          </div>

          {/* Update Status Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Update Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shipping Carrier</Label>
                  <Select
                    value={shippingCarrier}
                    onValueChange={setShippingCarrier}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_CARRIERS.map((carrier) => (
                        <SelectItem key={carrier.value} value={carrier.value}>
                          {carrier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this order..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStatusUpdate} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OrderDetailsDialog;
