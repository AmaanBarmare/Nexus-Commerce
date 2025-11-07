import { z } from 'zod';
import { openai, GENERATION_MODEL } from './client';
import { TemplateManifestSchema, type TemplateManifest } from '../schemas/marketing';
import { createStructuredOutputConfig, validateJsonResponse } from './json';
import { getRAGContext } from './embeddings';

/**
 * Email generation with RAG context
 * Uses OpenAI to generate email templates based on user intent and brand knowledge
 */

export interface GenerateEmailOptions {
  intent: string;
  context?: {
    email_type?: string;
    event?: string;
    customer_segment?: string;
    product_info?: string;
  };
  userMessage?: string;
}

export interface GenerateEmailResult {
  subject: string;
  manifest: TemplateManifest;
}

/**
 * Generate email template using AI with RAG context
 */
export async function generateEmail(
  options: GenerateEmailOptions
): Promise<GenerateEmailResult> {
  const { intent, context = {}, userMessage } = options;

  // Get RAG context from brand documents
  const ragQuery = userMessage || `${intent} ${context.email_type || ''} ${context.event || ''}`;
  const ragContext = await getRAGContext(ragQuery);

  // Build system prompt with RAG context
  const systemPrompt = `You are an AI assistant helping to create marketing emails for Alyra, a luxury fragrance brand.

Brand Context:
${ragContext || 'No specific brand context available. Use a professional, elegant tone suitable for a luxury fragrance brand.'}

Your task is to generate email templates that:
1. Match Alyra's brand voice (elegant, sophisticated, warm)
2. Include appropriate legal disclaimers when needed
3. Use the provided design system structure
4. Create engaging, conversion-focused content

Always return a valid JSON object with "subject" and "manifest" fields.`;

  // Build user prompt
  const userPrompt = `Generate an email template for: ${intent}

Context:
${JSON.stringify(context, null, 2)}

${userMessage ? `\nUser request: ${userMessage}` : ''}

Generate a complete email template with:
- A compelling subject line
- A structured manifest with appropriate blocks (heading, text, CTA, footer)
- Professional, brand-consistent content
- Clear call-to-action if applicable`;

  // Create structured output config
  const responseSchema = TemplateManifestSchema.extend({
    subject: z.string(),
  }).transform((data) => ({
    subject: data.subject,
    manifest: {
      design_system: data.design_system,
      blocks: data.blocks,
    },
  }));

  const structuredConfig = createStructuredOutputConfig(
    responseSchema,
    'email_template'
  );

  // Call OpenAI with retry logic for invalid JSON
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const completion = await openai.chat.completions.create({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...structuredConfig,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON response
      let jsonResponse: unknown;
      try {
        jsonResponse = JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError}`);
      }

      // Validate against schema
      const result = validateJsonResponse(jsonResponse, responseSchema);

      return {
        subject: result.subject,
        manifest: result.manifest,
      };
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(
          `Failed to generate valid email after ${maxAttempts} attempts: ${error}`
        );
      }
      // Retry with a slightly modified prompt
      console.warn(`Email generation attempt ${attempts} failed, retrying...`, error);
    }
  }

  throw new Error('Unexpected error in email generation');
}

