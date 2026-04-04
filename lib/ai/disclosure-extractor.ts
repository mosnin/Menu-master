import { getOpenAIClient } from './client';
import {
  DisclosureExtractionSchema,
  type DisclosureExtraction,
} from '@/lib/validation/ai-schemas';

const SYSTEM_PROMPT = `You are a real estate document parser. Extract the following structured fields from this property disclosure document. If a field is not found, return null.

Respond with a JSON object containing these fields:
- disclosure_type: string describing the type of disclosure (e.g., "Seller's Property Disclosure", "Lead-Based Paint Disclosure") or null
- property_address: string or null
- seller_name: string or null
- known_issues: array of objects, each with:
  - category: string (e.g., "Plumbing", "Roof", "Foundation", "Electrical", "HVAC", "Water Damage")
  - description: string describing the issue
  - severity: "low", "medium", or "high"
- missing_sections: array of strings listing any sections that appear incomplete or missing
- missing_signatures: array of strings describing any missing signatures
- confidence: number between 0 and 1 indicating overall extraction confidence`;

export async function extractDisclosure(
  text: string,
): Promise<DisclosureExtraction> {
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
        content: `Extract structured data from this disclosure document:\n\n${text.substring(0, 12000)}`,
      },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI for disclosure extraction');
  }

  const parsed = JSON.parse(content);
  return DisclosureExtractionSchema.parse(parsed);
}

function getMockExtraction(): DisclosureExtraction {
  return {
    disclosure_type: "Seller's Property Disclosure Statement",
    property_address: '123 Main St, Austin, TX 78701',
    seller_name: 'John Doe',
    known_issues: [
      {
        category: 'Plumbing',
        description: 'Minor leak under kitchen sink, repaired in 2024',
        severity: 'low',
      },
      {
        category: 'Roof',
        description: 'Roof replaced in 2020, 25-year warranty transferable',
        severity: 'low',
      },
      {
        category: 'Foundation',
        description: 'Hairline crack in garage foundation, monitored annually',
        severity: 'medium',
      },
    ],
    missing_sections: ['Environmental hazards section'],
    missing_signatures: ['Buyer acknowledgment signature'],
    confidence: 0.88,
  };
}
