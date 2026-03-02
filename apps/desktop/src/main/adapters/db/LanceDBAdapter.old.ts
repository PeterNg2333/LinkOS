import * as lancedb from "@lancedb/lancedb";
import type { Table as LanceTable } from "@lancedb/lancedb";
import { BaseVectorStore, nodeToMetadata, metadataDictToNode } from "@llamaindex/core/vector-store";
import type { BaseNode } from "@llamaindex/core/schema";
import { MetadataMode } from "@llamaindex/core/schema";
import type { VectorStoreQuery, VectorStoreQueryResult, VectorStoreBaseParams } from "@llamaindex/core/vector-store";
import { join } from "path";

import { IVectorDB, PatchDTO } from "@main/core/ports/IVectorDB";
import { IRepository } from "@main/core/ports/IRepository";

export class LanceDBAdapter<TSchema extends Record<string, any>>
    extends BaseVectorStore
    implements IVectorDB<TSchema>, IRepository<TSchema> {
    storesText = true;
    private table: LanceTable;
    private dimension: number;

    constructor(table: LanceTable, dimension: number, params?: VectorStoreBaseParams) {
        super(params);
        this.table = table;
        this.dimension = dimension;
    }

    client(): LanceTable {
        return this.table;
    }

    // ==========================================
    // 1. LlamaIndex BaseVectorStore Implementation
    // ==========================================
    async add(nodes: BaseNode[]): Promise<string[]>;
    async add(records: TSchema[]): Promise<void>;
    async add(items: any[]): Promise<any> {
        if (items.length === 0) return [];

        if (items[0] && typeof items[0].getEmbedding === 'function') {
            const nodes = items as BaseNode[];
            const rows = [];
            for (const node of nodes) {
                const embedding = node.getEmbedding();
                const metadata = nodeToMetadata(node, false, "text", true);
                rows.push({
                    id: node.id_,
                    vector: embedding && embedding.length > 0 ? embedding : new Array(this.dimension).fill(0),
                    text: node.getContent(MetadataMode.NONE),
                    metadata: JSON.stringify(metadata),
                });
            }
            await this.table.add(rows as unknown as Record<string, unknown>[]);
            return nodes.map((n) => n.id_);
        } else {
            // Processing TSchema (IRepository add)
            const records = items as TSchema[];
            const rows = records.map(record => ({
                id: record.uuid || record.id || crypto.randomUUID(),
                vector: record.embedding && record.embedding.length > 0 ? record.embedding : new Array(this.dimension).fill(0),
                text: record.content || record.text || "",
                // We serialize the whole record into metadata, but also include common filter columns
                metadata: JSON.stringify(record),
            }));
            await this.table.add(rows as unknown as Record<string, unknown>[]);
            return;
        }
    }

    async delete(refDocId: string, deleteKwargs?: any): Promise<void>;
    async delete(filter: Partial<TSchema>): Promise<void>;
    async delete(arg: string | Partial<TSchema>, deleteKwargs?: any): Promise<void> {
        if (typeof arg === "string") {
            await this.table.delete(`id = '${arg}'`);
        } else {
            // To filter by properties stored inside metadata JSON we would need a more complex query
            // for now, assuming simple fallback or explicit columns mapped when extracting requirements
            const conditions = Object.keys(arg).map(k => {
                const val = (arg as any)[k];
                if (typeof val === "string") return `metadata LIKE '%"${k}":"${val}"%'`;
                return `metadata LIKE '%"${k}":${val}%'`;
            });
            if (conditions.length > 0) {
                try {
                    await this.table.delete(conditions.join(" AND "));
                } catch (e) {
                    console.error("Delete by filter failed", e);
                }
            }
        }
    }

    async query(query: VectorStoreQuery): Promise<VectorStoreQueryResult> {
        if (!query.queryEmbedding) {
            return { nodes: [], similarities: [], ids: [] };
        }

        const results = await this.table
            .vectorSearch(query.queryEmbedding)
            .limit(query.similarityTopK)
            .toArray();

        const nodes: BaseNode[] = [];
        const similarities: number[] = [];
        const ids: string[] = [];

        for (const row of results) {
            const metadata = JSON.parse(row.metadata as string);
            const node = metadataDictToNode(metadata, {
                fallback: { text: row.text as string, id_: row.id as string, hash: "" },
            });
            nodes.push(node);
            similarities.push(1 - (row._distance ?? 0));
            ids.push(row.id as string);
        }

        return { nodes, similarities, ids };
    }

    // ==========================================
    // 2. IVectorDB Implementation
    // ==========================================
    async connect(tableName: string): Promise<void> {
        // Typically handled by factory
    }

    async retrieveAll(): Promise<TSchema[]> {
        const rows = await this.table.query().where("id != '__init__'").toArray();
        return rows.map(row => JSON.parse(row.metadata as string) as TSchema);
    }

    async retrieve(filter: Partial<TSchema>): Promise<TSchema[]>;
    async retrieve(query: string | number[], limit?: number): Promise<TSchema[]>;
    async retrieve(arg: Partial<TSchema> | string | number[], limit?: number): Promise<TSchema[]> {
        if (Array.isArray(arg)) {
            // query: number[]
            const results = await this.table.vectorSearch(arg).limit(limit ?? 10).toArray();
            return results.map(row => JSON.parse(row.metadata as string) as TSchema);
        } else if (typeof arg === "string") {
            // text search
            return [];
        } else {
            // IRepository retrieve
            // Querying via LIKE on JSON string if explicit columns are not present. LanceDB SQL dialect has limited JSON functions.
            const conditions = Object.keys(arg).map(k => {
                const val = (arg as any)[k];
                // basic substring match in metadata JSON string as fallback
                if (typeof val === "string") return `metadata LIKE '%"${k}":"${val}"%'`;
                return `metadata LIKE '%"${k}":${val}%'`;
            });

            try {
                let q = this.table.query().where("id != '__init__'");
                if (conditions.length > 0) {
                    q = q.where(conditions.join(" AND "));
                }
                const rows = await q.toArray();
                return rows.map(row => JSON.parse(row.metadata as string) as TSchema);
            } catch (e) {
                console.error("Retrieve by filter failed", e);
                return [];
            }
        }
    }

    // ==========================================
    // 3. IRepository Implementation
    // ==========================================
    async patch(records: PatchDTO<TSchema>[]): Promise<void> {
        for (const record of records) {
            const { uuid, ...updates } = record;

            // Re-fetch, patch in code, and then insert/update. 
            // LanceDB supports updating rows, but merging JSON metadata takes more logic in SQL.
            try {
                const existing = await this.table.query().where(`id = '${uuid}'`).toArray();
                if (existing.length === 0) continue;

                const oldData = JSON.parse(existing[0].metadata as string);
                const newData = { ...oldData, ...updates };

                await this.table.update({
                    where: `id = '${uuid}'`,
                    values: { metadata: JSON.stringify(newData) } as any
                });
            } catch (err) {
                console.error("Patch error", err);
            }
        }
    }

    async patchByFilter(filter: Partial<TSchema>, updates: Partial<TSchema>): Promise<void> {
        try {
            const targetRecords = await this.retrieve(filter as any);
            const patchObjects = targetRecords.map(r => ({ ...updates, uuid: (r as any).uuid }));
            await this.patch(patchObjects);
        } catch (err) {
            console.error("PatchByFilter error", err);
        }
    }
}

export async function createLanceDBAdapter<T extends Record<string, any>>(
    storagePath: string,
    dimension: number,
    params?: VectorStoreBaseParams,
): Promise<LanceDBAdapter<T>> {
    const db = await lancedb.connect(join(storagePath, "lancedb"));
    const tableNames = await db.tableNames();

    let table: LanceTable;
    if (tableNames.includes("docs")) {
        table = await db.openTable("docs");
        // We might want to check dimension matching here if required, as in original file
    } else {
        table = await db.createTable("docs", [
            {
                id: "__init__",
                vector: new Array(dimension).fill(0),
                text: "",
                metadata: "{}",
            },
        ]);
    }

    return new LanceDBAdapter<T>(table, dimension, params);
}
