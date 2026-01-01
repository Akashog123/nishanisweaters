import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { OrderStatus } from "@/lib/constants/orderStatus";

export interface UpdateOrderStatusParams {
  orderId: Id<"orders">;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  shippingCarrier?: string;
  adminNotes?: string;
}

export interface UseOrderMutationsReturn {
  updateOrderStatus: (params: UpdateOrderStatusParams) => Promise<void>;
  isUpdating: boolean;
}

export function useOrderMutations() {
  const updateOrderStatusMutation = useMutation(api.orders.updateOrderStatus);

  const updateOrderStatus = async ({
    orderId,
    orderStatus,
    trackingNumber,
    shippingCarrier,
    adminNotes,
  }: UpdateOrderStatusParams): Promise<void> => {
    try {
      await updateOrderStatusMutation({
        orderId,
        orderStatus: orderStatus as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
        trackingNumber,
        shippingCarrier,
        adminNotes,
      });
      toast.success("Order status updated successfully");
    } catch (error) {
      toast.error("Failed to update order status");
      throw error;
    }
  };

  return {
    updateOrderStatus,
  };
}
