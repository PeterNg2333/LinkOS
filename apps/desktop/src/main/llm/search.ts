import { tavily, type TavilySearchResponse, type TavilySearchOptions } from "@tavily/core";
import config from "@main/config";
import log from "electron-log/main";

const logger = log.scope("llm:search");

const tavilyClient = tavily({
    apiKey: config.tavilyApiKey,
})

interface SearchResult {
    success: boolean
    summary?: string
    items: Array<{
        title: string,
        url: string,
        content: string,
        confidence: number,
    }>
    error?: any
}

const search = async (
    query: string,
    topK: number = 3,
    specificDomains?: string[],
    requireRawContent: boolean = false
): Promise<SearchResult> => {
    try {
        const res = await tavilyClient.search(query, {
            maxResults: topK,
            includeAnswer: false,
            includeRawContent: requireRawContent,
            includeDomains: specificDomains,
        } as TavilySearchOptions)
        logger.info("Search results:", res)
        return {
            success: true,
            summary: res.answer,
            items: res.results.map(result => ({
                title: result.title,
                url: result.url,
                content: result.content,
                confidence: result.score,
            })),
        }
    } catch (err) {
        logger.error("Error searching:", err)
        return {
            success: false,
            items: [],
            error: err
        }
    }
}

export { search }
