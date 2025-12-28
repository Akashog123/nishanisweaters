import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { Minus, Plus } from "lucide-react";
import { useQuery } from "convex/react";
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
import NotFoundError from "@/components/NotFoundError";
import { useConvexError } from "@/hooks/useConvexError";
import { ValidationError } from "@/lib/errors";

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
  const { handleError } = useConvexError();

  // Use slug to fetch product from Convex
  const product = useQuery(api.products.getProductBySlug, { slug: productId || "" });

  // Fetch related products (limit to 6)
  const allProducts = useQuery(api.products.listProducts, { limit: 6 });

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Loading state
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

  // Extract unique sizes and colors from variants (memoized)
  const sizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))],
    [product.variants]
  );
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))],
    [product.variants]
  );

  // Get product images URLs (memoized)
  const productImages = useMemo(
    () => product.images.map((img) => img.url),
    [product.images]
  );

  // Get product videos for gallery (memoized)
  const productVideos = useMemo(
    () =>
      product.videos?.map((video) => ({
        youtubeId: video.youtubeId,
        title: video.title,
        thumbnail: video.thumbnail,
      })) || [],
    [product.videos]
  );

  // Filter related products - excluding current product (memoized)
  const relatedProducts = useMemo(
    () => (allProducts?.products || [])
      .filter((p) => p._id !== product._id)
      .slice(0, 3),
    [allProducts?.products, product._id]
  );

  const handleAddToCart = useCallback(() => {
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
        image: product.images[0]?.url || "/placeholder.jpg",
        size: selectedSize,
        color: selectedColor,
        quantity: quantity,
        _convexProductId: product._id,
        _variantSku: variant.sku,
      });
      // Toast is handled by CartContext
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else {
        handleError(error, "ProductDetail.handleAddToCart");
      }
    }
  }, [selectedSize, selectedColor, quantity, product, addToCart, handleError]);

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
      if (selectedSize && selectedColor) {
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
  }, [selectedSize, selectedColor, product.variants]);

  return (
    <Layout>
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
                <span className="text-3xl font-bold">${product.retailPrice.toFixed(2)}</span>
                {product.compareAtPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${product.compareAtPrice.toFixed(2)}
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
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </div>

            {/* Quantity */}
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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base font-medium"
              >
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                variant="outline"
                className="flex-1 border-2 h-14 text-base font-medium"
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        {/* Product Reviews */}
        <ProductReviews productId={product._id} />

        {/* Related Products */}
        <section>
          <h2 className="text-2xl lg:text-3xl font-bold mb-8">more products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {allProducts === undefined ? (
              <ProductSkeleton count={3} />
            ) : (
              relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct._id}
                  id={relatedProduct.slug}
                  image={relatedProduct.images[0]?.url || "/placeholder.jpg"}
                  hoverImage={relatedProduct.images[1]?.url}
                  name={relatedProduct.name}
                  price={relatedProduct.retailPrice.toFixed(2)}
                  originalPrice={relatedProduct.compareAtPrice?.toFixed(2)}
                />
              ))
            )}
          </div>
        </section>
      </PageContainer>
    </Layout>
  );
};

export default ProductDetail;
