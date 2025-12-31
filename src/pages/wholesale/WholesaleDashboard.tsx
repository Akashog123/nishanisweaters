import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Building2,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Eye,
  Calendar,
  Truck,
  ClipboardList,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { WHATSAPP_BULK_PRICING_CONTACT, WHATSAPP_BULK_PRICING_URL } from "@/lib/constants";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type definitions for orders
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

interface Order {
  _id: Id<"orders">;
  orderNumber: string;
  orderType: "retail" | "wholesale";
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: number;
}

// Status badge variants
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "warning" => {
  switch (status) {
    case "delivered":
    case "paid":
    case "approved":
      return "default";
    case "processing":
    case "shipped":
    case "pending":
    case "under_review":
    case "refund_pending":
      return "secondary";
    case "cancelled":
    case "failed":
    case "rejected":
    case "refund_failed":
      return "destructive";
    case "disputed":
      return "warning";
    case "refunded":
    case "partially_refunded":
      return "outline";
    default:
      return "outline";
  }
};

// Status icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "delivered":
    case "paid":
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "processing":
    case "shipped":
      return <Truck className="h-4 w-4 text-blue-600" />;
    case "pending":
    case "under_review":
    case "refund_pending":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "cancelled":
    case "failed":
    case "rejected":
    case "refund_failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "disputed":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "refunded":
    case "partially_refunded":
      return <RefreshCw className="h-4 w-4 text-gray-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const WholesaleDashboard = () => {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const [orderFilter, setOrderFilter] = useState<string>("all");

  // SECURITY: Use server-side identity verification - never pass client clerkId
  const userProfile = useQuery(
    api.users.getUserByClerkId,
    user ? {} : "skip"
  );

  // Get wholesale application
  const wholesaleApplication = useQuery(
    api.wholesaleApplications.getUserApplication,
    isSignedIn ? {} : "skip"
  );

  // Get user orders
  const orders = useQuery(
    api.orders.getUserOrders,
    isSignedIn ? { limit: 50 } : "skip"
  ) as Order[] | undefined;

  // Filter for wholesale orders only
  const wholesaleOrders = orders?.filter(
    (order) => order.orderType === "wholesale"
  );

  // Filter orders based on selection
  const filteredOrders =
    orderFilter === "all"
      ? wholesaleOrders
      : wholesaleOrders?.filter((order) => order.orderStatus === orderFilter);

  // Calculate stats
  const totalOrders = wholesaleOrders?.length || 0;
  const totalSpent =
    wholesaleOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const pendingOrders =
    wholesaleOrders?.filter(
      (order) =>
        order.orderStatus === "pending" || order.orderStatus === "processing"
    ).length || 0;

  // Loading state
  if (!isUserLoaded) {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to access your wholesale dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Not a wholesale customer
  if (
    userProfile &&
    userProfile.role !== "wholesale" &&
    userProfile.wholesaleStatus !== "approved"
  ) {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Wholesale Access Required</CardTitle>
              <CardDescription>
                {wholesaleApplication?.status === "pending" ||
                wholesaleApplication?.status === "under_review"
                  ? "Your wholesale application is currently under review."
                  : wholesaleApplication?.status === "rejected"
                    ? "Your wholesale application was not approved. You can submit a new application."
                    : "You need to apply for wholesale access to view this dashboard."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wholesaleApplication?.status === "pending" ||
              wholesaleApplication?.status === "under_review" ? (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Application Status
                    </span>
                    <Badge variant="secondary">
                      {wholesaleApplication.status
                        .replace("_", " ")
                        .toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ) : (
                <Button asChild className="w-full">
                  <Link to="/wholesale/register">Apply for Wholesale</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">
              Wholesale Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {userProfile?.companyName || user?.firstName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/wholesale/bulk-order">
                <ClipboardList className="mr-2 h-4 w-4" />
                Bulk Order
              </Link>
            </Button>
            <Button asChild>
              <Link to="/shop">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Shop Products
              </Link>
            </Button>
          </div>
        </div>

        {/* Application Status Card */}
        {wholesaleApplication && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon status={wholesaleApplication.status} />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(wholesaleApplication.status)}>
                    {wholesaleApplication.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Account Type</span>
                  </div>
                  <p className="font-bold text-lg">
                    Wholesale Partner
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Bulk Pricing</span>
                  </div>
                  <a
                    href={WHATSAPP_BULK_PRICING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Contact on WhatsApp
                  </a>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Member Since</span>
                  </div>
                  <p className="font-medium">
                    {formatDate(wholesaleApplication.submittedAt, { month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Orders
                  </p>
                  <p className="text-3xl font-bold">{totalOrders}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Orders
                  </p>
                  <p className="text-3xl font-bold">{pendingOrders}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Pricing CTA Card */}
        <Card className="mb-8 border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Need Bulk Pricing?
            </CardTitle>
            <CardDescription>
              Get custom quotes for large orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  For orders with custom quantities or special pricing requirements,
                  reach out to us directly on WhatsApp. We're happy to discuss
                  volume-based discounts and custom arrangements.
                </p>
                <p className="text-sm font-medium">
                  WhatsApp: {WHATSAPP_BULK_PRICING_CONTACT}
                </p>
              </div>
              <Button
                asChild
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <a
                  href={WHATSAPP_BULK_PRICING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Chat on WhatsApp
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Order History</CardTitle>
                <CardDescription>
                  View and manage your wholesale orders
                </CardDescription>
              </div>
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!filteredOrders || filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-1">No orders found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {orderFilter === "all"
                    ? "You haven't placed any wholesale orders yet."
                    : `No orders with status "${orderFilter}" found.`}
                </p>
                <Button asChild>
                  <Link to="/shop">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={order.orderStatus} />
                            <Badge
                              variant={getStatusBadgeVariant(order.orderStatus)}
                            >
                              {order.orderStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={order.paymentStatus} />
                            <Badge
                              variant={getStatusBadgeVariant(order.paymentStatus)}
                            >
                              {order.paymentStatus === "disputed" ? "⚠️ " : ""}
                              {order.paymentStatus.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/order/${order._id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Quick reorder functionality
                                // In a real app, this would add items to cart
                                navigate("/shop");
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reorder
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {filteredOrders && filteredOrders.length > 0 && (
            <CardFooter className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredOrders.length} of {wholesaleOrders?.length || 0}{" "}
                orders
              </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default WholesaleDashboard;
