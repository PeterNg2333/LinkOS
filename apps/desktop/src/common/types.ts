import { BaseMessageLike } from "@langchain/core/messages";

// ============= PRELOAD API =============
interface IElectronAPI {
    ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => () => void;
        once: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
}

type LLMResult =
    | { success: true; content: string }
    | { success: false; error: string }

type DocumentResult =
    | { success: true; documents: { id: string; text: string; metadata: Record<string, any> }[] }
    | { success: false; error: string }

type LLMResultStream = LLMResult & { traceId: string }

interface IMainAPI {
    llm: {
        call: (message: string) => Promise<LLMResult>;
        chat: (messages: BaseMessageLike[], systemPrompt?: string, enableRAG?: boolean) => Promise<LLMResult>;
        chatStream: (
            onChunk: (chunk: LLMResultStream) => void,
            onError: (error: any) => void,
            onEnd: () => void,
            traceId: string,
            messages: BaseMessageLike[],
            systemPrompt?: string,
            enableRAG?: boolean,
            enableSearch?: boolean
        ) => () => void;
    };
    rag: {
        ingest: (filePath?: string) => Promise<LLMResult>;
        retrieve: (query: string, topK?: number) => Promise<DocumentResult>;
        list: () => Promise<DocumentResult>;
        clear: () => Promise<LLMResult>;
        remove: (id: number) => Promise<LLMResult>;
    }
}

export {
    IElectronAPI,
    IMainAPI,
    LLMResult,
    LLMResultStream
}