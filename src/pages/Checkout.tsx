import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useConvexError } from "@/hooks/useConvexError";
import { ValidationError, PaymentError } from "@/lib/errors";
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  formatCurrency,
} from "@/lib/constants";
import { Loader2, AlertCircle, Check, ChevronLeft, ChevronRight, ShoppingBag, Truck, CreditCard, ClipboardCheck } from "lucide-react";
import { loadRazorpayScript, type RazorpayPaymentResponse } from "@/types/razorpay";
import { cn } from "@/lib/utils";

// Step configuration
const STEPS = [
  { id: 1, name: "Cart Review", icon: ShoppingBag },
  { id: 2, name: "Shipping", icon: Truck },
  { id: 3, name: "Payment", icon: CreditCard },
  { id: 4, name: "Review & Place", icon: ClipboardCheck },
];

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center w-full">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    !isCompleted && !isCurrent && "border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium hidden sm:block",
                    isCurrent && "text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-full mx-2",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Step 1: Cart Review
function CartReviewStep({
  items,
  subtotal,
  onNext,
}: {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
  }>;
  subtotal: number;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg divide-y">
        {items.map((item) => (
          <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-4 p-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1">
              <h4 className="font-medium">{item.name}</h4>
              <p className="text-sm text-muted-foreground">
                Size: {item.size} | Color: {item.color}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">Qty: {item.quantity}</span>
                <span className="font-medium">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <span className="font-medium">Subtotal ({items.length} items)</span>
        <span className="text-xl font-bold">{formatCurrency(subtotal)}</span>
      </div>

      <div className="flex gap-4">
        <Link to="/cart" className="flex-1">
          <Button variant="outline" className="w-full">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Edit Cart
          </Button>
        </Link>
        <Button className="flex-1" onClick={onNext}>
          Continue to Shipping
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Shipping Address
function ShippingStep({
  shippingAddress,
  setShippingAddress,
  onNext,
  onBack,
  validateShipping,
}: {
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  setShippingAddress: React.Dispatch<React.SetStateAction<typeof shippingAddress>>;
  onNext: () => void;
  onBack: () => void;
  validateShipping: () => boolean;
}) {
  const handleContinue = () => {
    if (validateShipping()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Shipping Address</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={shippingAddress.name}
              onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={shippingAddress.phone}
              onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
              placeholder="9876543210"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={shippingAddress.street}
              onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
              placeholder="123 Main Street, Apt 4B"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
              placeholder="Mumbai"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={shippingAddress.state}
              onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code *</Label>
            <Input
              id="postalCode"
              value={shippingAddress.postalCode}
              onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
              placeholder="400001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              value={shippingAddress.country}
              onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
              placeholder="India"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button className="flex-1" onClick={handleContinue}>
          Continue to Payment
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Payment Method
function PaymentStep({
  paymentMethod,
  setPaymentMethod,
  isWholesale,
  customerNotes,
  setCustomerNotes,
  onNext,
  onBack,
}: {
  paymentMethod: "razorpay" | "invoice";
  setPaymentMethod: (method: "razorpay" | "invoice") => void;
  isWholesale: boolean;
  customerNotes: string;
  setCustomerNotes: (notes: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Payment Method</h2>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as "razorpay" | "invoice")}
          className="space-y-3"
        >
          <div className={cn(
            "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
            paymentMethod === "razorpay" && "border-primary bg-primary/5"
          )}>
            <RadioGroupItem value="razorpay" id="razorpay" />
            <Label htmlFor="razorpay" className="flex-1 cursor-pointer">
              <span className="font-medium">Pay with Razorpay</span>
              <p className="text-sm text-muted-foreground">
                Credit/Debit Card, UPI, Net Banking, Wallets
              </p>
            </Label>
            <div className="flex gap-1">
              <div className="w-8 h-5 bg-blue-600 rounded text-white text-[8px] flex items-center justify-center font-bold">VISA</div>
              <div className="w-8 h-5 bg-red-500 rounded text-white text-[8px] flex items-center justify-center font-bold">MC</div>
              <div className="w-8 h-5 bg-green-600 rounded text-white text-[8px] flex items-center justify-center font-bold">UPI</div>
            </div>
          </div>

          {isWholesale && (
            <div className={cn(
              "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
              paymentMethod === "invoice" && "border-primary bg-primary/5"
            )}>
              <RadioGroupItem value="invoice" id="invoice" />
              <Label htmlFor="invoice" className="flex-1 cursor-pointer">
                <span className="font-medium">Invoice / Bank Transfer</span>
                <p className="text-sm text-muted-foreground">
                  For wholesale orders - Pay within 30 days
                </p>
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Order Notes (Optional)</h2>
        <Textarea
          placeholder="Any special instructions for your order..."
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Review Order
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 4: Review & Place Order
function ReviewStep({
  items,
  shippingAddress,
  paymentMethod,
  customerNotes,
  subtotal,
  shipping,
  tax,
  total,
  isLoading,
  onBack,
  onSubmit,
}: {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
  }>;
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: "razorpay" | "invoice";
  customerNotes: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  isLoading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Order Items Summary */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Order Items</h2>
        <div className="divide-y">
          {items.map((item) => (
            <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 object-cover rounded"
              />
              <div className="flex-1 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {item.size} / {item.color} × {item.quantity}
                </p>
              </div>
              <span className="font-medium text-sm">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address Summary */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Shipping Address</h2>
        <div className="text-sm space-y-1">
          <p className="font-medium">{shippingAddress.name}</p>
          <p>{shippingAddress.street}</p>
          <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
          <p>{shippingAddress.country}</p>
          <p className="text-muted-foreground">Phone: {shippingAddress.phone}</p>
        </div>
      </div>

      {/* Payment Method Summary */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Payment Method</h2>
        <p className="text-sm">
          {paymentMethod === "razorpay" ? "Razorpay (Card/UPI/NetBanking)" : "Invoice / Bank Transfer"}
        </p>
        {customerNotes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium">Order Notes:</p>
            <p className="text-sm text-muted-foreground">{customerNotes}</p>
          </div>
        )}
      </div>

      {/* Order Total */}
      <div className="border rounded-lg p-6 bg-muted/50">
        <h2 className="text-lg font-bold mb-4">Order Total</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({(TAX_RATE * 100).toFixed(0)}% GST)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Place Order
              <Check className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { items, getSubtotal, clearCart, isLoading: cartLoading, error: cartError } = useCart();
  const createOrder = useMutation(api.orders.createOrder);
  const validateCart = useMutation(api.cart.validateCart);
  const createRazorpayOrder = useAction(api.payments.createRazorpayOrder);
  const verifyPayment = useAction(api.payments.verifyPayment);
  const dbUser = useQuery(api.users.getCurrentUser, user ? { clerkId: user.id } : "skip");
  const { handleError } = useConvexError();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "invoice">("razorpay");
  const [customerNotes, setCustomerNotes] = useState("");

  const subtotal = getSubtotal();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;

  const isWholesale = dbUser?.role === "wholesale";

  // Memoize cart items for step components
  const cartItems = useMemo(() => items.map(item => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    image: item.image,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    _convexProductId: item._convexProductId,
    _variantSku: item._variantSku,
  })), [items]);

  // Load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript().then((loaded) => {
      setRazorpayLoaded(loaded);
    });
  }, []);

  const validateShipping = () => {
    if (!shippingAddress.name.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!shippingAddress.street.trim()) {
      toast.error("Please enter your street address");
      return false;
    }
    if (!shippingAddress.city.trim()) {
      toast.error("Please enter your city");
      return false;
    }
    if (!shippingAddress.state.trim()) {
      toast.error("Please enter your state");
      return false;
    }
    if (!shippingAddress.postalCode.trim()) {
      toast.error("Please enter your postal code");
      return false;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(shippingAddress.phone.replace(/\D/g, ''))) {
      toast.error("Please enter a valid 10-digit phone number");
      return false;
    }

    const postalRegex = /^[0-9]{6}$/;
    if (!postalRegex.test(shippingAddress.postalCode)) {
      toast.error("Please enter a valid 6-digit postal code");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!user) {
        throw new ValidationError("Please sign in to continue");
      }

      if (items.length === 0) {
        throw new ValidationError("Your cart is empty");
      }

      if (paymentMethod === "razorpay" && !razorpayLoaded) {
        throw new PaymentError("Payment system is loading. Please try again.");
      }

      setIsLoading(true);

      // Validate cart before checkout
      const validation = await validateCart({
        userId: user.id,
      });

      if (!validation.isValid) {
        toast.error(validation.errors.join(", "));
        setIsLoading(false);
        return;
      }

      // Create order
      const orderId = await createOrder({
        items: items.map((item) => ({
          productId: (item._convexProductId || item.productId) as Id<"products">,
          variantSku: item._variantSku || `${item.size}-${item.color}`,
          quantity: item.quantity,
        })),
        shippingAddress,
        paymentMethod,
        customerNotes: customerNotes || undefined,
      });

      // Handle payment based on method
      if (paymentMethod === "razorpay") {
        const razorpayOrderData = await createRazorpayOrder({
          orderId,
          amount: Math.round(total * 100),
        });

        const options = {
          key: razorpayOrderData.keyId,
          amount: razorpayOrderData.amount,
          currency: razorpayOrderData.currency,
          name: "Nishani Woolera",
          description: "Premium Winter Wear",
          order_id: razorpayOrderData.razorpayOrderId,
          handler: async (response: RazorpayPaymentResponse) => {
            try {
              const verificationResult = await verifyPayment({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              if (verificationResult.success) {
                clearCart();
                toast.success("Payment successful!");
                navigate(`/order-confirmation/${orderId}`);
              } else {
                toast.error("Payment verification failed. Please contact support.");
              }
            } catch (error) {
              handleError(error, "Payment verification");
            }
          },
          prefill: {
            name: shippingAddress.name,
            email: user.emailAddresses[0]?.emailAddress || "",
            contact: shippingAddress.phone,
          },
          theme: {
            color: "#1a1a1a",
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              toast.info("Payment cancelled");
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        clearCart();
        toast.success("Order placed successfully! You will receive invoice details via email.");
        navigate(`/order-confirmation/${orderId}`);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else if (error instanceof PaymentError) {
        toast.error(error.message);
      } else {
        handleError(error, "Checkout.handleSubmit");
      }
      setIsLoading(false);
    }
  };

  // Redirect to cart if empty
  if (!cartLoading && items.length === 0) {
    navigate("/cart");
    return null;
  }

  // Loading skeleton
  if (cartLoading && items.length === 0) {
    return (
      <Layout showAnnouncement={false}>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showAnnouncement={false}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-6">Complete your order in a few simple steps</p>

        {cartError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{cartError}</AlertDescription>
          </Alert>
        )}

        <StepIndicator currentStep={currentStep} />

        {/* Step Content */}
        {currentStep === 1 && (
          <CartReviewStep
            items={cartItems}
            subtotal={subtotal}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <ShippingStep
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            validateShipping={validateShipping}
          />
        )}

        {currentStep === 3 && (
          <PaymentStep
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            isWholesale={isWholesale}
            customerNotes={customerNotes}
            setCustomerNotes={setCustomerNotes}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            items={cartItems}
            shippingAddress={shippingAddress}
            paymentMethod={paymentMethod}
            customerNotes={customerNotes}
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
            isLoading={isLoading}
            onBack={() => setCurrentStep(3)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </Layout>
  );
}
