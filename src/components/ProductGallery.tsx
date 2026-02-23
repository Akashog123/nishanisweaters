import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { Play, Maximize2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { YouTubePlayer } from "./YouTubePlayer";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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



const ProductGallery = ({ images, videos = [], productName }: ProductGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [_mainImageLoaded, _setMainImageLoaded] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset loading state when selected image changes
  const handleImageChange = useCallback((index: number) => {
    setSelectedIndex(index);
    _setMainImageLoaded(false);
  }, []);


  // Create unified gallery items array (images first, then videos)
  const galleryItems = useMemo<GalleryItem[]>(() => {
    const items: GalleryItem[] = [];
    images.forEach((src, idx) => {
      items.push({ type: "image", src, index: idx });
    });
    videos.forEach((video, idx) => {
      items.push({ type: "video", video, index: images.length + idx });
    });
    return items;
  }, [images, videos]);

  // Only image items for fullscreen navigation
  const imageItems = useMemo(() => galleryItems.filter((i) => i.type === "image"), [galleryItems]);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : imageItems.length - 1));
  }, [imageItems.length]);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < imageItems.length - 1 ? prev + 1 : 0));
  }, [imageItems.length]);

  // Touch swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > 50) {
      if (distance > 0) goToNext();
      else goToPrevious();
    }
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNext, goToPrevious]);

  const handleFullscreenKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goToPrevious(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); goToNext(); }
    else if (e.key === "Escape") { setIsFullscreenOpen(false); }
  }, [goToPrevious, goToNext]);

  useEffect(() => {
    if (isFullscreenOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreenOpen]);

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
      <div className="flex-1 bg-secondary order-1 lg:order-2 relative group cursor-pointer" onClick={() => {
        if (selectedItem?.type === 'image') {
          setIsFullscreenOpen(true);
        }
      }}>
        {selectedItem?.type === "image" ? (
          <>
            {/* PERFORMANCE: Explicit dimensions prevent CLS (3:4 aspect ratio) */}
            <img
              src={selectedItem.src}
              alt={productName}
              className="w-full h-auto object-cover"
              width={800}
              height={1067}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
              <div className="opacity-0 group-hover:opacity-100 bg-white/80 rounded-full p-3 shadow-lg transform scale-95 group-hover:scale-100 transition-all">
                <Maximize2 className="h-6 w-6 text-black" />
              </div>
            </div>
          </>
        ) : selectedItem?.type === "video" ? (
          <YouTubePlayer
            videoId={selectedItem.video.youtubeId}
            title={selectedItem.video.title}
            thumbnail={selectedItem.video.thumbnail}
          />
        ) : null}
      </div>

      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <VisuallyHidden>
          <DialogTitle>Fullscreen Product Image</DialogTitle>
          <DialogDescription>A full screen view of the product {productName}</DialogDescription>
        </VisuallyHidden>
        <DialogContent
          hideClose
          className="max-w-[100vw] w-[100vw] max-h-[100dvh] h-[100dvh] p-0 bg-transparent border-none shadow-none rounded-none focus-visible:outline-none overflow-hidden"
          onKeyDown={handleFullscreenKeyDown}
        >
          {/* Full viewport container */}
          <div
            className="relative w-full h-full flex items-center justify-center select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Close button — glass morphism */}
            <button
              onClick={() => setIsFullscreenOpen(false)}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full text-white/90 hover:text-white backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
              aria-label="Close fullscreen"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Navigation arrows — visible on all screens when multiple images */}
            {imageItems.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                  className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 p-2.5 md:p-3 rounded-full text-white/80 hover:text-white backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 p-2.5 md:p-3 rounded-full text-white/80 hover:text-white backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </>
            )}

            {/* Image */}
            {selectedItem?.type === "image" && (
              <img
                src={selectedItem.src}
                alt={`${productName} fullscreen view`}
                className="max-w-[92vw] md:max-w-[85vw] max-h-[88dvh] object-contain select-none pointer-events-none"
                draggable={false}
              />
            )}

            {/* Bottom bar — pagination + counter */}
            {imageItems.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/10">
                {imageItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
                    className={`rounded-full transition-all duration-300 ${
                      selectedIndex === index
                        ? "w-6 h-2 bg-white"
                        : "w-2 h-2 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                    aria-current={selectedIndex === index ? "true" : "false"}
                  />
                ))}
                <span className="text-white/60 text-xs font-medium ml-1 tabular-nums">
                  {selectedIndex + 1}/{imageItems.length}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// PERFORMANCE: Memoize the gallery component to prevent unnecessary re-renders
export default memo(ProductGallery);
