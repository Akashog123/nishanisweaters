/**
 * Order Confirmation Email Template
 */
import { escapeHtml, formatCurrency } from "../emailTemplates";

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    size: string;
    color: string;
  }>;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export function generateOrderConfirmationTemplate(order: OrderConfirmationData): string {
  const currentYear = new Date().getFullYear();

  const itemsHtml = order.items
    .map(
      (item) => `
    <div class="item">
      <div class="item-details">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-variant">${escapeHtml(item.size)} / ${escapeHtml(item.color)} x ${item.quantity}</div>
      </div>
      <div class="item-price">${formatCurrency(item.unitPrice * item.quantity)}</div>
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .order-number { background: #f0f0f0; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 25px; }
    .order-number span { font-size: 20px; font-weight: bold; color: #1a1a1a; }
    .section { margin-bottom: 25px; }
    .section h3 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
    .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .item-details { flex: 1; }
    .item-name { font-weight: 600; }
    .item-variant { color: #666; font-size: 14px; }
    .item-price { text-align: right; font-weight: 600; }
    .totals { background: #f9f9f9; padding: 20px; border-radius: 6px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.grand-total { border-top: 2px solid #1a1a1a; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
    .address { background: #f0f0f0; padding: 15px; border-radius: 6px; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nidhi Sweaters</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.8;">Premium Winter Wear</p>
    </div>
    <div class="content">
      <h2 style="text-align: center; color: #1a1a1a;">Thank you for your order!</h2>
      <p style="text-align: center; color: #666;">Hi ${escapeHtml(order.customerName)}, your order has been confirmed.</p>

      <div class="order-number">
        <p style="margin: 0 0 5px 0; color: #666;">Order Number</p>
        <span>${order.orderNumber}</span>
      </div>

      <div class="section">
        <h3>Order Details</h3>
        ${itemsHtml}
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Shipping</span>
          <span>${order.shippingCost === 0 ? "FREE" : formatCurrency(order.shippingCost)}</span>
        </div>
        <div class="total-row">
          <span>Tax (GST)</span>
          <span>${formatCurrency(order.tax)}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>

      <div class="section">
        <h3>Shipping Address</h3>
        <div class="address">
          <p style="margin: 0;">
            ${escapeHtml(order.shippingAddress.street)}<br>
            ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.state)} ${escapeHtml(order.shippingAddress.postalCode)}<br>
            ${escapeHtml(order.shippingAddress.country)}
          </p>
        </div>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${currentYear} Nidhi Sweaters. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">If you have any questions, contact us at support@nidhisweaters.com</p>
    </div>
  </div>
</body>
</html>
`;
}
