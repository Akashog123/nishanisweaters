import { Minus, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CartItemSkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      <Skeleton className="w-24 h-24 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { items, updateQuantity, removeFromCart, subtotal, isLoading, error } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold">
              Your Cart
              {!isLoading && items.length > 0 && (
                <span className="ml-3 bg-primary text-primary-foreground text-sm rounded-full h-6 w-6 inline-flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md mt-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && items.length === 0 ? (
          <div className="flex-1 py-6 space-y-6">
            <CartItemSkeleton />
            <CartItemSkeleton />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              asChild
            >
              <Link to="/shop">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6 my-6">
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.size}-${item.color}`}
                    className="flex gap-4"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.color} / {item.size}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.size,
                                item.color,
                                item.quantity - 1
                              )
                            }
                            className="p-1 border border-border hover:border-primary transition-colors disabled:opacity-50"
                            disabled={isLoading}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                            ) : (
                              item.quantity
                            )}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.size,
                                item.color,
                                item.quantity + 1
                              )
                            }
                            className="p-1 border border-border hover:border-primary transition-colors disabled:opacity-50"
                            disabled={isLoading}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            removeFromCart(item.productId, item.size, item.color)
                          }
                          className="p-1 hover:text-destructive transition-colors disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {typeof item.price === 'number'
                            ? `$${item.price.toFixed(2)}`
                            : `$${item.price}`
                          }
                        </span>
                        {item.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${typeof item.originalPrice === 'number'
                              ? item.originalPrice.toFixed(2)
                              : item.originalPrice
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Subtotal</span>
                  <span className="font-bold">
                    {isLoading ? (
                      <Skeleton className="h-6 w-20 inline-block" />
                    ) : (
                      `$${subtotal.toFixed(2)}`
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Taxes & Shipping calculated at checkout
                </p>
              </div>
              <Button
                className="w-full h-12 text-base font-medium"
                disabled={isLoading || items.length === 0}
                asChild
              >
                <Link to="/checkout" onClick={() => onOpenChange(false)}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Checkout"
                  )}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
                asChild
              >
                <Link to="/cart">View Cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
