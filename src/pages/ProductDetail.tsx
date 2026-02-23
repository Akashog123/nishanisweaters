import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Minus, Plus, Heart, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import PageContainer from "@/components/PageContainer";
import ProductGallery from "@/components/ProductGallery";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { ProductReviews } from "@/components/ProductReviews";
import { SizeGuide } from "@/components/SizeGuide";
import { useCart } from "@/context/CartContext";
import { useCartUI } from "@/context/cart";
import NotFoundError from "@/components/NotFoundError";
import { useConvexError } from "@/hooks/useConvexError";
import { ValidationError } from "@/lib/errors";
import { useImageSettings } from "@/hooks/useImageSettings";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SEO, getProductSchema, getBreadcrumbSchema } from "@/components/SEO";

const ProductDetailSkeleton = () => {
  return (
    <Layout>
      <PageContainer className="py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-20">
          {/* Gallery Skeleton */}
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="space-y-6">
            <div>
              <Skeleton className="h-10 w-3/4 mb-4" />
              <div className="flex items-center gap-3 mb-6">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-16 mb-3" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-16" />
                ))}
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-16 mb-3" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-24" />
                ))}
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-20 w-full" />
            </div>

            <div className="flex gap-4 pt-4">
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-14 flex-1" />
            </div>
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
};

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { openCart } = useCartUI();
  const [showGoToCart, setShowGoToCart] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { handleError } = useConvexError();
  const { isSignedIn } = useUser();
  const { placeholderUrl } = useImageSettings();
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  // Use slug to fetch product from Convex
  const product = useQuery(api.products.getProductBySlug, { slug: productId || "" });

  // Check if product is in wishlist
  const isInWishlist = useQuery(
    api.wishlist.isInWishlist,
    isSignedIn && product ? { productId: product._id } : "skip"
  );

  // Wishlist mutations
  const addToWishlist = useMutation(api.wishlist.addToWishlist);
  const removeFromWishlist = useMutation(api.wishlist.removeFromWishlist);

  // Check if current user is admin (to hide purchase buttons)
  const { isAdmin } = useCurrentUser();

  // Fetch related products from the same category
  const relatedProducts = useQuery(
    api.products.getRelatedProducts,
    product ? { productId: product._id, category: product.category, limit: 3 } : "skip"
  );

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Set default size and color when product loads (only once)
  const defaultsSet = useRef(false);
  useEffect(() => {
    if (product && product.variants.length > 0 && !defaultsSet.current) {
      defaultsSet.current = true;
      // Find first variant with stock
      const firstAvailableVariant = product.variants.find((v) => v.stockQuantity > 0);
      if (firstAvailableVariant) {
        setSelectedSize(firstAvailableVariant.size);
        setSelectedColor(firstAvailableVariant.color);
      }
    }
  }, [product]);

  // Size order for sorting (small to large)
  const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"];

  // Extract unique sizes and colors from variants (memoized)
  // Must be called before any early returns to follow Rules of Hooks
  const sizes = useMemo(
    () => {
      if (!product) return [];
      const uniqueSizes = [...new Set(product.variants.map((v) => v.size))];
      return uniqueSizes.sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a.toUpperCase());
        const indexB = SIZE_ORDER.indexOf(b.toUpperCase());
        // If size not in our order list, put it at the end
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    },
    [product]
  );
  const colors = useMemo(
    () => (product ? [...new Set(product.variants.map((v) => v.color))].sort((a, b) => a.localeCompare(b)) : []),
    [product]
  );

  // Get product images URLs (memoized) - filter out placeholder
  const productImages = useMemo(
    () => (product ? product.images.filter(img => img.url !== "/placeholder.svg").map((img) => img.url) : []),
    [product]
  );

  // Get product videos for gallery (memoized)
  const productVideos = useMemo(
    () =>
      product?.videos?.map((video) => ({
        youtubeId: video.youtubeId,
        title: video.title,
        thumbnail: video.thumbnail,
      })) || [],
    [product]
  );

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    try {
      // Validate selection
      if (!selectedSize || !selectedColor) {
        throw new ValidationError("Please select both size and color");
      }

      // Find the matching variant
      const variant = product.variants.find(
        (v) => v.size === selectedSize && v.color === selectedColor
      );

      if (!variant) {
        throw new ValidationError("Selected combination is not available");
      }

      // Check stock
      if (variant.stockQuantity < quantity) {
        throw new ValidationError(
          `Only ${variant.stockQuantity} items available in stock`
        );
      }

      if (quantity < 1) {
        throw new ValidationError("Quantity must be at least 1");
      }

      addToCart({
        productId: product.slug,
        name: product.name,
        price: product.retailPrice,
        originalPrice: product.compareAtPrice,
        image: product.images.filter(img => img.url !== "/placeholder.svg")[0]?.url || placeholderUrl,
        size: selectedSize,
        color: selectedColor,
        quantity: quantity,
        _convexProductId: product._id,
        _variantSku: variant.sku,
      });
      // Show "Go to Cart" option in button
      setShowGoToCart(true);
      // Toast is handled by CartContext
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else {
        handleError(error, "ProductDetail.handleAddToCart");
      }
    }
  }, [selectedSize, selectedColor, quantity, product, addToCart, setShowGoToCart, openCart, handleError, placeholderUrl]);

  const handleBuyNow = useCallback(() => {
    try {
      if (!selectedSize || !selectedColor) {
        throw new ValidationError("Please select both size and color");
      }

      // Add to cart first
      handleAddToCart();

      // Navigate to checkout after a brief delay
      setTimeout(() => {
        navigate('/checkout');
      }, 500);
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else {
        handleError(error, "ProductDetail.handleBuyNow");
      }
    }
  }, [selectedSize, selectedColor, handleAddToCart, navigate, handleError]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    try {
      if (newQuantity < 1) {
        throw new ValidationError("Quantity must be at least 1");
      }

      // Check max stock if variant is selected
      if (selectedSize && selectedColor && product) {
        const variant = product.variants.find(
          (v) => v.size === selectedSize && v.color === selectedColor
        );

        if (variant && newQuantity > variant.stockQuantity) {
          throw new ValidationError(
            `Only ${variant.stockQuantity} items available`
          );
        }
      }

      setQuantity(newQuantity);
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
      }
    }
  }, [selectedSize, selectedColor, product]);

  const handleToggleWishlist = useCallback(async () => {
    if (!product) return;

    if (!isSignedIn) {
      toast.error("Please sign in to save items to your wishlist");
      navigate("/sign-in");
      return;
    }

    setIsTogglingWishlist(true);
    try {
      if (isInWishlist) {
        await removeFromWishlist({ productId: product._id });
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist({ productId: product._id });
        toast.success("Added to wishlist");
      }
    } catch (error) {
      toast.error("Failed to update wishlist");
    } finally {
      setIsTogglingWishlist(false);
    }
  }, [product, isSignedIn, isInWishlist, addToWishlist, removeFromWishlist, navigate]);

  // Loading state - must be after all hooks
  if (product === undefined) {
    return <ProductDetailSkeleton />;
  }

  // Product not found - Use NotFoundError component
  if (!product) {
    return (
      <Layout>
        <NotFoundError
          resourceType="product"
          resourceId={productId}
          showSearch={true}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={`${product.name} - Buy Online`}
        description={`Buy ${product.name} at ₹${product.retailPrice}${product.compareAtPrice ? ` (Save ₹${(product.compareAtPrice - product.retailPrice).toFixed(0)})` : ""}. Premium knitwear from Nidhi Clothing Co. Free shipping across India.`}
        canonicalPath={`/product/${product.slug}`}
        ogType="product"
        ogImage={productImages[0] || undefined}
        keywords={`${product.name}, ${product.category || "knitwear"}, buy ${product.name} online, Nidhi Clothing`}
        jsonLd={[
          getProductSchema({
            name: product.name,
            description: product.description,
            price: product.retailPrice,
            originalPrice: product.compareAtPrice,
            image: productImages[0],
            images: productImages,
            slug: product.slug,
            category: product.category,
            inStock: product.variants.some(v => v.stockQuantity > 0),
            sku: product.variants[0]?.sku,
          }),
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            ...(product.category ? [{ name: product.category, path: `/shop/${product.category}` }] : []),
            { name: product.name, path: `/product/${product.slug}` },
          ]),
        ]}
      />
      <PageContainer className="py-8 lg:py-16">
        {/* Product Detail */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-20">
          {/* Gallery */}
          <ProductGallery
            images={productImages}
            videos={productVideos}
            productName={product.name}
          />

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold mb-4">{product.name}</h1>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold">{CURRENCY_SYMBOL}{product.retailPrice.toFixed(2)}</span>
                {product.compareAtPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {CURRENCY_SYMBOL}{product.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Size</h3>
                <SizeGuide productType="tops" triggerVariant="link" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-6 py-3 border-2 font-medium transition-all ${
                      selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <h3 className="text-sm font-medium mb-3">Color</h3>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-6 py-3 border-2 font-medium transition-all ${
                      selectedColor === color
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {isDescriptionExpanded ? (
                  product.description
                ) : (
                  <>
                    {product.description.slice(0, 150)}
                    {product.description.length > 150 && (
                      <button
                        onClick={() => setIsDescriptionExpanded(true)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        ...  See more
                      </button>
                    )}
                  </>
                )}
              </p>
              {isDescriptionExpanded && product.description.length > 150 && (
                <button
                  onClick={() => setIsDescriptionExpanded(false)}
                  className="text-sm font-medium text-primary hover:underline mt-1"
                >
                  See less
                </button>
              )}
            </div>

            {/* Quantity - Hidden for admin */}
            {!isAdmin && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                  className="p-3 border-2 border-border hover:border-primary transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="p-3 border-2 border-border hover:border-primary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Action Buttons - Hidden for admin */}
            {!isAdmin && (
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={showGoToCart ? openCart : handleAddToCart}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base font-medium"
                >
                  {showGoToCart ? "Go to Cart" : "Add to Cart"}
                </Button>
                <Button
                  onClick={handleBuyNow}
                  variant="outline"
                  className="flex-1 border-2 h-14 text-base font-medium"
                >
                  Buy Now
                </Button>
                <Button
                  onClick={handleToggleWishlist}
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 border-2"
                  disabled={isTogglingWishlist}
                  title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                >
                  {isTogglingWishlist ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart
                      className={`h-5 w-5 ${isInWishlist ? "fill-red-500 text-red-500" : ""}`}
                    />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Product Reviews */}
        <ProductReviews productId={product._id} />

        {/* Related Products */}
        <section>
          <h2 className="text-2xl lg:text-3xl font-bold mb-8">More Products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {relatedProducts === undefined ? (
              <ProductSkeleton count={3} />
            ) : (
              relatedProducts.map((relatedProduct) => {
                const realImages = relatedProduct.images.filter(img => img.url !== "/placeholder.svg");
                return (
                  <ProductCard
                    key={relatedProduct._id}
                    id={relatedProduct.slug}
                    image={realImages[0]?.url || placeholderUrl}
                    hoverImage={realImages[1]?.url}
                    name={relatedProduct.name}
                    price={relatedProduct.retailPrice.toFixed(2)}
                    originalPrice={relatedProduct.compareAtPrice?.toFixed(2)}
                  />
                );
              })
            )}
          </div>
        </section>
      </PageContainer>
    </Layout>
  );
};

export default ProductDetail;
