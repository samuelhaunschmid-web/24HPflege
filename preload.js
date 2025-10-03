const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', cb),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_e, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', cb),
  onUpdateError: (cb) => ipcRenderer.on('update:error', (_e, err) => cb(err)),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  quitAndInstall: () => ipcRenderer.invoke('update:install'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (partial) => ipcRenderer.invoke('config:set', partial),
  chooseDirectory: (title) => ipcRenderer.invoke('dialog:chooseDirectory', title)
});

contextBridge.exposeInMainWorld('docgen', {
  getLists: () => ipcRenderer.invoke('data:getLists'),
  getVorlagenTree: () => ipcRenderer.invoke('vorlagen:getTree'),
  listDocx: () => ipcRenderer.invoke('vorlagen:listDocx'),
  generateDocs: (args) => ipcRenderer.invoke('docs:generate', args),
  listInvoiceTemplates: () => ipcRenderer.invoke('rechnungsvorlagen:list'),
  generateInvoices: (args) => ipcRenderer.invoke('invoices:generate', args),
});

contextBridge.exposeInMainWorld('db', {
  kundenAdd: (row) => ipcRenderer.invoke('kunden:add', row),
  kundenUpdate: (payload) => ipcRenderer.invoke('kunden:update', payload),
  kundenDelete: (__key) => ipcRenderer.invoke('kunden:delete', __key),
  betreuerAdd: (row) => ipcRenderer.invoke('betreuer:add', row),
  betreuerUpdate: (payload) => ipcRenderer.invoke('betreuer:update', payload),
  betreuerDelete: (__key) => ipcRenderer.invoke('betreuer:delete', __key),
});


