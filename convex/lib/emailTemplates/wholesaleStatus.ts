/**
 * Wholesale Application Status Email Template
 */
import { escapeHtml } from "../emailTemplates";

export interface WholesaleStatusData {
  customerName: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
}

export function generateWholesaleStatusTemplate(data: WholesaleStatusData): string {
  const currentYear = new Date().getFullYear();

  const statusContent =
    data.status === "approved"
      ? `
      <div style="text-align: center;">
        <span style="display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; background: #d4edda; color: #155724;">
          Application Approved
        </span>
      </div>
      <p>Congratulations! Your wholesale application has been approved.</p>

      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
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
    `
      : `
      <div style="text-align: center;">
        <span style="display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; background: #f8d7da; color: #721c24;">
          Application Not Approved
        </span>
      </div>
      <p>We regret to inform you that your wholesale application has not been approved at this time.</p>

      ${
        data.rejectionReason
          ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <strong>Reason:</strong><br>
          ${escapeHtml(data.rejectionReason)}
        </div>
      `
          : ""
      }

      <p>If you believe this was in error or have additional documentation to provide, please contact our wholesale team.</p>
    `;

  return `
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
    .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nidhi Sweaters</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.8;">Wholesale Program</p>
    </div>
    <div class="content">
      <h2>Wholesale Application Update</h2>
      <p>Hi ${escapeHtml(data.customerName)},</p>

      ${statusContent}
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${currentYear} Nidhi Sweaters. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">Contact: wholesale@nidhisweaters.com</p>
    </div>
  </div>
</body>
</html>
`;
}
