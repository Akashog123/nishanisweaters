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
    <h2 style="color: #3d4f59; font-weight: 300; margin-top: 0;">Your order is on its way!</h2>
    <p>Hi ${escapeHtml(data.customerName)}, great news! Your order <strong style="color: #3d4f59;">${escapeHtml(data.orderNumber)}</strong> has been shipped.</p>

    <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
        Tracking Number (${escapeHtml(data.carrier)})
      </p>
      <div style="font-size: 28px; font-weight: 300; color: #3d4f59; letter-spacing: 3px; background: #ffffff; display: inline-block; padding: 10px 20px; border: 1px solid #e0e0e0;">
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
