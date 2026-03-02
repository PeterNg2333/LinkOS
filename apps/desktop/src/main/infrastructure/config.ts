import dotenv from "dotenv";

interface Config {
    apiKey: string
    tavilyApiKey: string
}

dotenv.config();

const tempConfig = {}
const readConfigFromEnv = (
    configObject: object,
    keyName: string,
    envKey: string,
    defaultValue: string
) => {
    Object.defineProperty(configObject, keyName, {
        value: process.env[envKey] || defaultValue,
        writable: false,
        configurable: false,
        enumerable: false
    })
}
readConfigFromEnv(tempConfig, "apiKey", "OPEN_ROUTER_API_KEY", "")
readConfigFromEnv(tempConfig, "tavilyApiKey", "TAWVILY_API_KEY", "")

const config = tempConfig as Config
export default config
