import log from './logger';
import { app, BrowserWindow } from 'electron';
import { join } from 'path';

import { setupLLMHandlers } from "@main/modules/llm/chat"
import setupRAGHandlers from "@main/modules/llm/rqg"

const logger = log.scope('main');
logger.info('Main process started...');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    });

    mainWindow.on('ready-to-show', () => mainWindow.show());

    process.env.ELECTRON_RENDERER_URL
        ? mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
        : mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    setupLLMHandlers();
    setupRAGHandlers();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
