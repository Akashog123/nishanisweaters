import { useState, useMemo, memo, useCallback } from "react";
import { Play } from "lucide-react";
import { YouTubePlayer } from "./YouTubePlayer";

interface ProductVideo {
  youtubeId: string;
  title?: string;
  thumbnail: string;
}

interface ProductGalleryProps {
  images: string[];
  videos?: ProductVideo[];
  productName: string;
}

type GalleryItem =
  | { type: "image"; src: string; index: number }
  | { type: "video"; video: ProductVideo; index: number };

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

/**
 * Loading skeleton for gallery images
 */
const GalleryImageSkeleton = memo(function GalleryImageSkeleton() {
  return (
    <div className="absolute inset-0 bg-secondary animate-pulse flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
    </div>
  );
});

const ProductGallery = ({ images, videos = [], productName }: ProductGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

  // Reset loading state when selected image changes
  const handleImageChange = useCallback((index: number) => {
    setSelectedIndex(index);
    setMainImageLoaded(false);
  }, []);

  const handleMainImageLoad = useCallback(() => {
    setMainImageLoaded(true);
  }, []);

  // Create unified gallery items array (images first, then videos)
  const galleryItems = useMemo<GalleryItem[]>(() => {
    const items: GalleryItem[] = [];

    // Add images
    images.forEach((src, idx) => {
      items.push({ type: "image", src, index: idx });
    });

    // Add videos
    videos.forEach((video, idx) => {
      items.push({ type: "video", video, index: images.length + idx });
    });

    return items;
  }, [images, videos]);

  const selectedItem = galleryItems[selectedIndex];

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));
    }
  };

  if (galleryItems.length === 0) {
    return (
      <div className="flex-1 bg-secondary flex items-center justify-center h-96">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col lg:flex-row gap-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Product gallery"
    >
      {/* Thumbnail Column */}
      <div className="flex lg:flex-col gap-2 order-2 lg:order-1 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px]">
        {galleryItems.map((item, index) => (
          <button
            key={`${item.type}-${index}`}
            onClick={() => handleImageChange(index)}
            className={`relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 border-2 transition-all ${
              selectedIndex === index
                ? "border-primary"
                : "border-border hover:border-primary/50"
            }`}
            aria-label={
              item.type === "image"
                ? `View image ${index + 1}`
                : `Play video: ${item.video.title || "Product video"}`
            }
            aria-pressed={selectedIndex === index}
          >
            {item.type === "image" ? (
              // PERFORMANCE: Explicit dimensions prevent CLS
              <img
                src={item.src}
                alt={`${productName} view ${index + 1}`}
                className="w-full h-full object-cover"
                width={96}
                height={96}
                loading="lazy"
              />
            ) : (
              <>
                {/* PERFORMANCE: Explicit dimensions prevent CLS */}
                <img
                  src={item.video.thumbnail}
                  alt={item.video.title || `${productName} video`}
                  className="w-full h-full object-cover"
                  width={96}
                  height={96}
                  loading="lazy"
                />
                {/* Play icon overlay for video thumbnails */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                    <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                  </div>
                </div>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Main Display Area */}
      <div className="flex-1 bg-secondary order-1 lg:order-2">
        {selectedItem?.type === "image" ? (
          // PERFORMANCE: Explicit dimensions prevent CLS (3:4 aspect ratio)
          <img
            src={selectedItem.src}
            alt={productName}
            className="w-full h-auto object-cover"
            width={800}
            height={1067}
          />
        ) : selectedItem?.type === "video" ? (
          <YouTubePlayer
            videoId={selectedItem.video.youtubeId}
            title={selectedItem.video.title}
            thumbnail={selectedItem.video.thumbnail}
          />
        ) : null}
      </div>
    </div>
  );
};

// PERFORMANCE: Memoize the gallery component to prevent unnecessary re-renders
export default memo(ProductGallery);
