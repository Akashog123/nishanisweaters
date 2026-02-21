/**
 * Abandoned Cart Email Templates
 */
import {
  escapeHtml,
  formatCurrency,
  baseEmailLayout,
  createButton,
  createProductRow,
  EMAIL_STYLES
} from "../emailTemplates";

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
  const itemsHtml = data.items
    .slice(0, 3)
    .map((item) =>
      createProductRow({
        productName: escapeHtml(item.name),
        variantDetails: `${escapeHtml(item.size)} / ${escapeHtml(item.color)}`,
        quantity: 1,
        price: item.price,
        imageUrl: item.image,
      })
    )
    .join("");

  const moreItems =
    data.items.length > 3
      ? `<p style="text-align: center; color: #666; font-size: 13px; margin-top: 15px;">+ ${data.items.length - 3} more item(s)</p>`
      : "";

  const content = `
    <h2 style="text-align: center; color: #3d4f59; font-weight: 300; margin-top: 0;">Forgot something?</h2>
    <p>Hi ${escapeHtml(data.customerName)},</p>
    <p>We noticed you left some items in your cart. Don't worry, we saved them for you!</p>

    <div style="margin: 30px 0; border: 1px solid #e0e0e0; padding: 20px; background: #ffffff;">
      <table style="${EMAIL_STYLES.table} margin: 0;">
        ${itemsHtml}
      </table>
      ${moreItems}
    </div>

    <div style="background: #f9f9f9; padding: 20px; text-align: center; border: 1px solid #e0e0e0; margin-bottom: 25px;">
      <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Cart Total</p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 300; color: #3d4f59;">${formatCurrency(data.cartTotal)}</p>
    </div>

    ${createButton({
      url: data.cartUrl,
      text: "Complete Your Purchase",
      align: "center"
    })}
  `;

  return baseEmailLayout({
    title: "You left something behind...",
    content,
    showTagline: false,
  });
}

export function generateAbandonedCartTemplate2(data: AbandonedCartData): string {
  const content = `
    <h2 style="text-align: center; color: #3d4f59; font-weight: 300; margin-top: 0;">Still interested?</h2>
    <p style="text-align: center;">Hi ${escapeHtml(data.customerName)}, your cart is waiting for you!</p>
    <p style="text-align: center;">The items you selected are still available, but they're selling fast.</p>

    <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 20px; margin: 30px 0; text-align: center;">
      <p style="margin: 0; color: #b07d00; font-size: 15px;">
        <strong style="text-transform: uppercase; letter-spacing: 1px;">Hurry!</strong> Your items won't be reserved forever.
      </p>
    </div>

    <p style="font-size: 20px; font-weight: 300; text-align: center; color: #3d4f59;">
      Cart Total: ${formatCurrency(data.cartTotal)}
    </p>

    ${createButton({
      url: data.cartUrl,
      text: "Return to Cart",
      align: "center"
    })}
  `;

  return baseEmailLayout({
    title: "Still thinking about it?",
    content,
    showTagline: false,
  });
}

export function generateAbandonedCartTemplate3(data: AbandonedCartData): string {
  const discountSection = data.discountCode
    ? `
      <div style="background: #3d4f59; color: #ffffff; padding: 30px; margin: 30px 0; text-align: center;">
        <p style="margin: 0; color: #a8b2b8; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Special offer just for you!</p>
        <p style="margin: 15px 0; font-size: 18px; font-weight: 300;">Get <strong style="font-weight: 600;">${data.discountPercent || 10}% OFF</strong> your order</p>
        <div style="font-size: 28px; font-weight: 600; letter-spacing: 4px; margin: 15px 0; padding: 10px; border: 2px dashed #ffffff; display: inline-block;">${escapeHtml(data.discountCode)}</div>
        <p style="margin: 0; font-size: 12px; color: #a8b2b8;">Valid for 24 hours</p>
      </div>
    `
    : `
      <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-left: 4px solid #3d4f59; padding: 20px; margin: 30px 0; color: #333333;">
        <strong style="text-transform: uppercase; letter-spacing: 1px; color: #3d4f59;">Final Notice:</strong> Your cart will expire soon!
      </div>
    `;

  const content = `
    <h2 style="text-align: center; color: #3d4f59; font-weight: 300; margin-top: 0;">Last Chance!</h2>
    <p style="text-align: center;">Hi ${escapeHtml(data.customerName)}, this is your final reminder about your cart.</p>

    ${discountSection}

    <p style="font-size: 20px; font-weight: 300; text-align: center; color: #3d4f59;">
      Cart Total: ${formatCurrency(data.cartTotal)}
    </p>

    ${createButton({
      url: data.cartUrl,
      text: "Complete Purchase Now",
      align: "center"
    })}
  `;

  return baseEmailLayout({
    title: "Last chance + special offer!",
    content,
    showTagline: false,
  });
}
