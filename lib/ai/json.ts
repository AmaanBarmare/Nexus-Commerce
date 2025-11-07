import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Helper utilities for structured JSON output with OpenAI
 * Converts Zod schemas to JSON Schema for OpenAI's structured output
 */

/**
 * Convert a Zod schema to JSON Schema format for OpenAI
 */
export function zodToOpenAIJsonSchema<T extends z.ZodTypeAny>(
  schema: T
): Record<string, any> {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as Record<string, any>;

  enforceRequiredFields(jsonSchema);

  return jsonSchema;
}

function enforceRequiredFields(node: any) {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (node.type === 'object') {
    const properties = node.properties ?? {};
    node.properties = properties;
    node.required = Object.keys(properties);
    node.additionalProperties = false;

    Object.values(properties).forEach(enforceRequiredFields);
  }

  if (node.type === 'array' && node.items) {
    enforceRequiredFields(node.items);
  }

  if (Array.isArray(node.anyOf)) {
    node.anyOf.forEach(enforceRequiredFields);
  }

  if (Array.isArray(node.allOf)) {
    node.allOf.forEach(enforceRequiredFields);
  }

  if (node.type === 'string' && node.format) {
    delete node.format;
  }
}

/**
 * Validate and parse JSON response against a Zod schema
 * Returns the parsed data or throws an error
 */
export function validateJsonResponse<T>(
  json: unknown,
  schema: z.ZodType<T>
): T {
  try {
    return schema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `JSON validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Create OpenAI response format configuration for structured output
 */
export function createStructuredOutputConfig<T extends z.ZodTypeAny>(
  schema: T,
  name: string = 'response'
) {
  return {
    response_format: {
      type: 'json_schema' as const,
      json_schema: {
        name,
        description: `Structured ${name} following the specified schema`,
        schema: zodToOpenAIJsonSchema(schema),
        strict: true,
      },
    },
  };
}

