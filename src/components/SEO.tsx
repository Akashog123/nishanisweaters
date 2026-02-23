import { Helmet } from "react-helmet-async";

const SITE_NAME = "Nidhi Clothing Co.";
const SITE_URL = "https://nidhiclothing.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  /** Page title - will be appended with site name */
  title?: string;
  /** Meta description for the page */
  description?: string;
  /** Canonical URL path (e.g., "/shop/womens") */
  canonicalPath?: string;
  /** OG image URL */
  ogImage?: string;
  /** OG type (default: "website") */
  ogType?: "website" | "article" | "product";
  /** JSON-LD structured data object(s) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Additional keywords for meta tag */
  keywords?: string;
  /** Prevent indexing of this page */
  noIndex?: boolean;
}

/**
 * SEO component for per-page meta tag management.
 * Uses react-helmet-async to dynamically set title, description,
 * Open Graph, Twitter Cards, canonical URL, and JSON-LD structured data.
 *
 * Keyword strategy derived from Google Trends data (2025-2026):
 * Primary: knitwear sweater, knitwear women, knitwear men, winter wear
 * Secondary: budget clothing, aesthetic clothing, hoodies, knitwear tops
 * Rising: black knitwear (+150%), unique knitwear (+140%), knitwear designer (+60%)
 */
export function SEO({
  title,
  description = "Shop premium knitwear sweaters, hoodies & winter wear for men & women at Nidhi Clothing Co. Budget-friendly aesthetic clothing, crafted with care. Free shipping across India.",
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
  keywords = "knitwear, sweater, winter wear, hoodie, women knitwear, men knitwear, budget clothing, aesthetic clothing, knitwear sweater, knitwear tops, buy online India, affordable knitwear, Nidhi Clothing",
  noIndex = false,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | Premium Knitwear & Winter Wear Online India`;
  const canonicalUrl = canonicalPath
    ? `${SITE_URL}${canonicalPath}`
    : undefined;

  const jsonLdScripts = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    : [];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {canonicalUrl && <link rel="alternate" hrefLang="en-IN" href={canonicalUrl} />}
      {canonicalUrl && <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLdScripts.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}

// ─── Structured Data Helpers ─────────────────────────────────

/** Schema.org Organization for the homepage */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/Logo.png`,
    description:
      "Premium knitwear and winter clothing brand offering sweaters, hoodies, and aesthetic clothing for men, women and kids across India at affordable prices.",
    foundingDate: "2013",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+91-7458816343",
      email: "support@nidhiclothing.com",
      url: `${SITE_URL}/contact-us`,
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sikandarpur",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    sameAs: [],
  };
}

/** Schema.org WebSite with SearchAction for sitelinks search box */
export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: "Shop premium knitwear sweaters, hoodies & winter wear online. Budget-friendly aesthetic clothing for men, women & kids across India.",
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Schema.org Product for product detail pages */
export function getProductSchema(product: {
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  slug: string;
  category?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  sku?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description || `Buy ${product.name} online at ${SITE_NAME}. Premium knitwear with free shipping across India.`,
    image: product.images && product.images.length > 0
      ? product.images
      : (product.image || DEFAULT_OG_IMAGE),
    url: `${SITE_URL}/product/${product.slug}`,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    itemCondition: "https://schema.org/NewCondition",
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      url: `${SITE_URL}/product/${product.slug}`,
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 3,
            maxValue: 7,
            unitCode: "DAY",
          },
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "INR",
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 15,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };

  if (product.sku) {
    schema.sku = product.sku;
    schema.mpn = product.sku;
  }

  if (product.originalPrice && product.originalPrice > product.price) {
    (schema.offers as Record<string, unknown>).priceValidUntil =
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
  }

  if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (product.category) {
    schema.category = product.category;
  }

  return schema;
}

/** Schema.org BreadcrumbList for navigation */
export function getBreadcrumbSchema(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/** Schema.org ItemList for collection/category pages */
export function getItemListSchema(
  name: string,
  products: { name: string; url: string; image?: string; position: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p) => ({
      "@type": "ListItem",
      position: p.position,
      url: `${SITE_URL}${p.url}`,
      name: p.name,
      ...(p.image ? { image: p.image } : {}),
    })),
  };
}

/** Schema.org CollectionPage for Shop category pages */
export function getCollectionPageSchema(opts: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    breadcrumb: getBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Shop", path: "/shop" },
      ...(opts.path !== "/shop" ? [{ name: opts.name, path: opts.path }] : []),
    ]),
  };
}

/** Schema.org LocalBusiness for local SEO */
export function getLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/Logo.png`,
    image: DEFAULT_OG_IMAGE,
    description: "Premium knitwear clothing store offering sweaters, hoodies & winter wear at affordable prices. Shop online with free shipping across India.",
    priceRange: "₹₹",
    telephone: "+91-7458816343",
    email: "support@nidhiclothing.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sikandarpur",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 26.0368,
      longitude: 84.0378,
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    paymentAccepted: "Cash, Credit Card, Debit Card, UPI, Net Banking",
    currenciesAccepted: "INR",
  };
}

/** Schema.org FAQPage for FAQ sections (enables rich FAQ snippets) */
export function getFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export default SEO;
