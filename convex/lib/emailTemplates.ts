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
 * Updated to "Minimalist Premium" design system
 */
export const EMAIL_STYLES = {
  body: `
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f9f9f9;
    color: #333333;
    -webkit-font-smoothing: antialiased;
  `,
  container: `
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 0;
    border: 1px solid #e0e0e0;
    overflow: hidden;
  `,
  header: `
    background: #3d4f59;
    color: #ffffff;
    padding: 40px 30px;
    text-align: center;
  `,
  headerTitle: `
    margin: 0;
    font-size: 24px;
    font-weight: 300;
    letter-spacing: 2px;
    text-transform: uppercase;
  `,
  headerSubtitle: `
    margin: 12px 0 0 0;
    color: #a8b2b8;
    font-size: 14px;
    letter-spacing: 1px;
  `,
  content: `
    padding: 40px 30px;
    line-height: 1.6;
    font-size: 15px;
  `,
  footer: `
    background: #fafafa;
    color: #666666;
    padding: 30px;
    text-align: center;
    font-size: 12px;
    border-top: 1px solid #e0e0e0;
  `,
  button: `
    display: inline-block;
    background: #3d4f59;
    color: #ffffff;
    padding: 14px 28px;
    text-decoration: none;
    border-radius: 0;
    font-weight: 500;
    font-size: 14px;
    letter-spacing: 1px;
    text-transform: uppercase;
  `,
  // New styles for tables (used in receipts/product lists)
  table: `
    width: 100%;
    border-collapse: collapse;
    margin: 30px 0;
  `,
  th: `
    padding: 12px 0;
    text-align: left;
    border-bottom: 2px solid #3d4f59;
    color: #3d4f59;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  `,
  td: `
    padding: 20px 0;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: top;
  `
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
  logoUrl?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const logoUrl = params.logoUrl || "https://nidhiclothing.com/Logo.png";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
</head>
<body style="${EMAIL_STYLES.body}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 20px;">
    <tr>
      <td align="center">
        <div class="container" style="${EMAIL_STYLES.container}">

          <!-- Header with Logo -->
          <div class="header" style="${EMAIL_STYLES.header}">
            <img src="${logoUrl}" alt="${BRAND.name}" style="max-width: 180px; height: auto; margin-bottom: 15px;" />
            ${params.showTagline !== false ? `<p style="${EMAIL_STYLES.headerSubtitle}">${BRAND.tagline}</p>` : ''}
          </div>

          <!-- Content -->
          <div class="content" style="${EMAIL_STYLES.content}">
            ${params.content}
          </div>

          <!-- Footer -->
          <div class="footer" style="${EMAIL_STYLES.footer}">
            <p style="margin: 0 0 10px 0;">© ${currentYear} ${BRAND.name}. All rights reserved.</p>
            <p style="margin: 0;">Need help? Contact us at <a href="mailto:${BRAND.supportEmail}" style="color: #3d4f59; text-decoration: none;">${BRAND.supportEmail}</a></p>
          </div>

        </div>
      </td>
    </tr>
  </table>
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
  align?: 'left' | 'center' | 'right';
}): string {
  const buttonStyle = params.style || EMAIL_STYLES.button;
  const alignment = params.align || 'left';

  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="${alignment}" style="padding: 20px 0;">
          <a href="${params.url}" style="${buttonStyle}">${params.text}</a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Helper: Create an info box
 */
export function createInfoBox(params: {
  content: string;
  backgroundColor?: string;
  borderColor?: string;
}): string {
  const bgColor = params.backgroundColor || '#f5f5f5';
  const borderColor = params.borderColor || '#e0e0e0';

  return `
    <div style="background: ${bgColor}; padding: 20px; border: 1px solid ${borderColor}; margin: 25px 0;">
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
    <div style="margin-bottom: 30px;">
      <h3 style="color: #3d4f59; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 20px; font-weight: 500; text-transform: uppercase; font-size: 16px; letter-spacing: 1px;">
        ${params.title}
      </h3>
      ${params.content}
    </div>
  `;
}

/**
 * Helper: Create a product row for order receipts
 */
export function createProductRow(params: {
  productName: string;
  variantDetails?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}): string {
  const imageHtml = params.imageUrl
    ? `<img src="${params.imageUrl}" alt="${params.productName}" style="width: 60px; height: auto; display: block; background: #f0f0f0;" />`
    : `<div style="width: 60px; height: 80px; background: #f0f0f0;"></div>`;

  const variantHtml = params.variantDetails
    ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${params.variantDetails}</p>`
    : '';

  return `
    <tr>
      <td style="${EMAIL_STYLES.td} width: 75px; padding-right: 15px;">
        ${imageHtml}
      </td>
      <td style="${EMAIL_STYLES.td}">
        <p style="margin: 0; font-weight: 500; color: #3d4f59;">${params.productName}</p>
        ${variantHtml}
      </td>
      <td style="${EMAIL_STYLES.td} text-align: center; color: #666;">
        Qty: ${params.quantity}
      </td>
      <td style="${EMAIL_STYLES.td} text-align: right; font-weight: 500;">
        ${formatCurrency(params.price * params.quantity)}
      </td>
    </tr>
  `;
}
