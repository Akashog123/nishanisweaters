import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { logger } from "./lib/logger";

/**
 * Escapes HTML special characters to prevent XSS attacks in email templates.
 * This must be applied to ALL user-provided data before interpolation.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize Resend instance
function getResendInstance() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new ConvexError({
      code: "CONFIGURATION_ERROR",
      message: "Resend API key not configured",
    });
  }

  return new Resend(apiKey);
}

// Email templates
const ORDER_CONFIRMATION_TEMPLATE = (order: {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; size: string; color: string }>;
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
}) => `
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
      <h1>Nishani Woolera</h1>
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
        ${order.items.map(item => `
          <div class="item">
            <div class="item-details">
              <div class="item-name">${escapeHtml(item.name)}</div>
              <div class="item-variant">${escapeHtml(item.size)} / ${escapeHtml(item.color)} x ${item.quantity}</div>
            </div>
            <div class="item-price">₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</div>
          </div>
        `).join('')}
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row">
          <span>Shipping</span>
          <span>${order.shippingCost === 0 ? 'FREE' : '₹' + order.shippingCost.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row">
          <span>Tax (GST)</span>
          <span>₹${order.tax.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total</span>
          <span>₹${order.total.toLocaleString('en-IN')}</span>
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
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">If you have any questions, contact us at support@nishaniwoolera.com</p>
    </div>
  </div>
</body>
</html>
`;

const SHIPPING_UPDATE_TEMPLATE = (data: {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Shipping Update</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; text-align: center; }
    .tracking-box { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .tracking-number { font-size: 24px; font-weight: bold; color: #1a1a1a; letter-spacing: 2px; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nishani Woolera</h1>
    </div>
    <div class="content">
      <h2>Your order is on its way!</h2>
      <p>Hi ${escapeHtml(data.customerName)}, great news! Your order <strong>${escapeHtml(data.orderNumber)}</strong> has been shipped.</p>

      <div class="tracking-box">
        <p style="margin: 0 0 10px 0; color: #666;">Tracking Number (${escapeHtml(data.carrier)})</p>
        <div class="tracking-number">${escapeHtml(data.trackingNumber)}</div>
      </div>

      <p style="color: #666;">You can track your package using the tracking number above on your carrier's website.</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const WHOLESALE_APPLICATION_STATUS_TEMPLATE = (data: {
  customerName: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wholesale Application Update</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .status-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
    .status-approved { background: #d4edda; color: #155724; }
    .status-rejected { background: #f8d7da; color: #721c24; }
    .tier-info { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nishani Woolera</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.8;">Wholesale Program</p>
    </div>
    <div class="content">
      <h2>Wholesale Application Update</h2>
      <p>Hi ${escapeHtml(data.customerName)},</p>

      ${data.status === "approved" ? `
        <div style="text-align: center;">
          <span class="status-badge status-approved">Application Approved</span>
        </div>
        <p>Congratulations! Your wholesale application has been approved.</p>

        <div class="tier-info">
          <h3 style="margin-top: 0;">Welcome to Wholesale!</h3>
          <p>You now have access to:</p>
          <ul>
            <li>Wholesale pricing on all products</li>
            <li>Bulk ordering capabilities</li>
            <li>Invoice payment options</li>
            <li>Dedicated wholesale dashboard</li>
          </ul>
          <p style="margin-bottom: 0;"><strong>Need bulk pricing?</strong> Contact us on WhatsApp: +91 7458 816 343</p>
        </div>

        <p>Log in to your account to start shopping at wholesale prices!</p>
      ` : `
        <div style="text-align: center;">
          <span class="status-badge status-rejected">Application Not Approved</span>
        </div>
        <p>We regret to inform you that your wholesale application has not been approved at this time.</p>

        ${data.rejectionReason ? `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Reason:</strong><br>
            ${escapeHtml(data.rejectionReason)}
          </div>
        ` : ''}

        <p>If you believe this was in error or have additional documentation to provide, please contact our wholesale team.</p>
      `}
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">Contact: wholesale@nishaniwoolera.com</p>
    </div>
  </div>
</body>
</html>
`;

// Action: Send order confirmation email
export const sendOrderConfirmationEmail = internalAction({
  args: {
    to: v.string(),
    orderNumber: v.string(),
    customerName: v.string(),
    items: v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      size: v.string(),
      color: v.string(),
    })),
    subtotal: v.number(),
    tax: v.number(),
    shippingCost: v.number(),
    total: v.number(),
    shippingAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    // Get dynamic email settings
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    const html = ORDER_CONFIRMATION_TEMPLATE({
      orderNumber: args.orderNumber,
      customerName: args.customerName,
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      shippingCost: args.shippingCost,
      total: args.total,
      shippingAddress: args.shippingAddress,
    });

    try {
      await resend.emails.send({
        from: `Nishani Woolera <${emailConfig.fromOrders}>`,
        to: args.to,
        subject: `Order Confirmation - ${args.orderNumber}`,
        html,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send order confirmation email', error, { to: args.to, orderNumber: args.orderNumber });
      return { success: false, error: String(error) };
    }
  },
});

// Action: Send shipping update email
export const sendShippingUpdateEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    orderNumber: v.string(),
    trackingNumber: v.string(),
    carrier: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    // Get dynamic email settings
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    const html = SHIPPING_UPDATE_TEMPLATE({
      customerName: args.customerName,
      orderNumber: args.orderNumber,
      trackingNumber: args.trackingNumber,
      carrier: args.carrier,
    });

    try {
      await resend.emails.send({
        from: `Nishani Woolera <${emailConfig.fromShipping}>`,
        to: args.to,
        subject: `Your Order ${args.orderNumber} Has Shipped!`,
        html,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send shipping update email', error, { to: args.to, orderNumber: args.orderNumber });
      return { success: false, error: String(error) };
    }
  },
});

// Action: Send wholesale application status email
export const sendWholesaleStatusEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    // Get dynamic email settings
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    const html = WHOLESALE_APPLICATION_STATUS_TEMPLATE({
      customerName: args.customerName,
      status: args.status,
      rejectionReason: args.rejectionReason,
    });

    const subject = args.status === "approved"
      ? "Welcome to the Nishani Woolera Wholesale Program!"
      : "Wholesale Application Update";

    try {
      await resend.emails.send({
        from: `Nishani Woolera <${emailConfig.fromWholesale}>`,
        to: args.to,
        subject,
        html,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send wholesale status email', error, { to: args.to, status: args.status });
      return { success: false, error: String(error) };
    }
  },
});

// Action: Send newsletter welcome email
export const sendNewsletterWelcomeEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    // Get dynamic email settings
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Nishani Woolera</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a1a; color: white; padding: 40px; text-align: center; }
    .content { padding: 40px; text-align: center; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nishani Woolera</h1>
    </div>
    <div class="content">
      <h2>Welcome to our Newsletter!</h2>
      <p>Thank you for subscribing. You'll be the first to know about new arrivals, exclusive offers, and winter wear tips.</p>
      <p style="color: #666; font-size: 14px;">Stay warm, stay stylish!</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

    try {
      await resend.emails.send({
        from: `Nishani Woolera <${emailConfig.support}>`,
        to: args.to,
        subject: "Welcome to Nishani Woolera!",
        html,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send newsletter welcome email', error, { to: args.to });
      return { success: false, error: String(error) };
    }
  },
});

// Welcome Email Template
const WELCOME_EMAIL_TEMPLATE = (data: { customerName: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Nishani Woolera</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; color: white; padding: 40px; text-align: center; }
    .content { padding: 40px; }
    .cta-button { display: inline-block; background: #1a1a1a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nishani Woolera</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.8;">Premium Winter Wear</p>
    </div>
    <div class="content">
      <h2>Welcome, ${escapeHtml(data.customerName)}!</h2>
      <p>Thank you for creating an account with Nishani Woolera. We're excited to have you join our community of style-conscious winter wear enthusiasts.</p>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0;">What you can do now:</h3>
        <ul style="padding-left: 20px;">
          <li>Browse our exclusive collection of premium winter wear</li>
          <li>Save your favorite items to your wishlist</li>
          <li>Track your orders and manage your account</li>
          <li>Apply for wholesale pricing (for businesses)</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="https://nishaniwoolera.com/shop" class="cta-button">Start Shopping</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">Questions? Contact us at support@nishaniwoolera.com</p>
    </div>
  </div>
</body>
</html>
`;

// Abandoned Cart Email Templates
const ABANDONED_CART_TEMPLATE_1 = (data: {
  customerName: string;
  items: Array<{ name: string; image: string; price: number; size: string; color: string }>;
  cartTotal: number;
  cartUrl: string;
}) => `
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
      <h1>Nishani Woolera</h1>
    </div>
    <div class="content">
      <h2 style="text-align: center;">Forgot something?</h2>
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>We noticed you left some items in your cart. Don't worry, we saved them for you!</p>

      <div style="margin: 25px 0;">
        ${data.items.slice(0, 3).map(item => `
          <div class="item">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="item-image" />
            <div class="item-details">
              <p style="margin: 0; font-weight: 600;">${escapeHtml(item.name)}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">${escapeHtml(item.size)} / ${escapeHtml(item.color)}</p>
              <p style="margin: 0; font-weight: bold;">₹${item.price.toLocaleString('en-IN')}</p>
            </div>
          </div>
        `).join('')}
        ${data.items.length > 3 ? `<p style="text-align: center; color: #666;">+ ${data.items.length - 3} more item(s)</p>` : ''}
      </div>

      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #666;">Cart Total</p>
        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold;">₹${data.cartTotal.toLocaleString('en-IN')}</p>
      </div>

      <a href="${data.cartUrl}" class="cta-button">Complete Your Purchase</a>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const ABANDONED_CART_TEMPLATE_2 = (data: {
  customerName: string;
  items: Array<{ name: string; image: string; price: number }>;
  cartTotal: number;
  cartUrl: string;
}) => `
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
      <h1>Nishani Woolera</h1>
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

      <p style="font-size: 20px; font-weight: bold;">Cart Total: ₹${data.cartTotal.toLocaleString('en-IN')}</p>

      <a href="${data.cartUrl}" class="cta-button">Return to Cart</a>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const ABANDONED_CART_TEMPLATE_3 = (data: {
  customerName: string;
  cartTotal: number;
  cartUrl: string;
  discountCode?: string;
  discountPercent?: number;
}) => `
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
      <h1>Nishani Woolera</h1>
    </div>
    <div class="content">
      <h2>Last Chance!</h2>
      <p>Hi ${escapeHtml(data.customerName)}, this is your final reminder about your cart.</p>

      ${data.discountCode ? `
        <div class="discount-box">
          <p style="margin: 0; opacity: 0.8;">Special offer just for you!</p>
          <p style="margin: 10px 0;">Get <strong>${data.discountPercent || 10}% OFF</strong> your order</p>
          <div class="discount-code">${escapeHtml(data.discountCode)}</div>
          <p style="margin: 0; font-size: 12px; opacity: 0.7;">Valid for 24 hours</p>
        </div>
      ` : `
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 25px 0; color: #721c24;">
          <strong>Final Notice:</strong> Your cart will expire soon!
        </div>
      `}

      <p style="font-size: 20px; font-weight: bold;">Cart Total: ₹${data.cartTotal.toLocaleString('en-IN')}</p>

      <a href="${data.cartUrl}" class="cta-button">Complete Purchase Now</a>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nishani Woolera. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Action: Send welcome email to new users
export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    // Get dynamic email settings
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    const html = WELCOME_EMAIL_TEMPLATE({
      customerName: args.customerName,
    });

    try {
      await resend.emails.send({
        from: `Nishani Woolera <${emailConfig.support}>`,
        to: args.to,
        subject: "Welcome to Nishani Woolera!",
        html,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send welcome email', error, { to: args.to });
      return { success: false, error: String(error) };
    }
  },
});

// Action: Send abandoned cart email
export const sendAbandonedCartEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    reminderNumber: v.number(), // 1, 2, or 3
    items: v.array(v.object({
      name: v.string(),
      image: v.string(),
      price: v.number(),
      size: v.string(),
      color: v.string(),
    })),
    cartTotal: v.number(),
    cartUrl: v.string(),
    discountCode: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    // Get dynamic email settings
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    let html: string;
    let subject: string;

    switch (args.reminderNumber) {
      case 1:
        html = ABANDONED_CART_TEMPLATE_1({
          customerName: args.customerName,
          items: args.items,
          cartTotal: args.cartTotal,
          cartUrl: args.cartUrl,
        });
        subject = "You left something behind...";
        break;
      case 2:
        html = ABANDONED_CART_TEMPLATE_2({
          customerName: args.customerName,
          items: args.items,
          cartTotal: args.cartTotal,
          cartUrl: args.cartUrl,
        });
        subject = "Still thinking about it?";
        break;
      case 3:
      default:
        html = ABANDONED_CART_TEMPLATE_3({
          customerName: args.customerName,
          cartTotal: args.cartTotal,
          cartUrl: args.cartUrl,
          discountCode: args.discountCode,
          discountPercent: args.discountPercent,
        });
        subject = args.discountCode
          ? `Last chance! Here's ${args.discountPercent || 10}% off your cart`
          : "Last chance to complete your order!";
        break;
    }

    try {
      await resend.emails.send({
        from: `Nishani Woolera <${emailConfig.fromCart}>`,
        to: args.to,
        subject,
        html,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send abandoned cart email', error, { to: args.to, reminderNumber: args.reminderNumber });
      return { success: false, error: String(error) };
    }
  },
});

// ============================================================================
// DISPUTE NOTIFICATION EMAILS (Admin Alerts)
// ============================================================================

/**
 * Dispute Alert Email Template (Admin)
 * Sent when a payment dispute/chargeback is created or requires action
 */
