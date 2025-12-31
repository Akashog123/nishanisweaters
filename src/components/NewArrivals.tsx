import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ProductCard from "./ProductCard";
import ProductSkeleton from "./ProductSkeleton";
import { Button } from "@/components/ui/button";

const NewArrivals = () => {
  // Fetch new arrival products with a limit of 4
  const result = useQuery(api.products.listProducts, { newArrival: true, limit: 4 });
  const products = result?.products ?? [];

  return (
    <section id="new-arrival" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold">NEW ARRIVAL</h2>
          <Link to="/shop/new-arrival">
            <Button variant="outline" className="border-2 font-medium">
              Browse All
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
          {result === undefined ? (
            <ProductSkeleton count={4} />
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No new arrivals at the moment.</p>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product._id}
                id={product.slug}
                image={product.images[0]?.url || "/placeholder.jpg"}
                hoverImage={product.images[1]?.url}
                name={product.name}
                price={product.retailPrice.toFixed(2)}
                originalPrice={product.compareAtPrice?.toFixed(2)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
