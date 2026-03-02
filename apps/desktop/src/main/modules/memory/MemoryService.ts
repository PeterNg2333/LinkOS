import { IMemoryStore } from "@main/core/ports/IMemoryStore";
import { IRepository } from "@main/core/ports/IRepository";
import { IVectorDB } from "@main/core/ports/IVectorDB";
import { MemoryLevel, MemoryNodeDTO } from "@main/core/types/memory.type";
import { VectorStoreIndex, Document, StorageContext } from "llamaindex";
import { BaseVectorStore } from "@llamaindex/core/vector-store";
import { MetadataMode } from "@llamaindex/core/schema";
import * as crypto from "crypto";

export class MemoryService implements IMemoryStore {
    private repository: IRepository<MemoryNodeDTO>;
    private vectorDb: IVectorDB<MemoryNodeDTO>;
    private index: VectorStoreIndex | null = null;

    constructor(
        repository: IRepository<MemoryNodeDTO>,
        vectorDb: IVectorDB<MemoryNodeDTO>
    ) {
        this.repository = repository;
        this.vectorDb = vectorDb;
        this.initLlamaIndex();
    }

    private async initLlamaIndex() {
        // Since vectorDb is LanceDBAdapter, it extends BaseVectorStore
        const storageContext = {
            vectorStore: this.vectorDb as unknown as BaseVectorStore,
            docStore: undefined as any,
            indexStore: undefined as any,
        } as unknown as StorageContext;

        try {
            this.index = await VectorStoreIndex.init({ storageContext });
        } catch {
            this.index = await VectorStoreIndex.fromDocuments([], { storageContext });
        }
    }

    async saveMemory(content: string, level: MemoryLevel, tags?: string[]): Promise<MemoryNodeDTO> {
        const dto: MemoryNodeDTO = {
            uuid: crypto.randomUUID(),
            level: level,
            importance: 5, // Default importance
            isCompressed: false,
            isDeleted: false,
            content: content,
            tags: tags || [],
            lastAccessedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (level === 'semantic_fact' && this.index) {
            const doc = new Document({
                text: content,
                metadata: { ...dto } // Inject full DTO into LlamaIndex metadata
            });
            await this.index.insert(doc);
        } else {
            await this.repository.add([dto]);
        }

        return dto;
    }

    async retrieveContext(query: string, activeLevels?: MemoryLevel[]): Promise<MemoryNodeDTO[]> {
        const results: MemoryNodeDTO[] = [];

        // 1. Fetch Persona and active context by repository queries
        const activeNodes = await this.repository.retrieve({ level: 'persona' });
        results.push(...activeNodes);

        // 2. Fetch Semantic Facts using LlamaIndex Vector Retrieval
        if (this.index && activeLevels?.includes('semantic_fact')) {
            const retriever = this.index.asRetriever({ similarityTopK: 3 });
            const semanticMatches = await retriever.retrieve({ query });

            for (const match of semanticMatches) {
                const metadata = match.node.metadata;
                // map back
                results.push({ ...metadata, content: match.node.getContent(MetadataMode.NONE) } as unknown as MemoryNodeDTO);
            }
        }

        return results;
    }

    async getWorkingContext(): Promise<MemoryNodeDTO[]> {
        return await this.repository.retrieve({ level: 'working-context' });
    }

    async updateMemory(uuid: string, updates: Partial<MemoryNodeDTO>): Promise<MemoryNodeDTO> {
        await this.repository.patch([{ uuid, ...updates }]);

        // Fetch it back to return
        const res = await this.repository.retrieve({ uuid });
        return res?.[0] || null;
    }

    async deleteMemory(uuid: string): Promise<void> {
        await this.repository.delete({ uuid });
    }

    async compressMemories(): Promise<void> {
        const workingContext = await this.getWorkingContext();
        if (workingContext.length === 0) return;

        // --- Logic Placeholder for calling LLM to summarize ---
        const summaryText = `[Simulated Compression] summarized ${workingContext.length} messages.`;
        // ------------------------------------------------------

        await this.saveMemory(summaryText, 'semantic_fact', ['compressed']);

        // Soft delete old working context
        await this.repository.patchByFilter(
            { level: 'working-context' },
            { isDeleted: true }
        );
    }
}
