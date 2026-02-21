/**
 * Welcome Email Template (New User Registration)
 */
import { escapeHtml, baseEmailLayout, createInfoBox, createButton } from "../emailTemplates";

export interface WelcomeEmailData {
  customerName: string;
}

export function generateWelcomeEmailTemplate(data: WelcomeEmailData): string {
  const content = `
    <h2 style="color: #3d4f59; margin-top: 0; font-weight: 300;">Welcome, ${escapeHtml(data.customerName)}!</h2>
    <p>Thank you for creating an account with Nidhi Clothing Co. We're excited to have you join our community of style-conscious winter wear enthusiasts.</p>

    ${createInfoBox({
      content: `
        <h3 style="margin-top: 0; color: #3d4f59; font-weight: 500; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">What you can do now:</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          <li style="margin-bottom: 8px;">Browse our exclusive collection of premium winter wear</li>
          <li style="margin-bottom: 8px;">Save your favorite items to your wishlist</li>
          <li style="margin-bottom: 8px;">Track your orders and manage your account</li>
          <li style="margin-bottom: 0;">Apply for wholesale pricing (for businesses)</li>
        </ul>
      `
    })}

    ${createButton({
      url: "https://nidhiclothing.com/shop",
      text: "Start Shopping",
      align: "center"
    })}
  `;

  return baseEmailLayout({
    title: "Welcome to Nidhi Clothing Co.",
    content,
    showTagline: true,
  });
}
