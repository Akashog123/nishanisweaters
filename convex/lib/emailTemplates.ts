/**
 * Base Email Template System
 * Provides reusable components and utilities for email generation
 */

/**
 * Escapes HTML special characters to prevent XSS attacks in email templates.
 * This must be applied to ALL user-provided data before interpolation.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Common CSS styles used across all email templates
 */
export const EMAIL_STYLES = {
  body: `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
  `,
  container: `
    max-width: 600px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `,
  header: `
    background: #1a1a1a;
    color: white;
    padding: 30px;
    text-align: center;
  `,
  headerTitle: `
    margin: 0;
    font-size: 24px;
  `,
  headerSubtitle: `
    margin: 10px 0 0 0;
    opacity: 0.8;
  `,
  content: `
    padding: 30px;
  `,
  footer: `
    background: #1a1a1a;
    color: #999;
    padding: 20px;
    text-align: center;
    font-size: 12px;
  `,
  button: `
    display: inline-block;
    background: #1a1a1a;
    color: white;
    padding: 15px 30px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
  `,
};

/**
 * Brand configuration
 */
export const BRAND = {
  name: "Nidhi Clothing Co.",
  tagline: "Premium Winter Wear",
  supportEmail: "support@nidhiclothing.com",
  wholesaleEmail: "support@nidhiclothing.com",
};

/**
 * Base email layout wrapper
 * Wraps content with consistent header and footer
 */
export function baseEmailLayout(params: {
  title: string;
  content: string;
  showTagline?: boolean;
}): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${params.title}</title>
  <style>
    body { ${EMAIL_STYLES.body} }
    .container { ${EMAIL_STYLES.container} }
    .header { ${EMAIL_STYLES.header} }
    .content { ${EMAIL_STYLES.content} }
    .footer { ${EMAIL_STYLES.footer} }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="${EMAIL_STYLES.headerTitle}">${BRAND.name}</h1>
      ${params.showTagline !== false ? `<p style="${EMAIL_STYLES.headerSubtitle}">${BRAND.tagline}</p>` : ''}
    </div>
    <div class="content">
      ${params.content}
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${currentYear} ${BRAND.name}. All rights reserved.</p>
      <p style="margin: 10px 0 0 0;">If you have any questions, contact us at ${BRAND.supportEmail}</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Helper: Format currency in Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Helper: Create a styled button link
 */
export function createButton(params: {
  url: string;
  text: string;
  style?: string;
}): string {
  const buttonStyle = params.style || EMAIL_STYLES.button;
  return `<a href="${params.url}" style="${buttonStyle}">${params.text}</a>`;
}

/**
 * Helper: Create an info box
 */
export function createInfoBox(params: {
  content: string;
  backgroundColor?: string;
  borderColor?: string;
}): string {
  const bgColor = params.backgroundColor || '#f0f0f0';
  const borderColor = params.borderColor || 'transparent';

  return `
    <div style="background: ${bgColor}; padding: 15px; border-radius: 6px; border: 1px solid ${borderColor};">
      ${params.content}
    </div>
  `;
}

/**
 * Helper: Create a section with heading
 */
export function createSection(params: {
  title: string;
  content: string;
}): string {
  return `
    <div style="margin-bottom: 25px;">
      <h3 style="color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
        ${params.title}
      </h3>
      ${params.content}
    </div>
  `;
}
