import { ipcMain } from "electron"
import { ChatOpenAI } from "@langchain/openai"
import { type BaseMessageLike } from "@langchain/core/messages"


import config from "@main/config"
import { retrieveContext } from "@main/llm/rqg"



const chatModel = new ChatOpenAI({
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    apiKey: config.apiKey,
    model: "google/gemini-2.5-flash-lite",
    temperature: 0.7,
})

const injectContext = async (systemPrompt: string, query: string): Promise<string> => {
    const instructions = systemPrompt || "You are a helpful assistant."

    try {
        const context = await retrieveContext(query)
        if (!context) return instructions
        return `${instructions}\n\n**Context**:\n${context}\n\n**Query**:\n${query}`
    } catch (err) {
        console.error("Error injecting context:", err)
        return instructions
    }
}


const setupLLMHandlers = () => {
    ipcMain.handle("llm:call", async (_, message: string) => {
        try {
            const res = await chatModel.invoke(message)
            return { success: true, content: res.content }
        } catch (err) {
            console.error("Error in LLM call:", err)
            return { success: false, error: err }
        }
    });



    ipcMain.handle('llm:chat', async (_, messages: BaseMessageLike[], systemPrompt?: string, enableRAG: boolean = false) => {
        try {
            let enrichedSystemPrompt = null
            if (enableRAG) {
                const lastMsg = messages[messages.length - 1];
                const lastMessage = typeof lastMsg === 'string' ? lastMsg : (lastMsg as any).content?.toString() || "";
                enrichedSystemPrompt = await injectContext(systemPrompt || "", lastMessage)
            }

            const langchainMessages = [...messages]
            systemPrompt
                ? langchainMessages.unshift({ role: "system", content: enrichedSystemPrompt || systemPrompt })
                : null

            const res = await chatModel.invoke(langchainMessages)
            return { success: true, content: res.content }
        } catch (err) {
            console.error("Error in LLM chat:", err)
            return { success: false, error: err }
        }
    });

    ipcMain.on('llm:chat-stream', async (evt, traceId: string, messages: BaseMessageLike[], systemPrompt?: string, enableRAG: boolean = false) => {
        try {
            let enrichedSystemPrompt = null
            if (enableRAG) {
                const lastMsg = messages[messages.length - 1];
                const lastMessage = typeof lastMsg === 'string' ? lastMsg : (lastMsg as any).content?.toString() || "";
                enrichedSystemPrompt = await injectContext(systemPrompt || "", lastMessage)
            }

            const langchainMessages = [...messages]
            systemPrompt
                ? langchainMessages.unshift({ role: "system", content: enrichedSystemPrompt || systemPrompt })
                : null

            const stream = await chatModel.stream(langchainMessages)
            for await (const chunk of stream) {
                evt.sender.send("llm:chat-chunk", { success: true, content: chunk.content, traceId })
            }
            evt.sender.send("llm:chat-end", { success: true, content: "", traceId })
        } catch (err) {
            console.error("Error in LLM chat stream:", err)
            evt.sender.send("llm:chat-error", { success: false, error: err, traceId })
        }
    })
}

export { setupLLMHandlers }