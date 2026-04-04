import { getOpenAIClient } from './client';
import {
  OutboundEmailDraftSchema,
  type OutboundEmailDraft,
} from '@/lib/validation/ai-schemas';

const SYSTEM_PROMPT = `You are a professional real estate transaction coordinator drafting reminder emails. Write professional, concise, and friendly emails to parties involved in real estate transactions.

Respond with a JSON object containing:
- recipient_name: the name of the person receiving the email
- recipient_email: leave as empty string (will be filled by the system)
- subject: a clear email subject line
- body: the full email body in plain text (use line breaks for formatting)
- context: a brief internal note explaining why this email is being sent
- urgency: "low", "medium", or "high" based on the proximity of the deadline`;

interface DraftReminderParams {
  recipientName: string;
  transactionTitle: string;
  deadlineTitle: string;
  deadlineDate: string;
  contextNotes?: string;
}

export async function draftReminderEmail(
  params: DraftReminderParams,
): Promise<OutboundEmailDraft> {
  const client = getOpenAIClient();

  if (!client) {
    return getMockDraft(params);
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `Draft a reminder email with the following details:`,
          `- Recipient: ${params.recipientName}`,
          `- Transaction: ${params.transactionTitle}`,
          `- Deadline: ${params.deadlineTitle}`,
          `- Deadline date: ${params.deadlineDate}`,
          params.contextNotes ? `- Additional context: ${params.contextNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI for email draft');
  }

  const parsed = JSON.parse(content);
  return OutboundEmailDraftSchema.parse(parsed);
}

function getMockDraft(params: DraftReminderParams): OutboundEmailDraft {
  const deadlineDate = new Date(params.deadlineDate);
  const now = new Date();
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  let urgency: 'low' | 'medium' | 'high' = 'low';
  if (daysUntil <= 3) urgency = 'high';
  else if (daysUntil <= 7) urgency = 'medium';

  return {
    recipient_name: params.recipientName,
    recipient_email: '',
    subject: `Reminder: ${params.deadlineTitle} — ${params.transactionTitle}`,
    body: [
      `Dear ${params.recipientName},`,
      '',
      `This is a friendly reminder regarding the upcoming deadline for "${params.deadlineTitle}" on the transaction "${params.transactionTitle}".`,
      '',
      `The deadline is scheduled for ${params.deadlineDate}${daysUntil > 0 ? `, which is ${daysUntil} day${daysUntil === 1 ? '' : 's'} from now` : ''}.`,
      '',
      'Please ensure all necessary steps are completed before this date. If you have any questions or need assistance, please do not hesitate to reach out.',
      '',
      params.contextNotes ? `Note: ${params.contextNotes}\n` : '',
      'Best regards,',
      'Deal Desk Team',
    ]
      .filter((line) => line !== undefined)
      .join('\n'),
    context: `Automated reminder for ${params.deadlineTitle} deadline on ${params.deadlineDate}`,
    urgency,
  };
}
