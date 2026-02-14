/**
 * Type declarations for the Electron preload API and Forge-injected globals.
 */

export interface SystemInfo {
    platform: string;
    arch: string;
    hostname: string;
    nodeVersion: string;
    electronVersion: string;
    cpuModel: string;
    cpuCores: number;
    totalMemoryGB: string;
}

export interface ElectronAPI {
    getSystemInfo: () => Promise<SystemInfo>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
