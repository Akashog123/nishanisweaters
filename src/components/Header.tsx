import { ShoppingCart, Heart, User, Menu, X, Package, Settings, LogOut, Building2 } from "lucide-react";
import { useState, memo, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import SearchBar from "@/components/SearchBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Navigation links - defined outside component to prevent recreation on each render
const NAV_LINKS = [
  { name: "NEW ARRIVALS", href: "/shop/new-arrival" },
  { name: "MENS", href: "/shop/mens" },
  { name: "WOMENS", href: "/shop/womens" },
  { name: "ABOUT US", href: "#about" },
] as const;

const Header = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { isSignedIn, user, isLoaded } = useUser();

  const dbUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn && user ? { clerkId: user.id } : "skip"
  );

  const isAdmin = dbUser?.role === "admin";
  const isWholesale = dbUser?.role === "wholesale";

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-lg font-medium hover:text-primary transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="border-t pt-4 mt-4">
                  {isSignedIn ? (
                    <>
                      <Link
                        to="/account"
                        className="flex items-center gap-2 py-2 hover:text-primary"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" /> My Account
                      </Link>
                      <Link
                        to="/orders"
                        className="flex items-center gap-2 py-2 hover:text-primary"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Package className="h-4 w-4" /> Orders
                      </Link>
                      <Link
                        to="/wishlist"
                        className="flex items-center gap-2 py-2 hover:text-primary"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Heart className="h-4 w-4" /> Wishlist
                      </Link>
                      {isWholesale && (
                        <Link
                          to="/wholesale/dashboard"
                          className="flex items-center gap-2 py-2 hover:text-primary"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Building2 className="h-4 w-4" /> Wholesale Dashboard
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 py-2 hover:text-primary"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" /> Admin Dashboard
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SignInButton mode="modal">
                        <Button variant="outline" className="w-full">
                          Sign In
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button className="w-full">Sign Up</Button>
                      </SignUpButton>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="text-xl lg:text-3xl font-bold tracking-tight">
            NISHANI WOOLERA.
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
            {!isWholesale && isSignedIn && (
              <Link
                to="/wholesale/register"
                className="text-sm font-medium text-primary hover:underline"
              >
                BECOME A PARTNER
              </Link>
            )}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:block">
              <SearchBar />
            </div>

            {/* Wishlist - Only for signed in users */}
            {isSignedIn && (
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="hover:bg-secondary">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-secondary relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
            </Button>

            {/* User Menu */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-secondary">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{user?.fullName || "My Account"}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {user?.primaryEmailAddress?.emailAddress}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Account Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/orders" className="cursor-pointer">
                          <Package className="mr-2 h-4 w-4" />
                          Order History
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/wishlist" className="cursor-pointer">
                          <Heart className="mr-2 h-4 w-4" />
                          Wishlist
                        </Link>
                      </DropdownMenuItem>
                      {isWholesale && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/wholesale/dashboard" className="cursor-pointer">
                              <Building2 className="mr-2 h-4 w-4" />
                              Wholesale Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" />
                              Admin Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer">
                        <UserButton afterSignOutUrl="/" />
                        <span className="ml-2">Manage Account</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <SignInButton mode="modal">
                      <Button variant="ghost" size="sm">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button size="sm">Sign Up</Button>
                    </SignUpButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  );
};

export default memo(Header);
