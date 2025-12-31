import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

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

        {/* Main product image */}
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
            // Ensure image fills container while maintaining aspect ratio
            aspectRatio: "3 / 4",
            objectFit: "cover",
          }}
        />

        {/* Hover image - only rendered if available */}
        {hoverImage && (
          <img
            src={hoverImage}
            alt={`${name} alternate view`}
            width={PRODUCT_IMAGE_WIDTH}
            height={PRODUCT_IMAGE_HEIGHT}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              aspectRatio: "3 / 4",
              objectFit: "cover",
            }}
          />
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
          <span className="font-bold text-lg">₹{price}</span>
          {originalPrice && (
            <span className="text-muted-foreground line-through text-sm">
              ₹{originalPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
