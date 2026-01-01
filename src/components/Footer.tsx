import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  // Fetch dynamic social links from settings
  const socialLinks = useQuery(api.settings.getSocialLinks);

  return (
    <footer className="bg-gray-100 py-16 lg:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-16 relative z-10">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/Logo.svg" alt="Nishani Woolera Logo" className="h-24 lg:h-28 w-auto" />
              <h3 className="text-2xl lg:text-3xl font-bold">NISHANI WOOLERA.</h3>
            </div>
            <p className="text-sm text-gray-600">
              Made by OG
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-gray-900">© 2025 Nishani Woolera</p>
              <Link to="/privacy-policy" className="block text-gray-600 hover:text-black transition-colors">
                Privacy Policy.
              </Link>
            </div>
          </div>

          {/* Shops Links */}
          <div>
            <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-400 uppercase tracking-wider">
              SHOPS
            </h4>
            <ul className="space-y-2 lg:space-y-3">
              <li>
                <Link to="/shop/new-arrival" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  NEW ARRIVALS
                </Link>
              </li>
              <li>
                <Link to="/shop/mens" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  MENS
                </Link>
              </li>
              <li>
                <Link to="/shop/womens" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  WOMENS
                </Link>
              </li>
              <li>
                <Link to="/shop/kids" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  KIDS
                </Link>
              </li>
              <li>
                <Link to="/shop/winter" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  WINTER
                </Link>
              </li>
            </ul>
          </div>

          {/* Brand Links */}
          <div>
            <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-400 uppercase tracking-wider">
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
              <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-400 uppercase tracking-wider">
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

        {/* Background Text */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none select-none overflow-hidden h-32 lg:h-48">
          <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[5rem] xl:text-[6rem] 2xl:text-[8rem] font-bold whitespace-nowrap opacity-[0.1] leading-none text-center">
            DESIGNED FOR THE BOLD.
          </h2>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
