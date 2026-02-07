/**
 * Email Actions - Refactored
 *
 * This file has been refactored from a 1,205-line "god class" into a clean,
 * modular system. Email templates are now in separate files under
 * convex/lib/emailTemplates/, and email sending logic is centralized in
 * convex/lib/emailService.ts.
 *
 * All public APIs remain unchanged for backward compatibility.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { EmailService } from "./lib/emailService";

// Import email template generators
import { generateOrderConfirmationTemplate } from "./lib/emailTemplates/orderConfirmation";
import { generateShippingUpdateTemplate } from "./lib/emailTemplates/shippingUpdate";
import { generateWholesaleStatusTemplate } from "./lib/emailTemplates/wholesaleStatus";
import { generateNewsletterWelcomeTemplate } from "./lib/emailTemplates/newsletterWelcome";
import { generateWelcomeEmailTemplate } from "./lib/emailTemplates/welcomeEmail";
import {
  generateAbandonedCartTemplate1,
  generateAbandonedCartTemplate2,
  generateAbandonedCartTemplate3,
} from "./lib/emailTemplates/abandonedCart";
import {
  generateDisputeAlertTemplate,
  generateDisputeResolutionTemplate,
} from "./lib/emailTemplates/disputeAlert";
import { generateContactInquiryTemplate } from "./lib/emailTemplates/contactInquiry";

// Subject label mapping for contact inquiries
const CONTACT_SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  order_inquiry: "Order Inquiry",
  wholesale: "Wholesale Inquiry",
  feedback: "Feedback",
  other: "Other",
};

// ============================================================================
// ORDER EMAILS
// ============================================================================

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = internalAction({
  args: {
    to: v.string(),
    orderNumber: v.string(),
    customerName: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        size: v.string(),
        color: v.string(),
      })
    ),
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
    const emailService = new EmailService();

    const html = generateOrderConfirmationTemplate({
      orderNumber: args.orderNumber,
      customerName: args.customerName,
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      shippingCost: args.shippingCost,
      total: args.total,
      shippingAddress: args.shippingAddress,
    });

    return emailService.sendOrderEmail(ctx, {
      to: args.to,
      subject: `Order Confirmation - ${args.orderNumber}`,
      html,
      orderNumber: args.orderNumber,
    });
  },
});

/**
 * Send shipping update email
 */
export const sendShippingUpdateEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    orderNumber: v.string(),
    trackingNumber: v.string(),
    carrier: v.string(),
  },
  handler: async (ctx, args) => {
    const emailService = new EmailService();

    const html = generateShippingUpdateTemplate({
      customerName: args.customerName,
      orderNumber: args.orderNumber,
      trackingNumber: args.trackingNumber,
      carrier: args.carrier,
    });

    return emailService.sendShippingEmail(ctx, {
      to: args.to,
      subject: `Your Order ${args.orderNumber} Has Shipped!`,
      html,
      orderNumber: args.orderNumber,
    });
  },
});

// ============================================================================
// WHOLESALE EMAILS
// ============================================================================

/**
 * Send wholesale application status email
 */
export const sendWholesaleStatusEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailService = new EmailService();

    const html = generateWholesaleStatusTemplate({
      customerName: args.customerName,
      status: args.status,
      rejectionReason: args.rejectionReason,
    });

    const subject =
      args.status === "approved"
        ? "Welcome to the Nidhi Sweaters Wholesale Program!"
        : "Wholesale Application Update";

    return emailService.sendWholesaleEmail(ctx, {
      to: args.to,
      subject,
      html,
      status: args.status,
    });
  },
});

// ============================================================================
// NEWSLETTER & WELCOME EMAILS
// ============================================================================

/**
 * Send newsletter welcome email
 */
export const sendNewsletterWelcomeEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const emailService = new EmailService();
    const html = generateNewsletterWelcomeTemplate();

    return emailService.sendSupportEmail(ctx, {
      to: args.to,
      subject: "Welcome to Nidhi Sweaters!",
      html,
    });
  },
});

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
  },
  handler: async (ctx, args) => {
    const emailService = new EmailService();

    const html = generateWelcomeEmailTemplate({
      customerName: args.customerName,
    });

    return emailService.sendSupportEmail(ctx, {
      to: args.to,
      subject: "Welcome to Nidhi Sweaters!",
      html,
    });
  },
});

// ============================================================================
// ABANDONED CART EMAILS
// ============================================================================

