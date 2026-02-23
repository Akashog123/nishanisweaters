import { memo, useState, useCallback, useMemo } from "react";
import { Phone, MessageCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatting";

// WhatsApp contact number (without + prefix for URL)
const WHATSAPP_BULK_PRICING_CONTACT = "917458816343";

// Intrinsic dimensions for product images - 3:4 aspect ratio
const PRODUCT_IMAGE_WIDTH = 300;
const PRODUCT_IMAGE_HEIGHT = 400;

// Maximum items to show before "+X more"
const MAX_VISIBLE_SIZES = 4;
const MAX_VISIBLE_COLORS = 4;

interface BulkProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    category: string;
    retailPrice: number;
    compareAtPrice?: number; // Regular Price / MSRP
    wholesalePrice?: number;
    minOrderQuantity?: number;
    averageRating?: number;
    reviewCount?: number;
    availableSizes?: string[];
    availableColors?: string[];
    images: { url: string; alt?: string }[];
    variants?: { sku: string; size: string; color: string; colorHex?: string }[];
  };
}

// Skeleton placeholder for image loading
const ImageSkeleton = memo(() => (
  <div
    className="absolute inset-0 bg-secondary animate-pulse"
    aria-hidden="true"
  />
));
ImageSkeleton.displayName = "ImageSkeleton";

