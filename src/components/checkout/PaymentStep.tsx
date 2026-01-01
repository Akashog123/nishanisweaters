import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaymentMethod = "razorpay";

export interface PaymentStepProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  customerNotes: string;
  setCustomerNotes: (notes: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PaymentStep({
  paymentMethod,
  setPaymentMethod,
  customerNotes,
  setCustomerNotes,
  onNext,
  onBack,
}: PaymentStepProps) {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Payment Method</h2>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
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
