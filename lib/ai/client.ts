import OpenAI from 'openai';

/**
 * OpenAI client configuration
 * Uses environment variables for API key and model selection
 */
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey,
});

/**
 * Model configuration
 * Uses environment variables with fallback defaults
 */
export const GENERATION_MODEL = process.env.OPENAI_GENERATION_MODEL || 'gpt-4o-mini';
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

/**
 * Embedding dimensions for text-embedding-3-small
 */
export const EMBEDDING_DIMENSIONS = 1536;

