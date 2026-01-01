import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Package,
  ShoppingCart,
  Users,
  Settings,
  LayoutDashboard,
  Plus,
  Clock,
  AlertTriangle,
  Building2,
  Tag,
  Star,
  FileText,
} from "lucide-react";

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCommandPalette({ open, onOpenChange }: AdminCommandPaletteProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K to toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Fetch products for search (only when searching)
  const products = useQuery(
    api.products.listProducts,
    search.length >= 2 ? { limit: 5 } : "skip"
  );

  // Fetch orders for search (only when searching)
  const orders = useQuery(
    api.orders.listAllOrders,
    search.length >= 2 ? { limit: 5 } : "skip"
  );

  // Filter products and orders based on search term
  const filteredProducts = useMemo(() => {
    if (!products?.products || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    return products.products
      .filter((p) => p.name.toLowerCase().includes(searchLower))
      .slice(0, 5);
  }, [products, search]);

  const filteredOrders = useMemo(() => {
    if (!orders?.orders || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    return orders.orders
      .filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(searchLower) ||
          o.shippingAddress?.name?.toLowerCase().includes(searchLower)
      )
      .slice(0, 5);
  }, [orders, search]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  // Quick navigation items
  const quickNav = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Wholesale", href: "/admin/wholesale", icon: Building2 },
    { name: "Reviews", href: "/admin/reviews", icon: Star },
    { name: "Promo Codes", href: "/admin/promo-codes", icon: Tag },
    { name: "CMS", href: "/admin/cms", icon: FileText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  // Quick actions
  const quickActions = [
    { name: "Add New Product", href: "/admin/products?action=new", icon: Plus },
    { name: "View Pending Orders", href: "/admin/orders?status=pending", icon: Clock },
    { name: "View Disputed Orders", href: "/admin/orders?status=disputed", icon: AlertTriangle },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search orders, products, or type a command..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-12 text-center">
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-muted mb-3">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">No results found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
        </CommandEmpty>

        {/* Search Results - Products */}
        {filteredProducts.length > 0 && (
          <CommandGroup heading="Products">
            {filteredProducts.map((product) => (
              <CommandItem
                key={product._id}
                onSelect={() => handleSelect(`/admin/products?edit=${product._id}`)}
                className="flex items-center gap-3 py-3"
              >
                <div className="w-8 h-8 flex items-center justify-center bg-primary/10 shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{product.name}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(product.retailPrice)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Search Results - Orders */}
        {filteredOrders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Orders">
              {filteredOrders.map((order) => (
                <CommandItem
                  key={order._id}
                  onSelect={() => handleSelect(`/admin/orders?order=${order._id}`)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-amber-500/10 shrink-0">
                    <ShoppingCart className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {order.shippingAddress?.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Quick Actions - Always visible */}
        {search.length < 2 && (
          <>
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.name}
                  onSelect={() => handleSelect(action.href)}
                  className="flex items-center gap-3 py-2.5"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{action.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-2" />

            {/* Navigation - Always visible when not searching */}
            <CommandGroup heading="Navigation">
              {quickNav.map((item) => (
                <CommandItem
                  key={item.name}
                  onSelect={() => handleSelect(item.href)}
                  className="flex items-center gap-3 py-2.5"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default AdminCommandPalette;
