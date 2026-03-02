
type PatchDTO<T> = Partial<T> & { uuid: string };

interface IVectorDB<T extends Record<string, any>> {
    connect(tableName: string): Promise<void>;
    retrieveAll(): Promise<T[]>;
    add(records: T[]): Promise<void>;
    patch(records: PatchDTO<T>[]): Promise<void>;
    patchByFilter(filter: Partial<T>, updates: Partial<T>): Promise<void>;
    retrieve(query: string | number[], limit?: number): Promise<T[]>;
    delete(filter: Partial<T>): Promise<void>;
}

export type { PatchDTO, IVectorDB }