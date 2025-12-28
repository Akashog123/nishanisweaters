import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatting";
import { WHOLESALE_MIN_ORDER_AMOUNTS, WHOLESALE_DISCOUNTS } from "@/lib/constants";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle,
} from "lucide-react";

interface BulkOrderItem {
  productId: Id<"products">;
  productName: string;
  productImage: string;
  variantSku: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  stockQuantity: number;
}

// Tier discount information (using shared constants)
const tierInfo = {
  tier1: { name: "Starter", discount: WHOLESALE_DISCOUNTS.tier1, minOrder: WHOLESALE_MIN_ORDER_AMOUNTS.tier1 },
  tier2: { name: "Growth", discount: WHOLESALE_DISCOUNTS.tier2, minOrder: WHOLESALE_MIN_ORDER_AMOUNTS.tier2 },
  tier3: { name: "Enterprise", discount: WHOLESALE_DISCOUNTS.tier3, minOrder: WHOLESALE_MIN_ORDER_AMOUNTS.tier3 },
};

export default function BulkOrder() {
  const navigate = useNavigate();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { addToCart } = useCart();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [bulkItems, setBulkItems] = useState<BulkOrderItem[]>([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Get user profile
  const userProfile = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get all products for bulk ordering
  const productsData = useQuery(api.products.listProducts, { limit: 100 });
  const products = productsData?.products || [];

  // Get filter options
  const filterOptions = useQuery(api.products.getFilterOptions, {});

  // Current tier discount
  const currentTier = userProfile?.wholesaleTier || "tier1";
  const tierDiscount = tierInfo[currentTier as keyof typeof tierInfo]?.discount || 0.15;
  const minOrderAmount = tierInfo[currentTier as keyof typeof tierInfo]?.minOrder || 10000;

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" ||
        product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Calculate totals
  const orderSummary = useMemo(() => {
    const subtotal = bulkItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const discount = subtotal * tierDiscount;
    const total = subtotal - discount;
    const totalItems = bulkItems.reduce((sum, item) => sum + item.quantity, 0);
    const meetsMinOrder = total >= minOrderAmount;

    return { subtotal, discount, total, totalItems, meetsMinOrder };
  }, [bulkItems, tierDiscount, minOrderAmount]);

  // Add item to bulk order
  const addToBulkOrder = (
    product: typeof products[0],
    variant: typeof products[0]['variants'][0]
  ) => {
    const existingIndex = bulkItems.findIndex(
      item => item.productId === product._id && item.variantSku === variant.sku
    );

    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...bulkItems];
      const newQty = updatedItems[existingIndex].quantity + 1;
      if (newQty <= variant.stockQuantity) {
        updatedItems[existingIndex].quantity = newQty;
        setBulkItems(updatedItems);
      } else {
        toast.error(`Only ${variant.stockQuantity} units available`);
      }
    } else {
      // Add new item
      setBulkItems([
        ...bulkItems,
        {
          productId: product._id,
          productName: product.name,
          productImage: product.images[0]?.url || "/placeholder.jpg",
          variantSku: variant.sku,
          size: variant.size,
          color: variant.color,
          unitPrice: product.retailPrice,
          quantity: 1,
          stockQuantity: variant.stockQuantity,
        },
      ]);
    }
    toast.success(`Added ${product.name} (${variant.size}/${variant.color})`);
  };

  // Update item quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(index);
      return;
    }

    const item = bulkItems[index];
    if (newQuantity > item.stockQuantity) {
      toast.error(`Only ${item.stockQuantity} units available`);
      return;
    }

    const updatedItems = [...bulkItems];
    updatedItems[index].quantity = newQuantity;
    setBulkItems(updatedItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  // Clear all items
  const clearBulkOrder = () => {
    setBulkItems([]);
  };

  // Add all to cart and proceed to checkout
  const handleProceedToCheckout = async () => {
    if (!orderSummary.meetsMinOrder) {
      toast.error(`Minimum order amount is ${formatCurrency(minOrderAmount)}`);
      return;
    }

    if (bulkItems.length === 0) {
      toast.error("Please add items to your order");
      return;
    }

    setIsAddingToCart(true);

    try {
      // Add each item to cart
      for (const item of bulkItems) {
        addToCart({
          productId: item.productId as unknown as string,
          name: item.productName,
          price: item.unitPrice,
          image: item.productImage,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          _convexProductId: item.productId,
          _variantSku: item.variantSku,
        });
      }

      toast.success("Items added to cart");
      setTimeout(() => {
        navigate("/checkout");
      }, 500);
    } catch (error) {
      toast.error("Failed to add items to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Loading state
  if (!isUserLoaded) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // Not signed in or not wholesale
  if (!isSignedIn || (userProfile && userProfile.role !== "wholesale")) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Wholesale Access Required</CardTitle>
              <CardDescription>
                Bulk ordering is only available for approved wholesale customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate("/wholesale/register")}>
                Apply for Wholesale
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bulk Order</h1>
          <p className="text-muted-foreground">
            Add multiple products to your order quickly. Your tier discount of{" "}
            <span className="font-semibold text-green-600">
              {(tierDiscount * 100).toFixed(0)}%
            </span>{" "}
            will be applied at checkout.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filterOptions?.categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {productsData === undefined ? (
                // Loading
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-32 w-full mb-3" />
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No products found</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Card key={product._id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={product.images[0]?.url || "/placeholder.jpg"}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium line-clamp-1">{product.name}</h4>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(product.retailPrice)}
                          </p>
                          <p className="text-xs text-green-600">
                            Wholesale: {formatCurrency(product.retailPrice * (1 - tierDiscount))}
                          </p>
                        </div>
                      </div>

                      {/* Variant Selection */}
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Select variant to add:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {product.variants
                            .filter((v) => v.stockQuantity > 0)
                            .slice(0, 6)
                            .map((variant) => (
                              <Button
                                key={variant.sku}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => addToBulkOrder(product, variant)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {variant.size}/{variant.color}
                              </Button>
                            ))}
                        </div>
                        {product.variants.filter((v) => v.stockQuantity > 0).length > 6 && (
                          <p className="text-xs text-muted-foreground">
                            +{product.variants.filter((v) => v.stockQuantity > 0).length - 6} more variants
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
                <CardDescription>
                  {orderSummary.totalItems} items in your bulk order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bulkItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Add products to start your bulk order
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Items List */}
                    <div className="max-h-[300px] overflow-y-auto space-y-3">
                      {bulkItems.map((item, index) => (
                        <div key={`${item.productId}-${item.variantSku}`} className="flex gap-2 p-2 bg-muted/50 rounded">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.size}/{item.color}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                                className="h-6 w-14 text-center text-sm px-1"
                                min={1}
                                max={item.stockQuantity}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(orderSummary.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Tier Discount ({(tierDiscount * 100).toFixed(0)}%)</span>
                        <span>-{formatCurrency(orderSummary.discount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(orderSummary.total)}</span>
                      </div>
                    </div>

                    {/* Min Order Alert */}
                    {!orderSummary.meetsMinOrder && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Minimum order not met</p>
                          <p className="text-xs">
                            Add {formatCurrency(minOrderAmount - orderSummary.total)} more to meet the minimum order of {formatCurrency(minOrderAmount)}
                          </p>
                        </div>
                      </div>
                    )}

                    {orderSummary.meetsMinOrder && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-800 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <p>Minimum order requirement met!</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleProceedToCheckout}
                  disabled={bulkItems.length === 0 || !orderSummary.meetsMinOrder || isAddingToCart}
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding to Cart...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Proceed to Checkout
                    </>
                  )}
                </Button>
                {bulkItems.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={clearBulkOrder}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Order
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
