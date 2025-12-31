import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  ShoppingCart,
  Package,
  AlertTriangle,
  Building2,
  Clock,
} from "lucide-react";

interface Notification {
  id: string;
  type: "order" | "stock" | "dispute" | "wholesale";
  title: string;
  message: string;
  href: string;
  urgent: boolean;
}

export function AdminNotifications() {
  const navigate = useNavigate();

  // Fetch dashboard stats to derive notifications
  const dashboardOverview = useQuery(api.analytics.getDashboardOverview);
  const wholesaleApplications = useQuery(api.wholesaleApplications.listApplications, {
    status: "pending",
    limit: 5,
  });

  // Build notifications from dashboard data
  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];

    if (dashboardOverview) {
      // Pending orders
      if (dashboardOverview.pendingOrders > 0) {
        items.push({
          id: "pending-orders",
          type: "order",
          title: `${dashboardOverview.pendingOrders} Pending Order${dashboardOverview.pendingOrders !== 1 ? "s" : ""}`,
          message: "New orders awaiting processing",
          href: "/admin/orders?status=pending",
          urgent: dashboardOverview.pendingOrders > 5,
        });
      }

      // Low stock products
      if (dashboardOverview.lowStockCount > 0) {
        items.push({
          id: "low-stock",
          type: "stock",
          title: `${dashboardOverview.lowStockCount} Low Stock Item${dashboardOverview.lowStockCount !== 1 ? "s" : ""}`,
          message: "Products need restocking",
          href: "/admin/products?stock=low",
          urgent: dashboardOverview.lowStockCount > 10,
        });
      }

      // Disputed orders
      if (dashboardOverview.disputedOrders > 0) {
        items.push({
          id: "disputed-orders",
          type: "dispute",
          title: `${dashboardOverview.disputedOrders} Disputed Order${dashboardOverview.disputedOrders !== 1 ? "s" : ""}`,
          message: "Payment disputes require attention",
          href: "/admin/orders?status=disputed",
          urgent: true,
        });
      }
    }

    // Pending wholesale applications
    if (wholesaleApplications && wholesaleApplications.length > 0) {
      items.push({
        id: "wholesale-pending",
        type: "wholesale",
        title: `${wholesaleApplications.length} Wholesale Application${wholesaleApplications.length !== 1 ? "s" : ""}`,
        message: "Applications awaiting review",
        href: "/admin/wholesale?status=pending",
        urgent: false,
      });
    }

    return items;
  }, [dashboardOverview, wholesaleApplications]);

  const urgentCount = notifications.filter((n) => n.urgent).length;
  const totalCount = notifications.length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="h-4 w-4 text-primary" />;
      case "stock":
        return <Package className="h-4 w-4 text-amber-500" />;
      case "dispute":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "wholesale":
        return <Building2 className="h-4 w-4 text-violet-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getIconBg = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return "bg-primary/10";
      case "stock":
        return "bg-amber-500/10";
      case "dispute":
        return "bg-destructive/10";
      case "wholesale":
        return "bg-violet-500/10";
      default:
        return "bg-muted";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 text-[10px] h-4 min-w-4 flex items-center justify-center font-bold px-1 ${
                urgentCount > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <span className="font-semibold">Notifications</span>
          {urgentCount > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-destructive font-bold bg-destructive/10 px-2 py-0.5">
              {urgentCount} urgent
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {totalCount === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center bg-muted mb-3">
              <Bell className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="p-1">
              {notifications.map((notification, index) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                    index !== notifications.length - 1 ? "border-b border-border/50" : ""
                  }`}
                  onClick={() => navigate(notification.href)}
                >
                  <div className={`shrink-0 w-8 h-8 flex items-center justify-center ${getIconBg(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{notification.title}</span>
                      {notification.urgent && (
                        <span className="shrink-0 text-[9px] uppercase tracking-wider bg-destructive text-destructive-foreground px-1.5 py-0.5 font-bold">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {notification.message}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AdminNotifications;
