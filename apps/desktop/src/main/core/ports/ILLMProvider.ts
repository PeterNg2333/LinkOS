import { MessageDTO } from "../types/message.type";

type FinishReason = 
    | 'stop'
    | 'length'
    | 'content_filter'
    | 'tool_calls'
    | 'unknown';

type LLMResult = {
    success: boolean;
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };       
    finishReason?: FinishReason; 
    model?: string;
    error?: Error;
}

interface ILLMProvider {
    generateText(messages: MessageDTO[], systemPrompt?: string): Promise<LLMResult>;
    streamText(
        messages: MessageDTO[],
        systemPrompt?: string,
        onChunk?: (chunk: string) => void,
        onEnd?: () => void,
        onError?: (error: Error) => void
    ): Promise<LLMResult>;
}

export type { FinishReason, LLMResult, ILLMProvider }

