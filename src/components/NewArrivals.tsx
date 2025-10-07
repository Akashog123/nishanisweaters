import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";

const NewArrivals = () => {
  return (
    <section id="new-arrival" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold">NEW ARRIVAL</h2>
          <Button variant="outline" className="border-2 font-medium">
            Browse All
          </Button>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              image={product.images[0]}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
