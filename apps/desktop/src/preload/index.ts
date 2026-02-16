import { contextBridge, ipcRenderer } from 'electron'

import { type BaseMessageLike } from "@langchain/core/messages"
import { IElectronAPI, LLMResultStream } from "@common/types"

const electronAPI: IElectronAPI = {
    ipcRenderer: {
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
        on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
            ipcRenderer.on(channel, listener)
            return () => ipcRenderer.removeListener(channel, listener)
        },
        once: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
            ipcRenderer.once(channel, listener)
        },
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
    }
}

const api = {
    llm: {
        call: (message: string) => electronAPI.ipcRenderer.invoke("llm:call", message),
        chat: (messages: BaseMessageLike[], systemPrompt?: string, enableRAG?: boolean, enableSearch?: boolean) => electronAPI.ipcRenderer.invoke("llm:chat", messages, systemPrompt, enableRAG, enableSearch),
        chatStream: (
            onChunk: (chunk: LLMResultStream) => void,
            onError: (error: any) => void,
            onEnd: () => void,
            traceId: string,
            messages: BaseMessageLike[],
            systemPrompt?: string,
            enableRAG?: boolean,
            enableSearch?: boolean
        ) => {
            const removeChunkListener = electronAPI.ipcRenderer.on("llm:chat-chunk", (_event, chunk) => {
                if (chunk.traceId === traceId) onChunk(chunk)
            })
            const removeErrorListener = electronAPI.ipcRenderer.on("llm:chat-error", (_event, error) => {
                if (error.traceId === traceId) onError(error)
            })
            const removeEndListener = electronAPI.ipcRenderer.on("llm:chat-end", (_event, end) => {
                if (end.traceId === traceId) onEnd()
            })
            electronAPI.ipcRenderer.send("llm:chat-stream", traceId, messages, systemPrompt, enableRAG, enableSearch);
            return () => {
                removeChunkListener()
                removeErrorListener()
                removeEndListener()
            }
        }
    },
    rag: {
        ingest: (filePath?: string) => electronAPI.ipcRenderer.invoke("rag:ingest", filePath),
        retrieve: (query: string, topK?: number) => electronAPI.ipcRenderer.invoke("rag:retrieve", query, topK),
        list: () => electronAPI.ipcRenderer.invoke("rag:list"),
        clear: () => electronAPI.ipcRenderer.invoke("rag:clear"),
        remove: (id: number) => electronAPI.ipcRenderer.invoke("rag:remove", id)
    }
}

try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
} catch (error) {
    console.error(error)
}
