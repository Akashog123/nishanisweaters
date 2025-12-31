import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/constants";
import { Loader2, Check, ChevronLeft } from "lucide-react";
import type { CartItem } from "./CartReviewStep";
import type { ShippingAddress } from "./ShippingStep";
import type { PaymentMethod } from "./PaymentStep";

export interface PricingDetails {
  subtotal: number;
  shipping: number;
  tax: number;
  taxRate: number;
  promoDiscount: number;
  total: number;
}

export interface ReviewStepProps {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  customerNotes: string;
  pricing: PricingDetails;
  isLoading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewStep({
  items,
  shippingAddress,
  paymentMethod,
  customerNotes,
  pricing,
  isLoading,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const { subtotal, shipping, tax, taxRate, promoDiscount, total } = pricing;

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
                  {item.size} / {item.color} x {item.quantity}
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
            <span>Tax ({(taxRate * 100).toFixed(0)}% GST)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promo Discount</span>
              <span>-{formatCurrency(promoDiscount)}</span>
            </div>
          )}
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
