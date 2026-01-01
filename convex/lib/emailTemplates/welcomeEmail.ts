/**
 * Welcome Email Template (New User Registration)
 */
import { escapeHtml } from "../emailTemplates";

export interface WelcomeEmailData {
  customerName: string;
}

export function generateWelcomeEmailTemplate(data: WelcomeEmailData): string {
  const currentYear = new Date().getFullYear();

  return `
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
      <p style="margin: 0;">© ${currentYear} Nishani Woolera. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">Questions? Contact us at support@nishaniwoolera.com</p>
    </div>
  </div>
</body>
</html>
`;
}
