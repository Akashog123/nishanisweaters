import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import PageContainer from "@/components/PageContainer";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { Search } from "lucide-react";
import { useImageSettings } from "@/hooks/useImageSettings";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { placeholderUrl } = useImageSettings();

  const searchResults = useQuery(
    api.products.searchProducts,
    query.length >= 2 ? { searchTerm: query, limit: 50 } : "skip"
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
      <PageContainer className="py-12 lg:py-20">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">
          Search results for "{query}"
        </h1>
        <p className="text-muted-foreground mb-8">
          {searchResults.length} product{searchResults.length !== 1 ? "s" : ""} found
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
          {searchResults.map((product) => (
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

export default SearchResults;
