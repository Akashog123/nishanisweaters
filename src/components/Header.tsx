import { ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navLinks = [
    { name: "NEW ARRIVAL", href: "#new-arrival" },
    { name: "MENS", href: "#mens" },
    { name: "WOMENS", href: "#womens" },
    { name: "ABOUT US", href: "#about" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="text-2xl lg:text-3xl font-bold tracking-tight">
            BLOCKHAUS.
          </a>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hover:bg-secondary">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-secondary relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                0
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
