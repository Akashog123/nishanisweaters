import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import productHoodie1 from "@/assets/product-hoodie-1.jpg";
import productHoodie2 from "@/assets/product-hoodie-2.jpg";

const CategorySplit = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {/* Mens Collection */}
          <Link
            to="/shop/mens"
            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100"
          >
            <img
              src={productHoodie1}
              alt="Mens Collection"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-8 left-8 text-black">
              <h3 className="text-3xl lg:text-4xl font-bold mb-2">MENS</h3>
              <p className="text-base lg:text-lg">COLLECTION</p>
            </div>
          </Link>

          {/* Womens Collection */}
          <Link
            to="/shop/womens"
            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100"
          >
            <img
              src={productHoodie2}
              alt="Womens Collection"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-8 left-8 text-black">
              <h3 className="text-3xl lg:text-4xl font-bold mb-2">WOMENS</h3>
              <p className="text-base lg:text-lg">COLLECTION</p>
            </div>
          </Link>

          {/* Kids Collection */}
          <Link
            to="/shop/kids"
            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100"
          >
            <img
              src={productHoodie1}
              alt="Kids Collection"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-8 left-8 text-black">
              <h3 className="text-3xl lg:text-4xl font-bold mb-2">KIDS</h3>
              <p className="text-base lg:text-lg">COLLECTION</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategorySplit;
