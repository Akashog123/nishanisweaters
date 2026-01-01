/**
 * Shipping Update Email Template
 */
import { escapeHtml, baseEmailLayout } from "../emailTemplates";

export interface ShippingUpdateData {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
}

export function generateShippingUpdateTemplate(data: ShippingUpdateData): string {
  const content = `
    <h2>Your order is on its way!</h2>
    <p>Hi ${escapeHtml(data.customerName)}, great news! Your order <strong>${escapeHtml(data.orderNumber)}</strong> has been shipped.</p>

    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #666;">Tracking Number (${escapeHtml(data.carrier)})</p>
      <div style="font-size: 24px; font-weight: bold; color: #1a1a1a; letter-spacing: 2px;">
        ${escapeHtml(data.trackingNumber)}
      </div>
    </div>

    <p style="color: #666;">You can track your package using the tracking number above on your carrier's website.</p>
  `;

  return baseEmailLayout({
    title: "Shipping Update",
    content,
    showTagline: false,
  });
}
