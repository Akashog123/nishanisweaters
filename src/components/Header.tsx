import { ShoppingCart, Heart, Menu, Package, Settings, Phone, MapPin, Bell } from "lucide-react";
import { useState, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/CartDrawer";
import CartBadge from "@/components/CartBadge";
import SearchBar from "@/components/SearchBar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ContactInfoPage } from "@/components/account/ContactInfoPage";
import { ClerkAddressesPage } from "@/components/account/ClerkAddressesPage";
import { ClerkNotificationsPage } from "@/components/account/ClerkNotificationsPage";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useHeaderCategories } from "@/hooks/useCategories";

// Navigation links - defined outside component to prevent recreation on each render
// These are fallback defaults when dynamic categories are not enabled
const DEFAULT_navLinks = [
  { name: "NEW ARRIVALS", href: "/shop/new-arrival" },
  { name: "MENS", href: "/shop/mens" },
  { name: "WOMENS", href: "/shop/womens" },
  { name: "KIDS", href: "/shop/kids" },
  { name: "BULK PURCHASE", href: "/bulk-purchase" },
  { name: "ABOUT US", href: "/about-us" },
] as const;

const STATIC_LINKS = [
  { name: "BULK PURCHASE", href: "/bulk-purchase" },
  { name: "ABOUT US", href: "/about-us" },
] as const;

const Header = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const { siteName, logoUrl, settings } = useSiteSettings();
  const headerCategories = useHeaderCategories();

  // Check if dynamic categories are enabled
  const enableDynamicCategories = settings?.enableDynamic === "true";

  // Build navigation links based on settings
  const navLinks = enableDynamicCategories && headerCategories
    ? [
        ...headerCategories.map((cat) => ({
          name: cat.name.toUpperCase(),
          href: `/shop/${cat.slug}`,
        })),
        ...STATIC_LINKS,
      ]
    : DEFAULT_navLinks;

  // SECURITY: Use server-side identity verification - never pass client clerkId
  const dbUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : "skip"
  );

  const isAdmin = dbUser?.role === "admin";

  // PERFORMANCE: Prefetch routes on hover for faster navigation
  const prefetchRoute = useCallback((href: string) => {
    if (href.startsWith("/shop")) {
      import("@/pages/Shop");
    } else if (href === "/bulk-purchase") {
      import("@/pages/wholesale/BulkOrder");
    } else if (href === "/about-us") {
      import("@/pages/AboutUs");
    } else if (href === "/contact-us") {
      import("@/pages/ContactUs");
    }
  }, []);

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
                {navLinks.map((link) => (
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
                      {/* Customer links - hidden for admin users */}
                      {!isAdmin && (
                        <>
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
                        </>
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
          <Link to="/" className="flex items-center gap-2 text-xl lg:text-3xl font-bold tracking-tight">
            <img src={logoUrl} alt={`${siteName} Logo`} className="h-12 lg:h-20 w-auto" />
            {/* {siteName} */}
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium hover:text-primary transition-colors"
                onMouseEnter={() => prefetchRoute(link.href)}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:block">
              <SearchBar />
            </div>

            {/* Wishlist - Only for signed in non-admin users */}
            {isSignedIn && !isAdmin && (
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="hover:bg-secondary hover:text-foreground">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* Cart - Hidden for admin users */}
            {/* PERFORMANCE: CartBadge is a separate memoized component */}
            {/* This prevents Header re-renders when cart changes */}
            {!isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-secondary hover:text-foreground relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                <CartBadge />
              </Button>
            )}

            {/* User Menu */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8"
                      }
                    }}
                  >
                    <UserButton.UserProfilePage
                      label="Contact Info"
                      labelIcon={<Phone className="h-4 w-4" />}
                      url="contact"
                    >
                      <ContactInfoPage />
                    </UserButton.UserProfilePage>

                    <UserButton.UserProfilePage
                      label="Addresses"
                      labelIcon={<MapPin className="h-4 w-4" />}
                      url="addresses"
                    >
                      <ClerkAddressesPage />
                    </UserButton.UserProfilePage>

                    <UserButton.UserProfilePage
                      label="Notifications"
                      labelIcon={<Bell className="h-4 w-4" />}
                      url="notifications"
                    >
                      <ClerkNotificationsPage />
                    </UserButton.UserProfilePage>

                    <UserButton.MenuItems>
                      {/* Order History - hidden for admin users */}
                      {!isAdmin && (
                        <UserButton.Link
                          label="Order History"
                          labelIcon={<Package className="h-4 w-4" />}
                          href="/orders"
                        />
                      )}
                      {isAdmin && (
                        <UserButton.Link
                          label="Admin Dashboard"
                          labelIcon={<Settings className="h-4 w-4" />}
                          href="/admin"
                        />
                      )}
                    </UserButton.MenuItems>
                  </UserButton>
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
