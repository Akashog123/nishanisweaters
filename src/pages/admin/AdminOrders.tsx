import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  MapPin,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatting";
import { logger } from "@/lib/logger";

// Order Status Configuration
const orderStatusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { variant: "outline", label: "Pending", icon: Clock },
  confirmed: { variant: "secondary", label: "Confirmed", icon: CheckCircle },
  processing: { variant: "secondary", label: "Processing", icon: Package },
  shipped: { variant: "default", label: "Shipped", icon: Truck },
  delivered: { variant: "default", label: "Delivered", icon: CheckCircle },
  cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
  refunded: { variant: "destructive", label: "Refunded", icon: RefreshCw },
};

// Payment Status Configuration
const paymentStatusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string }
> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  failed: { variant: "destructive", label: "Failed" },
  refunded: { variant: "destructive", label: "Refunded" },
  partially_refunded: { variant: "secondary", label: "Partial Refund" },
  disputed: { variant: "warning", label: "⚠️ Disputed" },
  refund_pending: { variant: "outline", label: "Refund Pending" },
  refund_failed: { variant: "destructive", label: "Refund Failed" },
};

// Order Status Badge
const OrderStatusBadge = ({ status }: { status: string }) => {
  const config = orderStatusConfig[status] || { variant: "outline" as const, label: status, icon: Clock };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Payment Status Badge
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const config = paymentStatusConfig[status] || { variant: "outline" as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Order item type
interface OrderItem {
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

// Order Details Dialog
const OrderDetailsDialog = ({
  order,
  open,
  onOpenChange,
  onUpdateStatus,
}: {
  order: Doc<"orders"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (
    orderId: Id<"orders">,
    status: string,
    trackingNumber?: string,
    shippingCarrier?: string,
    adminNotes?: string
  ) => void;
}) => {
  const [newStatus, setNewStatus] = useState(order?.orderStatus || "");
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || "");
  const [shippingCarrier, setShippingCarrier] = useState(order?.shippingCarrier || "");
  const [adminNotes, setAdminNotes] = useState(order?.adminNotes || "");
  const [isUpdating, setIsUpdating] = useState(false);

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
          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Order Items */}
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

          {/* Payment & Status Info */}
          <div className="grid grid-cols-2 gap-4">
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

            {/* Dispute Information - Only shown if order has dispute */}
            {order.disputeStatus && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span className="text-amber-600">⚠️</span> Dispute Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={
                      order.disputeStatus === 'action_required' ? 'destructive' :
                      order.disputeStatus === 'won' ? 'default' :
                      order.disputeStatus === 'lost' ? 'destructive' :
                      'warning'
                    }>
                      {order.disputeStatus.replace('_', ' ').toUpperCase()}
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
                      <span className="text-sm text-right max-w-[200px]">{order.disputeReason}</span>
                    </div>
                  )}
                  {order.disputeCreatedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Opened</span>
                      <span className="text-sm">{formatDateTime(order.disputeCreatedAt)}</span>
                    </div>
                  )}
                  {order.disputeResolvedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Resolved</span>
                      <span className="text-sm">{formatDateTime(order.disputeResolvedAt)}</span>
                    </div>
                  )}
                  {order.disputeStatus === 'action_required' && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300">
                      ⏰ <strong>Action Required:</strong> Submit evidence in Razorpay Dashboard to contest this dispute.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
          </div>

          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Update Order Status</CardTitle>
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shipping Carrier</Label>
                  <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delhivery">Delhivery</SelectItem>
                      <SelectItem value="bluedart">BlueDart</SelectItem>
                      <SelectItem value="dtdc">DTDC</SelectItem>
                      <SelectItem value="fedex">FedEx</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
};

const AdminOrders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const itemsPerPage = 10;

  // Fetch orders
  const ordersResult = useQuery(api.orders.listAllOrders, { limit: 500 });

  // Mutations
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

  // Extract orders array from paginated result
  const allOrders = ordersResult?.orders ?? [];

  // Filter orders
  const filteredOrders = allOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.orderStatus === statusFilter;

    const matchesPayment =
      paymentFilter === "all" || order.paymentStatus === paymentFilter;

    const matchesType = typeFilter === "all" || order.orderType === typeFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle status update
  const handleUpdateStatus = async (
    orderId: Id<"orders">,
    status: string,
    trackingNumber?: string,
    shippingCarrier?: string,
    adminNotes?: string
  ) => {
    try {
      await updateOrderStatus({
        orderId,
        orderStatus: status as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
        trackingNumber,
        shippingCarrier,
        adminNotes,
      });
      toast.success("Order status updated successfully");
    } catch (error) {
      toast.error("Failed to update order status");
      throw error;
    }
  };

  // Count orders by status
  const orderCounts = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.orderStatus === "pending").length,
    processing: allOrders.filter((o) => o.orderStatus === "processing").length,
    shipped: allOrders.filter((o) => o.orderStatus === "shipped").length,
    delivered: allOrders.filter((o) => o.orderStatus === "delivered").length,
    disputed: allOrders.filter((o) => o.paymentStatus === "disputed").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">Manage customer orders</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "all" && paymentFilter === "all" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => { setStatusFilter("all"); setPaymentFilter("all"); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderCounts.all}</div>
            </CardContent>
          </Card>
          {/* Disputed Alert Card - Highlighted for attention */}
          {orderCounts.disputed > 0 && (
            <Card
              className={`cursor-pointer transition-colors border-red-500 bg-red-50 dark:bg-red-950/30 ${
                paymentFilter === "disputed" ? "ring-2 ring-red-500" : ""
              }`}
              onClick={() => { setStatusFilter("all"); setPaymentFilter("disputed"); }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-1">
                  ⚠️ Disputed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {orderCounts.disputed}
                </div>
                <p className="text-xs text-red-500 mt-1">Needs attention</p>
              </CardContent>
            </Card>
          )}
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "pending" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => { setStatusFilter("pending"); setPaymentFilter("all"); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {orderCounts.pending}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "processing" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => { setStatusFilter("processing"); setPaymentFilter("all"); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {orderCounts.processing}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "shipped" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => { setStatusFilter("shipped"); setPaymentFilter("all"); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">
                Shipped
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {orderCounts.shipped}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "delivered" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => { setStatusFilter("delivered"); setPaymentFilter("all"); }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {orderCounts.delivered}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={paymentFilter}
                  onValueChange={(value) => {
                    setPaymentFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="disputed">⚠️ Disputed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="partially_refunded">Partial Refund</SelectItem>
                    <SelectItem value="refund_pending">Refund Pending</SelectItem>
                    <SelectItem value="refund_failed">Refund Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Order Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order List</CardTitle>
            <CardDescription>
              {filteredOrders.length} orders found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[150px]">{order.userEmail}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.shippingAddress.city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {order.orderType}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.orderStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedOrders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No orders found</p>
                      <p className="text-sm">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of{" "}
                  {filteredOrders.length} orders
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
