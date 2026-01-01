/**
 * OptimizedImage Component
 *
 * A performance-optimized image component that provides:
 * 1. Modern format support (WebP/AVIF) with automatic fallbacks
 * 2. Lazy loading with blur-up placeholder
 * 3. Explicit dimensions for CLS prevention
 * 4. Loading skeleton animation
 *
 * PERFORMANCE BENEFITS:
 * - WebP is ~25-35% smaller than JPEG at equivalent quality
 * - AVIF is ~50% smaller than JPEG at equivalent quality
 * - Lazy loading defers off-screen images
 * - Explicit dimensions prevent layout shifts (CLS)
 * - Skeleton placeholder improves perceived performance
 *
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   src="/images/product.jpg"
 *   alt="Product name"
 *   width={300}
 *   height={400}
 *   priority={false} // Set true for above-the-fold images
 * />
 * ```
 */

import { memo, useState, useCallback, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Intrinsic width of the image */
  width: number;
  /** Intrinsic height of the image */
  height: number;
  /** Whether this is a priority/LCP image (disables lazy loading) */
  priority?: boolean;
  /** Whether to show WebP format (if supported by browser) */
  enableWebP?: boolean;
  /** Whether to show AVIF format (if supported by browser) */
  enableAvif?: boolean;
  /** Custom class for the image element */
  imageClassName?: string;
  /** Custom class for the container element */
  containerClassName?: string;
  /** Callback when image finishes loading */
  onImageLoad?: () => void;
  /** Callback when image fails to load */
  onImageError?: () => void;
  /** Aspect ratio for the container (e.g., "3/4", "16/9") */
  aspectRatio?: string;
  /** Object fit style */
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

/**
 * Generates WebP and AVIF URLs from a source image URL
 *
 * This assumes the server/CDN can serve modern formats when requested
 * with appropriate query parameters or Accept headers.
 *
 * For static assets, you would use Vite imagetools:
 * import heroWebp from "@/assets/hero.jpg?format=webp"
 */
function getModernFormatUrl(src: string, format: "webp" | "avif"): string | null {
  // If already in the target format, return as-is
  if (src.endsWith(`.${format}`)) {
    return src;
  }

  // If it's a Convex storage URL or external URL, we can't convert it
  // Those should be handled by the image CDN/storage service
  if (src.includes("convex.cloud") || src.startsWith("http")) {
    return null;
  }

  // For local assets, use Vite imagetools query parameter
  // This works with vite-imagetools plugin
  if (src.includes("?")) {
    return `${src}&format=${format}`;
  }

  return `${src}?format=${format}`;
}

/**
 * Loading skeleton component for images
 */
const ImageSkeleton = memo(function ImageSkeleton() {
  return (
    <div
      className="absolute inset-0 bg-secondary animate-pulse"
      aria-hidden="true"
    />
  );
});

/**
 * OptimizedImage component with modern format support and lazy loading
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  enableWebP = true,
  enableAvif = true,
  imageClassName,
  containerClassName,
  onImageLoad,
  onImageError,
  aspectRatio,
  objectFit = "cover",
  className,
  style,
  ...imgProps
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true); // Hide skeleton on error too
    onImageError?.();
  }, [onImageError]);

  // Generate modern format URLs
  const avifSrc = enableAvif ? getModernFormatUrl(src, "avif") : null;
  const webpSrc = enableWebP ? getModernFormatUrl(src, "webp") : null;

  // Compute aspect ratio from dimensions if not provided
  const computedAspectRatio = aspectRatio || `${width} / ${height}`;

  // Check if we can use picture element (have at least one modern format)
  const usePicture = avifSrc || webpSrc;

  const imageElement = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        "w-full h-full transition-opacity duration-300",
        objectFit === "cover" && "object-cover",
        objectFit === "contain" && "object-contain",
        objectFit === "fill" && "object-fill",
        objectFit === "none" && "object-none",
        objectFit === "scale-down" && "object-scale-down",
        isLoaded ? "opacity-100" : "opacity-0",
        imageClassName
      )}
      style={{
        aspectRatio: computedAspectRatio,
        ...style,
      }}
      // @ts-expect-error - React 18 doesn't recognize fetchpriority yet
      fetchpriority={priority ? "high" : undefined}
      {...imgProps}
    />
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-secondary",
        containerClassName,
        className
      )}
      style={{
        contain: "layout paint",
        aspectRatio: computedAspectRatio,
      }}
    >
      {/* Loading skeleton shown until image loads */}
      {!isLoaded && <ImageSkeleton />}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary text-muted-foreground text-sm">
          Failed to load image
        </div>
      )}

      {/* Image with optional picture wrapper for modern formats */}
      {!hasError && usePicture ? (
        <picture>
          {/* AVIF source - best compression */}
          {avifSrc && <source type="image/avif" srcSet={avifSrc} />}
          {/* WebP source - good compression, wider support */}
          {webpSrc && <source type="image/webp" srcSet={webpSrc} />}
          {/* Original format fallback */}
          {imageElement}
        </picture>
      ) : (
        !hasError && imageElement
      )}
    </div>
  );
});

/**
 * ProductImage - Specialized OptimizedImage for product cards
 *
 * Pre-configured with:
 * - 3:4 aspect ratio (standard product image ratio)
 * - Lazy loading enabled
 * - WebP format support
 */
export const ProductImage = memo(function ProductImage({
  src,
  alt,
  className,
  priority = false,
  ...props
}: Omit<OptimizedImageProps, "width" | "height" | "aspectRatio"> & {
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={300}
      height={400}
      aspectRatio="3 / 4"
      priority={priority}
      className={className}
      {...props}
    />
  );
});

export default OptimizedImage;
