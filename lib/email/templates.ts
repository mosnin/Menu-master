interface DeadlineReminderParams {
  recipientName: string;
  transactionTitle: string;
  deadlineTitle: string;
  deadlineDate: string;
  daysUntil: number;
}

interface ActionRequiredParams {
  recipientName: string;
  transactionTitle: string;
  actionDescription: string;
}

interface DocumentUploadedParams {
  recipientName: string;
  transactionTitle: string;
  documentName: string;
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #333333;
  line-height: 1.6;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #2563eb;
  color: #ffffff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
`;

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1e3a5f; padding: 24px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; ${baseStyles}">Deal Desk</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; ${baseStyles}">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; ${baseStyles}">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated message from Deal Desk. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function deadlineReminderTemplate(params: DeadlineReminderParams): string {
  const urgencyColor =
    params.daysUntil <= 3 ? '#dc2626' : params.daysUntil <= 7 ? '#d97706' : '#059669';
  const urgencyLabel =
    params.daysUntil <= 0
      ? 'OVERDUE'
      : params.daysUntil <= 3
        ? 'URGENT'
        : params.daysUntil <= 7
          ? 'UPCOMING'
          : 'REMINDER';

  const content = `
    <p style="margin: 0 0 16px;">Hi ${params.recipientName},</p>
    <div style="padding: 16px; background-color: #f0f9ff; border-left: 4px solid ${urgencyColor}; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; font-weight: 600; color: ${urgencyColor}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${urgencyLabel}</p>
      <p style="margin: 8px 0 0; font-size: 16px; font-weight: 600;">${params.deadlineTitle}</p>
      <p style="margin: 4px 0 0; color: #6b7280;">Due: ${params.deadlineDate} &mdash; ${params.daysUntil <= 0 ? 'Overdue' : `${params.daysUntil} day${params.daysUntil === 1 ? '' : 's'} remaining`}</p>
    </div>
    <p style="margin: 0 0 16px;">This is a reminder about an upcoming deadline for the transaction <strong>${params.transactionTitle}</strong>.</p>
    <p style="margin: 0 0 24px;">Please ensure all necessary actions are completed before the deadline. If you have any questions, reach out to your transaction coordinator.</p>
  `;

  return wrapInLayout(content);
}

export function actionRequiredTemplate(params: ActionRequiredParams): string {
  const content = `
    <p style="margin: 0 0 16px;">Hi ${params.recipientName},</p>
    <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #d97706; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; font-weight: 600; color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">ACTION REQUIRED</p>
      <p style="margin: 8px 0 0; font-size: 14px;">${params.actionDescription}</p>
    </div>
    <p style="margin: 0 0 16px;">Your attention is needed on the transaction <strong>${params.transactionTitle}</strong>.</p>
    <p style="margin: 0 0 24px;">Please review the details and take the necessary action at your earliest convenience.</p>
  `;

  return wrapInLayout(content);
}

export function documentUploadedTemplate(params: DocumentUploadedParams): string {
  const content = `
    <p style="margin: 0 0 16px;">Hi ${params.recipientName},</p>
    <div style="padding: 16px; background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; font-weight: 600; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">DOCUMENT UPLOADED</p>
      <p style="margin: 8px 0 0; font-size: 14px;">A new document has been uploaded: <strong>${params.documentName}</strong></p>
    </div>
    <p style="margin: 0 0 16px;">A new document has been uploaded to the transaction <strong>${params.transactionTitle}</strong>.</p>
    <p style="margin: 0 0 24px;">The document will be processed automatically. You will be notified if any action is required after processing is complete.</p>
  `;

  return wrapInLayout(content);
}