// Star rating component
const StarRating = memo(({ rating, reviewCount }: { rating: number; reviewCount: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <div className="flex items-center" aria-label={`Rating: ${rating.toFixed(1)} out of 5 stars`}>
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className="h-4 w-4 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
        ))}
        {/* Half star (rendered as full for simplicity) */}
        {hasHalfStar && (
          <Star
            key="half"
            className="h-4 w-4 fill-amber-400/50 text-amber-400"
            aria-hidden="true"
          />
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className="h-4 w-4 text-muted-foreground/30"
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-muted-foreground">
        {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
});
StarRating.displayName = "StarRating";

// Color dot component
const ColorDot = memo(({ colorHex, colorName }: { colorHex: string; colorName: string }) => (
  <div
    className="h-5 w-5 rounded-full border border-border shadow-sm"
    style={{ backgroundColor: colorHex }}
    title={colorName}
    aria-label={colorName}
  />
));
ColorDot.displayName = "ColorDot";

const BulkProductCard = memo(({ product }: BulkProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    name,
    category,
    retailPrice,
    wholesalePrice,
    minOrderQuantity = 10,
    averageRating = 0,
    reviewCount = 0,
    availableSizes = [],
    availableColors = [],
    images,
    variants = [],
  } = product;

  // Get primary image
  const primaryImage = images[0];

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Calculate savings percentage
  const savingsPercentage = useMemo(() => {
    if (!wholesalePrice || wholesalePrice >= retailPrice) return 0;
    return Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100);
  }, [retailPrice, wholesalePrice]);

  // Get unique colors with hex values from variants
  const uniqueColors = useMemo(() => {
    const colorMap = new Map<string, string>();

    // First try to get colors from variants with colorHex
    variants.forEach((variant) => {
      if (variant.color && variant.colorHex && !colorMap.has(variant.color)) {
        colorMap.set(variant.color, variant.colorHex);
      }
    });

    // If no variants with colorHex, use availableColors with default colors
    if (colorMap.size === 0 && availableColors.length > 0) {
      availableColors.forEach((color) => {
        // Default color mapping for common colors
        const defaultColors: Record<string, string> = {
          black: "#000000",
          white: "#FFFFFF",
          red: "#EF4444",
          blue: "#3B82F6",
          green: "#22C55E",
          yellow: "#EAB308",
          purple: "#A855F7",
          pink: "#EC4899",
          orange: "#F97316",
          gray: "#6B7280",
          grey: "#6B7280",
          brown: "#92400E",
          navy: "#1E3A5F",
          beige: "#D4C4A8",
          maroon: "#800000",
        };
        colorMap.set(color, defaultColors[color.toLowerCase()] || "#9CA3AF");
      });
    }

    return Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
  }, [variants, availableColors]);

  // Get sizes to display
  const sizesToDisplay = useMemo(() => {
    const sizes = availableSizes.length > 0
      ? availableSizes
      : [...new Set(variants.map((v) => v.size))].filter(Boolean);
    return sizes;
  }, [availableSizes, variants]);

  // Generate WhatsApp message
  const whatsappMessage = useMemo(() => {
    const message = `Hi, I'm interested in bulk purchase of:

Product: ${name}
Category: ${category}

Quantity: [Please specify your required quantity]

Please share the best price.`;
    return encodeURIComponent(message);
  }, [name, category]);

  const whatsappUrl = `https://wa.me/${WHATSAPP_BULK_PRICING_CONTACT}?text=${whatsappMessage}`;
  const phoneUrl = `tel:+${WHATSAPP_BULK_PRICING_CONTACT}`;

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ contain: "layout paint" }}
    >
      {/* Image Container */}
      <div
        className="relative overflow-hidden bg-secondary"
        style={{
          contain: "layout paint",
          aspectRatio: "3 / 4",
        }}
      >
        {/* Skeleton placeholder */}
        {!imageLoaded && <ImageSkeleton />}

        {/* Product Image */}
        {primaryImage && (
          <img
            src={primaryImage.url}
            alt={primaryImage.alt || name}
            width={PRODUCT_IMAGE_WIDTH}
            height={PRODUCT_IMAGE_HEIGHT}
            loading="lazy"
            decoding="async"
            onLoad={handleImageLoad}
            className={`
              w-full h-full object-cover
              transition-all duration-300
              group-hover:scale-105
              ${imageLoaded ? "opacity-100" : "opacity-0"}
            `}
            style={{
              aspectRatio: "3 / 4",
              objectFit: "cover",
            }}
          />
        )}

        {/* Category Badge - Positioned on image */}
        <Badge
          variant="secondary"
          className="absolute top-3 left-3 text-xs bg-white/90 backdrop-blur-sm text-foreground"
        >
          {category}
        </Badge>

        {/* Savings Badge - Positioned on image */}
        {savingsPercentage > 0 && (
          <Badge
            className="absolute top-3 right-3 text-xs bg-green-600 hover:bg-green-600"
          >
            Save {savingsPercentage}%
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Product Name */}
        <h3 className="font-semibold text-base leading-tight line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>

        {/* Star Ratings */}
        {averageRating > 0 && (
          <StarRating rating={averageRating} reviewCount={reviewCount} />
        )}

        {/* Pricing Section - Retail price crossed out, bulk/wholesale as main */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-bold text-primary">
              {formatCurrency(wholesalePrice || retailPrice)}
            </span>
            {wholesalePrice && wholesalePrice < retailPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(retailPrice)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Bulk purchase price per unit</p>
        </div>

        {/* MOQ Indicator */}
        <Badge variant="outline" className="text-xs">
          Min. Order: {minOrderQuantity} units
        </Badge>

        {/* Available Sizes */}
        {sizesToDisplay.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Available Sizes</p>
            <div className="flex flex-wrap gap-1.5">
              {sizesToDisplay.slice(0, MAX_VISIBLE_SIZES).map((size) => (
                <Badge
                  key={size}
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                >
                  {size}
                </Badge>
              ))}
              {sizesToDisplay.length > MAX_VISIBLE_SIZES && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0.5 bg-muted"
                >
                  +{sizesToDisplay.length - MAX_VISIBLE_SIZES} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Available Colors */}
        {uniqueColors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Available Colors</p>
            <div className="flex items-center gap-1.5">
              {uniqueColors.slice(0, MAX_VISIBLE_COLORS).map((color) => (
                <ColorDot
                  key={color.name}
                  colorHex={color.hex}
                  colorName={color.name}
                />
              ))}
              {uniqueColors.length > MAX_VISIBLE_COLORS && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{uniqueColors.length - MAX_VISIBLE_COLORS} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            asChild
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Contact via WhatsApp for ${name}`}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              WhatsApp
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <a
              href={phoneUrl}
              aria-label={`Call to inquire about ${name}`}
            >
              <Phone className="h-4 w-4 mr-1.5" />
              Call Now
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

BulkProductCard.displayName = "BulkProductCard";

export default BulkProductCard;
