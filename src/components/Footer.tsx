import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useActiveCategories } from "@/hooks/useCategories";

// Helper to validate URL protocol for XSS prevention
const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const Footer = () => {
  // Social links now come from the unified settings query (no separate subscription)
  const { siteName, logoUrl, footerTagline, footerBackgroundText, copyrightYear, settings, socialLinks } = useSiteSettings();
  const activeCategories = useActiveCategories();

  // Check if dynamic categories are enabled
  const enableDynamicCategories = settings?.enableDynamic === "true";

  // Default shop links as fallback
  const defaultShopLinks = [
    { name: "NEW ARRIVALS", href: "/shop/new-arrival" },
    { name: "MENS", href: "/shop/mens" },
    { name: "WOMENS", href: "/shop/womens" },
    { name: "KIDS", href: "/shop/kids" },
    { name: "WINTER", href: "/shop/winter" },
  ];

  // Build shop links based on settings
  const shopLinks = enableDynamicCategories && activeCategories
    ? activeCategories.map((cat) => ({
        name: cat.name.toUpperCase(),
        href: `/shop/${cat.slug}`,
      }))
    : defaultShopLinks;

  return (
    <footer className="bg-gray-100 py-16 lg:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-16 relative z-10">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={`${siteName} Logo`} className="h-24 lg:h-28 w-auto" width="224" height="112" />
              {/* <h3 className="text-2xl lg:text-3xl font-bold">{siteName}</h3> */}
            </div>
            <p className="text-sm text-gray-600">
              {footerTagline}
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-gray-900">© {copyrightYear} {siteName}</p>
              <Link to="/privacy-policy" className="block text-gray-600 hover:text-black transition-colors">
                Privacy Policy.
              </Link>
              <Link to="/terms-of-service" className="block text-gray-600 hover:text-black transition-colors">
                Terms of Service.
              </Link>
            </div>
          </div>

          {/* Shops Links */}
          <div>
            <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-500 uppercase tracking-wider">
              SHOPS
            </h4>
            <ul className="space-y-2 lg:space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Brand Links */}
          <div>
            <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-500 uppercase tracking-wider">
              BRAND
            </h4>
            <ul className="space-y-2 lg:space-y-3">
              <li>
                <Link to="/about-us" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  ABOUT
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  CONTACT US
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us - Dynamic Social Links (only shown when links are configured) */}
          {socialLinks && socialLinks.length > 0 && (
            <div>
              <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-500 uppercase tracking-wider">
                FOLLOW US
              </h4>
              <ul className="space-y-2 lg:space-y-3">
                {socialLinks
                  .filter((link) => isSafeUrl(link.url))
                  .map((link) => (
                    <li key={link.platform}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm lg:text-base text-gray-900 hover:underline transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Background Text - decorative only, hidden from assistive tech */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none select-none overflow-hidden h-32 lg:h-48" aria-hidden="true">
          <span className="text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[5rem] xl:text-[6rem] 2xl:text-[8rem] font-bold whitespace-nowrap opacity-[0.1] leading-none text-center">
            {footerBackgroundText}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
