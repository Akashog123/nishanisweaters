import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ProductCard from "./ProductCard";
import ProductSkeleton from "./ProductSkeleton";
import { useImageSettings } from "@/hooks/useImageSettings";

const BestSeller = () => {
  // Fetch bestseller products with a limit of 3
  const products = useQuery(api.products.getBestsellerProducts, { limit: 3 });
  const { placeholderUrl } = useImageSettings();

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className="text-3xl lg:text-4xl font-bold mb-12">BEST SELLER</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products === undefined ? (
            <ProductSkeleton count={3} />
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No bestsellers at the moment.</p>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product._id}
                id={product.slug}
                image={product.images[0]?.url || placeholderUrl}
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

export default BestSeller;
