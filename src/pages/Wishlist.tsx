import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  HeartOff,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { formatCurrency, calculateDiscount } from "@/lib/formatting";

interface WishlistProduct {
  _id: Id<"products">;
  name: string;
  slug: string;
  retailPrice: number;
  compareAtPrice?: number;
  images: Array<{ url: string; alt: string; order: number }>;
  variants: Array<{
    sku: string;
    size: string;
    color: string;
    stockQuantity: number;
  }>;
  isActive: boolean;
}

interface WishlistItem {
  productId: Id<"products">;
  addedAt: number;
  product: WishlistProduct | null;
}

export default function Wishlist() {
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { addToCart } = useCart();

  const wishlist = useQuery(
    api.wishlist.getWishlist,
    isSignedIn ? {} : "skip"
  );

  const removeFromWishlist = useMutation(api.wishlist.removeFromWishlist);
  const clearWishlist = useMutation(api.wishlist.clearWishlist);

  // Loading state
  if (!isClerkLoaded || wishlist === undefined) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading your wishlist...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Sign in to view your wishlist</CardTitle>
              <CardDescription>
                Save your favorite items by signing in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const wishlistItems = (wishlist?.items || []) as WishlistItem[];
  const validItems = wishlistItems.filter((item) => item.product !== null && item.product.isActive);

  const handleRemoveFromWishlist = async (productId: Id<"products">) => {
    try {
      await removeFromWishlist({
        productId,
      });
      toast.success("Removed from wishlist");
    } catch (_error) {
      toast.error("Failed to remove item");
    }
  };

  const handleClearWishlist = async () => {
    try {
      await clearWishlist({});
      toast.success("Wishlist cleared");
    } catch (_error) {
      toast.error("Failed to clear wishlist");
    }
  };

  const handleAddToCart = (product: WishlistProduct) => {
    // Get the first available variant
    const availableVariant = product.variants.find((v) => v.stockQuantity > 0);

    if (!availableVariant) {
      toast.error("This item is currently out of stock");
      return;
    }

    addToCart({
      productId: product._id,
      name: product.name,
      price: product.retailPrice,
      image: product.images[0]?.url || "",
      size: availableVariant.size,
      color: availableVariant.color,
      quantity: 1,
    });

    toast.success("Added to cart", {
      description: `${product.name} - ${availableVariant.size}/${availableVariant.color}`,
    });
  };

  // Empty state
  if (!wishlist || validItems.length === 0) {
    return (
      <Layout showAnnouncement={false}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" asChild className="mb-6">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Link>
            </Button>

            <div className="text-center py-16">
              <HeartOff className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
              <p className="text-muted-foreground mb-6">
                Save items you love to your wishlist and find them here anytime.
              </p>
              <Button asChild>
                <Link to="/shop/new-arrival">Explore Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showAnnouncement={false}>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <Button variant="ghost" asChild className="mb-2 -ml-4">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
              <h1 className="text-3xl lg:text-4xl font-bold flex items-center gap-3">
                <Heart className="h-8 w-8 text-red-500 fill-red-500" />
                My Wishlist
              </h1>
              <p className="text-muted-foreground mt-1">
                {validItems.length} item{validItems.length !== 1 ? "s" : ""} saved
              </p>
            </div>
            {validItems.length > 0 && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleClearWishlist}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Wishlist
              </Button>
            )}
          </div>

          {/* Wishlist Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {validItems.map((item) => {
              const product = item.product!;
              const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.retailPrice;
              const discount = hasDiscount
                ? calculateDiscount(product.compareAtPrice!, product.retailPrice)
                : 0;
              const isOutOfStock = product.variants.every((v) => v.stockQuantity === 0);

              return (
                <Card key={product._id} className="group overflow-hidden">
                  <div className="relative">
                    {/* Product Image */}
                    <Link to={`/product/${product.slug || product._id}`}>
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].alt || product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Overlay for out of stock */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Badge variant="destructive" className="text-sm">
                              Out of Stock
                            </Badge>
                          </div>
                        )}

                        {/* Discount Badge */}
                        {hasDiscount && !isOutOfStock && (
                          <Badge
                            className="absolute top-2 left-2 bg-red-500 hover:bg-red-600"
                          >
                            -{discount}%
                          </Badge>
                        )}
                      </div>
                    </Link>

                    {/* Remove Button */}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFromWishlist(product._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-4">
                    {/* Product Name */}
                    <Link
                      to={`/product/${product.slug || product._id}`}
                      className="block hover:underline"
                    >
                      <h3 className="font-medium text-sm lg:text-base line-clamp-2 mb-2">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-bold text-lg">
                        {formatCurrency(product.retailPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-muted-foreground line-through text-sm">
                          {formatCurrency(product.compareAtPrice!)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {isOutOfStock ? "Unavailable" : "Add to Cart"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        asChild
                      >
                        <Link to={`/product/${product.slug || product._id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Continue Shopping */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">Looking for more?</p>
            <Button variant="outline" asChild>
              <Link to="/shop/new-arrival">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
