
import { z } from 'zod';

const MemoryLevelSchema = z.union([
    // Highest priority, always injected into the System Prompt (Only edited manually by the user, never overwritten by the AI). 
    z.literal('self-intro'),
    // Short-term, raw conversation history (No compression, no embeddings but limited by length). 
    // Automatically compressed into 'semantic_fact' or deleted after a certain period (e.g., 30 mins).
    z.literal('working-context'),
    // AI-maintained dynamic state or user profile. Stored as a markdown string and automatically added to the context
    z.literal('persona'),
    // Long-lived, compressed, and abstracted knowledge. Requires vector embeddings for semantic retrieval (RAG).
    // Periodically updated, softly deleted (superseded), and selectively retrieved based on similarity.
    z.literal('semantic_fact')
]);

const MemoryImportanceSchema = z.number().min(1).max(10);

const MemoryNodeDTOSchema = z.object({
    uuid: z.string(),
    level: MemoryLevelSchema,
    importance: MemoryImportanceSchema,
    embedding: z.array(z.number()).optional(),
    supersededBy: z.string().optional(),
    isCompressed: z.boolean(),
    isDeleted: z.boolean(),
    content: z.string(),
    tags: z.array(z.string()),
    metadata: z.record(z.string(), z.any()).optional(),
    lastAccessedAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

type MemoryLevel = z.infer<typeof MemoryLevelSchema>;
type MemoryNodeDTO = z.infer<typeof MemoryNodeDTOSchema>;

export { MemoryLevelSchema, MemoryNodeDTOSchema };
export type { MemoryLevel, MemoryNodeDTO };
