/**
 * Email Service Wrapper
 * Centralizes email configuration and sending logic
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- GenericActionCtx requires any for DataModel flexibility */
import { Resend } from "resend";
import { ConvexError } from "convex/values";
import { GenericActionCtx } from "convex/server";
import { internal } from "../_generated/api";
import { logger } from "./logger";

export interface EmailConfig {
  fromOrders: string;
  fromShipping: string;
  fromWholesale: string;
  fromCart: string;
  support: string;
}

/**
 * Initialize Resend instance with API key validation
 */
function getResendInstance(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new ConvexError({
      code: "CONFIGURATION_ERROR",
      message: "Resend API key not configured",
    });
  }

  return new Resend(apiKey);
}

/**
 * EmailService class to handle all email operations
 * Caches email configuration to reduce database queries
 */
export class EmailService {
  private resend: Resend;
  private config: EmailConfig | null = null;

  constructor() {
    this.resend = getResendInstance();
  }

  /**
   * Get email configuration (cached)
   */
  async getConfig(ctx: GenericActionCtx<any>): Promise<EmailConfig> {
    if (!this.config) {
      this.config = await ctx.runQuery(internal.settings.getEmailConfig);
    }
    return this.config;
  }

  /**
   * Send an email with error handling and logging
   */
  async send(params: {
    from: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    logContext?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
      });

      if (params.logContext) {
        logger.info(`Email sent: ${params.subject}`, params.logContext);
      }

      return { success: true };
    } catch (error) {
      logger.error(`Failed to send email: ${params.subject}`, error, {
        to: params.to,
        ...params.logContext,
      });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderEmail(
    ctx: GenericActionCtx<any>,
    params: {
      to: string;
      subject: string;
      html: string;
      orderNumber: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(ctx);
    return this.send({
      from: `Nishani Woolera <${config.fromOrders}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      logContext: { orderNumber: params.orderNumber },
    });
  }

  /**
   * Send shipping update email
   */
  async sendShippingEmail(
    ctx: GenericActionCtx<any>,
    params: {
      to: string;
      subject: string;
      html: string;
      orderNumber: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(ctx);
    return this.send({
      from: `Nishani Woolera <${config.fromShipping}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      logContext: { orderNumber: params.orderNumber },
    });
  }

  /**
   * Send wholesale-related email
   */
  async sendWholesaleEmail(
    ctx: GenericActionCtx<any>,
    params: {
      to: string;
      subject: string;
      html: string;
      status?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(ctx);
    return this.send({
      from: `Nishani Woolera <${config.fromWholesale}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      logContext: params.status ? { status: params.status } : undefined,
    });
  }

  /**
   * Send cart-related email
   */
  async sendCartEmail(
    ctx: GenericActionCtx<any>,
    params: {
      to: string;
      subject: string;
      html: string;
      reminderNumber?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(ctx);
    return this.send({
      from: `Nishani Woolera <${config.fromCart}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      logContext: params.reminderNumber ? { reminderNumber: params.reminderNumber } : undefined,
    });
  }

  /**
   * Send support/general email
   */
  async sendSupportEmail(
    ctx: GenericActionCtx<any>,
    params: {
      to: string;
      subject: string;
      html: string;
      replyTo?: string;
      logContext?: Record<string, any>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(ctx);
    return this.send({
      from: `Nishani Woolera <${config.support}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      logContext: params.logContext,
    });
  }

  /**
   * Send admin alert email
   */
  async sendAdminAlert(
    ctx: GenericActionCtx<any>,
    params: {
      subject: string;
      html: string;
      logContext?: Record<string, any>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(ctx);
    const adminEmail = config.support || "support@nishaniwoolera.com";

    return this.send({
      from: `Nishani Woolera Alerts <${config.fromOrders}>`,
      to: adminEmail,
      subject: params.subject,
      html: params.html,
      logContext: params.logContext,
    });
  }
}
