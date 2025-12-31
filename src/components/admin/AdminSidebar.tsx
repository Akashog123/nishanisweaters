import { Link, useLocation } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  Star,
  Tag,
  FileText,
  Settings,
  LogOut,
  ChevronUp,
  ExternalLink,
  FolderTree,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: "orders" | "wholesale" | "lowStock";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Grouped navigation structure for better organization
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Catalog",
    items: [
      { name: "Products", href: "/admin/products", icon: Package, badge: "lowStock" },
      { name: "Categories", href: "/admin/categories", icon: FolderTree },
      { name: "Reviews", href: "/admin/reviews", icon: Star },
      { name: "CMS", href: "/admin/cms", icon: FileText },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart, badge: "orders" },
      { name: "Promo Codes", href: "/admin/promo-codes", icon: Tag },
    ],
  },
  {
    label: "Customers",
    items: [
      { name: "All Customers", href: "/admin/customers", icon: Users },
      { name: "Wholesale", href: "/admin/wholesale", icon: Building2, badge: "wholesale" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Fetch dashboard stats for badges
  const dashboardOverview = useQuery(api.analytics.getDashboardOverview);
  const wholesaleApplications = useQuery(api.wholesaleApplications.listApplications, {
    status: "pending",
    limit: 10,
  });

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  // Get badge count for nav items
  const getBadgeCount = (badge?: NavItem["badge"]): number | null => {
    if (!badge) return null;
    switch (badge) {
      case "orders":
        return dashboardOverview?.pendingOrders || null;
      case "wholesale":
        return wholesaleApplications?.length || null;
      case "lowStock":
        return dashboardOverview?.lowStockCount || null;
      default:
        return null;
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      {/* Header - Logo/Brand with Toggle */}
      <SidebarHeader className="border-b border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="justify-between">
              <div className="flex items-center w-full">
                <Link to="/admin" className="flex items-center gap-3 flex-1">
                  <div className="flex aspect-square size-9 items-center justify-center bg-primary text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
                    NW
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-bold text-sm tracking-tight">NISHANI WOOLERA</span>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Admin Panel</span>
                  </div>
                </Link>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation - Grouped */}
      <SidebarContent className="px-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-2">
            <SidebarGroupLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground/70 px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const badgeCount = getBadgeCount(item.badge);
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.name}
                        className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm transition-all duration-150"
                      >
                        <Link to={item.href}>
                          <item.icon className="size-4" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badgeCount !== null && badgeCount > 0 && (
                        <SidebarMenuBadge className="bg-primary/10 text-primary font-semibold">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer - User Menu */}
      <SidebarFooter className="border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="size-8 border border-border/50">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{user?.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="end"
                sideOffset={4}
              >
                <div className="flex items-center gap-3 px-3 py-2.5 text-left">
                  <Avatar className="size-10 border border-border/50">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold">{user?.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Administrator
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/" className="flex items-center">
                    <ExternalLink className="mr-2 size-4" />
                    View Store
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Rail for edge-based toggle (click on edge to expand when collapsed) */}
      <SidebarRail />
    </Sidebar>
  );
}

export default AdminSidebar;
