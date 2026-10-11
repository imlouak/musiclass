const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  importScoreFile: (file) => ipcRenderer.invoke('scores:import-file', webUtils.getPathForFile(file)),
  pickAttachment: () => ipcRenderer.invoke('attachment:pick'),
  storeAttachment: (file) => ipcRenderer.invoke('attachment:store-file', webUtils.getPathForFile(file)),
  openAttachment: (attachment) => ipcRenderer.invoke('attachment:open', attachment),
  removeAttachment: (attachment) => ipcRenderer.invoke('attachment:remove', attachment),
  installUpdate: () => ipcRenderer.send('update:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, value) => callback(value)
    ipcRenderer.on('update:status', listener)
    return () => ipcRenderer.removeListener('update:status', listener)
  },
  onMaximized: (callback) => {
    const listener = (_event, value) => callback(value)
    ipcRenderer.on('window:maximized', listener)
    return () => ipcRenderer.removeListener('window:maximized', listener)
  },
})
