/**
 * Order Delivered Email Template
 */
import { escapeHtml, baseEmailLayout } from "../emailTemplates";

export interface OrderDeliveredData {
  customerName: string;
  orderNumber: string;
}

export function generateOrderDeliveredTemplate(data: OrderDeliveredData): string {
  const content = `
    <h2 style="color: #3d4f59; font-weight: 300; margin-top: 0;">Your order has been delivered!</h2>
    <p>Hi ${escapeHtml(data.customerName)}, great news! Your order <strong style="color: #3d4f59;">${escapeHtml(data.orderNumber)}</strong> has been delivered successfully.</p>

    <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; margin: 30px 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
      <p style="margin: 0; font-size: 18px; color: #3d4f59; font-weight: 500;">
        Delivery Confirmed
      </p>
    </div>

    <p style="color: #666;">Thank you for shopping with us! We hope you love your purchase.</p>

    <p style="color: #666; margin-top: 30px;">We'd love to hear your feedback! If you have a moment, please leave a review for your order.</p>

    <p style="color: #999; font-size: 13px; margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      If you have any questions or concerns about your order, please don't hesitate to contact our support team.
    </p>
  `;

  return baseEmailLayout({
    title: "Order Delivered",
    content,
    showTagline: false,
  });
}
