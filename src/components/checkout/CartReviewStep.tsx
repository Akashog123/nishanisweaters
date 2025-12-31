import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
}

export interface CartReviewStepProps {
  items: CartItem[];
  subtotal: number;
  onNext: () => void;
}

export function CartReviewStep({ items, subtotal, onNext }: CartReviewStepProps) {
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
