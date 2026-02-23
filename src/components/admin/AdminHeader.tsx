import { useState, startTransition } from "react";
import { Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, ChevronRight, Search, LogOut, User, ExternalLink } from "lucide-react";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { AdminNotifications } from "./AdminNotifications";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
}

export function AdminHeader({ breadcrumbs }: AdminHeaderProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left Section: Sidebar Trigger + Breadcrumbs */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 hover:bg-muted" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border/50" />

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link
              to="/admin"
              className="hover:text-foreground transition-colors flex items-center p-1 hover:bg-muted"
            >
              <Home className="size-4" />
            </Link>

            {breadcrumbs && breadcrumbs.length > 0 && (
              <>
                {breadcrumbs.map((item, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    <ChevronRight className="size-3.5 text-muted-foreground/50" />
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="hover:text-foreground transition-colors px-1.5 py-0.5 hover:bg-muted"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium px-1.5 py-0.5">{item.label}</span>
                    )}
                  </span>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* Right Section: Search, Notifications, Profile */}
        <div className="flex items-center gap-1">
          {/* Quick Search Button */}
          <Button
            variant="outline"
            className="hidden sm:flex w-56 justify-start text-muted-foreground border-border/50 hover:border-border hover:bg-muted/50 transition-all"
            onClick={() => startTransition(() => setCommandOpen(true))}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">Ctrl</span>K
            </kbd>
          </Button>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden hover:bg-muted"
            onClick={() => startTransition(() => setCommandOpen(true))}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6 bg-border/50 hidden sm:block" />

          {/* Notifications */}
          <AdminNotifications />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 p-0 hover:bg-muted">
                <Avatar className="h-8 w-8 border border-border/50">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/settings" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/" className="flex items-center cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>View Store</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Palette Modal */}
      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}

export default AdminHeader;
