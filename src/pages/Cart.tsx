import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Loader2, AlertCircle, RefreshCw, Heart, ShoppingCart, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { PromoCodeInput } from "@/components/PromoCodeInput";
import { useImageSettings } from "@/hooks/useImageSettings";
import { formatCurrency } from "@/lib/constants";
import { SEO } from "@/components/SEO";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 border rounded-lg animate-pulse">
      <Skeleton className="w-24 h-24 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

function OrderSummarySkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4 animate-pulse">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>
      <Skeleton className="h-12 w-full mt-6" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// Saved for Later Item component
function SavedItem({
  item,
  onMoveToCart,
  onRemove,
  isLoading
}: {
  item: {
    productId: Id<"products">;
    addedAt: number;
    product: {
      _id: Id<"products">;
      name: string;
      slug: string;
      images: { url: string }[];
      retailPrice: number;
      variants: { sku: string; size: string; color: string; stockQuantity: number }[];
      isActive?: boolean;
    } | null;
  };
  onMoveToCart: (productId: Id<"products">, variantSku: string) => void;
  onRemove: (productId: Id<"products">) => void;
  isLoading: boolean;
}) {
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const { placeholderUrl } = useImageSettings();

  if (!item.product || !("isActive" in item.product) || item.product.isActive === false) {
    return (
      <div className="flex gap-4 p-4 border rounded-lg bg-muted/50">
        <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground">Product no longer available</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive mt-2"
            onClick={() => onRemove(item.productId)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    );
  }

  const availableVariants = item.product.variants.filter(v => v.stockQuantity > 0);

  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      <Link to={`/product/${item.product.slug}`}>
        <img
          src={item.product.images.filter(img => img.url !== "/placeholder.svg")[0]?.url || placeholderUrl}
          alt={item.product.name}
          className="w-20 h-20 object-cover rounded"
        />
      </Link>
      <div className="flex-1">
        <Link to={`/product/${item.product.slug}`} className="hover:underline">
          <h4 className="font-medium">{item.product.name}</h4>
        </Link>
        <p className="text-sm font-bold mt-1">{formatCurrency(item.product.retailPrice)}</p>

        {availableVariants.length > 0 ? (
          <div className="flex items-center gap-2 mt-2">
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Size/Color" />
              </SelectTrigger>
              <SelectContent>
                {availableVariants.map(v => (
                  <SelectItem key={v.sku} value={v.sku}>
                    {v.size} / {v.color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedVariant || isLoading}
              onClick={() => onMoveToCart(item.productId, selectedVariant)}
              className="h-8"
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Add to Cart
            </Button>
          </div>
        ) : (
          <p className="text-sm text-destructive mt-2">Out of stock</p>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive mt-1 h-7 px-2"
          onClick={() => onRemove(item.productId)}
          disabled={isLoading}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, getSubtotal, getTotalItems, isLoading, error, clearCart, promoDiscount, appliedPromoCode } = useCart();
  const { isSignedIn } = useUser();

  // Wishlist: Check count first (lightweight), only fetch full data if non-empty
  const wishlistCount = useQuery(
    api.wishlist.getWishlistCount,
    isSignedIn ? {} : "skip"
  );
  const wishlist = useQuery(
    api.wishlist.getWishlist,
    isSignedIn && wishlistCount && wishlistCount > 0 ? {} : "skip"
  );
  const saveForLaterMutation = useMutation(api.wishlist.saveForLater);
  const moveToCartMutation = useMutation(api.wishlist.moveToCart);
  const removeFromWishlistMutation = useMutation(api.wishlist.removeFromWishlist);

  // Promo discount comes from cart context (no separate query needed)

  // Dynamic pricing config from admin settings
  const pricingConfig = useQuery(api.settings.getPricingConfig);

  const [savingItem, setSavingItem] = useState<string | null>(null);

  const handleSaveForLater = async (productId: string, variantSku: string) => {
    if (!isSignedIn) {
      toast.error("Please sign in to save items for later");
      return;
    }

    setSavingItem(`${productId}-${variantSku}`);
    try {
      await saveForLaterMutation({
        productId: productId as Id<"products">,
        variantSku,
      });
      toast.success("Item saved for later");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSavingItem(null);
    }
  };

  const handleMoveToCart = async (productId: Id<"products">, variantSku: string) => {
    setSavingItem(`${productId}-${variantSku}`);
    try {
      await moveToCartMutation({
        productId,
        variantSku,
        quantity: 1,
      });
      toast.success("Item moved to cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move item to cart");
    } finally {
      setSavingItem(null);
    }
  };

  const handleRemoveFromWishlist = async (productId: Id<"products">) => {
    try {
      await removeFromWishlistMutation({ productId });
      toast.success("Item removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  // Loading state - initial load
  if (isLoading && items.length === 0) {
    return (
      <Layout showAnnouncement={false}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-8 w-48" />
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <CartItemSkeleton />
              <CartItemSkeleton />
              <CartItemSkeleton />
            </div>
            <div className="lg:col-span-1">
              <OrderSummarySkeleton />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Your cart is empty</h1>
            <p className="text-muted-foreground">Add some items to get started</p>
            <Link to="/shop/new-arrival">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const subtotal = getSubtotal();
  const taxRate = pricingConfig?.taxRate ?? 0.18;
  const freeThreshold = pricingConfig?.freeShippingThreshold ?? 1000;
  const shippingCostVal = pricingConfig?.shippingCost ?? 99;
  const shipping = subtotal >= freeThreshold ? 0 : shippingCostVal;
  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax - promoDiscount;

  return (
    <Layout showAnnouncement={false}>
      <SEO title="Shopping Cart" noIndex={true} />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            Shopping Cart ({getTotalItems()} items)
            {isLoading && <Loader2 className="inline-block ml-3 h-5 w-5 animate-spin" />}
          </h1>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearCart}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}-${item.color}`}
                className="flex gap-4 p-4 border rounded-lg relative"
              >
                {/* Loading overlay for item */}
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
                <img
                  src={item.image}
                  alt={item.name}
                  className={`w-24 h-24 object-cover rounded ${item.isAvailable === false ? 'opacity-50 grayscale' : ''}`}
                />
                <div className="flex-1">
                  <h3 className={`font-semibold ${item.isAvailable === false ? 'text-muted-foreground line-through' : ''}`}>
                    {item.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Size: {item.size} | Color: {item.color}
                  </p>

                  {item.isAvailable === false ? (
                    <div className="mt-2 text-sm font-medium text-destructive">
                      {item.unavailableReason || "Item is no longer available"}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-bold">
                        {formatCurrency(item.price)}
                      </p>
                      {item.originalPrice && item.originalPrice !== item.price && (
                        <p className="text-sm text-muted-foreground line-through">
                          {formatCurrency(item.originalPrice)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center border rounded">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.size, item.color, Math.max(1, item.quantity - 1))}
                        disabled={isLoading || item.quantity <= 1 || item.isAvailable === false}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                        disabled={isLoading || item.isAvailable === false}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {isSignedIn && item.isAvailable !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        onClick={() => handleSaveForLater(
                          item._convexProductId || item.productId,
                          item._variantSku || `${item.size}-${item.color}`
                        )}
                        disabled={isLoading || savingItem === `${item.productId}-${item._variantSku}`}
                      >
                        {savingItem === `${item.productId}-${item._variantSku}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Heart className="h-4 w-4 mr-1" />
                            Save for Later
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeFromCart(item.productId, item.size, item.color)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Saved for Later Section */}
            {isSignedIn && wishlist && wishlist.items && wishlist.items.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Saved for Later ({wishlist.items.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {wishlist.items.map((item) => (
                    <SavedItem
                      key={item.productId}
                      item={item}
                      onMoveToCart={handleMoveToCart}
                      onRemove={handleRemoveFromWishlist}
                      isLoading={savingItem !== null}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16 inline-block" />
                    ) : (
                      formatCurrency(subtotal)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({(taxRate * 100).toFixed(0)}% GST)</span>
                  <span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16 inline-block" />
                    ) : (
                      formatCurrency(tax)
                    )}
                  </span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Discount ({Math.round((promoDiscount / subtotal) * 100)}%)</span>
                    <span>-{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>
                      {isLoading ? (
                        <Skeleton className="h-6 w-24 inline-block" />
                      ) : (
                        formatCurrency(total)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="mt-4 pt-4 border-t">
                <PromoCodeInput />
              </div>

              {subtotal < freeThreshold && (
                <p className="text-sm text-muted-foreground mt-4">
                  Add {formatCurrency(freeThreshold - subtotal)} more for free shipping!
                </p>
              )}

              <Link to="/checkout" className={`block mt-6 ${items.every(item => item.isAvailable === false) ? 'pointer-events-none' : ''}`}>
                <Button className="w-full" size="lg" disabled={isLoading || items.length === 0 || items.every(item => item.isAvailable === false)}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Proceed to Checkout"
                  )}
                </Button>
              </Link>

              <Link to="/shop/new-arrival" className="block mt-2">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
