import { getOpenAIClient } from './client';
import {
  ChecklistGenerationSchema,
  type ChecklistGeneration,
} from '@/lib/validation/ai-schemas';

const SYSTEM_PROMPT = `You are a real estate transaction coordinator. Based on the extracted document data and the transaction type, generate a checklist of items that need to be completed for this transaction.

Each item should include:
- title: a concise title for the checklist item
- description: a detailed description of what needs to be done
- due_date: an ISO 8601 date string if a specific deadline can be inferred from the data, or null
- priority: "low", "medium", "high", or "critical"
- requires_review: boolean, true if this item needs broker/agent review

Consider standard real estate transaction milestones and any deadlines found in the extracted data. Return a JSON object with an "items" array.`;

export async function generateChecklist(
  extractionData: Record<string, unknown>,
  transactionType: string,
): Promise<ChecklistGeneration> {
  const client = getOpenAIClient();

  if (!client) {
    return getMockChecklist();
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Transaction type: ${transactionType}\n\nExtracted data:\n${JSON.stringify(extractionData, null, 2)}`,
      },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI for checklist generation');
  }

  const parsed = JSON.parse(content);
  return ChecklistGenerationSchema.parse(parsed);
}

function getMockChecklist(): ChecklistGeneration {
  return {
    items: [
      {
        title: 'Deposit earnest money',
        description:
          'Deposit the agreed-upon earnest money into the escrow account within the contractual deadline.',
        due_date: null,
        priority: 'critical',
        requires_review: false,
      },
      {
        title: 'Schedule inspection',
        description:
          'Schedule a professional home inspection with a licensed inspector before the inspection deadline.',
        due_date: null,
        priority: 'high',
        requires_review: false,
      },
      {
        title: 'Review disclosures',
        description:
          "Review all seller disclosures and property condition reports. Flag any concerns for the buyer's attention.",
        due_date: null,
        priority: 'high',
        requires_review: true,
      },
      {
        title: 'Secure financing',
        description:
          'Confirm loan approval and ensure all financing contingencies are met before the deadline.',
        due_date: null,
        priority: 'critical',
        requires_review: false,
      },
      {
        title: 'Appraisal completed',
        description:
          'Ensure the lender-ordered appraisal is completed and the property value meets or exceeds the purchase price.',
        due_date: null,
        priority: 'high',
        requires_review: true,
      },
      {
        title: 'Final walkthrough',
        description:
          'Schedule and complete a final walkthrough of the property within 24-48 hours of closing.',
        due_date: null,
        priority: 'medium',
        requires_review: false,
      },
      {
        title: 'Confirm title and escrow',
        description:
          'Verify that the title commitment is clear, title insurance is in place, and escrow instructions are correct.',
        due_date: null,
        priority: 'high',
        requires_review: true,
      },
      {
        title: 'Closing preparation',
        description:
          'Prepare all closing documents, confirm closing date and location, and ensure all parties are informed.',
        due_date: null,
        priority: 'medium',
        requires_review: true,
      },
    ],
  };
}
