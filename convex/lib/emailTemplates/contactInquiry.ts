/**
 * Contact Inquiry Email Template (Admin Notification)
 */
import { escapeHtml, baseEmailLayout, createButton } from "../emailTemplates";

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
      <td style="padding: 10px 0; color: #666; vertical-align: top; border-bottom: 1px solid #e0e0e0;"><strong>Phone:</strong></td>
      <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #e0e0e0;">
        <a href="tel:${escapeHtml(params.phone)}" style="color: #3d4f59;">${escapeHtml(params.phone)}</a>
      </td>
    </tr>
    `
    : "";

  const userStatusBadge = params.userId
    ? `
    <span style="background: #e5ffe5; border: 1px solid #065f46; color: #065f46; padding: 4px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
      Registered User
    </span>
    `
    : `
    <span style="background: #fff8e1; border: 1px solid #b07d00; color: #b07d00; padding: 4px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
      Guest
    </span>
    `;

  const content = `
    <h2 style="color: #3d4f59; font-weight: 300; margin-top: 0;">New Contact Inquiry</h2>
    <p>A new contact form submission has been received.</p>

    <div style="background: #ffffff; border: 1px solid #e0e0e0; padding: 25px; margin-bottom: 30px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top; width: 120px; border-bottom: 1px solid #e0e0e0;"><strong>Name:</strong></td>
          <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #e0e0e0;">${escapeHtml(params.name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top; border-bottom: 1px solid #e0e0e0;"><strong>Email:</strong></td>
          <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #e0e0e0;">
            <a href="mailto:${escapeHtml(params.email)}" style="color: #3d4f59;">${escapeHtml(params.email)}</a>
          </td>
        </tr>
        ${phoneRow}
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top; border-bottom: 1px solid #e0e0e0;"><strong>Subject:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span style="background: #f0f4f8; border: 1px solid #3d4f59; color: #3d4f59; padding: 4px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
              ${escapeHtml(params.subjectLabel)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top; border-bottom: 1px solid #e0e0e0;"><strong>User Status:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            ${userStatusBadge}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; vertical-align: top;"><strong>Submitted:</strong></td>
          <td style="padding: 10px 0; color: #333;">${new Date(params.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
        </tr>
      </table>
    </div>

    <div style="margin-bottom: 30px;">
      <h3 style="color: #3d4f59; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Message:</h3>
      <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-left: 4px solid #3d4f59; padding: 20px;">
        <p style="margin: 0; color: #333; white-space: pre-wrap; line-height: 1.6; font-style: italic;">${escapeHtml(params.message)}</p>
      </div>
    </div>

    ${createButton({
      url: params.dashboardUrl,
      text: "View in Admin Dashboard",
      align: "center"
    })}

    <div style="margin-top: 25px; text-align: center;">
      <a href="mailto:${escapeHtml(params.email)}?subject=Re: ${escapeHtml(params.subjectLabel)}" style="color: #3d4f59; text-decoration: underline; font-size: 14px;">
        Reply to ${escapeHtml(params.name)}
      </a>
    </div>

    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      This is an automated notification from your Nidhi Clothing Co. store.
    </p>
  `;

  return baseEmailLayout({
    title: "New Contact Inquiry",
    content,
    showTagline: false,
  });
}
