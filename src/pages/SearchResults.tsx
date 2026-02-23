import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import PageContainer from "@/components/PageContainer";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useImageSettings } from "@/hooks/useImageSettings";
import { SEO } from "@/components/SEO";

const INITIAL_LIMIT = 12;
const LOAD_MORE_INCREMENT = 12;

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { placeholderUrl } = useImageSettings();
  const [displayCount, setDisplayCount] = useState(INITIAL_LIMIT);

  // Reset display count when search query changes
  const searchKey = query;
  const [prevSearchKey, setPrevSearchKey] = useState(searchKey);
  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    setDisplayCount(INITIAL_LIMIT);
  }

  // Fetch a reasonable batch — only what we need to display + 1 to know if there's more
  const fetchLimit = displayCount + 1;
  const searchResults = useQuery(
    api.products.searchProducts,
    query.length >= 2 ? { searchTerm: query, limit: fetchLimit } : "skip"
  );

  const hasMore = searchResults ? searchResults.length > displayCount : false;
  const visibleResults = useMemo(
    () => searchResults?.slice(0, displayCount) ?? [],
    [searchResults, displayCount]
  );

  // Show prompt if query is too short
  if (query.length < 2) {
    return (
      <Layout>
        <PageContainer className="py-12 lg:py-20">
          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Search Products</h1>
            <p className="text-muted-foreground">
              Enter at least 2 characters to search for products
            </p>
          </div>
        </PageContainer>
      </Layout>
    );
  }

  // Loading state
  if (searchResults === undefined) {
    return (
      <Layout>
        <PageContainer className="py-12 lg:py-20">
          <h1 className="text-3xl lg:text-4xl font-bold mb-8">
            Search results for "{query}"
          </h1>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            <ProductSkeleton count={6} />
          </div>
        </PageContainer>
      </Layout>
    );
  }

  // Empty state
  if (searchResults.length === 0) {
    return (
      <Layout>
        <PageContainer className="py-12 lg:py-20">
          <h1 className="text-3xl lg:text-4xl font-bold mb-8">
            Search results for "{query}"
          </h1>

          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground mb-4">
              No products found matching "{query}"
            </p>
            <p className="text-sm text-muted-foreground">
              Try searching with different keywords or browse our collections
            </p>
          </div>
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={query ? `Search: ${query}` : "Search Products"}
        description={`Search results for "${query}" at Nidhi Clothing Co. Find knitwear, sweaters, hoodies & winter wear.`}
        noIndex={true}
      />
      <PageContainer className="py-12 lg:py-20">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">
          Search results for "{query}"
        </h1>
        <p className="text-muted-foreground mb-8">
          {visibleResults.length}{hasMore ? "+" : ""} product{visibleResults.length !== 1 ? "s" : ""} found
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
          {visibleResults.map((product) => {
            const realImages = product.images.filter(img => img.url !== "/placeholder.svg");
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
        </div>

        {hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDisplayCount((prev) => prev + LOAD_MORE_INCREMENT)}
            >
              Load more results
            </Button>
          </div>
        )}
      </PageContainer>
    </Layout>
  );
};

export default SearchResults;
