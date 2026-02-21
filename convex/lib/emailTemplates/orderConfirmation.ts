/**
 * Order Confirmation Email Template
 */
import {
  escapeHtml,
  formatCurrency,
  baseEmailLayout,
  createSection,
  createInfoBox,
  createProductRow,
  EMAIL_STYLES
} from "../emailTemplates";

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    size: string;
    color: string;
    image?: string;
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
  const itemsHtml = order.items
    .map((item) =>
      createProductRow({
        productName: escapeHtml(item.name),
        variantDetails: `${escapeHtml(item.size)} / ${escapeHtml(item.color)}`,
        quantity: item.quantity,
        price: item.unitPrice,
        imageUrl: item.image,
      })
    )
    .join("");

  const content = `
    <h2 style="text-align: center; color: #3d4f59; font-weight: 300; margin-top: 0;">Thank you for your order!</h2>
    <p style="text-align: center; color: #666;">Hi ${escapeHtml(order.customerName)}, your order has been confirmed.</p>

    ${createInfoBox({
      content: `
        <div style="text-align: center;">
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
          <span style="font-size: 24px; font-weight: 300; color: #3d4f59; letter-spacing: 2px;">${order.orderNumber}</span>
        </div>
      `
    })}

    ${createSection({
      title: "Order Details",
      content: `
        <table style="${EMAIL_STYLES.table}">
          ${itemsHtml}
        </table>
      `
    })}

    <div style="background: #f9f9f9; padding: 25px; border: 1px solid #e0e0e0; margin-bottom: 30px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; color: #666;">Subtotal</td>
          <td align="right" style="padding: 8px 0;">${formatCurrency(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Shipping</td>
          <td align="right" style="padding: 8px 0;">${order.shippingCost === 0 ? "FREE" : formatCurrency(order.shippingCost)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Tax (GST)</td>
          <td align="right" style="padding: 8px 0;">${formatCurrency(order.tax)}</td>
        </tr>
        <tr>
          <td style="padding: 20px 0 0 0; border-top: 1px solid #e0e0e0; font-weight: 600; font-size: 18px; color: #3d4f59;">Total</td>
          <td align="right" style="padding: 20px 0 0 0; border-top: 1px solid #e0e0e0; font-weight: 600; font-size: 18px; color: #3d4f59;">${formatCurrency(order.total)}</td>
        </tr>
      </table>
    </div>

    ${createSection({
      title: "Shipping Address",
      content: createInfoBox({
        content: `
          <p style="margin: 0; line-height: 1.8; color: #333;">
            ${escapeHtml(order.shippingAddress.street)}<br>
            ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.state)} ${escapeHtml(order.shippingAddress.postalCode)}<br>
            ${escapeHtml(order.shippingAddress.country)}
          </p>
        `
      })
    })}
  `;

  return baseEmailLayout({
    title: "Order Confirmation",
    content,
  });
}
