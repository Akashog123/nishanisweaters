import { useState, useMemo, memo, useRef, useEffect, useCallback } from "react";
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
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SEO, getBreadcrumbSchema, getCollectionPageSchema, getItemListSchema } from "@/components/SEO";

// Default category titles as fallback
const DEFAULT_CATEGORY_TITLES: Record<string, string> = {
  "new-arrival": "NEW ARRIVALS",
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

  // Infinite scroll hook — accumulates products and exposes loadMore
  const { products, isLoading, isLoadingMore, isDone, loadMore } =
    useInfiniteProducts(queryArgs);

  const filterOptions = useQuery(api.products.getFilterOptions, {
    category: isNewArrivalCategory ? undefined : categoryString,
    newArrival: isNewArrivalCategory ? true : undefined,
  });

  // IntersectionObserver sentinel ref — triggers loadMore when visible
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && !isDone && !isLoadingMore) {
        loadMore();
      }
    },
    [isDone, isLoadingMore, loadMore]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "400px", // start loading before user reaches the bottom
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  // Get category title - use database name if available, otherwise fall back to defaults
  const title = category
    ? categoryData?.name
      ? `${categoryData.name.toUpperCase()} COLLECTION`
      : DEFAULT_CATEGORY_TITLES[category] || "SHOP"
    : "SHOP";

  // SEO: Category-specific meta descriptions with trending keywords
  const seoMeta = useMemo(() => {
    const categoryMap: Record<string, { description: string; keywords: string }> = {
      "womens": {
        description: "Shop women's knitwear collection at Nidhi Clothing Co. Premium sweaters, tops & winter wear for women. Affordable aesthetic knitwear online India with free shipping.",
        keywords: "knitwear women, women knitwear, knitwear for women, knitwear sweater women, knitwear tops, aesthetic women clothing, buy women sweater online India, black knitwear women",
      },
      "mens": {
        description: "Shop men's knitwear collection at Nidhi Clothing Co. Premium sweaters, hoodies & winter wear for men. Budget-friendly knitwear online India with free shipping.",
        keywords: "knitwear men, knitwear for men, mens knitwear, knitwear sweater men, hoodie men, men winter wear, buy men sweater online India, black knitwear men",
      },
      "kids": {
        description: "Shop kids' knitwear at Nidhi Clothing Co. Comfortable sweaters & winter wear for children at affordable prices. Free shipping across India.",
        keywords: "kids knitwear, children sweater, kids winter wear, kids hoodie, affordable kids clothing, buy kids sweater online India",
      },
      "new-arrival": {
        description: "New arrivals at Nidhi Clothing Co. Latest knitwear sweaters, hoodies & winter fashion 2026. Shop the newest aesthetic clothing collection with free shipping.",
        keywords: "new arrival knitwear, latest sweater 2026, new hoodie, new winter wear, trending knitwear, unique knitwear, knitwear design new",
      },
    };
    return categoryMap[category || ""] || {
      description: "Shop premium knitwear & winter wear at Nidhi Clothing Co. Sweaters, hoodies & tops for men, women & kids. Budget-friendly aesthetic clothing online India with free shipping.",
      keywords: "knitwear sweater, sweater online India, hoodie, winter wear, budget clothing, aesthetic clothing, knitwear tops, buy knitwear online, affordable clothing India, Nidhi Clothing shop",
    };
  }, [category]);

  const breadcrumbs = useMemo(() => {
    const items = [{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }];
    if (category) {
      items.push({ name: title, path: `/shop/${category}` });
    }
    return items;
  }, [category, title]);

  // Initial loading state
  if (isLoading) {
    return (
      <Layout>
        <SEO
          title={category ? `${title} - Knitwear & Winter Wear` : "Shop All Knitwear & Winter Wear"}
          description={seoMeta.description}
          keywords={seoMeta.keywords}
          canonicalPath={category ? `/shop/${category}` : "/shop"}
          jsonLd={getBreadcrumbSchema(breadcrumbs)}
        />
        <PageContainer className="py-4 lg:py-8">
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
        <SEO
          title={category ? `${title} - Knitwear & Winter Wear` : "Shop All Knitwear & Winter Wear"}
          description={seoMeta.description}
          keywords={seoMeta.keywords}
          canonicalPath={category ? `/shop/${category}` : "/shop"}
          jsonLd={getBreadcrumbSchema(breadcrumbs)}
        />
        <PageContainer className="py-4 lg:py-8">
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
      <SEO
        title={category ? `${title} - Knitwear & Winter Wear` : "Shop All Knitwear & Winter Wear"}
        description={seoMeta.description}
        keywords={seoMeta.keywords}
        canonicalPath={category ? `/shop/${category}` : "/shop"}
        jsonLd={[
          getBreadcrumbSchema(breadcrumbs),
          getCollectionPageSchema({
            name: category ? title : "Shop All Products",
            description: seoMeta.description,
            path: category ? `/shop/${category}` : "/shop",
          }),
          ...(products.length > 0 ? [getItemListSchema(
            category ? title : "All Products",
            products.slice(0, 10).map((p, i) => ({
              name: p.name,
              url: `/product/${p.slug}`,
              image: p.images.filter((img: { url: string; }) => img.url !== "/placeholder.svg")[0]?.url,
              position: i + 1,
            }))
          )] : []),
        ]}
      />
      <PageContainer className="py-4 lg:py-8">
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
          {products.map((product) => {
            const realImages = product.images.filter((img: { url: string; }) => img.url !== "/placeholder.svg");
            return (
              <ProductCard
                key={product._id}
                id={product.slug}
                image={realImages[0]?.url || placeholderUrl}
                hoverImage={realImages[1]?.url}
                name={product.name}
                price={product.retailPrice.toFixed(2)}
                originalPrice={product.compareAtPrice?.toFixed(2)}
              />
            );
          })}

          {/* Loading skeletons while fetching more */}
          {isLoadingMore && <ProductSkeleton count={6} />}
        </div>

        {/* Invisible sentinel — observed by IntersectionObserver to trigger loadMore */}
        {!isDone && <div ref={sentinelRef} className="h-1" />}
      </PageContainer>
    </Layout>
  );
};

// PERFORMANCE: Memoize the Shop component to prevent unnecessary re-renders
export default memo(Shop);
