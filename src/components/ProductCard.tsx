import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { CURRENCY_SYMBOL } from "@/lib/constants";

interface ProductCardProps {
  id: string;
  image: string;
  hoverImage?: string;
  name: string;
  price: string;
  originalPrice?: string;
}

// Intrinsic dimensions for product images - 3:4 aspect ratio
const PRODUCT_IMAGE_WIDTH = 300;
const PRODUCT_IMAGE_HEIGHT = 400;

/**
 * Generates a WebP URL from an image source
 *
 * For Convex storage URLs or external URLs, returns null as they
 * should handle format conversion at the CDN/storage level.
 * For local assets, appends format=webp query parameter for Vite imagetools.
 */
function getWebPUrl(src: string): string | null {
  // If already WebP, return as-is
  if (src.endsWith(".webp")) {
    return src;
  }

  // External URLs and Convex storage - let the CDN handle format negotiation
  if (src.includes("convex.cloud") || src.startsWith("http")) {
    return null;
  }

  // For local assets, use Vite imagetools query parameter
  if (src.includes("?")) {
    return `${src}&format=webp`;
  }

  return `${src}?format=webp`;
}

// Skeleton placeholder for image loading
const ImageSkeleton = memo(() => (
  <div
    className="absolute inset-0 bg-secondary animate-pulse"
    aria-hidden="true"
  />
));
ImageSkeleton.displayName = "ImageSkeleton";

const ProductCard = memo(({ id, image, hoverImage, name, price, originalPrice }: ProductCardProps) => {
  const [hoverImageLoaded, setHoverImageLoaded] = useState(false);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const hoverImageRef = useRef<HTMLImageElement | null>(null);

  // Generate WebP URLs for modern format support
  const mainImageWebP = getWebPUrl(image);
  const hoverImageWebP = hoverImage ? getWebPUrl(hoverImage) : null;

  // Cleanup hover image prefetch on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (hoverImageRef.current) {
        // Cancel any pending image load
        hoverImageRef.current.src = "";
        hoverImageRef.current = null;
      }
    };
  }, []);

  // Prefetch hover image on mouse enter for smoother UX
  // Uses IntersectionObserver-like approach to avoid memory leaks
  const handleMouseEnter = useCallback(() => {
    if (hoverImage && !hoverImageLoaded && !hoverImageRef.current) {
      const img = new Image();
      hoverImageRef.current = img;

      img.onload = () => {
        setHoverImageLoaded(true);
        hoverImageRef.current = null; // Clear ref after successful load
      };

      img.onerror = () => {
        hoverImageRef.current = null; // Clear ref on error
      };

      img.src = hoverImage;
    }
  }, [hoverImage, hoverImageLoaded]);

  // Handle main image load for skeleton removal
  const handleMainImageLoad = useCallback(() => {
    setMainImageLoaded(true);
  }, []);

  return (
    <Link
      to={`/product/${id}`}
      className="group cursor-pointer block"
      onMouseEnter={handleMouseEnter}
    >
      {/*
        Image container with fixed aspect ratio for CLS prevention
        Using CSS contain: layout for better performance
      */}
      <div
        className="relative overflow-hidden bg-secondary mb-4"
        style={{
          // CSS containment for layout isolation
          contain: "layout paint",
          // Fixed aspect ratio using padding-bottom fallback + aspect-ratio
          aspectRatio: "3 / 4",
        }}
      >
        {/* Skeleton placeholder shown until main image loads */}
        {!mainImageLoaded && <ImageSkeleton />}

        {/*
          Main product image with WebP support
          Uses <picture> element to serve modern formats with fallback
          PERFORMANCE: WebP is ~25-35% smaller than JPEG at equivalent quality
        */}
        <picture>
          {/* WebP source for modern browsers */}
          {mainImageWebP && <source type="image/webp" srcSet={mainImageWebP} />}
          {/* Original format fallback */}
          <img
            src={image}
            alt={name}
            width={PRODUCT_IMAGE_WIDTH}
            height={PRODUCT_IMAGE_HEIGHT}
            loading="lazy"
            decoding="async"
            onLoad={handleMainImageLoad}
            className={`
              w-full h-full object-cover
              transition-opacity duration-300
              group-hover:opacity-0
              ${mainImageLoaded ? "opacity-100" : "opacity-0"}
            `}
            style={{
              aspectRatio: "3 / 4",
              objectFit: "cover",
            }}
          />
        </picture>

        {/* Hover image with WebP support - only rendered if available */}
        {hoverImage && (
          <picture className="absolute inset-0">
            {/* WebP source for modern browsers */}
            {hoverImageWebP && <source type="image/webp" srcSet={hoverImageWebP} />}
            {/* Original format fallback */}
            <img
              src={hoverImage}
              alt={`${name} alternate view`}
              width={PRODUCT_IMAGE_WIDTH}
              height={PRODUCT_IMAGE_HEIGHT}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                aspectRatio: "3 / 4",
                objectFit: "cover",
              }}
            />
          </picture>
        )}
      </div>

      {/*
        Text content container with reserved height
        Using min-height to prevent CLS from text loading
      */}
      <div
        className="min-h-[4rem]"
        style={{ contain: "content" }}
      >
        <h3 className="font-medium mb-2 text-sm lg:text-base line-clamp-2">
          {name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{CURRENCY_SYMBOL}{price}</span>
          {originalPrice && (
            <span className="text-muted-foreground line-through text-sm">
              {CURRENCY_SYMBOL}{originalPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
