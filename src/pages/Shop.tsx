import { useState, useMemo, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import PageContainer from "@/components/PageContainer";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { ProductFilters, FilterState } from "@/components/ProductFilters";
import { useImageSettings } from "@/hooks/useImageSettings";
import { useCategoryBySlug } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Default category titles as fallback
const DEFAULT_CATEGORY_TITLES: Record<string, string> = {
  "new-arrival": "NEW ARRIVAL",
  "mens": "MEN'S COLLECTION",
  "womens": "WOMEN'S COLLECTION",
  "kids": "KIDS COLLECTION",
};

// PERFORMANCE: Pure function moved outside component
// This maps URL slugs to database category values
function getCategoryFilter(category: string | undefined, isNewArrival: boolean = false) {
  if (!category) return {};

  // Check if this is the new arrivals category (special flag-based category)
  if (isNewArrival) {
    return { newArrival: true };
  }

  // For other categories, use the slug directly as the category value
  return { category };
}

// PERFORMANCE: Pure function moved outside component
function getCategoryString(category: string | undefined): string | undefined {
  // Simply return the category slug for database queries
  return category;
}

const Shop = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [filters, setFilters] = useState<FilterState>({
    sizes: [],
    colors: [],
  });
  const { placeholderUrl } = useImageSettings();

  // Get category data from database if available
  const categoryData = useCategoryBySlug(category);

  // Determine if this is a "new arrival" category (special flag-based)
  const isNewArrivalCategory = categoryData?.slug === "new-arrival" || category === "new-arrival";

  // PERFORMANCE: Memoize category filter to prevent object recreation
  const categoryFilter = useMemo(
    () => getCategoryFilter(category, isNewArrivalCategory),
    [category, isNewArrivalCategory]
  );
  const categoryString = useMemo(() => getCategoryString(category), [category]);

  // PERFORMANCE: Memoize query arguments to prevent unnecessary re-queries
  const queryArgs = useMemo(() => ({
    ...categoryFilter,
    sizes: filters.sizes.length > 0 ? filters.sizes : undefined,
    colors: filters.colors.length > 0 ? filters.colors : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sortBy: filters.sortBy,
  }), [categoryFilter, filters]);

  const productsResult = useQuery(api.products.listProducts, queryArgs);
  const filterOptions = useQuery(api.products.getFilterOptions, {
    category: categoryString,
  });

  // Get category title - use database name if available, otherwise fall back to defaults
  const title = category
    ? categoryData?.name
      ? `${categoryData.name.toUpperCase()} COLLECTION`
      : DEFAULT_CATEGORY_TITLES[category] || "SHOP"
    : "SHOP";
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
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="-ml-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
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
              image={product.images[0]?.url || placeholderUrl}
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

// PERFORMANCE: Memoize the Shop component to prevent unnecessary re-renders
export default memo(Shop);
