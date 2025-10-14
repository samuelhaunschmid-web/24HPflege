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
  chooseDirectory: (title) => ipcRenderer.invoke('dialog:chooseDirectory', title),
  checkLibreOffice: () => ipcRenderer.invoke('api:checkLibreOffice'),
  installLibreOffice: () => ipcRenderer.invoke('api:installLibreOffice'),
  checkHomebrew: () => ipcRenderer.invoke('api:checkHomebrew'),
  installHomebrew: () => ipcRenderer.invoke('api:installHomebrew'),
  getPlatform: () => ipcRenderer.invoke('api:getPlatform'),
  checkChocolatey: () => ipcRenderer.invoke('api:checkChocolatey'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  
  // Mail
  mail: {
    googleStartAuth: () => ipcRenderer.invoke('mail:google:startAuth'),
    googleStoreTokens: (tokens) => ipcRenderer.invoke('mail:google:storeTokens', tokens),
    googleDisconnect: () => ipcRenderer.invoke('mail:google:disconnect'),
    send: (payload) => ipcRenderer.invoke('mail:send', payload),
    sendBatch: (list) => ipcRenderer.invoke('mail:sendBatch', list),
    logs: () => ipcRenderer.invoke('mail:logs'),
    deleteLog: (time) => ipcRenderer.invoke('mail:logs:delete', time),
    clearLogs: () => ipcRenderer.invoke('mail:logs:clear'),
  }
});

contextBridge.exposeInMainWorld('docgen', {
  getLists: () => ipcRenderer.invoke('data:getLists'),
  getVorlagenTree: () => ipcRenderer.invoke('vorlagen:getTree'),
  listDocx: () => ipcRenderer.invoke('vorlagen:listDocx'),
  generateDocs: (args) => ipcRenderer.invoke('docs:generate', args),
  generateHtmlPdf: (args) => ipcRenderer.invoke('docs:generateHtmlPdf', args),
  listInvoiceTemplates: () => ipcRenderer.invoke('rechnungsvorlagen:list'),
  generateInvoices: (args) => ipcRenderer.invoke('invoices:generate', args),
});

contextBridge.exposeInMainWorld('db', {
  kundenAdd: (row) => ipcRenderer.invoke('kunden:add', row),
  kundenUpdate: (payload) => ipcRenderer.invoke('kunden:update', payload),
  kundenDelete: (__key) => ipcRenderer.invoke('kunden:delete', __key),
  kundenRestore: (__key) => ipcRenderer.invoke('kunden:restore', __key),
  archivKundenList: () => ipcRenderer.invoke('archiv:kunden:list'),
  archivKundenDelete: (__key) => ipcRenderer.invoke('archiv:kunden:delete', __key),
  betreuerAdd: (row) => ipcRenderer.invoke('betreuer:add', row),
  betreuerUpdate: (payload) => ipcRenderer.invoke('betreuer:update', payload),
  betreuerDelete: (__key) => ipcRenderer.invoke('betreuer:delete', __key),
  betreuerRestore: (__key) => ipcRenderer.invoke('betreuer:restore', __key),
  archivBetreuerList: () => ipcRenderer.invoke('archiv:betreuer:list'),
  archivBetreuerDelete: (__key) => ipcRenderer.invoke('archiv:betreuer:delete', __key),
  archivDebug: () => ipcRenderer.invoke('archiv:debug'),
});


