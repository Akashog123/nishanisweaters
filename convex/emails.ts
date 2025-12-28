import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { ConvexError } from "convex/values";

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
      <p style="text-align: center; color: #666;">Hi ${order.customerName}, your order has been confirmed.</p>

      <div class="order-number">
        <p style="margin: 0 0 5px 0; color: #666;">Order Number</p>
        <span>${order.orderNumber}</span>
      </div>

      <div class="section">
        <h3>Order Details</h3>
        ${order.items.map(item => `
          <div class="item">
            <div class="item-details">
              <div class="item-name">${item.name}</div>
              <div class="item-variant">${item.size} / ${item.color} x ${item.quantity}</div>
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
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
            ${order.shippingAddress.country}
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
      <p>Hi ${data.customerName}, great news! Your order <strong>${data.orderNumber}</strong> has been shipped.</p>

      <div class="tracking-box">
        <p style="margin: 0 0 10px 0; color: #666;">Tracking Number (${data.carrier})</p>
        <div class="tracking-number">${data.trackingNumber}</div>
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
  tier?: string;
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
      <p>Hi ${data.customerName},</p>

      ${data.status === "approved" ? `
        <div style="text-align: center;">
          <span class="status-badge status-approved">Application Approved</span>
        </div>
        <p>Congratulations! Your wholesale application has been approved.</p>

        <div class="tier-info">
          <h3 style="margin-top: 0;">Your Wholesale Tier: ${data.tier?.replace('tier', 'Tier ')}</h3>
          <p>You now have access to:</p>
          <ul>
            <li>Wholesale pricing on all products</li>
            <li>Bulk ordering capabilities</li>
            <li>Invoice payment options</li>
            <li>Dedicated wholesale dashboard</li>
          </ul>
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
            ${data.rejectionReason}
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
        from: "Nishani Woolera <orders@nishaniwoolera.com>",
        to: args.to,
        subject: `Order Confirmation - ${args.orderNumber}`,
        html,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send order confirmation email:", error);
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

    const html = SHIPPING_UPDATE_TEMPLATE({
      customerName: args.customerName,
      orderNumber: args.orderNumber,
      trackingNumber: args.trackingNumber,
      carrier: args.carrier,
    });

    try {
      await resend.emails.send({
        from: "Nishani Woolera <shipping@nishaniwoolera.com>",
        to: args.to,
        subject: `Your Order ${args.orderNumber} Has Shipped!`,
        html,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send shipping update email:", error);
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
    tier: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = getResendInstance();

    const html = WHOLESALE_APPLICATION_STATUS_TEMPLATE({
      customerName: args.customerName,
      status: args.status,
      tier: args.tier,
      rejectionReason: args.rejectionReason,
    });

    const subject = args.status === "approved"
      ? "Welcome to the Nishani Woolera Wholesale Program!"
      : "Wholesale Application Update";

    try {
      await resend.emails.send({
        from: "Nishani Woolera <wholesale@nishaniwoolera.com>",
        to: args.to,
        subject,
        html,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send wholesale status email:", error);
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
        from: "Nishani Woolera <newsletter@nishaniwoolera.com>",
        to: args.to,
        subject: "Welcome to Nishani Woolera!",
        html,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send newsletter welcome email:", error);
      return { success: false, error: String(error) };
    }
  },
});
