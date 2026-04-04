import { getOpenAIClient } from './client';
import {
  PurchaseAgreementExtractionSchema,
  type PurchaseAgreementExtraction,
} from '@/lib/validation/ai-schemas';

const SYSTEM_PROMPT = `You are a real estate document parser. Extract the following structured fields from this purchase agreement text. If a field is not found, return null. For dates, use ISO 8601 format. For prices, return numbers without formatting.

Respond with a JSON object containing these fields:
- buyer_name: string or null
- seller_name: string or null
- property_address: string or null
- purchase_price: number or null
- earnest_money: number or null
- financing_contingency_date: ISO date string or null
- inspection_deadline: ISO date string or null
- closing_date: ISO date string or null
- broker_name: string or null
- missing_signatures: array of strings describing any missing signatures
- missing_addenda: array of strings describing any missing addenda or exhibits
- additional_terms: array of strings for any notable additional terms or conditions
- confidence: number between 0 and 1 indicating overall extraction confidence`;

export async function extractPurchaseAgreement(
  text: string,
): Promise<PurchaseAgreementExtraction> {
  const client = getOpenAIClient();

  if (!client) {
    return getMockExtraction();
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract structured data from this purchase agreement:\n\n${text.substring(0, 12000)}`,
      },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI for purchase agreement extraction');
  }

  const parsed = JSON.parse(content);
  return PurchaseAgreementExtractionSchema.parse(parsed);
}

function getMockExtraction(): PurchaseAgreementExtraction {
  return {
    buyer_name: 'Jane Smith',
    seller_name: 'John Doe',
    property_address: '123 Main St, Austin, TX 78701',
    purchase_price: 425000,
    earnest_money: 10000,
    financing_contingency_date: '2026-05-15',
    inspection_deadline: '2026-04-25',
    closing_date: '2026-06-01',
    broker_name: 'Acme Realty',
    missing_signatures: [],
    missing_addenda: ['Lead-based paint disclosure'],
    additional_terms: ['Seller to provide home warranty'],
    confidence: 0.92,
  };
}
