import { getResendClient } from './client';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string; success: boolean }> {
  const client = getResendClient();
  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? 'Deal Desk <noreply@dealdesk.dev>';

  if (!client) {
    console.log('[EMAIL MOCK] Sending email:', { to: params.to, subject: params.subject, from });
    console.log('[EMAIL MOCK] Body:', params.html.substring(0, 200));
    return { id: `mock_${Date.now()}`, success: true };
  }

  const { data, error } = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return { id: data?.id ?? 'unknown', success: true };
}
