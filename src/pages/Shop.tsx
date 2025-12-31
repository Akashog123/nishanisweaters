import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import PageContainer from "@/components/PageContainer";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { ProductFilters, FilterState } from "@/components/ProductFilters";

const Shop = () => {
  const { category } = useParams<{ category: string }>();
  const [filters, setFilters] = useState<FilterState>({
    sizes: [],
    colors: [],
  });

  const categoryTitles: Record<string, string> = {
    "new-arrival": "NEW ARRIVAL",
    "mens": "MEN'S COLLECTION",
    "womens": "WOMEN'S COLLECTION",
    "kids": "KIDS COLLECTION",
  };

  // Map URL categories to Convex query parameters
  const getCategoryFilter = () => {
    if (!category) return {};

    switch (category) {
      case "new-arrival":
        return { newArrival: true };
      case "mens":
        return { category: "men" };
      case "womens":
        return { category: "women" };
      case "kids":
        return { category: "kids" };
      default:
        return { category };
    }
  };

  // Get the category string for filter options
  const getCategoryString = () => {
    if (!category) return undefined;
    switch (category) {
      case "mens":
        return "men";
      case "womens":
        return "women";
      case "kids":
        return "kids";
      default:
        return undefined;
    }
  };

  const categoryFilter = getCategoryFilter();

  // Build query arguments with filters
  const queryArgs = {
    ...categoryFilter,
    sizes: filters.sizes.length > 0 ? filters.sizes : undefined,
    colors: filters.colors.length > 0 ? filters.colors : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sortBy: filters.sortBy,
  };

  const productsResult = useQuery(api.products.listProducts, queryArgs);
  const filterOptions = useQuery(api.products.getFilterOptions, {
    category: getCategoryString(),
  });

  const title = category ? categoryTitles[category] || "SHOP" : "SHOP";
  const products = productsResult?.products;

  // Loading state
  if (products === undefined) {
    return (
      <Layout>
        <PageContainer className="py-12 lg:py-20">
          <h1 className="text-4xl lg:text-6xl font-bold mb-8 text-center">{title}</h1>

          <ProductFilters
            filterOptions={filterOptions}
            filters={filters}
            onFiltersChange={setFilters}
            productCount={0}
          />

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            <ProductSkeleton count={6} />
          </div>
        </PageContainer>
      </Layout>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <Layout>
        <PageContainer className="py-12 lg:py-20">
          <h1 className="text-4xl lg:text-6xl font-bold mb-8 text-center">{title}</h1>

          <ProductFilters
            filterOptions={filterOptions}
            filters={filters}
            onFiltersChange={setFilters}
            productCount={0}
          />

          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">No products found matching your filters.</p>
            {(filters.sizes.length > 0 || filters.colors.length > 0 || filters.minPrice !== undefined) && (
              <button
                onClick={() => setFilters({ sizes: [], colors: [] })}
                className="text-primary underline hover:no-underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContainer className="py-12 lg:py-20">
        <h1 className="text-4xl lg:text-6xl font-bold mb-8 text-center">{title}</h1>

        <ProductFilters
          filterOptions={filterOptions}
          filters={filters}
          onFiltersChange={setFilters}
          productCount={products.length}
        />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              id={product.slug}
              image={product.images[0]?.url || "/placeholder.jpg"}
              hoverImage={product.images[1]?.url}
              name={product.name}
              price={product.retailPrice.toFixed(2)}
              originalPrice={product.compareAtPrice?.toFixed(2)}
            />
          ))}
        </div>
      </PageContainer>
    </Layout>
  );
};

export default Shop;
