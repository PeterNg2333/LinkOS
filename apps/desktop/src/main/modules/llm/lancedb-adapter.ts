import * as lancedb from "@lancedb/lancedb";
import type { Table as LanceTable } from "@lancedb/lancedb";
import {
    BaseVectorStore,
    nodeToMetadata,
    metadataDictToNode,
} from "@llamaindex/core/vector-store";
import type {
    VectorStoreQuery,
    VectorStoreQueryResult,
    VectorStoreBaseParams,
} from "@llamaindex/core/vector-store";
import type { BaseNode } from "@llamaindex/core/schema";
import { MetadataMode } from "@llamaindex/core/schema";
import { join } from "path";

interface LanceDBRow {
    id: string;
    vector: number[];
    text: string;
    metadata: string;
}

export class LanceDBAdapter extends BaseVectorStore {
    storesText = true;
    private table: LanceTable;

    constructor(table: LanceTable, params?: VectorStoreBaseParams) {
        super(params);
        this.table = table;
    }

    client(): LanceTable {
        return this.table;
    }

    // Add nodes (LlamaIndex will break a document into smaller nodes) to the vector store.
    async add(nodes: BaseNode[]): Promise<string[]> {
        if (nodes.length === 0) return [];

        // LlamaIndex: Convert into vector and together with metadata into LanceDB Row
        const rows: LanceDBRow[] = [];
        for (const node of nodes) {
            const embedding = node.getEmbedding();
            const metadata = nodeToMetadata(node, false, "text", true);
            rows.push({
                id: node.id_,
                vector: embedding,
                text: node.getContent(MetadataMode.NONE),
                metadata: JSON.stringify(metadata),
            });
        }
        // LanceDB: Store those vectors and row data in LanceDB
        await this.table.add(rows as unknown as Record<string, unknown>[]);
        return nodes.map((n) => n.id_);
    }

    async delete(refDocId: string): Promise<void> {
        await this.table.delete(`id = '${refDocId}'`);
    }

    // LlamaIndex: Query from vector store by lanceDB similarity search
    async query(query: VectorStoreQuery): Promise<VectorStoreQueryResult> {
        if (!query.queryEmbedding) {
            return { nodes: [], similarities: [], ids: [] };
        }

        // LanceDB: Query from vector store by lanceDB similarity search
        const results = await this.table
            .vectorSearch(query.queryEmbedding)
            .limit(query.similarityTopK)
            .toArray();

        const nodes: BaseNode[] = [];
        const similarities: number[] = [];
        const ids: string[] = [];

        // LlamaIndex: Convert LanceDB Row into LlamaIndex Node
        for (const row of results) {
            const metadata = JSON.parse(row.metadata);
            const node = metadataDictToNode(metadata, {
                fallback: { text: row.text, id_: row.id, hash: "" },
            });
            nodes.push(node);
            similarities.push(1 - (row._distance ?? 0));
            ids.push(row.id);
        }

        return { nodes, similarities, ids };
    }

    // LlamaIndex: List all documents in the vector store
    async listDocuments(): Promise<{ id: string; text: string; metadata: Record<string, unknown> }[]> {
        const rows = await this.table
            .query()
            .where("id != '__init__'") // Exclude the initialization row
            .select(["id", "text", "metadata"])
            .toArray();
        return rows.map((row: any) => ({
            id: row.id,
            text: row.text,
            metadata: JSON.parse(row.metadata),
        }));
    }
}

export async function createLanceDBAdapter(
    storagePath: string,
    dimension: number,
    params?: VectorStoreBaseParams,
): Promise<LanceDBAdapter> {
    // LanceDB: Connect to vector store
    const db = await lancedb.connect(join(storagePath, "lancedb"));
    const tableNames = await db.tableNames(); // Get all table names

    let table: LanceTable;
    // LlamaIndex: Open table or create table if not exists (Target table name is "docs")
    if (tableNames.includes("docs")) {
        table = await db.openTable("docs");
        const schema = await table.schema();
        const vectorField = schema.fields.find((f) => f.name === "vector");
        const listSize = (vectorField?.type as any)?.listSize;
        // LanceDB: Check if the table schema matches the expected schema
        if (listSize !== dimension) {
            await db.dropTable("docs");
            table = await db.createTable("docs", [
                {
                    id: "__init__",
                    vector: new Array(dimension).fill(0),
                    text: "",
                    metadata: "{}",
                },
            ]);
        }
    } else {
        // LanceDB: Create vector store with initial data
        table = await db.createTable("docs", [
            {
                id: "__init__",
                vector: new Array(dimension).fill(0),
                text: "",
                metadata: "{}",
            },
        ]);
    }

    return new LanceDBAdapter(table, params);
}
