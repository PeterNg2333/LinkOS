import { app, BrowserWindow, MessageChannelMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { RPCHandler } from "@orpc/server/message-port";

import appRouter from "./api/index";

// ==========================================
// 1. Initialization & Paths
// ==========================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set root directory and other paths
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

// Static resources path
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

// ==========================================
// 2. Window Management
// ==========================================
const rpcHandler = new RPCHandler(appRouter);
let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // After Loading successfully, test active push message to Renderer-process.
  mainWindow.webContents.on("did-finish-load", () => {
    if (!mainWindow) return;
    const { port1, port2 } = new MessageChannelMain();
    rpcHandler.upgrade(port1);
    port1.start();
    mainWindow.webContents.postMessage("orpc-port", null, [port2]);
  });

  // Load the appropriate URL or file based on the environment
  VITE_DEV_SERVER_URL // Dev or build? Load URL or file accordingly
    ? mainWindow.loadURL(VITE_DEV_SERVER_URL)
    : mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// ==========================================
// 3. App Lifecycle
// ==========================================
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});
app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

export { VITE_DEV_SERVER_URL, MAIN_DIST, RENDERER_DIST };
