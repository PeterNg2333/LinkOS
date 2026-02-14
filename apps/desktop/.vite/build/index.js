"use strict";
const electron = require("electron");
const electronAPI = {
  getSystemInfo: () => electron.ipcRenderer.invoke("get-system-info")
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
