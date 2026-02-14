import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure, narrowly-scoped API exposed to the renderer process.
 * No generic IPC passthrough — each method maps to a specific channel.
 */
const electronAPI = {
    getSystemInfo: (): Promise<{
        platform: string;
        arch: string;
        hostname: string;
        nodeVersion: string;
        electronVersion: string;
        cpuModel: string;
        cpuCores: number;
        totalMemoryGB: string;
    }> => ipcRenderer.invoke('get-system-info'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
