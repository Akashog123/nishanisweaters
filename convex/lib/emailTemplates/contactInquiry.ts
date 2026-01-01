/**
 * Contact Inquiry Email Template (Admin Notification)
 */
import { escapeHtml } from "../emailTemplates";

export interface ContactInquiryData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  subjectLabel: string;
  message: string;
  userId?: string;
  createdAt: number;
  dashboardUrl: string;
}

export function generateContactInquiryTemplate(params: ContactInquiryData): string {
  const phoneRow = params.phone
    ? `
    <tr>
      <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Phone:</strong></td>
      <td style="padding: 10px 0; color: #1f2937;">
        <a href="tel:${escapeHtml(params.phone)}" style="color: #2563eb;">${escapeHtml(params.phone)}</a>
      </td>
    </tr>
    `
    : "";

  const userStatusBadge = params.userId
    ? `
    <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
      Registered User
    </span>
    `
    : `
    <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
      Guest
    </span>
    `;

  return `
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
          ${phoneRow}
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Subject:</strong></td>
            <td style="padding: 10px 0;">
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                ${escapeHtml(params.subjectLabel)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>User Status:</strong></td>
            <td style="padding: 10px 0;">
              ${userStatusBadge}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Submitted:</strong></td>
            <td style="padding: 10px 0; color: #1f2937;">${new Date(params.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
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
}
