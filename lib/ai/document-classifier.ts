import { getOpenAIClient } from './client';
import {
  GenericDocumentClassificationSchema,
  type GenericDocumentClassification,
} from '@/lib/validation/ai-schemas';

const SYSTEM_PROMPT = `You are a real estate document classifier. Given the text of a document, classify it into one of the following types:

- purchase_agreement: A contract between buyer and seller for the sale of real property
- disclosure: Seller disclosures about the condition of the property
- addendum: An amendment or addition to an existing contract
- inspection_report: A professional inspection of the property's condition
- appraisal: A professional valuation of the property
- title_commitment: A commitment to issue title insurance
- loan_estimate: A lender's estimate of loan terms and closing costs
- closing_disclosure: Final accounting of all charges and credits for a transaction
- other: Any document that does not fit the above categories

Respond with a JSON object containing:
- document_type: one of the types listed above
- confidence: a number between 0 and 1 indicating your confidence
- reasoning: a brief explanation of why you chose this classification`;

export async function classifyDocument(
  text: string,
): Promise<GenericDocumentClassification> {
  const client = getOpenAIClient();

  if (!client) {
    return getMockClassification();
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Classify the following document text:\n\n${text.substring(0, 8000)}`,
      },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI for document classification');
  }

  const parsed = JSON.parse(content);
  return GenericDocumentClassificationSchema.parse(parsed);
}

function getMockClassification(): GenericDocumentClassification {
  return {
    document_type: 'purchase_agreement',
    confidence: 0.85,
    reasoning:
      'Mock classification — OPENAI_API_KEY not configured. Defaulting to purchase_agreement.',
  };
}
