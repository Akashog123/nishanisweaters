/**
 * Dispute Alert Email Templates (Admin Notifications)
 */
import { formatCurrency, baseEmailLayout, createButton } from "../emailTemplates";

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
      <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Reason:</td>
      <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #e0e0e0;">${params.disputeReason}</td>
    </tr>
    `
    : "";

  const actionRequiredSection = params.actionRequired
    ? `
    <div style="background: #ffffff; border: 1px solid #dc2626; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0;">
      <p style="margin: 0; color: #dc2626; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; font-size: 14px;">
        URGENT: Action Required
      </p>
      <p style="margin: 10px 0 0 0; color: #333;">
        You must submit evidence within the deadline to contest this dispute.
      </p>
    </div>
    `
    : "";

  const titleColor = params.actionRequired ? "#dc2626" : "#f59e0b";
  const titleText = params.actionRequired ? "URGENT: Action Required" : "Payment Dispute Alert";

  const content = `
    <h2 style="color: ${titleColor}; font-weight: 300; margin-top: 0; text-align: center;">${titleText}</h2>

    <p style="text-align: center;">
      A payment dispute has been ${params.disputeStatus === "created" ? "initiated" : "updated"} for order <strong style="color: #3d4f59;">#${params.orderNumber}</strong>.
    </p>

    <div style="background: #ffffff; border: 1px solid #e0e0e0; padding: 25px; margin: 30px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Order Number:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #3d4f59; border-bottom: 1px solid #e0e0e0;">#${params.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Dispute Status:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${params.actionRequired ? "#dc2626" : "#f59e0b"}; border-bottom: 1px solid #e0e0e0;">${params.disputeStatus.replace("_", " ").toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Order Total:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${formatCurrency(params.orderTotal / 100)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Customer:</td>
          <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #e0e0e0;">${params.customerEmail}</td>
        </tr>
        ${reasonRow}
      </table>
    </div>

    ${actionRequiredSection}

    ${createButton({
      url: params.dashboardUrl,
      text: "View in Dashboard",
      align: "center"
    })}

    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      This is an automated alert from your Nidhi Clothing Co. store.
    </p>
  `;

  return baseEmailLayout({
    title: titleText,
    content,
    showTagline: false,
  });
}

export interface DisputeResolutionData {
  orderNumber: string;
  resolution: "won" | "lost" | "closed";
  orderTotal: number;
  dashboardUrl: string;
}

export function generateDisputeResolutionTemplate(params: DisputeResolutionData): string {
  const headerColor = params.resolution === "won" ? "#16a34a" : params.resolution === "lost" ? "#dc2626" : "#6b7280";
  const headerText = params.resolution === "won" ? "Dispute Won!" : params.resolution === "lost" ? "Dispute Lost" : "Dispute Closed";
  const borderColor = params.resolution === "won" ? "#bbf7d0" : params.resolution === "lost" ? "#fecaca" : "#e5e7eb";
  const resultText = params.resolution === "won"
    ? `You retained ${formatCurrency(params.orderTotal / 100)}`
    : params.resolution === "lost"
    ? `${formatCurrency(params.orderTotal / 100)} was returned to customer`
    : "Dispute has been closed";

  const content = `
    <h2 style="color: ${headerColor}; font-weight: 300; margin-top: 0; text-align: center;">${headerText}</h2>

    <p style="text-align: center;">
      The payment dispute for order <strong style="color: #3d4f59;">#${params.orderNumber}</strong> has been resolved.
    </p>

    <div style="background: #ffffff; border: 1px solid ${borderColor}; border-left: 4px solid ${headerColor}; padding: 30px; margin: 30px 0; text-align: center;">
      <p style="font-size: 18px; font-weight: 500; color: ${headerColor}; margin: 0;">
        ${resultText}
      </p>
    </div>

    ${createButton({
      url: params.dashboardUrl,
      text: "View Order Details",
      align: "center"
    })}
  `;

  return baseEmailLayout({
    title: "Dispute Resolution",
    content,
    showTagline: false,
  });
}
