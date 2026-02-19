/**
 * Settings Registry - Central definition of all configurable settings
 *
 * This registry defines the metadata for all admin-configurable settings.
 * Settings are stored in the database but use these definitions for:
 * - Default values when database is empty
 * - Validation rules (min/max values)
 * - UI rendering (labels, descriptions, input types)
 * - Preview information (affected code areas)
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export type SettingCategory =
  | "pricing_tax"
  | "shipping"
  | "cart_session"
  | "validation"
  | "pagination"
  | "abandoned_cart"
  | "email"
  | "contact"
  | "social_links"
  | "images"
  | "branding"
  | "content"
  | "display"
  | "business_info"
  | "legal";

export type SettingValueType =
  | "number"
  | "percentage"
  | "currency"
  | "duration_ms"
  | "duration_hours"
  | "string"
  | "text"
  | "email"
  | "phone"
  | "url"
  | "boolean";

export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  category: SettingCategory;
  valueType: SettingValueType;
  defaultValue: string;
  minValue?: number;
  maxValue?: number;
  displayOrder: number;
  affectedAreas: string[];
}

// ============================================
// CATEGORY METADATA
// ============================================

export const CATEGORY_LABELS: Record<SettingCategory, string> = {
  pricing_tax: "Pricing & Tax",
  shipping: "Shipping",
  cart_session: "Cart & Session",
  validation: "Validation Limits",
  pagination: "Pagination",
  abandoned_cart: "Abandoned Cart Recovery",
  email: "Email Settings",
  contact: "Contact Information",
  social_links: "Social Media Links",
  images: "Images & Media",
  branding: "Branding",
  content: "Content",
  display: "Display Settings",
  business_info: "Business Information",
  legal: "Legal Pages",
};

export const CATEGORY_DESCRIPTIONS: Record<SettingCategory, string> = {
  pricing_tax: "Configure tax rates and pricing calculations",
  shipping: "Set shipping thresholds and delivery costs",
  cart_session: "Manage cart expiry and session timeouts",
  validation: "Define validation limits for orders and uploads",
  pagination: "Configure list pagination defaults",
  abandoned_cart: "Tune abandoned cart recovery timing and discounts",
  email: "Configure email sender addresses",
  contact: "Manage contact information displayed to customers",
  social_links: "Configure social media links displayed in the footer",
  images: "Configure default images for hero, placeholders, and category banners",
  branding: "Configure site branding and identity",
  content: "Manage content displayed in hero, footer, and banners",
  display: "Configure product display limits and grid settings",
  business_info: "Manage business information displayed to customers",
  legal: "Configure legal page content and policies",
};

export const CATEGORY_ICONS: Record<SettingCategory, string> = {
  pricing_tax: "IndianRupee",
  shipping: "Truck",
  cart_session: "ShoppingCart",
  validation: "ShieldCheck",
  pagination: "LayoutList",
  abandoned_cart: "Clock",
  email: "Mail",
  contact: "Phone",
  social_links: "Share2",
  images: "Image",
  branding: "Palette",
  content: "FileText",
  display: "LayoutGrid",
  business_info: "Building",
  legal: "Scale",
};

// ============================================
// TIME CONSTANTS (for reference)
// ============================================

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ============================================
// SETTINGS REGISTRY
// ============================================

export const SETTINGS_REGISTRY: SettingDefinition[] = [
  // ============================================
  // PRICING & TAX (1 setting)
  // ============================================
  {
    key: "PRICING.TAX_RATE",
    label: "GST Tax Rate",
    description: "Tax rate applied to all orders (18% GST for India)",
    category: "pricing_tax",
    valueType: "percentage",
    defaultValue: "0.18",
    minValue: 0,
    maxValue: 1,
    displayOrder: 1,
    affectedAreas: [
      "convex/orders.ts - calculateTax()",
      "convex/lib/constants.ts - calculateTax()",
      "src/pages/Checkout.tsx - Order summary",
      "src/components/CartDrawer.tsx - Cart totals",
    ],
  },

  // ============================================
  // SHIPPING (2 settings)
  // ============================================
  {
    key: "SHIPPING.FREE_THRESHOLD",
    label: "Free Shipping Threshold",
    description: "Minimum order amount (INR) for free shipping",
    category: "shipping",
    valueType: "currency",
    defaultValue: "1000",
    minValue: 0,
    displayOrder: 1,
    affectedAreas: [
      "convex/orders.ts - calculateShipping()",
      "convex/lib/constants.ts - calculateShipping()",
      "src/pages/Checkout.tsx - Shipping display",
      "src/components/CartDrawer.tsx - Free shipping message",
    ],
  },
  {
    key: "SHIPPING.STANDARD_COST",
    label: "Standard Shipping Cost",
    description: "Shipping cost (INR) when order is below threshold",
    category: "shipping",
    valueType: "currency",
    defaultValue: "99",
    minValue: 0,
    displayOrder: 2,
    affectedAreas: [
      "convex/orders.ts - calculateShipping()",
      "convex/lib/constants.ts - calculateShipping()",
      "src/pages/Checkout.tsx - Shipping display",
    ],
  },

  // ============================================
  // CART & SESSION (3 settings)
  // ============================================
  {
    key: "CART.GUEST_EXPIRY",
    label: "Guest Cart Expiry",
    description: "How long guest carts are retained before cleanup (in hours)",
    category: "cart_session",
    valueType: "duration_hours",
    defaultValue: String(7 * DAY_MS), // 7 days in ms
    minValue: HOUR_MS, // 1 hour minimum
    displayOrder: 1,
    affectedAreas: [
      "convex/cart.ts - Cart cleanup cron",
      "convex/crons.ts - Scheduled cleanup",
    ],
  },
  {
    key: "CART.SESSION_TIMEOUT",
    label: "Session Timeout",
    description: "Idle session timeout for users (in minutes)",
    category: "cart_session",
    valueType: "duration_hours",
    defaultValue: String(30 * 60 * 1000), // 30 minutes
    minValue: 5 * 60 * 1000, // 5 minutes minimum
    displayOrder: 2,
    affectedAreas: ["Session management logic"],
  },
  {
    key: "CART.MAX_ITEM_QUANTITY",
    label: "Maximum Item Quantity",
    description: "Maximum quantity allowed per item in cart",
    category: "cart_session",
    valueType: "number",
    defaultValue: "100",
    minValue: 1,
    maxValue: 10000,
    displayOrder: 3,
    affectedAreas: [
      "convex/cart.ts - addToCart validation",
      "src/pages/ProductDetail.tsx - Quantity selector",
    ],
  },

  // ============================================
  // VALIDATION LIMITS (3 settings)
  // ============================================
  {
    key: "VALIDATION.MIN_WHOLESALE_QUANTITY",
    label: "Minimum Wholesale Order Quantity",
    description: "Minimum items per order for wholesale customers",
    category: "validation",
    valueType: "number",
    defaultValue: "10",
    minValue: 1,
    displayOrder: 1,
    affectedAreas: [
      "convex/orders.ts - Wholesale order validation",
      "src/pages/wholesale/BulkOrder.tsx - Order form",
    ],
  },
  {
    key: "VALIDATION.MAX_NOTES_LENGTH",
    label: "Maximum Notes Length",
    description: "Maximum characters for customer order notes",
    category: "validation",
    valueType: "number",
    defaultValue: "500",
    minValue: 50,
    maxValue: 5000,
    displayOrder: 2,
    affectedAreas: ["src/pages/Checkout.tsx - Notes input validation"],
  },
  {
    key: "VALIDATION.MAX_FILE_SIZE",
    label: "Maximum File Size (MB)",
    description: "Maximum upload file size in bytes (5MB default)",
    category: "validation",
    valueType: "number",
    defaultValue: String(5 * 1024 * 1024), // 5MB
    minValue: 1024 * 1024, // 1MB minimum
    maxValue: 50 * 1024 * 1024, // 50MB maximum
    displayOrder: 3,
    affectedAreas: [
      "File upload validation",
      "src/components/admin/products/ProductFormDialog.tsx",
    ],
  },

  // ============================================
  // PAGINATION (3 settings)
  // ============================================
  {
    key: "PAGINATION.DEFAULT_PAGE_SIZE",
    label: "Default Page Size",
    description: "Default number of items per page for customer-facing lists",
    category: "pagination",
    valueType: "number",
    defaultValue: "20",
    minValue: 5,
    maxValue: 100,
    displayOrder: 1,
    affectedAreas: ["All product listing pages"],
  },
  {
    key: "PAGINATION.MAX_PAGE_SIZE",
    label: "Maximum Page Size",
    description: "Maximum items allowed per page request",
    category: "pagination",
    valueType: "number",
    defaultValue: "100",
    minValue: 10,
    maxValue: 500,
    displayOrder: 2,
    affectedAreas: ["API pagination limits"],
  },
  {
    key: "PAGINATION.ADMIN_PAGE_SIZE",
    label: "Admin Page Size",
    description: "Default page size for admin tables",
    category: "pagination",
    valueType: "number",
    defaultValue: "50",
    minValue: 10,
    maxValue: 200,
    displayOrder: 3,
    affectedAreas: [
      "src/pages/admin/AdminProducts.tsx",
      "src/pages/admin/AdminCustomers.tsx",
      "src/pages/admin/AdminOrders.tsx",
    ],
  },

  // ============================================
  // ABANDONED CART RECOVERY (6 settings)
  // ============================================
  {
    key: "ABANDONED_CART.REMINDER_1_DELAY",
    label: "First Reminder Delay",
    description: "Hours after cart abandonment to send first reminder email",
    category: "abandoned_cart",
    valueType: "duration_hours",
    defaultValue: String(24 * HOUR_MS), // 24 hours
    minValue: HOUR_MS, // 1 hour minimum
    displayOrder: 1,
    affectedAreas: ["convex/abandonedCart.ts - REMINDER_DELAYS"],
  },
  {
    key: "ABANDONED_CART.REMINDER_2_DELAY",
    label: "Second Reminder Delay",
    description: "Hours after cart abandonment to send second reminder email",
    category: "abandoned_cart",
    valueType: "duration_hours",
    defaultValue: String(48 * HOUR_MS), // 48 hours
    minValue: HOUR_MS,
    displayOrder: 2,
    affectedAreas: ["convex/abandonedCart.ts - REMINDER_DELAYS"],
  },
  {
    key: "ABANDONED_CART.REMINDER_3_DELAY",
    label: "Third Reminder Delay",
    description: "Hours after cart abandonment to send third reminder email",
    category: "abandoned_cart",
    valueType: "duration_hours",
    defaultValue: String(72 * HOUR_MS), // 72 hours
    minValue: HOUR_MS,
    displayOrder: 3,
    affectedAreas: ["convex/abandonedCart.ts - REMINDER_DELAYS"],
  },
  {
    key: "ABANDONED_CART.MAX_REMINDERS",
    label: "Maximum Reminders",
    description: "Maximum number of reminder emails to send per cart",
    category: "abandoned_cart",
    valueType: "number",
    defaultValue: "3",
    minValue: 1,
    maxValue: 5,
    displayOrder: 4,
    affectedAreas: ["convex/abandonedCart.ts - MAX_REMINDERS"],
  },
  {
    key: "ABANDONED_CART.CART_AGE_THRESHOLD",
    label: "Cart Age Threshold",
    description: "Minimum cart age (hours) before considering it abandoned",
    category: "abandoned_cart",
    valueType: "duration_hours",
    defaultValue: String(24 * HOUR_MS), // 24 hours
    minValue: HOUR_MS,
    displayOrder: 5,
    affectedAreas: ["convex/abandonedCart.ts - CART_AGE_THRESHOLD"],
  },
  {
    key: "ABANDONED_CART.DEFAULT_DISCOUNT",
    label: "Default Recovery Discount",
    description: "Discount percentage offered in final reminder email",
    category: "abandoned_cart",
    valueType: "percentage",
    defaultValue: "0.10", // 10%
    minValue: 0,
    maxValue: 0.5, // 50% max
    displayOrder: 6,
    affectedAreas: [
      "convex/abandonedCart.ts - Final reminder discount",
      "convex/emails.ts - Abandoned cart email template",
    ],
  },

  // ============================================
  // EMAIL SETTINGS (5 settings)
  // ============================================
  {
    key: "EMAIL.FROM_ORDERS",
    label: "Orders Email Sender",
    description: "From address for order confirmation emails",
    category: "email",
    valueType: "email",
    defaultValue: "support@nidhiclothing.com",
    displayOrder: 1,
    affectedAreas: ["convex/emails.ts - sendOrderConfirmationEmail"],
  },
  {
    key: "EMAIL.FROM_SHIPPING",
    label: "Shipping Email Sender",
    description: "From address for shipping update emails",
    category: "email",
    valueType: "email",
    defaultValue: "support@nidhiclothing.com",
    displayOrder: 2,
    affectedAreas: ["convex/emails.ts - sendShippingUpdateEmail"],
  },
  {
    key: "EMAIL.FROM_WHOLESALE",
    label: "Wholesale Email Sender",
    description: "From address for wholesale-related emails",
    category: "email",
    valueType: "email",
    defaultValue: "support@nidhiclothing.com",
    displayOrder: 3,
    affectedAreas: ["convex/emails.ts - sendWholesaleStatusEmail"],
  },
  {
    key: "EMAIL.FROM_CART",
    label: "Cart Recovery Email Sender",
    description: "From address for abandoned cart emails",
    category: "email",
    valueType: "email",
    defaultValue: "support@nidhiclothing.com",
    displayOrder: 4,
    affectedAreas: ["convex/emails.ts - sendAbandonedCartEmail"],
  },
  {
    key: "EMAIL.SUPPORT_ADDRESS",
    label: "Support Email",
    description: "Support email shown in email footers",
    category: "email",
    valueType: "email",
    defaultValue: "support@nidhiclothing.com",
    displayOrder: 5,
    affectedAreas: ["All email templates - Footer support link"],
  },

  // ============================================
  // CONTACT INFORMATION (2 settings)
  // ============================================
  {
    key: "CONTACT.WHATSAPP_NUMBER",
    label: "WhatsApp Contact Number",
    description: "WhatsApp number for bulk pricing and customer inquiries",
    category: "contact",
    valueType: "phone",
    defaultValue: "+91 7458 816 343",
    displayOrder: 1,
    affectedAreas: [
      "src/pages/wholesale/BulkOrder.tsx",
      "src/pages/wholesale/WholesaleDashboard.tsx",
      "convex/emails.ts - Wholesale approval email",
    ],
  },
  {
    key: "CONTACT.WHATSAPP_URL",
    label: "WhatsApp URL",
    description: "Pre-filled WhatsApp message URL for bulk inquiries",
    category: "contact",
    valueType: "url",
    defaultValue:
      "https://wa.me/917458816343?text=Hi,%20I%27m%20interested%20in%20bulk%20purchase.",
    displayOrder: 2,
    affectedAreas: ["src/pages/wholesale/BulkOrder.tsx - WhatsApp button"],
  },
  {
    key: "CONTACT.SUPPORT_EMAIL",
    label: "Support Email",
    description: "Primary support email address for customer inquiries",
    category: "contact",
    valueType: "email",
    defaultValue: "support@nidhiclothing.com",
    displayOrder: 3,
    affectedAreas: [
      "Contact page",
      "Footer contact section",
      "convex/emails.ts - Contact inquiry notifications",
    ],
  },
  {
    key: "CONTACT.PHONE_NUMBER",
    label: "Support Phone Number",
    description: "Primary phone number displayed for customer support",
    category: "contact",
    valueType: "phone",
    defaultValue: "+91 7458 816 343",
    displayOrder: 4,
    affectedAreas: [
      "Contact page",
      "Footer contact section",
      "src/components/Footer.tsx",
    ],
  },
  {
    key: "CONTACT.ADDRESS",
    label: "Business Address",
    description: "Physical business address displayed on contact page",
    category: "contact",
    valueType: "string",
    defaultValue: "Nidhi Clothing Co., Main Market Road, Ludhiana, Punjab 141001, India",
    displayOrder: 5,
    affectedAreas: [
      "Contact page",
      "Footer contact section",
      "src/components/Footer.tsx",
    ],
  },

  // ============================================
  // SOCIAL MEDIA LINKS (16 settings - URL + enabled toggle for each platform)
  // ============================================
  {
    key: "SOCIAL.INSTAGRAM_URL",
    label: "Instagram URL",
    description: "Instagram profile URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 1,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.INSTAGRAM_ENABLED",
    label: "Show Instagram",
    description: "Display Instagram link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 2,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.FACEBOOK_URL",
    label: "Facebook URL",
    description: "Facebook page URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 3,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.FACEBOOK_ENABLED",
    label: "Show Facebook",
    description: "Display Facebook link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 4,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.YOUTUBE_URL",
    label: "YouTube URL",
    description: "YouTube channel URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 5,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.YOUTUBE_ENABLED",
    label: "Show YouTube",
    description: "Display YouTube link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 6,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.WHATSAPP_URL",
    label: "WhatsApp URL",
    description: "WhatsApp contact URL (wa.me link)",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 7,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.WHATSAPP_ENABLED",
    label: "Show WhatsApp",
    description: "Display WhatsApp link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 8,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.TWITTER_URL",
    label: "Twitter/X URL",
    description: "Twitter (X) profile URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 9,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.TWITTER_ENABLED",
    label: "Show Twitter/X",
    description: "Display Twitter/X link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 10,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.LINKEDIN_URL",
    label: "LinkedIn URL",
    description: "LinkedIn company page URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 11,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.LINKEDIN_ENABLED",
    label: "Show LinkedIn",
    description: "Display LinkedIn link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 12,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.PINTEREST_URL",
    label: "Pinterest URL",
    description: "Pinterest profile URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 13,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.PINTEREST_ENABLED",
    label: "Show Pinterest",
    description: "Display Pinterest link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 14,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.TELEGRAM_URL",
    label: "Telegram URL",
    description: "Telegram channel or contact URL",
    category: "social_links",
    valueType: "url",
    defaultValue: "",
    displayOrder: 15,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },
  {
    key: "SOCIAL.TELEGRAM_ENABLED",
    label: "Show Telegram",
    description: "Display Telegram link in footer",
    category: "social_links",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 16,
    affectedAreas: ["src/components/Footer.tsx - Social links section"],
  },

  // ============================================
  // IMAGES & MEDIA
  // ============================================
  {
    key: "IMAGES.HERO_URL",
    label: "Hero Image URL",
    description: "URL for the homepage hero section background image",
    category: "images",
    valueType: "url",
    defaultValue: "",
    displayOrder: 1,
    affectedAreas: ["src/components/HeroSection.tsx - Hero background image"],
  },
  {
    key: "IMAGES.PLACEHOLDER_URL",
    label: "Placeholder Image URL",
    description: "Default fallback image when product images are unavailable",
    category: "images",
    valueType: "url",
    defaultValue: "/placeholder.svg",
    displayOrder: 2,
    affectedAreas: [
      "src/components/NewArrivals.tsx - Product images",
      "src/components/BestSeller.tsx - Product images",
      "src/components/WinterWear.tsx - Product images",
      "src/components/SearchBar.tsx - Product images",
      "src/pages/Cart.tsx - Cart item images",
      "src/pages/ProductDetail.tsx - Product images",
      "src/pages/Shop.tsx - Product grid images",
      "src/pages/SearchResults.tsx - Search result images",
      "src/pages/wholesale/BulkOrder.tsx - Product images",
    ],
  },
  {
    key: "IMAGES.CATEGORY_BANNER_URL",
    label: "Default Category Banner URL",
    description: "Default banner image for category pages without custom images",
    category: "images",
    valueType: "url",
    defaultValue: "",
    displayOrder: 3,
    affectedAreas: ["Category pages - Banner background"],
  },

  // ============================================
  // BRANDING (3 settings)
  // ============================================
  {
    key: "BRANDING.SITE_NAME",
    label: "Site Name",
    description: "Company name displayed in header and footer",
    category: "branding",
    valueType: "string",
    defaultValue: "NIDHI CLOTHING CO.",
    displayOrder: 1,
    affectedAreas: [
      "src/components/Header.tsx",
      "src/components/Footer.tsx",
      "src/components/admin/AdminSidebar.tsx",
    ],
  },
  {
    key: "BRANDING.LOGO_URL",
    label: "Logo Image URL",
    description: "URL to the site logo image",
    category: "branding",
    valueType: "url",
    defaultValue: "/Logo.png",
    displayOrder: 2,
    affectedAreas: [
      "src/components/Header.tsx",
      "src/components/Footer.tsx",
    ],
  },
  {
    key: "BRANDING.COPYRIGHT_YEAR",
    label: "Copyright Year",
    description: "Year displayed in copyright notice",
    category: "branding",
    valueType: "string",
    defaultValue: "2025",
    displayOrder: 3,
    affectedAreas: ["src/components/Footer.tsx"],
  },

  // ============================================
  // CONTENT (7 settings)
  // ============================================
  {
    key: "HERO.BADGE_TEXT",
    label: "Hero Badge Text",
    description: "Small badge text above hero heading (e.g., 'YEAR-END SALE')",
    category: "content",
    valueType: "string",
    defaultValue: "YEAR-END SALE",
    displayOrder: 1,
    affectedAreas: ["src/components/HeroSection.tsx"],
  },
  {
    key: "HERO.HEADING",
    label: "Hero Heading",
    description: "Main heading text for hero section",
    category: "content",
    valueType: "text",
    defaultValue: "NIDHI CLOTHING CO.\nSIGNATURES 25% OFF",
    displayOrder: 2,
    affectedAreas: ["src/components/HeroSection.tsx"],
  },
  {
    key: "HERO.DESCRIPTION",
    label: "Hero Description",
    description: "Description text below hero heading",
    category: "content",
    valueType: "text",
    defaultValue: "Redefine your look with 25% off for all NIDHI CLOTHING CO. Signatures outfit",
    displayOrder: 3,
    affectedAreas: ["src/components/HeroSection.tsx"],
  },
  {
    key: "HERO.CTA_TEXT",
    label: "Hero CTA Button Text",
    description: "Text for the call-to-action button",
    category: "content",
    valueType: "string",
    defaultValue: "Explore",
    displayOrder: 4,
    affectedAreas: ["src/components/HeroSection.tsx"],
  },
  {
    key: "FOOTER.TAGLINE",
    label: "Footer Tagline",
    description: "Short tagline displayed below logo",
    category: "content",
    valueType: "string",
    defaultValue: "Made by OG",
    displayOrder: 5,
    affectedAreas: ["src/components/Footer.tsx"],
  },
  {
    key: "FOOTER.BACKGROUND_TEXT",
    label: "Footer Background Text",
    description: "Large decorative text in footer background",
    category: "content",
    valueType: "string",
    defaultValue: "DESIGNED FOR THE BOLD.",
    displayOrder: 6,
    affectedAreas: ["src/components/Footer.tsx"],
  },
  {
    key: "BUSINESS.RESPONSE_TIME",
    label: "Response Time Message",
    description: "Message about support response time",
    category: "content",
    valueType: "string",
    defaultValue: "We respond within 24 hours",
    displayOrder: 7,
    affectedAreas: ["src/pages/ContactUs.tsx"],
  },

  // ============================================
  // BUSINESS INFORMATION (6 settings)
  // ============================================
  {
    key: "BUSINESS.ESTABLISHED_YEAR",
    label: "Established Year",
    description: "Year the business was established",
    category: "business_info",
    valueType: "string",
    defaultValue: "2013",
    displayOrder: 1,
    affectedAreas: ["src/pages/AboutUs.tsx"],
  },
  {
    key: "BUSINESS.LOCATION",
    label: "Business Location",
    description: "City and state where business is located",
    category: "business_info",
    valueType: "string",
    defaultValue: "Ludhiana, Punjab",
    displayOrder: 2,
    affectedAreas: [
      "src/pages/AboutUs.tsx",
      "src/pages/ContactUs.tsx",
    ],
  },
  {
    key: "BUSINESS.CUSTOMERS_COUNT",
    label: "Happy Customers Count",
    description: "Number of happy customers to display",
    category: "business_info",
    valueType: "string",
    defaultValue: "10K+",
    displayOrder: 3,
    affectedAreas: ["src/pages/AboutUs.tsx"],
  },
  {
    key: "BUSINESS.YEARS_EXPERIENCE",
    label: "Years of Experience",
    description: "Years of experience to display",
    category: "business_info",
    valueType: "string",
    defaultValue: "40+",
    displayOrder: 4,
    affectedAreas: ["src/pages/AboutUs.tsx"],
  },
  {
    key: "BUSINESS.QUALITY_GUARANTEE",
    label: "Quality Guarantee",
    description: "Quality guarantee percentage or text",
    category: "business_info",
    valueType: "string",
    defaultValue: "100%",
    displayOrder: 5,
    affectedAreas: ["src/pages/AboutUs.tsx"],
  },
  {
    key: "BUSINESS.HOURS_WEEKDAYS",
    label: "Weekday Business Hours",
    description: "Business hours for weekdays",
    category: "business_info",
    valueType: "string",
    defaultValue: "10:00 AM - 6:00 PM",
    displayOrder: 6,
    affectedAreas: ["src/pages/ContactUs.tsx"],
  },
  {
    key: "BUSINESS.HOURS_WEEKENDS",
    label: "Weekend Business Hours",
    description: "Business hours for weekends",
    category: "business_info",
    valueType: "string",
    defaultValue: "Closed",
    displayOrder: 7,
    affectedAreas: ["src/pages/ContactUs.tsx"],
  },

  // ============================================
  // DISPLAY LIMITS (5 settings)
  // ============================================
  {
    key: "DISPLAY.NEW_ARRIVALS_LIMIT",
    label: "New Arrivals Limit",
    description: "Number of products to show in new arrivals section",
    category: "display",
    valueType: "number",
    defaultValue: "4",
    minValue: 1,
    maxValue: 20,
    displayOrder: 1,
    affectedAreas: ["src/components/NewArrivals.tsx"],
  },
  {
    key: "DISPLAY.BEST_SELLERS_LIMIT",
    label: "Best Sellers Limit",
    description: "Number of products to show in best sellers section",
    category: "display",
    valueType: "number",
    defaultValue: "3",
    minValue: 1,
    maxValue: 20,
    displayOrder: 2,
    affectedAreas: ["src/components/BestSeller.tsx"],
  },
  {
    key: "DISPLAY.WINTER_WEAR_LIMIT",
    label: "Winter Wear Limit",
    description: "Number of products to show in winter wear section",
    category: "display",
    valueType: "number",
    defaultValue: "6",
    minValue: 1,
    maxValue: 20,
    displayOrder: 3,
    affectedAreas: ["src/components/WinterWear.tsx"],
  },
  {
    key: "DISPLAY.RELATED_PRODUCTS_LIMIT",
    label: "Related Products Limit",
    description: "Number of related products to show on product detail page",
    category: "display",
    valueType: "number",
    defaultValue: "6",
    minValue: 1,
    maxValue: 20,
    displayOrder: 4,
    affectedAreas: ["src/pages/ProductDetail.tsx"],
  },
  {
    key: "DISPLAY.BULK_ORDER_LIMIT",
    label: "Bulk Order Products Limit",
    description: "Maximum number of products to load in bulk order page",
    category: "display",
    valueType: "number",
    defaultValue: "100",
    minValue: 10,
    maxValue: 500,
    displayOrder: 5,
    affectedAreas: ["src/pages/wholesale/BulkOrder.tsx"],
  },

  // ============================================
  // LEGAL PAGES (6 settings)
  // ============================================
  {
    key: "LEGAL.PRIVACY_POLICY_TITLE",
    label: "Privacy Policy Title",
    description: "Title displayed for privacy policy page",
    category: "legal",
    valueType: "string",
    defaultValue: "Privacy Policy",
    displayOrder: 1,
    affectedAreas: ["src/pages/PrivacyPolicy.tsx"],
  },
  {
    key: "LEGAL.PRIVACY_POLICY_CONTENT",
    label: "Privacy Policy Content",
    description: "Full content for privacy policy page (HTML supported)",
    category: "legal",
    valueType: "text",
    defaultValue: "",
    displayOrder: 2,
    affectedAreas: ["src/pages/PrivacyPolicy.tsx"],
  },
  {
    key: "LEGAL.PRIVACY_POLICY_EDITED_AT",
    label: "Privacy Policy Last Edited",
    description: "Timestamp when privacy policy was last edited (auto-managed)",
    category: "legal",
    valueType: "string",
    defaultValue: "",
    displayOrder: 3,
    affectedAreas: ["src/pages/PrivacyPolicy.tsx"],
  },
  {
    key: "LEGAL.TERMS_OF_SERVICE_TITLE",
    label: "Terms of Service Title",
    description: "Title displayed for terms of service page",
    category: "legal",
    valueType: "string",
    defaultValue: "Terms of Service",
    displayOrder: 4,
    affectedAreas: ["src/pages/TermsOfService.tsx"],
  },
  {
    key: "LEGAL.TERMS_OF_SERVICE_CONTENT",
    label: "Terms of Service Content",
    description: "Full content for terms of service page (HTML supported)",
    category: "legal",
    valueType: "text",
    defaultValue: "",
    displayOrder: 5,
    affectedAreas: ["src/pages/TermsOfService.tsx"],
  },
  {
    key: "LEGAL.TERMS_OF_SERVICE_EDITED_AT",
    label: "Terms of Service Last Edited",
    description: "Timestamp when terms of service was last edited (auto-managed)",
    category: "legal",
    valueType: "string",
    defaultValue: "",
    displayOrder: 6,
    affectedAreas: ["src/pages/TermsOfService.tsx"],
  },
  // ============================================
  // CATEGORIES SETTINGS
  // ============================================
  {
    key: "CATEGORIES.ENABLE_DYNAMIC",
    label: "Enable Dynamic Categories",
    description: "Use database-driven categories instead of hardcoded values. When enabled, Header, Footer, and Shop pages will use categories from the database.",
    category: "display",
    valueType: "boolean",
    defaultValue: "false",
    displayOrder: 1,
    affectedAreas: ["Header", "Footer", "Shop", "CategorySplit"],
  },
  {
    key: "CATEGORIES.SHOW_IN_HEADER",
    label: "Categories to Show in Header",
    description: "Comma-separated list of category slugs to show in the header navigation (only used when dynamic categories is enabled)",
    category: "display",
    valueType: "string",
    defaultValue: "new-arrival,mens,womens,kids,winter",
    displayOrder: 2,
    affectedAreas: ["Header"],
  },
  {
    key: "DISPLAY.NEW_ARRIVALS_CATEGORY",
    label: "New Arrivals Category",
    description: "Category slug to use for the New Arrivals section",
    category: "display",
    valueType: "string",
    defaultValue: "new-arrival",
    displayOrder: 3,
    affectedAreas: ["NewArrivals"],
  },
  {
    key: "DISPLAY.WINTER_WEAR_CATEGORY",
    label: "Winter Wear Category",
    description: "Category slug to use for the Winter Wear section",
    category: "display",
    valueType: "string",
    defaultValue: "winter",
    displayOrder: 4,
    affectedAreas: ["WinterWear"],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a setting definition by key
 */
export function getSettingDefinition(
  key: string
): SettingDefinition | undefined {
  return SETTINGS_REGISTRY.find((s) => s.key === key);
}

/**
 * Get all settings for a category
 */
export function getSettingsByCategory(
  category: SettingCategory
): SettingDefinition[] {
  return SETTINGS_REGISTRY.filter((s) => s.category === category).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
}

/**
 * Get all unique categories from the registry
 */
export function getAllCategories(): SettingCategory[] {
  const categories = new Set(SETTINGS_REGISTRY.map((s) => s.category));
  return Array.from(categories);
}

/**
 * Type-safe setting keys for use in helper functions
 */
export type SettingKey = (typeof SETTINGS_REGISTRY)[number]["key"];
