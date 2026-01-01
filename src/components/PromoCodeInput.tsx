import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag, X, Check } from "lucide-react";

interface PromoCodeInputProps {
  sessionId?: string;
  onPromoApplied?: (discount: number, code: string) => void;
  onPromoRemoved?: () => void;
}

export function PromoCodeInput({
  sessionId,
  onPromoApplied,
  onPromoRemoved,
}: PromoCodeInputProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const cart = useQuery(api.cart.getCart, { sessionId });
  const validatePromoCode = useMutation(api.promoCodes.validatePromoCode);
  const removePromoCode = useMutation(api.promoCodes.removePromoCode);

  const appliedCode = cart?.appliedPromoCode;
  const appliedDiscount = cart?.promoDiscount;

  const handleApply = async () => {
    if (!code.trim()) {
      toast({
        title: "Enter a code",
        description: "Please enter a promo code to apply.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      const result = await validatePromoCode({
        code: code.trim(),
        sessionId,
      });

      toast({
        title: "Promo code applied!",
        description: `You saved ₹${result.discount.toLocaleString("en-IN")}`,
      });

      setCode("");
      onPromoApplied?.(result.discount, result.code);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid promo code. Please try again.";
      toast({
        title: "Invalid code",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removePromoCode({ sessionId });
      toast({
        title: "Promo code removed",
        description: "The discount has been removed from your cart.",
      });
      onPromoRemoved?.();
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to remove promo code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isApplying && code.trim()) {
      handleApply();
    }
  };

  // Show applied promo code
  if (appliedCode && appliedDiscount) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              {appliedCode}
            </Badge>
            <span className="text-sm text-green-700">
              -₹{appliedDiscount.toLocaleString("en-IN")} applied
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemoving}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show input form
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter promo code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="pl-10 uppercase"
            disabled={isApplying}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={isApplying || !code.trim()}
          variant="outline"
        >
          {isApplying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </div>
  );
}
