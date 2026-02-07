/**
 * Abandoned Cart Email Templates
 */
import { escapeHtml, formatCurrency } from "../emailTemplates";

export interface AbandonedCartData {
  customerName: string;
  items: Array<{
    name: string;
    image: string;
    price: number;
    size: string;
    color: string;
  }>;
  cartTotal: number;
  cartUrl: string;
  discountCode?: string;
  discountPercent?: number;
}

export function generateAbandonedCartTemplate1(data: AbandonedCartData): string {
  const currentYear = new Date().getFullYear();

  const itemsHtml = data.items
    .slice(0, 3)
    .map(
      (item) => `
    <div class="item">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="item-image" />
      <div class="item-details">
        <p style="margin: 0; font-weight: 600;">${escapeHtml(item.name)}</p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">${escapeHtml(item.size)} / ${escapeHtml(item.color)}</p>
        <p style="margin: 0; font-weight: bold;">${formatCurrency(item.price)}</p>
      </div>
    </div>
  `
    )
    .join("");

  const moreItems =
    data.items.length > 3
      ? `<p style="text-align: center; color: #666;">+ ${data.items.length - 3} more item(s)</p>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You left something behind...</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .item { display: flex; gap: 15px; padding: 15px; border-bottom: 1px solid #eee; }
    .item-image { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; }
    .item-details { flex: 1; }
    .cta-button { display: block; background: #1a1a1a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; margin-top: 25px; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nidhi Sweaters</h1>
    </div>
    <div class="content">
      <h2 style="text-align: center;">Forgot something?</h2>
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>We noticed you left some items in your cart. Don't worry, we saved them for you!</p>

      <div style="margin: 25px 0;">
        ${itemsHtml}
        ${moreItems}
      </div>

      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #666;">Cart Total</p>
        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold;">${formatCurrency(data.cartTotal)}</p>
      </div>

      <a href="${data.cartUrl}" class="cta-button">Complete Your Purchase</a>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${currentYear} Nidhi Sweaters. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function generateAbandonedCartTemplate2(data: AbandonedCartData): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Still thinking about it?</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; text-align: center; }
    .cta-button { display: inline-block; background: #1a1a1a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nidhi Sweaters</h1>
    </div>
    <div class="content">
      <h2>Still interested?</h2>
      <p>Hi ${escapeHtml(data.customerName)}, your cart is waiting for you!</p>
      <p>The items you selected are still available, but they're selling fast.</p>

      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; color: #856404;">
          <strong>Hurry!</strong> Your items won't be reserved forever.
        </p>
      </div>

      <p style="font-size: 20px; font-weight: bold;">Cart Total: ${formatCurrency(data.cartTotal)}</p>

      <a href="${data.cartUrl}" class="cta-button">Return to Cart</a>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${currentYear} Nidhi Sweaters. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function generateAbandonedCartTemplate3(data: AbandonedCartData): string {
  const currentYear = new Date().getFullYear();

  const discountSection = data.discountCode
    ? `
      <div class="discount-box">
        <p style="margin: 0; opacity: 0.8;">Special offer just for you!</p>
        <p style="margin: 10px 0;">Get <strong>${data.discountPercent || 10}% OFF</strong> your order</p>
        <div class="discount-code">${escapeHtml(data.discountCode)}</div>
        <p style="margin: 0; font-size: 12px; opacity: 0.7;">Valid for 24 hours</p>
      </div>
    `
    : `
      <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 25px 0; color: #721c24;">
        <strong>Final Notice:</strong> Your cart will expire soon!
      </div>
    `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Last chance + special offer!</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; text-align: center; }
    .discount-box { background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white; padding: 25px; border-radius: 8px; margin: 25px 0; }
    .discount-code { font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 10px 0; }
    .cta-button { display: inline-block; background: #d4af37; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nidhi Sweaters</h1>
    </div>
    <div class="content">
      <h2>Last Chance!</h2>
      <p>Hi ${escapeHtml(data.customerName)}, this is your final reminder about your cart.</p>

      ${discountSection}

      <p style="font-size: 20px; font-weight: bold;">Cart Total: ${formatCurrency(data.cartTotal)}</p>

      <a href="${data.cartUrl}" class="cta-button">Complete Purchase Now</a>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${currentYear} Nidhi Sweaters. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}
