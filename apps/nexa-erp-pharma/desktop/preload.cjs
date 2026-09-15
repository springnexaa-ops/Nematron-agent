const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nexaERP', {
  getData: () => ipcRenderer.invoke('nexa:get-data'),
  saveData: data => ipcRenderer.invoke('nexa:save-data', data),
  queueSync: event => ipcRenderer.invoke('nexa:queue-sync', event),
});