const DISPUTE_ALERT_TEMPLATE = (params: {
  orderNumber: string;
  disputeStatus: string;
  disputeReason?: string;
  customerEmail: string;
  orderTotal: number;
  actionRequired: boolean;
  dashboardUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>⚠️ Payment Dispute Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fff8e1; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: ${params.actionRequired ? '#dc2626' : '#f59e0b'}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ${params.actionRequired ? '🚨 URGENT: Action Required' : '⚠️ Payment Dispute Alert'}
      </h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        A payment dispute has been ${params.disputeStatus === 'created' ? 'initiated' : 'updated'} for order <strong>#${params.orderNumber}</strong>.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Order Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">#${params.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Dispute Status:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${params.actionRequired ? '#dc2626' : '#f59e0b'};">${params.disputeStatus.replace('_', ' ').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Order Total:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">₹${(params.orderTotal / 100).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Customer:</td>
            <td style="padding: 8px 0; text-align: right;">${params.customerEmail}</td>
          </tr>
          ${params.disputeReason ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Reason:</td>
            <td style="padding: 8px 0; text-align: right;">${params.disputeReason}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${params.actionRequired ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #dc2626; font-weight: bold;">
          ⏰ You must submit evidence within the deadline to contest this dispute.
        </p>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${params.dashboardUrl}" style="background: #1f2937; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View in Dashboard
        </a>
      </div>

      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
        This is an automated alert from your Nishani Woolera store.
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Dispute Resolution Email Template (Admin)
 * Sent when a dispute is resolved (won, lost, or closed)
 */
const DISPUTE_RESOLUTION_TEMPLATE = (params: {
  orderNumber: string;
  resolution: 'won' | 'lost' | 'closed';
  orderTotal: number;
  dashboardUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Dispute Resolution</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: ${params.resolution === 'won' ? '#16a34a' : params.resolution === 'lost' ? '#dc2626' : '#6b7280'}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ${params.resolution === 'won' ? '✅ Dispute Won!' : params.resolution === 'lost' ? '❌ Dispute Lost' : '📋 Dispute Closed'}
      </h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        The payment dispute for order <strong>#${params.orderNumber}</strong> has been resolved.
      </p>

      <div style="background: ${params.resolution === 'won' ? '#dcfce7' : params.resolution === 'lost' ? '#fef2f2' : '#f3f4f6'}; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 20px; font-weight: bold; color: ${params.resolution === 'won' ? '#16a34a' : params.resolution === 'lost' ? '#dc2626' : '#6b7280'}; margin: 0;">
          ${params.resolution === 'won'
            ? `You retained ₹${(params.orderTotal / 100).toLocaleString('en-IN')}`
            : params.resolution === 'lost'
            ? `₹${(params.orderTotal / 100).toLocaleString('en-IN')} was returned to customer`
            : 'Dispute has been closed'}
        </p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${params.dashboardUrl}" style="background: #1f2937; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View Order Details
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Action: Send dispute alert email to admin
export const sendDisputeAlertEmail = internalAction({
  args: {
    orderNumber: v.string(),
    disputeStatus: v.string(),
    disputeReason: v.optional(v.string()),
    customerEmail: v.string(),
    orderTotal: v.number(),
    actionRequired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    // Use support email as admin notification target
    const adminEmail = emailConfig.support || 'support@nishaniwoolera.com';
    const baseUrl = process.env.SITE_URL || 'https://nishaniwoolera.com';
    const dashboardUrl = `${baseUrl}/admin/orders`;

    const html = DISPUTE_ALERT_TEMPLATE({
      orderNumber: args.orderNumber,
      disputeStatus: args.disputeStatus,
      disputeReason: args.disputeReason,
      customerEmail: args.customerEmail,
      orderTotal: args.orderTotal,
      actionRequired: args.actionRequired,
      dashboardUrl,
    });

    const subject = args.actionRequired
      ? `🚨 URGENT: Dispute Action Required - Order #${args.orderNumber}`
      : `⚠️ Payment Dispute Alert - Order #${args.orderNumber}`;

    try {
      await resend.emails.send({
        from: `Nishani Woolera Alerts <${emailConfig.fromOrders}>`,
        to: adminEmail,
        subject,
        html,
      });

      logger.info('Dispute alert email sent', { orderNumber: args.orderNumber, disputeStatus: args.disputeStatus });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send dispute alert email', error, { orderNumber: args.orderNumber });
      return { success: false, error: String(error) };
    }
  },
});

// Action: Send dispute resolution email to admin
export const sendDisputeResolutionEmail = internalAction({
  args: {
    orderNumber: v.string(),
    resolution: v.union(v.literal('won'), v.literal('lost'), v.literal('closed')),
    orderTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    const adminEmail = emailConfig.support || 'support@nishaniwoolera.com';
    const baseUrl = process.env.SITE_URL || 'https://nishaniwoolera.com';
    const dashboardUrl = `${baseUrl}/admin/orders`;

    const html = DISPUTE_RESOLUTION_TEMPLATE({
      orderNumber: args.orderNumber,
      resolution: args.resolution,
      orderTotal: args.orderTotal,
      dashboardUrl,
    });

    const subject = args.resolution === 'won'
      ? `✅ Dispute Won - Order #${args.orderNumber}`
      : args.resolution === 'lost'
      ? `❌ Dispute Lost - Order #${args.orderNumber}`
      : `📋 Dispute Closed - Order #${args.orderNumber}`;

    try {
      await resend.emails.send({
        from: `Nishani Woolera Alerts <${emailConfig.fromOrders}>`,
        to: adminEmail,
        subject,
        html,
      });

      logger.info('Dispute resolution email sent', { orderNumber: args.orderNumber, resolution: args.resolution });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send dispute resolution email', error, { orderNumber: args.orderNumber });
      return { success: false, error: String(error) };
    }
  },
});

// ============================================================================
// CONTACT INQUIRY EMAILS (Admin Notification)
// ============================================================================

/**
 * Contact Inquiry Email Template (Admin)
 * Sent when a customer submits a contact form
 */
const CONTACT_INQUIRY_TEMPLATE = (params: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  subjectLabel: string;
  message: string;
  userId?: string;
  createdAt: number;
  dashboardUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Contact Inquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: #1a1a1a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        New Contact Inquiry
      </h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        A new contact form submission has been received.
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top; width: 120px;"><strong>Name:</strong></td>
            <td style="padding: 10px 0; color: #1f2937;">${escapeHtml(params.name)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Email:</strong></td>
            <td style="padding: 10px 0; color: #1f2937;">
              <a href="mailto:${escapeHtml(params.email)}" style="color: #2563eb;">${escapeHtml(params.email)}</a>
            </td>
          </tr>
          ${params.phone ? `
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Phone:</strong></td>
            <td style="padding: 10px 0; color: #1f2937;">
              <a href="tel:${escapeHtml(params.phone)}" style="color: #2563eb;">${escapeHtml(params.phone)}</a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Subject:</strong></td>
            <td style="padding: 10px 0;">
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                ${escapeHtml(params.subjectLabel)}
              </span>
            </td>
          </tr>
          ${params.userId ? `
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>User Status:</strong></td>
            <td style="padding: 10px 0;">
              <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                Registered User
              </span>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>User Status:</strong></td>
            <td style="padding: 10px 0;">
              <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                Guest
              </span>
            </td>
          </tr>
          `}
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Submitted:</strong></td>
            <td style="padding: 10px 0; color: #1f2937;">${new Date(params.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">Message:</h3>
        <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px;">
          <p style="margin: 0; color: #1f2937; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(params.message)}</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${params.dashboardUrl}" style="background: #1f2937; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View in Admin Dashboard
        </a>
      </div>

      <div style="margin-top: 24px; text-align: center;">
        <a href="mailto:${escapeHtml(params.email)}?subject=Re: ${escapeHtml(params.subjectLabel)}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
          Reply to ${escapeHtml(params.name)}
        </a>
      </div>

      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
        This is an automated notification from your Nishani Woolera store.
      </p>
    </div>
  </div>
</body>
</html>
`;

// Subject label mapping
const CONTACT_SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  order_inquiry: "Order Inquiry",
  wholesale: "Wholesale Inquiry",
  feedback: "Feedback",
  other: "Other",
};

// Action: Send contact inquiry notification email to admin
export const sendContactInquiryEmail = internalAction({
  args: {
    submissionId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    userId: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();
    const emailConfig = await ctx.runQuery(internal.settings.getEmailConfig);

    // Use support email as admin notification target
    const adminEmail = emailConfig.support || 'support@nishaniwoolera.com';
    const baseUrl = process.env.SITE_URL || 'https://nishaniwoolera.com';
    const dashboardUrl = `${baseUrl}/admin/contact`;

    const subjectLabel = CONTACT_SUBJECT_LABELS[args.subject] || args.subject;

    const html = CONTACT_INQUIRY_TEMPLATE({
      name: args.name,
      email: args.email,
      phone: args.phone,
      subject: args.subject,
      subjectLabel,
      message: args.message,
      userId: args.userId,
      createdAt: args.createdAt,
      dashboardUrl,
    });

    const emailSubject = `[Contact] ${subjectLabel} from ${args.name}`;

    try {
      await resend.emails.send({
        from: `Nishani Woolera Contact <${emailConfig.support}>`,
        to: adminEmail,
        replyTo: args.email,
        subject: emailSubject,
        html,
      });

      logger.info('Contact inquiry email sent', {
        submissionId: args.submissionId,
        from: args.email,
        subject: args.subject
      });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send contact inquiry email', error, {
        submissionId: args.submissionId,
        from: args.email
      });
      return { success: false, error: String(error) };
    }
  },
});
