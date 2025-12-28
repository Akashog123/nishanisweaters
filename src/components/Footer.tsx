import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-100 py-16 lg:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-16 relative z-10">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <h3 className="text-2xl lg:text-3xl font-bold">NISHANI WOOLERA.</h3>
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
                  CONTACT
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  BLOG
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="font-bold mb-4 lg:mb-6 text-xs lg:text-sm text-gray-400 uppercase tracking-wider">
              FOLLOW US
            </h4>
            <ul className="space-y-2 lg:space-y-3">
              <li>
                <a href="https://x.com/VeloxThemes" target="_blank" rel="noopener noreferrer" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  X/TWITTER
                </a>
              </li>
              <li>
                <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  FACEBOOK
                </a>
              </li>
              <li>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-sm lg:text-base text-gray-900 hover:underline transition-colors">
                  INSTAGRAM
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Background Text */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-start pointer-events-none select-none overflow-hidden h-32 lg:h-48">
          <h2 className="text-[3rem] lg:text-[5rem] xl:text-[7rem] px-4 font-bold whitespace-nowrap opacity-[0.1] leading-none">
            DESIGNED FOR THE BOLD.
          </h2>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
