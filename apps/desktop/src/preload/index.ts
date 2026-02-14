import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
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

const api = {}

try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
} catch (error) {
    console.error(error)
}
