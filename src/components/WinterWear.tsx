import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/formatting";
import { useImageSettings } from "@/hooks/useImageSettings";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const WinterWear = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { settings } = useSiteSettings();

  // Get the configured winter wear category from settings (default: "winter")
  const winterCategory = settings?.winterWearCategory || "winter";

  // Fetch winter wear products from the database
  // Uses category filter to get jackets/winter wear items
  const result = useQuery(api.products.listProducts, {
    category: winterCategory,
    limit: 6
  });
  const products = result?.products ?? [];
  const { placeholderUrl } = useImageSettings();

  const nextSlide = () => {
    if (products.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % products.length);
  };

  const prevSlide = () => {
    if (products.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + products.length) % products.length);
  };

  // Show loading skeleton
  if (result === undefined) {
    return (
      <section className="py-16 lg:py-18 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-12 w-64 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="h-20 w-full max-w-md bg-gray-200 animate-pulse rounded" />
              <div className="h-12 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="relative aspect-[3/4] bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
      </section>
    );
  }

  // Don't render section if no products available
  if (products.length === 0) {
    return null;
  }

  const currentProduct = products[currentSlide];

  return (
    <section className="py-16 lg:py-18 bg-gray-50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium tracking-wider">NEW COLLECTION</p>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                WINTER WEAR
              </h2>
            </div>

            <p className="text-gray-600 text-lg max-w-md">
              Explore the newest additions to our Men's Collection to discover clothing,
              shoes, bags and accessories featuring signature styles and detailing.
            </p>

            <Link to={`/shop/${winterCategory}`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base">
                Browse All
              </Button>
            </Link>
          </div>

          {/* Right Carousel */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
              <img
                key={currentSlide}
                src={currentProduct.images[0]?.url || placeholderUrl}
                alt={currentProduct.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />

              {/* Navigation Arrows - only show if more than 1 product */}
              {products.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Product Info Card */}
            <Link
              to={`/product/${currentProduct.slug}`}
              className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-4">
                <img
                  src={currentProduct.images[0]?.url || placeholderUrl}
                  alt={currentProduct.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-sm lg:text-base">
                    {currentProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold">
                      {formatCurrency(currentProduct.retailPrice)}
                    </span>
                    {currentProduct.compareAtPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(currentProduct.compareAtPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WinterWear;
