import { MemoryNodeDTO, MemoryLevel } from '@main/core/types/memory.type'

interface IMemoryStore {
    saveMemory(content: string, level: MemoryLevel, tags?: string[]): Promise<MemoryNodeDTO>;
    retrieveContext(query: string, activeLevels?: MemoryLevel[]): Promise<MemoryNodeDTO[]>;
    getWorkingContext(): Promise<MemoryNodeDTO[]>;
    updateMemory(uuid: string, updates: Partial<MemoryNodeDTO>): Promise<MemoryNodeDTO>;
    deleteMemory(uuid: string): Promise<void>;
    compressMemories(): Promise<void>;
}

export type { IMemoryStore }

