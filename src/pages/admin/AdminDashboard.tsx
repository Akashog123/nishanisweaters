import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  ShoppingCart,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/formatting";

// Order Status Badge
const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "Pending" },
    confirmed: { variant: "secondary", label: "Confirmed" },
    processing: { variant: "secondary", label: "Processing" },
    shipped: { variant: "default", label: "Shipped" },
    delivered: { variant: "default", label: "Delivered" },
    cancelled: { variant: "destructive", label: "Cancelled" },
    refunded: { variant: "destructive", label: "Refunded" },
  };

  const config = statusConfig[status] || { variant: "outline" as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const AdminDashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data
  const dashboardData = useQuery(api.analytics.getDashboardOverview);
  const lowStockProducts = useQuery(api.products.getLowStockProducts);

  // Get analytics data for charts (last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const salesAnalytics = useQuery(api.analytics.getSalesAnalytics, {
    startDate: thirtyDaysAgo,
    endDate: Date.now(),
  });
  const orderTypeBreakdown = useQuery(api.analytics.getOrderTypeBreakdown, {
    startDate: thirtyDaysAgo,
    endDate: Date.now(),
  });

  // Prepare chart data
  const chartData = salesAnalytics?.dailyStats
    ? Object.entries(salesAnalytics.dailyStats)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          revenue: data.revenue,
          orders: data.orders,
        }))
        .slice(-14) // Last 14 days
    : [];

  const orderTypeData = orderTypeBreakdown
    ? [
        { name: "Retail", value: orderTypeBreakdown.retail.revenue, count: orderTypeBreakdown.retail.count },
        { name: "Wholesale", value: orderTypeBreakdown.wholesale.revenue, count: orderTypeBreakdown.wholesale.count },
      ]
    : [];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!dashboardData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your store performance
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue (30d)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboardData.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+12.5%</span> from last month
              </p>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-500">{dashboardData.pendingOrders}</span>{" "}
                pending orders
              </p>
            </CardContent>
          </Card>

          {/* Customers Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesAnalytics?.customerCount || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+8.2%</span> new this month
              </p>
            </CardContent>
          </Card>

          {/* Low Stock Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {dashboardData.lowStockCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Products need restocking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue for the last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      tickFormatter={(value) =>
                        `${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Revenue",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Order Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Order Type Breakdown</CardTitle>
              <CardDescription>Retail vs Wholesale revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      tickFormatter={(value) =>
                        `${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "value"
                          ? formatCurrency(value)
                          : value,
                        name === "value" ? "Revenue" : "Orders",
                      ]}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Recent Orders */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/products">
                  <Package className="h-4 w-4 mr-2" />
                  Add New Product
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/orders">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  View Pending Orders ({dashboardData.pendingOrders})
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/wholesale">
                  <Building2 className="h-4 w-4 mr-2" />
                  Review Applications ({dashboardData.pendingApplications})
                </Link>
              </Button>
              {dashboardData.lowStockCount > 0 && (
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="destructive"
                >
                  <Link to="/admin/products?filter=low-stock">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Restock Low Items ({dashboardData.lowStockCount})
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/orders">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[150px]">
                          {order.userEmail}
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.orderStatus} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dashboardData.recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No orders yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Products */}
        {lowStockProducts && lowStockProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>
                Products that need immediate restocking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.slice(0, 5).map((product) => {
                    const lowStockVariant = product.variants.find(
                      (v) => v.stockQuantity <= v.lowStockThreshold
                    );
                    return (
                      <TableRow key={product._id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{lowStockVariant?.sku || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={
                              (lowStockVariant?.stockQuantity || 0) === 0
                                ? "text-red-500 font-medium"
                                : "text-amber-500"
                            }
                          >
                            {lowStockVariant?.stockQuantity || 0}
                          </span>
                        </TableCell>
                        <TableCell>{lowStockVariant?.lowStockThreshold || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/admin/products/${product._id}`}>
                              Restock
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
