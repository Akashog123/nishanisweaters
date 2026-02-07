/**
 * Dispute Alert Email Templates (Admin Notifications)
 */
import { formatCurrency } from "../emailTemplates";

export interface DisputeAlertData {
  orderNumber: string;
  disputeStatus: string;
  disputeReason?: string;
  customerEmail: string;
  orderTotal: number;
  actionRequired: boolean;
  dashboardUrl: string;
}

export function generateDisputeAlertTemplate(params: DisputeAlertData): string {
  const reasonRow = params.disputeReason
    ? `
    <tr>
      <td style="padding: 8px 0; color: #666;">Reason:</td>
      <td style="padding: 8px 0; text-align: right;">${params.disputeReason}</td>
    </tr>
    `
    : "";

  const actionRequiredSection = params.actionRequired
    ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #dc2626; font-weight: bold;">
        You must submit evidence within the deadline to contest this dispute.
      </p>
    </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Dispute Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fff8e1; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: ${params.actionRequired ? "#dc2626" : "#f59e0b"}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ${params.actionRequired ? "URGENT: Action Required" : "Payment Dispute Alert"}
      </h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        A payment dispute has been ${params.disputeStatus === "created" ? "initiated" : "updated"} for order <strong>#${params.orderNumber}</strong>.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Order Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">#${params.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Dispute Status:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${params.actionRequired ? "#dc2626" : "#f59e0b"};">${params.disputeStatus.replace("_", " ").toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Order Total:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(params.orderTotal / 100)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Customer:</td>
            <td style="padding: 8px 0; text-align: right;">${params.customerEmail}</td>
          </tr>
          ${reasonRow}
        </table>
      </div>

      ${actionRequiredSection}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${params.dashboardUrl}" style="background: #1f2937; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View in Dashboard
        </a>
      </div>

      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
        This is an automated alert from your Nidhi Sweaters store.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

export interface DisputeResolutionData {
  orderNumber: string;
  resolution: "won" | "lost" | "closed";
  orderTotal: number;
  dashboardUrl: string;
}

export function generateDisputeResolutionTemplate(params: DisputeResolutionData): string {
  const headerColor =
    params.resolution === "won" ? "#16a34a" : params.resolution === "lost" ? "#dc2626" : "#6b7280";

  const headerText =
    params.resolution === "won"
      ? "Dispute Won!"
      : params.resolution === "lost"
      ? "Dispute Lost"
      : "Dispute Closed";

  const bgColor =
    params.resolution === "won" ? "#dcfce7" : params.resolution === "lost" ? "#fef2f2" : "#f3f4f6";

  const textColor =
    params.resolution === "won" ? "#16a34a" : params.resolution === "lost" ? "#dc2626" : "#6b7280";

  const resultText =
    params.resolution === "won"
      ? `You retained ${formatCurrency(params.orderTotal / 100)}`
      : params.resolution === "lost"
      ? `${formatCurrency(params.orderTotal / 100)} was returned to customer`
      : "Dispute has been closed";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Dispute Resolution</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: ${headerColor}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ${headerText}
      </h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        The payment dispute for order <strong>#${params.orderNumber}</strong> has been resolved.
      </p>

      <div style="background: ${bgColor}; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 20px; font-weight: bold; color: ${textColor}; margin: 0;">
          ${resultText}
        </p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${params.dashboardUrl}" style="background: #1f2937; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View Order Details
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;
}
