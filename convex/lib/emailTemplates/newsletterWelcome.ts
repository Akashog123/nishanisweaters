/**
 * Newsletter Welcome Email Template
 */
import { baseEmailLayout, createButton } from "../emailTemplates";

export function generateNewsletterWelcomeTemplate(): string {
  const content = `
    <h2 style="color: #3d4f59; font-weight: 300; margin-top: 0; text-align: center;">Welcome to our Newsletter!</h2>
    <p style="text-align: center; line-height: 1.6;">Thank you for subscribing. You'll be the first to know about new arrivals, exclusive offers, and winter wear tips.</p>

    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #666; font-size: 14px; font-style: italic;">Stay warm, stay stylish!</p>
    </div>

    ${createButton({
      url: "https://nidhiclothing.com/shop",
      text: "Explore Latest Collection",
      align: "center"
    })}
  `;

  return baseEmailLayout({
    title: "Welcome to Nidhi Clothing Co.",
    content,
    showTagline: true,
  });
}
