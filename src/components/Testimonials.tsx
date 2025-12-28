import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Testimonials = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      id: 1,
      quote: "WE BOUGHT 10 PIECES AND IT IS THE BEST PURCHASE EVER!",
      author: "Jeanice Woodley",
    },
    {
      id: 2,
      quote: "AMAZING QUALITY AND PERFECT FIT. HIGHLY RECOMMEND!",
      author: "Marcus Johnson",
    },
    {
      id: 3,
      quote: "THE FABRIC IS INCREDIBLE AND THE STYLE IS UNMATCHED!",
      author: "Sarah Williams",
    },
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section className="py-16 lg:py-24 bg-gray-50 relative overflow-hidden">
      {/* Background Text */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center opacity-[0.06] pointer-events-none select-none">
        <h2 className="text-[6rem] lg:text-[8rem] xl:text-[10rem] font-bold whitespace-nowrap tracking-tight leading-none">
          WHAT PEOPLE SAY
        </h2>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Navigation Buttons - Desktop */}
        <div className="hidden lg:flex items-center justify-between mb-16">
          <Button
            variant="outline"
            size="icon"
            onClick={prevTestimonial}
            className="w-14 h-14 rounded-full border-2 hover:bg-gray-100"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Stars */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className="w-10 h-10 fill-blue-600"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={nextTestimonial}
            className="w-14 h-14 rounded-full border-2 hover:bg-gray-100"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Stars - Mobile */}
        <div className="flex lg:hidden justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className="w-8 h-8 fill-blue-600"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>

        {/* Testimonial Content */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-8">
            <blockquote className="text-3xl lg:text-5xl xl:text-6xl font-bold leading-tight px-4">
              "{testimonials[currentTestimonial].quote}"
            </blockquote>
            <p className="text-xl text-gray-600">
              {testimonials[currentTestimonial].author}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-12">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentTestimonial
                    ? "bg-blue-600 w-12"
                    : "bg-gray-300 w-2"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Buttons - Mobile */}
        <div className="flex lg:hidden items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={prevTestimonial}
            className="w-12 h-12 rounded-full border-2"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextTestimonial}
            className="w-12 h-12 rounded-full border-2"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
