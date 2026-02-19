import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { useImageSettings } from "@/hooks/useImageSettings";
import { useSiteSettings } from "@/hooks/useSiteSettings";

// Use the original high-quality AVIF file from assets (best quality for full resolution)
import heroAvifOriginal from "@/assets/hero-blockhaus.avif";

// vite-imagetools: Generate responsive images at build time from JPG source
// (Sharp can't read AVIF as input, so we use JPG for generating smaller sizes)
import heroAvif480 from "@/assets/hero-blockhaus.jpg?w=480&format=avif";
import heroAvif768 from "@/assets/hero-blockhaus.jpg?w=768&format=avif";
import heroAvif1024 from "@/assets/hero-blockhaus.jpg?w=1024&format=avif";

// Generate responsive WebP images as fallback for browsers without AVIF support
import heroWebp480 from "@/assets/hero-blockhaus.jpg?w=480&format=webp";
import heroWebp768 from "@/assets/hero-blockhaus.jpg?w=768&format=webp";
import heroWebp1024 from "@/assets/hero-blockhaus.jpg?w=1024&format=webp";
import heroWebp1920 from "@/assets/hero-blockhaus.jpg?w=1920&format=webp";

// JPG fallback for older browsers
import heroImageJpg from "@/assets/hero-blockhaus.jpg";

// Intrinsic dimensions for CLS prevention
const HERO_WIDTH = 1920;
const HERO_HEIGHT = 1080;
const HERO_ASPECT_RATIO = HERO_WIDTH / HERO_HEIGHT;

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { heroUrl } = useImageSettings();
  const { heroBadgeText, heroHeading, heroDescription, heroCtaText, siteName } = useSiteSettings();

  // Check for desktop viewport and reduced motion preference
  useEffect(() => {
    // Check reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // Check if desktop (>= 1024px)
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(desktopQuery.matches);

    const handleDesktopChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    desktopQuery.addEventListener("change", handleDesktopChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, []);

  // Parallax effect - only on desktop without reduced motion
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !isDesktop || prefersReducedMotion) return;

    const scrollY = window.scrollY;
    const parallaxOffset = scrollY * 0.3; // Reduced parallax intensity for better performance
    containerRef.current.style.transform = `translate3d(0, ${parallaxOffset}px, 0)`;
  }, [isDesktop, prefersReducedMotion]);

  useEffect(() => {
    // Skip parallax on mobile or when reduced motion is preferred
    if (!isDesktop || prefersReducedMotion) {
      // Reset transform when switching to mobile or reduced motion
      if (containerRef.current) {
        containerRef.current.style.transform = "";
      }
      return;
    }

    let ticking = false;

    const scrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
    return () => window.removeEventListener("scroll", scrollHandler);
  }, [isDesktop, prefersReducedMotion, handleScroll]);

  // Handle smooth scroll to New Arrivals section
  const handleExploreClick = useCallback(() => {
    const newArrivalsSection = document.getElementById("new-arrival");
    if (newArrivalsSection) {
      newArrivalsSection.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [prefersReducedMotion]);

  return (
    <section
      className="relative min-h-[80vh] lg:min-h-screen flex items-center overflow-hidden"
      // Reserve space with aspect ratio to prevent CLS
      style={{ contain: "layout" }}
    >
      {/* Background Image Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 will-change-transform"
        style={{
          // GPU acceleration hint
          transform: "translate3d(0, 0, 0)",
        }}
      >
        {/*
          Dynamic hero from settings - used when admin configures a custom hero image
        */}
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={`${siteName} Fashion Collection`}
            className="w-full h-full object-cover"
            width={HERO_WIDTH}
            height={HERO_HEIGHT}
            style={{
              aspectRatio: `${HERO_ASPECT_RATIO}`,
              objectFit: "cover",
            }}
            // @ts-expect-error - React 18 doesn't recognize fetchpriority yet
            fetchpriority="high"
            loading="eager"
            decoding="sync"
          />
        ) : (
          /*
            <picture> element with responsive images
            Browser picks the best format and size automatically
            Order: AVIF (best) -> WebP (good) -> JPG (fallback)
          */
          <picture>
            {/* AVIF sources - best compression for modern browsers */}
            <source
              type="image/avif"
              srcSet={`${heroAvif480} 480w, ${heroAvif768} 768w, ${heroAvif1024} 1024w, ${heroAvifOriginal} 1920w`}
              sizes="100vw"
            />
            {/* WebP sources - good compression, wider support */}
            <source
              type="image/webp"
              srcSet={`${heroWebp480} 480w, ${heroWebp768} 768w, ${heroWebp1024} 1024w, ${heroWebp1920} 1920w`}
              sizes="100vw"
            />
            {/* JPG fallback for older browsers */}
            <img
              src={heroImageJpg}
              alt={`${siteName} Fashion Collection - Modern streetwear and premium clothing`}
              className="w-full h-full object-cover"
              // Explicit dimensions for CLS prevention
              width={HERO_WIDTH}
              height={HERO_HEIGHT}
              style={{
                aspectRatio: `${HERO_ASPECT_RATIO}`,
                objectFit: "cover",
              }}
              // LCP optimization attributes
              // @ts-expect-error - React 18 doesn't recognize fetchpriority yet
              fetchpriority="high"
              loading="eager"
              decoding="sync" // Use sync decoding for LCP image
            />
          </picture>
        )}
        {/* Overlay for text contrast */}
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <div className="max-w-2xl animate-fade-in">
          <span className="inline-block bg-primary text-primary-foreground px-4 py-2 text-sm font-medium tracking-wider mb-6">
            {heroBadgeText}
          </span>
          <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 leading-tight">
            {heroHeading.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < heroHeading.split('\n').length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="text-lg lg:text-xl text-white/90 mb-8 max-w-lg">
            {heroDescription}
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-6 text-base group"
            onClick={handleExploreClick}
          >
            {heroCtaText}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders when parent components update
// HeroSection has no props and uses internal state, so it should only re-render when its own state changes
export default memo(HeroSection);
