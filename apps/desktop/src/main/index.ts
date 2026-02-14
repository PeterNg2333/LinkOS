import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import os from 'os';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 960,
        height: 700,
        minWidth: 600,
        minHeight: 400,
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        },
    });

    mainWindow.on('ready-to-show', () => mainWindow.show());

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        );
    }
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('get-system-info', () => {
    const cpus = os.cpus();
    return {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron,
        cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown',
        cpuCores: cpus.length,
        totalMemoryGB: (os.totalmem() / 1073741824).toFixed(2),
    };
});

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
