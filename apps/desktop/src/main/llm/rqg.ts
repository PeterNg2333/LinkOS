import {
    Document, VectorStoreIndex, storageContextFromDefaults, Settings, type StorageContext,
    ModalityType, MetadataMode
} from 'llamaindex';
import { OpenAIEmbedding } from '@llamaindex/openai';
import { extname, join } from 'path';
import { app, ipcMain, dialog } from 'electron';
import fs from 'fs/promises'

import config from '@main/config'

Settings.embedModel = new OpenAIEmbedding({
    apiKey: config.apiKey,
    model: 'openai/text-embedding-3-small',
    additionalSessionOptions: {
        baseURL: "https://openrouter.ai/api/v1"
    }
})

let currentIndex: VectorStoreIndex | null = null
let storageContext: StorageContext | null = null


const getPersistDir = () => join(app.getPath("userData"), "rag");

const loadVectorStore = async (): Promise<boolean> => {
    const persistDir = getPersistDir();
    try {
        await fs.mkdir(persistDir, { recursive: true })
        // Init storage context (usually in C:\Users\<username>\AppData\Roaming\LinkOS\rag)
        storageContext = await storageContextFromDefaults({ persistDir })
        const isVectorStoreExist = await fs.access(join(persistDir, "vector_store.json"))
            .then(() => true)
            .catch(() => false)

        if (isVectorStoreExist) {
            console.log("Index exists, loading...")
            currentIndex = await VectorStoreIndex.init({ storageContext })
        } else {
            console.log("No index found, creating new one...")
            currentIndex = await VectorStoreIndex.fromDocuments([], { storageContext });
        }

        return true
    } catch (err: any) {
        console.error("Error loading vector store:", err)
        return false
    }
}

const ingestFile = async (filePath: string): Promise<boolean> => {
    const isSuccess = await _checkIndex();
    if (!isSuccess) return false

    try {
        const fileContent = await fs.readFile(filePath, "utf-8")
        // Wrap file content with metadata as document format
        const document = new Document({
            text: fileContent,
            metadata: {
                fileName: filePath.split(/[\\/]/).pop(),
                filePath,
                fileType: extname(filePath).toLocaleLowerCase(),
                lastModified: (await fs.stat(filePath)).mtime.toISOString()
            }
        })
        // Text Splitting and Convert into vector, then insert to store
        await currentIndex!.insertNodes([document]);

        const persistDir = getPersistDir();
        await storageContext?.docStore.persist(); // Save Document
        await storageContext?.indexStore.persist(); // Save Index
        const vectorStore = storageContext?.vectorStores?.[ModalityType.TEXT] as any; // Save Vector
        if (vectorStore && vectorStore?.persist) {
            const vectorConfigPath = join(persistDir, "vector_store.json")
            await vectorStore.persist(vectorConfigPath);
        }

        console.log(`File ${filePath} ingested successfully`)
        return true
    } catch (err: any) {
        console.error("Error ingesting file:", err)
        return false
    }
}

const retrieveContext = async (query: string, topK: number = 3) => {
    const isSuccess = await _checkIndex();
    if (!isSuccess) return []

    try {
        const retriever = currentIndex!.asRetriever({ similarityTopK: topK });
        const nodes = await retriever.retrieve(query);
        const nodeContent = nodes.map(result => result.node.getContent(MetadataMode.LLM));
        return nodeContent.join("\n\n---\n\n")
    } catch (err: any) {
        console.error("Error retrieving context:", err)
        return []
    }
}

const setupRAGHandlers = () => {
    loadVectorStore().catch(console.error);

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
            console.error("ingestion failed", err)
            return { success: false, error: err }
        }
    });
    ipcMain.handle("rag:retrieve", async (_, query: string, topK: number = 3) => {
        try {
            const content = await retrieveContext(query, topK)
            return { success: true, content }
        } catch (err) {
            console.error("retrieval failed", err)
            return { success: false, error: err }
        }
    });
    ipcMain.handle("rag:list", async () => {
        try {
            const isSuccess = await _checkIndex();
            if (!isSuccess) return { success: false, error: "Error loading vector store" }

            const vectorStore = storageContext?.vectorStores?.[ModalityType.TEXT] as any;
            if (!vectorStore) return { success: false, error: "Vector store not found" }
            const documents = await vectorStore.getAllDocuments();
            return { success: true, documents }
        } catch (err) {
            console.error("Error listing documents:", err)
            return { success: false, error: err }
        }
    });

    ipcMain.handle('rag:clear', async () => {
        const persistDir = join(app.getPath("userData"), "rag");
        try {
            await fs.rm(persistDir, { recursive: true, force: true })
            currentIndex = null
            storageContext = null
            return { success: true }
        } catch (err) {
            console.error("Error clearing vector store:", err)
            return { success: false, error: err }
        }
    });
}

// ======= Helper Functions ======
const _checkIndex = async () => {
    if (!currentIndex || !storageContext) {
        const isSuccess = await loadVectorStore();
        if (!isSuccess) {
            console.error("Error loading vector store")
            return false
        }
    }
    return true
}

export default setupRAGHandlers
export { retrieveContext }