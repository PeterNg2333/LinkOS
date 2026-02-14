"use strict";
const electron = require("electron");
const path = require("path");
const os = require("os");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => mainWindow.show());
  {
    mainWindow.loadURL("http://localhost:5173");
  }
}
electron.ipcMain.handle("get-system-info", () => {
  const cpus = os.cpus();
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    cpuModel: cpus.length > 0 ? cpus[0].model : "Unknown",
    cpuCores: cpus.length,
    totalMemoryGB: (os.totalmem() / 1073741824).toFixed(2)
  };
});
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