/**
 * Send abandoned cart email (with 3 reminder variations)
 */
export const sendAbandonedCartEmail = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    reminderNumber: v.number(), // 1, 2, or 3
    items: v.array(
      v.object({
        name: v.string(),
        image: v.string(),
        price: v.number(),
        size: v.string(),
        color: v.string(),
      })
    ),
    cartTotal: v.number(),
    cartUrl: v.string(),
    discountCode: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const emailService = new EmailService();

    let html: string;
    let subject: string;

    const templateData = {
      customerName: args.customerName,
      items: args.items,
      cartTotal: args.cartTotal,
      cartUrl: args.cartUrl,
      discountCode: args.discountCode,
      discountPercent: args.discountPercent,
    };

    switch (args.reminderNumber) {
      case 1:
        html = generateAbandonedCartTemplate1(templateData);
        subject = "You left something behind...";
        break;
      case 2:
        html = generateAbandonedCartTemplate2(templateData);
        subject = "Still thinking about it?";
        break;
      case 3:
      default:
        html = generateAbandonedCartTemplate3(templateData);
        subject = args.discountCode
          ? `Last chance! Here's ${args.discountPercent || 10}% off your cart`
          : "Last chance to complete your order!";
        break;
    }

    return emailService.sendCartEmail(ctx, {
      to: args.to,
      subject,
      html,
      reminderNumber: args.reminderNumber,
    });
  },
});

// ============================================================================
// DISPUTE NOTIFICATION EMAILS (Admin Alerts)
// ============================================================================

/**
 * Send dispute alert email to admin
 */
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
    const emailService = new EmailService();

    const baseUrl = process.env.SITE_URL || "https://nidhisweaters.com";
    const dashboardUrl = `${baseUrl}/admin/orders`;

    const html = generateDisputeAlertTemplate({
      orderNumber: args.orderNumber,
      disputeStatus: args.disputeStatus,
      disputeReason: args.disputeReason,
      customerEmail: args.customerEmail,
      orderTotal: args.orderTotal,
      actionRequired: args.actionRequired,
      dashboardUrl,
    });

    const subject = args.actionRequired
      ? `URGENT: Dispute Action Required - Order #${args.orderNumber}`
      : `Payment Dispute Alert - Order #${args.orderNumber}`;

    return emailService.sendAdminAlert(ctx, {
      subject,
      html,
      logContext: {
        orderNumber: args.orderNumber,
        disputeStatus: args.disputeStatus,
      },
    });
  },
});

/**
 * Send dispute resolution email to admin
 */
export const sendDisputeResolutionEmail = internalAction({
  args: {
    orderNumber: v.string(),
    resolution: v.union(v.literal("won"), v.literal("lost"), v.literal("closed")),
    orderTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const emailService = new EmailService();

    const baseUrl = process.env.SITE_URL || "https://nidhisweaters.com";
    const dashboardUrl = `${baseUrl}/admin/orders`;

    const html = generateDisputeResolutionTemplate({
      orderNumber: args.orderNumber,
      resolution: args.resolution,
      orderTotal: args.orderTotal,
      dashboardUrl,
    });

    const subject =
      args.resolution === "won"
        ? `Dispute Won - Order #${args.orderNumber}`
        : args.resolution === "lost"
        ? `Dispute Lost - Order #${args.orderNumber}`
        : `Dispute Closed - Order #${args.orderNumber}`;

    return emailService.sendAdminAlert(ctx, {
      subject,
      html,
      logContext: {
        orderNumber: args.orderNumber,
        resolution: args.resolution,
      },
    });
  },
});

// ============================================================================
// CONTACT INQUIRY EMAILS (Admin Notification)
// ============================================================================

/**
 * Send contact inquiry notification email to admin
 */
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
    const emailService = new EmailService();

    const baseUrl = process.env.SITE_URL || "https://nidhisweaters.com";
    const dashboardUrl = `${baseUrl}/admin/contact`;

    const subjectLabel = CONTACT_SUBJECT_LABELS[args.subject] || args.subject;

    const html = generateContactInquiryTemplate({
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

    return emailService.sendSupportEmail(ctx, {
      to: (await emailService.getConfig(ctx)).support || "support@nidhisweaters.com",
      subject: emailSubject,
      html,
      replyTo: args.email,
      logContext: {
        submissionId: args.submissionId,
        from: args.email,
        subject: args.subject,
      },
    });
  },
});
