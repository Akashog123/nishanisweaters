import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Layout from "@/components/Layout";
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
} from "@/lib/constants";
import { AlertCircle } from "lucide-react";
import { loadRazorpayScript, type RazorpayPaymentResponse } from "@/types/razorpay";
import { CheckoutErrorBoundary } from "@/components/CheckoutErrorBoundary";
import {
  StepIndicator,
  CartReviewStep,
  ShippingStep,
  PaymentStep,
  ReviewStep,
  type ShippingAddress,
  type PaymentMethod,
} from "@/components/checkout";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { items, getSubtotal, clearCart, isLoading: cartLoading, error: cartError } = useCart();
  const createOrder = useMutation(api.orders.createOrder);
  const validateCart = useMutation(api.cart.validateCart);
  const createRazorpayOrder = useAction(api.payments.createRazorpayOrder);
  const verifyPayment = useAction(api.payments.verifyPayment);
  // SECURITY: Use server-side identity verification - never pass client clerkId
  const dbUser = useQuery(api.users.getCurrentUser, user ? {} : "skip");
  const cartData = useQuery(api.cart.getCart, {});

  // SECURITY: Get server-side pricing to prevent frontend/backend pricing drift
  // The server calculates prices from the database, not from client-provided values
  const orderPreview = useQuery(
    api.orders.getOrderPreview,
    items.length > 0
      ? {
          items: items.map((item) => ({
            productId: (item._convexProductId || item.productId) as Id<"products">,
            variantSku: item._variantSku || `${item.size}-${item.color}`,
            quantity: item.quantity,
          })),
        }
      : "skip"
  );

  const { handleError } = useConvexError();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay");
  const [customerNotes, setCustomerNotes] = useState("");

  // Use server-side pricing when available, fall back to client calculations
  // Server prices are authoritative and prevent price manipulation
  const clientSubtotal = getSubtotal();
  const subtotal = orderPreview?.subtotal ?? clientSubtotal;
  const shipping = orderPreview?.shippingCost ?? (clientSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST);
  const tax = orderPreview?.tax ?? clientSubtotal * TAX_RATE;
  const promoDiscount = cartData?.promoDiscount ?? 0;
  const appliedPromoCode = cartData?.appliedPromoCode;
  const total = orderPreview?.total ?? (subtotal + shipping + tax - promoDiscount);
  const serverTaxRate = orderPreview?.taxRate ?? TAX_RATE;

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

  // Memoize pricing details for ReviewStep
  const pricingDetails = useMemo(() => ({
    subtotal,
    shipping,
    tax,
    taxRate: serverTaxRate,
    promoDiscount,
    total,
  }), [subtotal, shipping, tax, serverTaxRate, promoDiscount, total]);

  // Load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript().then((loaded) => {
      setRazorpayLoaded(loaded);
    });
  }, []);

  // Memoized validation function to prevent recreation on every render
  const validateShipping = useCallback(() => {
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
  }, [shippingAddress]);

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
      const validation = await validateCart({});

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
        promoCode: appliedPromoCode || undefined,
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

        {/* Wrap the critical payment/order submission step with error boundary */}
        <CheckoutErrorBoundary>
          {currentStep === 4 && (
            <ReviewStep
              items={cartItems}
              shippingAddress={shippingAddress}
              paymentMethod={paymentMethod}
              customerNotes={customerNotes}
              pricing={pricingDetails}
              isLoading={isLoading}
              onBack={() => setCurrentStep(3)}
              onSubmit={handleSubmit}
            />
          )}
        </CheckoutErrorBoundary>
      </div>
    </Layout>
  );
}
