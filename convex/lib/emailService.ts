/**
 * Email Service
 *
 * Sends transactional emails via Brevo HTTP API
 * Uses native fetch() - no nodemailer needed!
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- GenericActionCtx requires any for DataModel flexibility */
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
 * Brevo API Configuration
 */
interface BrevoConfig {
  apiKey: string;
}

/**
 * Get and validate Brevo API configuration from environment
 */
function getBrevoConfig(): BrevoConfig {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new ConvexError({
      code: "CONFIGURATION_ERROR",
      message: "Brevo API key not configured. Set BREVO_API_KEY environment variable.",
    });
  }

  return { apiKey };
}

/**
 * Send email via Brevo HTTP API
 */
async function sendViaBrevo(
  config: BrevoConfig,
  params: {
    from: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: params.from.includes("<")
          ? params.from.match(/<(.+)>/)?.[1] || params.from
          : params.from,
      },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
      ...(params.replyTo && {
        replyTo: { email: params.replyTo },
      }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
  }
}

/**
 * EmailService class to handle all email operations
 */
export class EmailService {
  private config: EmailConfig | null = null;
  private brevoConfig: BrevoConfig | null = null;

  /**
   * Get Brevo configuration (cached)
   */
  private getBrevo(): BrevoConfig {
    if (!this.brevoConfig) {
      this.brevoConfig = getBrevoConfig();
    }
    return this.brevoConfig;
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
      await sendViaBrevo(this.getBrevo(), params);

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
      from: `Nidhi Clothing Co. <${config.fromOrders}>`,
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
      from: `Nidhi Clothing Co. <${config.fromShipping}>`,
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
      from: `Nidhi Clothing Co. <${config.fromWholesale}>`,
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
      from: `Nidhi Clothing Co. <${config.fromCart}>`,
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
      from: `Nidhi Clothing Co. <${config.support}>`,
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
    const adminEmail = config.support || "support@nidhiclothing.com";

    return this.send({
      from: `Nidhi Clothing Co. Alerts <${config.fromOrders}>`,
      to: adminEmail,
      subject: params.subject,
      html: params.html,
      logContext: params.logContext,
    });
  }
}
