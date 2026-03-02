import {
    Document, VectorStoreIndex, storageContextFromDefaults, Settings, type StorageContext,
    MetadataMode
} from 'llamaindex';
import { OpenAIEmbedding } from '@llamaindex/openai';
import { extname, join } from 'path';
import { app, ipcMain, dialog } from 'electron';
import fs from 'fs/promises'

import { createLanceDBAdapter, LanceDBAdapter } from './lancedb-adapter'
import config from '@main/infrastructure/config'
import log from 'electron-log/main';

const logger = log.scope('llm:rag');

const EMBEDDING_DIMENSION = 4096;

Settings.embedModel = new OpenAIEmbedding({
    apiKey: config.apiKey,
    model: 'qwen/qwen3-embedding-8b',
    additionalSessionOptions: {
        baseURL: "https://openrouter.ai/api/v1"
    }
})

let currentIndex: VectorStoreIndex | null = null
let storageContext: StorageContext | null = null

const getStorageDir = () => join(app.getPath("userData"), "rag");

const loadVectorStore = async (): Promise<boolean> => {
    const storageDir = getStorageDir();
    const metadataDir = join(storageDir, "metadata");
    try {
        await fs.mkdir(metadataDir, { recursive: true })

        const vectorStore = await createLanceDBAdapter(storageDir, EMBEDDING_DIMENSION, {
            embedModel: Settings.embedModel,
        });

        storageContext = await storageContextFromDefaults({
            persistDir: metadataDir,
            vectorStore: vectorStore as any,
        })

        try {
            currentIndex = await VectorStoreIndex.init({ storageContext })
            logger.info("Existing index loaded")
        } catch {
            currentIndex = await VectorStoreIndex.fromDocuments([], { storageContext })
            logger.info("New index created")
        }
        return true
    } catch (err: any) {
        logger.error("Error loading vector store:", err)
        return false
    }
}

const ingestFile = async (filePath: string): Promise<boolean> => {
    const isSuccess = await _checkIndex();
    if (!isSuccess) return false

    try {
        const fileContent = await fs.readFile(filePath, "utf-8")
        const document = new Document({
            text: fileContent,
            metadata: {
                fileName: filePath.split(/[\\/]/).pop(),
                filePath,
                fileType: extname(filePath).toLocaleLowerCase(),
                lastModified: (await fs.stat(filePath)).mtime.toISOString()
            }
        })

        await currentIndex!.insertNodes([document]);

        logger.info(`File ${filePath} ingested successfully`)
        return true
    } catch (err: any) {
        logger.error("Error ingesting file:", err)
        return false
    }
}

const retrieveContext = async (query: string, topK: number = 3) => {
    const isSuccess = await _checkIndex();
    if (!isSuccess) return []

    try {
        const retriever = currentIndex!.asRetriever({ similarityTopK: topK });
        const nodes = await retriever.retrieve(query);
        if (!nodes || nodes.length === 0) return ""
        logger.info(nodes)
        const nodeContent = nodes.map(result => result.node.getContent(MetadataMode.LLM));
        return nodeContent.join("\n\n---\n\n")
    } catch (err: any) {
        logger.error("Error retrieving context:", err)
        return ""
    }
}

const setupRAGHandlers = () => {
    loadVectorStore().catch(logger.error);

    ipcMain.handle("rag:ingest", async (_, filePath?: string) => {
        try {
            let targetPath = filePath
            if (!targetPath) {
                const result = await dialog.showOpenDialog({
                    properties: ["openFile"],
                    filters: [{ name: "Text Files", extensions: ["txt", "md", "json"] }]
                })
                if (result.canceled || !result.filePaths[0]) {
                    return { success: false, error: "No file selected" }
                }
                targetPath = result.filePaths[0]
            }
            const isSuccess = await ingestFile(targetPath)
            return { success: isSuccess, content: targetPath }

        } catch (err) {
            logger.error("ingestion failed", err)
            return { success: false, error: err }
        }
    });
    ipcMain.handle("rag:retrieve", async (_, query: string, topK: number = 3) => {
        try {
            const content = await retrieveContext(query, topK)
            return { success: true, content }
        } catch (err) {
            logger.error("retrieval failed", err)
            return { success: false, error: err }
        }
    });
    ipcMain.handle("rag:list", async () => {
        try {
            const isSuccess = await _checkIndex();
            if (!isSuccess) return { success: false, error: "Vector store not loaded" }

            const vectorStore = storageContext?.vectorStores?.TEXT as unknown as LanceDBAdapter;
            if (!vectorStore?.listDocuments) return { success: false, error: "Vector store not found" }
            const documents = await vectorStore.listDocuments();
            return { success: true, documents }
        } catch (err) {
            logger.error("Error listing documents:", err)
            return { success: false, error: err }
        }
    });
    ipcMain.handle("rag:remove", async (_, docId: string) => {
        try {
            const isSuccess = await _checkIndex();
            if (!isSuccess) return { success: false, error: "Vector store not loaded" }

            const vectorStore = storageContext?.vectorStores?.TEXT as unknown as LanceDBAdapter;
            if (!vectorStore) return { success: false, error: "Vector store not found" }
            await vectorStore.delete(docId);
            logger.info(`Document ${docId} removed`)
            return { success: true }
        } catch (err) {
            logger.error("Error removing document:", err)
            return { success: false, error: err }
        }
    });

    ipcMain.handle('rag:clear', async () => {
        const storageDir = getStorageDir();
        try {
            await fs.rm(storageDir, { recursive: true, force: true })
            currentIndex = null
            storageContext = null
            return { success: true }
        } catch (err) {
            logger.error("Error clearing vector store:", err)
            return { success: false, error: err }
        }
    });
}

const _checkIndex = async () => {
    if (!currentIndex || !storageContext) {
        const isSuccess = await loadVectorStore();
        if (!isSuccess) {
            logger.error("Error loading vector store")
            return false
        }
    }
    return true
}

export default setupRAGHandlers
export { retrieveContext }