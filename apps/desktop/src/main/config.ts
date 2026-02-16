import dotenv from "dotenv";

dotenv.config();

const config = {}

Object.defineProperty(config, "apiKey", {
    value: process.env.OPEN_ROUTER_API_KEY || "",
    writable: false,
    configurable: false,
    enumerable: false
})

Object.defineProperty(config, "tavilyApiKey", {
    value: process.env.TAWVILY_API_KEY || "",
    writable: false,
    configurable: false,
    enumerable: false
})

export default config as { apiKey: string, tavilyApiKey: string }
