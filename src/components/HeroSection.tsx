import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-blockhaus.jpg";

const HeroSection = () => {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (imageRef.current) {
            const scrollY = window.scrollY;
            const parallaxOffset = scrollY * 0.5;
            imageRef.current.style.transform = `translateY(${parallaxOffset}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative min-h-[80vh] lg:min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          ref={imageRef}
          src={heroImage}
          alt="NISHANI WOOLERA Fashion Collection"
          className="w-full h-full object-cover will-change-transform"
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <div className="max-w-2xl animate-fade-in">
          <span className="inline-block bg-primary text-primary-foreground px-4 py-2 text-sm font-medium tracking-wider mb-6">
            YEAR-END SALE
          </span>
          <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 leading-tight">
            NISHANI WOOLERA
            <br />
            SIGNATURES 25% OFF
          </h1>
          <p className="text-lg lg:text-xl text-white/90 mb-8 max-w-lg">
            Redefine your look with 25% off for all NISHANI WOOLERA Signatures outfit
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-6 text-base group"
          >
            Explore
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
