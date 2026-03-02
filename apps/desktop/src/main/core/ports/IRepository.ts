type PatchDTO<T> = Partial<T> & { uuid: string };

interface IRepository<T> {
    add(records: T[]): Promise<void>;
    retrieve(filter: Partial<T>): Promise<T[]>;
    patch(records: PatchDTO<T>[]): Promise<void>;
    patchByFilter(filter: Partial<T>, updates: Partial<T>): Promise<void>;
    delete(filter: Partial<T>): Promise<void>;
}

export type { PatchDTO, IRepository }