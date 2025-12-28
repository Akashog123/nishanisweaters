import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import NotFoundError from "@/components/NotFoundError";

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();

  const order = useQuery(api.orders.getOrder, orderId ? { orderId: orderId as Id<"orders"> } : "skip");

  // Loading state
  if (!order) {
    return (
      <Layout showAnnouncement={false}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Order not found
  if (order === null) {
    return (
      <Layout showAnnouncement={false}>
        <NotFoundError
          resourceType="order"
          resourceId={orderId}
        />
      </Layout>
    );
  }

  return (
    <Layout showAnnouncement={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your order. We've sent a confirmation email to {order.userEmail}
          </p>

          <div className="border rounded-lg p-6 text-left mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order #{order.orderNumber}</h2>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm capitalize">
                {order.orderStatus}
              </span>
            </div>

            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4 py-2 border-b last:border-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.size} / {item.color} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{order.shippingCost === 0 ? "FREE" : `$${order.shippingCost}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 text-left mb-8">
            <h3 className="font-bold mb-2">Shipping Address</h3>
            <p>{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.street}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
            <p>{order.shippingAddress.country}</p>
            <p>Phone: {order.shippingAddress.phone}</p>
          </div>

          <div className="flex gap-4 justify-center">
            <Link to="/orders">
              <Button variant="outline">View All Orders</Button>
            </Link>
            <Link to="/shop/new-arrival">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
