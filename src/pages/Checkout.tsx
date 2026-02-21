import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
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
import { AlertCircle, ArrowLeft } from "lucide-react";
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
// PERFORMANCE: Import checkout funnel tracking for SLI/SLO measurement
import {
  trackCheckoutStep,
  trackPaymentInit,
  trackPaymentSuccess,
  trackPaymentFailure,
  trackCartAbandonmentRisk,
  resetCartAbandonmentTracking,
  clearCartAbandonmentTracking,
} from "@/lib/observability";
import { validateAddress } from "@/lib/validation";
import { getSessionId } from "@/lib/session";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const { items, getSubtotal, clearCart, isLoading: cartLoading, error: cartError } = useCart();
  const createOrder = useMutation(api.orders.createOrder);
  const validateCart = useMutation(api.cart.validateCart);
  const createRazorpayOrder = useAction(api.payments.createRazorpayOrder);
  const verifyPayment = useAction(api.payments.verifyPayment);
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
          promoCode: cartData?.appliedPromoCode,
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
  const promoDiscount = orderPreview?.promoDiscount ?? cartData?.promoDiscount ?? 0;

  // Tax is calculated on the subtotal minus promo discount
  const taxableAmount = Math.max(0, subtotal - promoDiscount);
  const tax = orderPreview?.tax ?? taxableAmount * TAX_RATE;

  // Shipping uses original subtotal to check free shipping threshold
  const shipping = orderPreview?.shippingCost ?? (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST);

  const appliedPromoCode = cartData?.appliedPromoCode;

  // Server total now correctly includes promo discount calculation
  const total = orderPreview?.total ?? (taxableAmount + tax + shipping);
  const serverTaxRate = orderPreview?.taxRate ?? TAX_RATE;

  // Memoize cart items for step components
  const cartItems = useMemo(() => items.map(item => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
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

  // OBSERVABILITY: Track checkout funnel steps for SLI/SLO measurement
  // This tracks user progress through the checkout funnel
  useEffect(() => {
    if (items.length > 0) {
      trackCheckoutStep("CHECKOUT_START", {
        itemCount: items.length,
        totalValue: total,
      });
    }
    // Start cart abandonment tracking
    trackCartAbandonmentRisk({ itemCount: items.length, totalValue: total });

    return () => {
      clearCartAbandonmentTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally only run on mount
  }, []);

  // Track step changes in the checkout flow
  useEffect(() => {
    const stepMap: Record<number, Parameters<typeof trackCheckoutStep>[0]> = {
      1: "CART_VIEW",
      2: "SHIPPING_INFO",
      3: "PAYMENT_METHOD",
      4: "CHECKOUT_START", // Review step
    };

    const stepName = stepMap[currentStep];
    if (stepName && items.length > 0) {
      trackCheckoutStep(stepName, {
        itemCount: items.length,
        totalValue: total,
      });
      // Reset abandonment timer on step progression
      resetCartAbandonmentTracking();
    }
  }, [currentStep, items.length, total]);

  // Memoized validation function to prevent recreation on every render
  const validateShipping = useCallback(() => {
    const validationResult = validateAddress(shippingAddress, "IN");

    if (!validationResult.isValid) {
      // Display the first error found
      const firstError = Object.values(validationResult.errors)[0];
      toast.error(firstError || "Please check your shipping information");
      return false;
    }

    return true;
  }, [shippingAddress]);

  /**
   * Validates checkout prerequisites before order creation
   * @throws {ValidationError} If validation fails
   */
  const validateCheckoutForm = useCallback(() => {
    if (!user) {
      throw new ValidationError("Please sign in to continue");
    }

    if (items.length === 0) {
      throw new ValidationError("Your cart is empty");
    }

    if (paymentMethod === "razorpay" && !razorpayLoaded) {
      throw new PaymentError("Payment system is loading. Please try again.");
    }
  }, [user, items.length, paymentMethod, razorpayLoaded]);

  /**
   * Creates order and initiates payment flow
   * @returns Order ID for the created order
   */
  const createOrderWithPayment = useCallback(async (): Promise<Id<"orders">> => {
    // Validate cart before checkout - only pass sessionId for guest users
    // For authenticated users, the server uses server-side identity
    // Use Convex auth state to ensure server-side identity is ready
    const sessionId = (user && isConvexAuthenticated) ? undefined : getSessionId();
    const validation = await validateCart({ sessionId });

    if (!validation.isValid) {
      toast.error(validation.errors.join(", "));
      throw new ValidationError("Cart validation failed");
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

    return orderId;
  }, [user, isConvexAuthenticated, validateCart, createOrder, items, shippingAddress, paymentMethod, customerNotes, appliedPromoCode]);

  /**
   * Processes Razorpay payment verification response
   */
  const processPaymentResponse = useCallback(
    async (orderId: Id<"orders">, response: RazorpayPaymentResponse) => {
      try {
        const verificationResult = await verifyPayment({
          orderId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });

        if (verificationResult.success) {
          // OBSERVABILITY: Track successful payment
          trackPaymentSuccess(
            {
              orderId: orderId.toString(),
              amount: total,
              currency: "INR",
              paymentMethod: "razorpay",
              gateway: "razorpay",
            },
            response.razorpay_payment_id
          );
          trackCheckoutStep("PAYMENT_SUCCESS", {
            itemCount: items.length,
            totalValue: total,
          });
          trackCheckoutStep("ORDER_CONFIRMED", {
            itemCount: items.length,
            totalValue: total,
          });

          clearCart();
          toast.success("Payment successful!");
          navigate(`/order-confirmation/${orderId}`);
        } else {
          // OBSERVABILITY: Track payment verification failure
          trackPaymentFailure(
            {
              orderId: orderId.toString(),
              amount: total,
              currency: "INR",
              paymentMethod: "razorpay",
              gateway: "razorpay",
            },
            "VERIFICATION_FAILED",
            "Payment verification failed"
          );
          toast.error("Payment verification failed. Please contact support.");
        }
      } catch (error) {
        // OBSERVABILITY: Track payment error
        trackPaymentFailure(
          {
            orderId: orderId.toString(),
            amount: total,
            currency: "INR",
            paymentMethod: "razorpay",
            gateway: "razorpay",
          },
          "VERIFICATION_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        );
        handleError(error, "Payment verification");
      }
    },
    [verifyPayment, total, items.length, clearCart, navigate, handleError]
  );

  /**
   * Handles Razorpay payment modal dismissal
   */
  const handlePaymentCancellation = useCallback(
    (orderId: Id<"orders">) => {
      // OBSERVABILITY: Track payment cancellation
      trackPaymentFailure(
        {
          orderId: orderId.toString(),
          amount: total,
          currency: "INR",
          paymentMethod: "razorpay",
          gateway: "razorpay",
        },
        "USER_CANCELLED",
        "Payment cancelled by user"
      );
      setIsLoading(false);
      toast.info("Payment cancelled");
    },
    [total]
  );

  /**
   * Initiates Razorpay payment flow
   */
  const initiateRazorpayPayment = useCallback(
    async (orderId: Id<"orders">) => {
      // SECURITY: Amount is now calculated server-side from the order in database
      const razorpayOrderData = await createRazorpayOrder({
        orderId,
      });

      // OBSERVABILITY: Track payment initialization for SLI/SLO
      trackPaymentInit({
        orderId: orderId.toString(),
        amount: total,
        currency: "INR",
        paymentMethod: "razorpay",
        gateway: "razorpay",
      });

      const options = {
        key: razorpayOrderData.keyId,
        amount: razorpayOrderData.amount,
        currency: razorpayOrderData.currency,
        name: "Nidhi Clothing Co.",
        description: "Premium Winter Wear",
        order_id: razorpayOrderData.razorpayOrderId,
        handler: (response: RazorpayPaymentResponse) => processPaymentResponse(orderId, response),
        prefill: {
          name: shippingAddress.name,
          email: user?.emailAddresses[0]?.emailAddress || "",
          contact: shippingAddress.phone,
        },
        theme: {
          color: "#1a1a1a",
        },
        modal: {
          ondismiss: () => handlePaymentCancellation(orderId),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    },
    [createRazorpayOrder, total, processPaymentResponse, shippingAddress, user, handlePaymentCancellation]
  );

  /**
   * Handles non-Razorpay payment methods (invoice/wholesale)
   */
  const handleNonRazorpayPayment = useCallback(
    (orderId: Id<"orders">) => {
      trackCheckoutStep("ORDER_CONFIRMED", {
        itemCount: items.length,
        totalValue: total,
      });
      clearCart();
      toast.success("Order placed successfully! You will receive invoice details via email.");
      navigate(`/order-confirmation/${orderId}`);
    },
    [items.length, total, clearCart, navigate]
  );

  /**
   * Main checkout submission handler
   * Orchestrates validation, order creation, and payment flow
   */
  const handleSubmit = async () => {
    try {
      // Step 1: Validate form inputs
      validateCheckoutForm();

      setIsLoading(true);

      // Step 2: Create order with validated cart
      const orderId = await createOrderWithPayment();

      // Step 3: Handle payment based on selected method
      if (paymentMethod === "razorpay") {
        await initiateRazorpayPayment(orderId);
      } else {
        handleNonRazorpayPayment(orderId);
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

  // Redirect to cart if empty (useEffect to avoid navigation during render)
  useEffect(() => {
    if (!cartLoading && items.length === 0) {
      navigate("/cart");
    }
  }, [cartLoading, items.length, navigate]);

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
        <Button
          variant="ghost"
          onClick={() => navigate("/cart")}
          className="-ml-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Button>
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
            promoDiscount={promoDiscount}
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
