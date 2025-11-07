import { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './client';
import { prisma } from '../db';

/**
 * Embedding utilities for RAG (Retrieval-Augmented Generation)
 * Handles generating embeddings and vector similarity search
 */

/**
 * Generate embedding for a text string
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  const embedding = response.data[0].embedding;
  
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected embedding dimension ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`
    );
  }

  return embedding;
}

/**
 * Store a brand document with its embedding
 */
export async function storeBrandDocument({
  title,
  content,
  category,
  metadata,
}: {
  title: string;
  content: string;
  category: string;
  metadata?: Record<string, any>;
}) {
  // Generate embedding
  const embedding = await embedText(content);

  // Store in database using raw SQL for pgvector
  // Note: Prisma doesn't natively support vector type, so we use raw SQL
  const embeddingStr = `[${embedding.join(',')}]`;
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Escape single quotes in strings
  const escapedTitle = title.replace(/'/g, "''");
  const escapedContent = content.replace(/'/g, "''");
  const escapedCategory = category.replace(/'/g, "''");

  const querySQL = `
    INSERT INTO "BrandDocument" (id, title, content, category, embedding, metadata, "createdAt", "updatedAt")
    VALUES (
      '${id}',
      '${escapedTitle}',
      '${escapedContent}',
      '${escapedCategory}',
      '${embeddingStr}'::vector,
      ${metadataJson ? `'${JSON.stringify(metadata).replace(/'/g, "''")}'::jsonb` : 'NULL::jsonb'},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(querySQL);
  return result[0]?.id || null;
}

/**
 * Search for similar documents using vector similarity
 * Returns top N most similar documents
 */
export async function searchSimilarDocuments(
  query: string,
  options: {
    limit?: number;
    category?: string;
    threshold?: number;
  } = {}
): Promise<Array<{ id: string; title: string; content: string; category: string; similarity: number }>> {
  const { limit = 5, category, threshold = 0.7 } = options;

  // Generate embedding for query
  const queryEmbedding = await embedText(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Vector similarity search using cosine distance
  // pgvector uses <-> operator for cosine distance (lower is more similar)
  // Note: We need to use $queryRawUnsafe for dynamic vector operations
  // The embedding string is generated from our own embedding function, so it's safe
  let querySQL = `
    SELECT 
      id,
      title,
      content,
      category,
      1 - (embedding <=> '${embeddingStr}'::vector) as similarity
    FROM "BrandDocument"
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> '${embeddingStr}'::vector) >= ${threshold}
  `;

  if (category) {
    querySQL += ` AND category = '${category.replace(/'/g, "''")}'`;
  }

  querySQL += `
    ORDER BY embedding <=> '${embeddingStr}'::vector
    LIMIT ${limit}
  `;

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    similarity: number;
  }>>(querySQL);

  return results;
}

/**
 * Get RAG context for email generation
 * Retrieves relevant brand documents based on query
 */
export async function getRAGContext(
  query: string,
  categories: string[] = ['brand_tone', 'product_info', 'legal']
): Promise<string> {
  const contexts: string[] = [];

  // Search across all specified categories
  for (const category of categories) {
    const docs = await searchSimilarDocuments(query, {
      limit: 2,
      category,
      threshold: 0.7,
    });

    if (docs.length > 0) {
      contexts.push(`\n## ${category.replace('_', ' ').toUpperCase()}`);
      for (const doc of docs) {
        contexts.push(`\n${doc.title}: ${doc.content}`);
      }
    }
  }

  return contexts.join('\n');
}

