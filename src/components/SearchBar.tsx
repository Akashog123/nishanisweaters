import { Search, X, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/constants";
import { useImageSettings } from "@/hooks/useImageSettings";

const SearchBar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { placeholderUrl } = useImageSettings();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query for search results
  const searchResults = useQuery(
    api.products.searchProducts,
    debouncedQuery.length >= 2 ? { searchTerm: debouncedQuery, limit: 5 } : "skip"
  );

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setIsOpen(false);
        setSearchQuery("");
      }
    },
    [searchQuery, navigate]
  );

  const handleProductClick = (slug: string) => {
    navigate(`/product/${slug}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleViewAll = () => {
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  const isLoading = debouncedQuery.length >= 2 && searchResults === undefined;
  const hasResults = searchResults && searchResults.length > 0;
  const showNoResults = debouncedQuery.length >= 2 && searchResults?.length === 0;

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-secondary hover:text-foreground"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <Search className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 bg-background border border-border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 duration-200 z-50"
          style={{ width: "340px" }}
        >
          <form onSubmit={handleSearch} className="p-3 border-b">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:bg-secondary hover:text-foreground shrink-0"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Search Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No Results */}
            {showNoResults && (
              <div className="py-8 text-center text-muted-foreground">
                <p>No products found for "{debouncedQuery}"</p>
              </div>
            )}

            {/* Results */}
            {hasResults && (
              <div className="py-2">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => handleProductClick(product.slug)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <img
                      src={product.images.filter(img => img.url !== "/placeholder.svg")[0]?.url || placeholderUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(product.retailPrice)}
                        {product.compareAtPrice && (
                          <span className="ml-2 line-through text-xs">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}

                {/* View All Button */}
                <div className="px-3 py-2 border-t mt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleViewAll}
                  >
                    View all results for "{searchQuery}"
                  </Button>
                </div>
              </div>
            )}

            {/* Prompt to search */}
            {debouncedQuery.length < 2 && searchQuery.length > 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
