import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import productHoodie1 from "@/assets/product-hoodie-1.jpg";
import productHoodie2 from "@/assets/product-hoodie-2.jpg";
import productPants1 from "@/assets/product-pants-1.jpg";

const WinterWear = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const winterProducts = [
    {
      id: "olive-winter-blazer",
      name: "Olive Winter Blazer",
      price: "$99.00",
      originalPrice: "$149.00",
      image: productHoodie1,
    },
    {
      id: "blue-puffy-jacket",
      name: "Blue Puffy Jacket",
      price: "$99.00",
      originalPrice: "$129.00",
      image: productHoodie2,
    },
    {
      id: "stylish-gray-jacket",
      name: "Stylish Gray Jacket",
      price: "$99.00",
      originalPrice: null,
      image: productPants1,
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % winterProducts.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + winterProducts.length) % winterProducts.length);
  };

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
            
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base">
              Browse All
            </Button>
          </div>

          {/* Right Carousel */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
              <img
                key={currentSlide}
                src={winterProducts[currentSlide].image}
                alt={winterProducts[currentSlide].name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              
              {/* Navigation Arrows */}
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
            </div>

            {/* Product Info Card */}
            <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={winterProducts[currentSlide].image}
                  alt={winterProducts[currentSlide].name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-sm lg:text-base">
                    {winterProducts[currentSlide].name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold">{winterProducts[currentSlide].price}</span>
                    {winterProducts[currentSlide].originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {winterProducts[currentSlide].originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WinterWear;
