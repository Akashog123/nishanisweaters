/**
 * Newsletter Welcome Email Template
 */
import { baseEmailLayout } from "../emailTemplates";

export function generateNewsletterWelcomeTemplate(): string {
  const content = `
    <h2>Welcome to our Newsletter!</h2>
    <p>Thank you for subscribing. You'll be the first to know about new arrivals, exclusive offers, and winter wear tips.</p>
    <p style="color: #666; font-size: 14px;">Stay warm, stay stylish!</p>
  `;

  return baseEmailLayout({
    title: "Welcome to Nishani Woolera",
    content,
    showTagline: false,
  });
}
