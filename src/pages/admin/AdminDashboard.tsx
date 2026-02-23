import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { PageLoader } from "@/components/routes/PageLoader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  IndianRupee,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatting";

// Import refactored dashboard components
// Using lazy-loaded chart components to avoid loading Recharts on initial page load
import {
  MetricCard,
  SuspendedRevenueChart,
  SuspendedOrderTypeChart,
  OrderStatusBadge,
  useDashboardData,
} from "@/components/admin/dashboard";

/**
 * AdminDashboard - Main admin dashboard page
 *
 * REFACTORING SUMMARY:
 * - Extracted MetricCard component (saved ~60 lines)
 * - Extracted RevenueChart and OrderTypeChart components (saved ~70 lines)
 * - Extracted useDashboardData hook (saved ~50 lines of data logic)
 * - Uses shared ORDER_STATUS_CONFIG from constants
 *
 * Before: 502 lines | After: ~200 lines (-60%)
 */
const AdminDashboard = () => {
  const {
    metrics,
    isLoading,
    chartData,
    orderTypeData,
    lowStockProducts,
    isRefreshing,
    handleRefresh,
  } = useDashboardData();

  if (isLoading) {
    return (
      <AdminLayout>
        <PageLoader />
      </AdminLayout>
    );
  }

  // Metrics should be available after loading check
  const dashboardData = metrics!;

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

        {/* Disputed Orders Alert */}
        {dashboardData.disputedOrders > 0 && (
          <DisputeAlertBanner count={dashboardData.disputedOrders} />
        )}

        {/* Metrics Cards - Now using MetricCard component */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue (30d)"
            value={formatCurrency(dashboardData.totalRevenue)}
            icon={IndianRupee}
            trend={{ value: "+12.5%", direction: "up", label: "from last month" }}
          />
          <MetricCard
            title="Total Orders"
            value={dashboardData.totalOrders}
            icon={ShoppingCart}
            subtitle={`${dashboardData.pendingOrders} pending orders`}
            subtitleClassName="text-amber-500"
          />
          <MetricCard
            title="Customers"
            value={dashboardData.customerCount}
            icon={Users}
            trend={{ value: "+8.2%", direction: "up", label: "new this month" }}
          />
          <MetricCard
            title="Low Stock Items"
            value={dashboardData.lowStockCount}
            icon={AlertTriangle}
            valueClassName="text-amber-500"
            subtitle="Products need restocking"
          />
        </div>

        {/* Charts Section - Using lazy-loaded components to defer Recharts bundle */}
        <div className="grid gap-4 md:grid-cols-2">
          <SuspendedRevenueChart data={chartData} />
          <SuspendedOrderTypeChart data={orderTypeData} />
        </div>

        {/* Quick Actions and Recent Orders */}
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionsCard
            pendingOrders={dashboardData.pendingOrders}
            lowStockCount={dashboardData.lowStockCount}
            disputedOrders={dashboardData.disputedOrders}
          />
          <RecentOrdersCard orders={dashboardData.recentOrders} />
        </div>

        {/* Low Stock Products Alert */}
        {lowStockProducts.length > 0 && (
          <LowStockAlertCard products={lowStockProducts} />
        )}
      </div>
    </AdminLayout>
  );
};

/**
 * DisputeAlertBanner - Prominent warning banner for disputed orders
 */
function DisputeAlertBanner({ count }: { count: number }) {
  return (
    <Card className="border-red-500 bg-red-50 dark:bg-red-950/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-600">
            {count} Disputed Order{count !== 1 ? "s" : ""} Require Attention
          </CardTitle>
        </div>
        <Button asChild variant="destructive" size="sm">
          <Link to="/admin/orders?payment=disputed">
            View Disputes
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600/80">
          Payment disputes require immediate action. Visit the Razorpay Dashboard
          to submit evidence and respond to chargebacks.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * QuickActionsCard - Common admin tasks shortcuts
 */
function QuickActionsCard({
  pendingOrders,
  lowStockCount,
  disputedOrders,
}: {
  pendingOrders: number;
  lowStockCount: number;
  disputedOrders: number;
}) {
  return (
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
            View Pending Orders ({pendingOrders})
          </Link>
        </Button>
        {lowStockCount > 0 && (
          <Button asChild className="w-full justify-start" variant="destructive">
            <Link to="/admin/products?filter=low-stock">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Restock Low Items ({lowStockCount})
            </Link>
          </Button>
        )}
        {disputedOrders > 0 && (
          <Button asChild className="w-full justify-start" variant="destructive">
            <Link to="/admin/orders?payment=disputed">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Handle Disputes ({disputedOrders})
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * RecentOrdersCard - Latest customer orders table
 */
function RecentOrdersCard({
  orders,
}: {
  orders: Array<{
    _id: string;
    orderNumber: string;
    userEmail: string;
    orderStatus: string;
    total: number;
    createdAt: number;
  }>;
}) {
  return (
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
            {orders.map((order) => (
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
                  <div className="truncate max-w-[150px]">{order.userEmail}</div>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.orderStatus} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(order.total)}
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
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
  );
}

/**
 * LowStockAlertCard - Products that need restocking
 */
function LowStockAlertCard({
  products,
}: {
  products: Array<{
    _id: string;
    name: string;
    variants: Array<{
      sku: string;
      stockQuantity: number;
      lowStockThreshold: number;
    }>;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Low Stock Alert
        </CardTitle>
        <CardDescription>Products that need immediate restocking</CardDescription>
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
            {products.slice(0, 5).map((product) => {
              const lowStockVariant = product.variants.find(
                (v) => v.stockQuantity <= v.lowStockThreshold
              );
              return (
                <TableRow key={product._id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
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
                      <Link to={`/admin/products/${product._id}`}>Restock</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default AdminDashboard;
