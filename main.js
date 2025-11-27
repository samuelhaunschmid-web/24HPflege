const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const mammoth = require('mammoth');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL;

let splashWindow = null;
let mainWindow = null;
let childWindows = new Set();

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Erstelle HTML für Splash Screen
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: white;
        }
        .logo {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
          font-size: 18px;
          margin-bottom: 30px;
          opacity: 0.9;
        }
        .loading {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .progress-text {
          font-size: 14px;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="logo">24h Pflege</div>
      <div class="subtitle">Verwaltungs-App</div>
      <div class="loading">
        <div class="spinner"></div>
        <div class="progress-text">App wird gestartet...</div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  
  // Zentriere das Fenster
  splashWindow.center();
  
  return splashWindow;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'app-icon.png'),
    show: false, // Verstecke das Hauptfenster zunächst
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    const indexHtml = path.join(__dirname, 'renderer', 'dist', 'index.html');
    mainWindow.loadFile(indexHtml);
  }

  // Zeige das Hauptfenster, sobald es geladen ist
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  // Timeout für Splash Screen (falls Hauptfenster nicht lädt)
  setTimeout(() => {
    if (splashWindow && !mainWindow.isVisible()) {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
    }
  }, 20000); // 20 Sekunden Timeout

  return mainWindow;
}

function createWindow() {
  // Erstelle zuerst den Splash Screen
  createSplashWindow();
  
  // Erstelle dann das Hauptfenster (versteckt)
  return createMainWindow();
}

function getConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
}
function readConfig() {
  const cfgPath = getConfigPath();
  if (fs.existsSync(cfgPath)) {
    try { return JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch { return {}; }
  }
  return {};
}
function writeConfig(cfg) {
  const cfgPath = getConfigPath();
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

function excelDateToString(excelDate) {
  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }
  return excelDate;
}
function fixDates(obj) {
  const dateFields = ['kgebdat', 'Geburtsdatum'];
  Object.keys(obj).forEach(key => {
    if (dateFields.includes(key) || /^b\d*anfang$/i.test(key) || /^b\d*ende$/i.test(key)) {
      obj[key] = excelDateToString(obj[key]);
    }
  });
  return obj;
}
function writeExcel(filePath, data) {
  if (!Array.isArray(data)) data = [];
  const allKeys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  const normalized = data.map(obj => {
    const copy = { ...obj };
    allKeys.forEach(k => { if (!(k in copy)) copy[k] = ''; });
    return copy;
  });
  const ws = XLSX.utils.json_to_sheet(normalized);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filePath);
}

function buildDocxTree(dir, rel = '') {
  let tree = [];
  if (!fs.existsSync(dir)) return tree;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    // Temp-/Systemdateien ausblenden
    if (
      file.startsWith('~$') || // Office-Temp
      file.startsWith('._') || // macOS Resource Fork
      file === '.DS_Store' ||
      file === 'Thumbs.db' ||
      file === 'desktop.ini' ||
      file.startsWith('.') // versteckte Ordner/Dateien
    ) continue;
    const filePath = path.join(dir, file);
    const relPath = rel ? path.join(rel, file) : file;
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      tree.push({ type: 'folder', name: file, relPath, children: buildDocxTree(filePath, relPath) });
    } else if (file.toLowerCase().endsWith('.docx')) {
      tree.push({ type: 'file', name: file, relPath });
    }
  }
  return tree;
}
async function replacePlaceholders(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '[[', end: ']]' },
    nullGetter: function(part) {
      return { raw: `<w:r><w:rPr><w:color w:val=\"FF0000\"/></w:rPr><w:t>${part.tag}</w:t></w:r>` };
    }
  });
  doc.setData(data);
  doc.render();
  return doc.getZip().generate({ type: 'nodebuffer' });
}
async function replaceFilenamePlaceholders(filename, data) {
  return filename.replace(/\[\[(.*?)\]\]/g, (m, key) => (data[key] == null ? m : String(data[key])));
}

// Finde LibreOffice (soffice) ausführbare Datei oder Kommando
function findSofficeExecutable() {
  try {
    const { spawnSync } = require('child_process');
    const os = require('os');
    const pathMod = require('path');

    // 1) Windows: bevorzugt absolute Pfade aus Program Files (auch wenn PATH-Binaries existieren)
    try {
      if (os.platform() === 'win32') {
        const pf = process.env['ProgramFiles'];
        const pfx86 = process.env['ProgramFiles(x86)'];
        const bases = [pf, pfx86].filter(Boolean);
        for (const base of bases) {
          try {
            const candidates = [];
            // Versioned folders
            try {
              const entries = fs.readdirSync(base, { withFileTypes: true });
              for (const e of entries) {
                if (e.isDirectory() && /^LibreOffice/i.test(e.name)) {
                  const prg = pathMod.join(base, e.name, 'program');
                  candidates.push(pathMod.join(prg, 'soffice.exe'));
                  candidates.push(pathMod.join(prg, 'soffice.com'));
                }
              }
            } catch {}
            // Standard folder
            candidates.push(pathMod.join(base, 'LibreOffice', 'program', 'soffice.exe'));
            candidates.push(pathMod.join(base, 'LibreOffice', 'program', 'soffice.com'));
            for (const c of candidates) {
              if (c && fs.existsSync(c)) return c;
            }
          } catch {}
        }
      }
    } catch {}

    // 2) Versuche absolute Pfade über where/which zu bekommen
    const tryResolve = (cmd) => {
      try {
        if (os.platform() === 'win32') {
          const w = spawnSync('where', [cmd], { stdio: 'pipe', shell: true });
          const out = String(w.stdout || '').trim();
          const exe = out.split(/\r?\n/).find(Boolean);
          if (w.status === 0 && exe && fs.existsSync(exe)) return exe;
        } else {
          const w = spawnSync('which', [cmd], { stdio: 'pipe' });
          const out = String(w.stdout || '').trim();
          if (w.status === 0 && out && fs.existsSync(out)) return out;
        }
      } catch {}
      return null;
    };
    const resolvedSoffice = tryResolve('soffice');
    if (resolvedSoffice) return resolvedSoffice;
    const resolvedLowriter = tryResolve('lowriter');
    if (resolvedLowriter) return resolvedLowriter;
    const resolvedSofficeCom = tryResolve('soffice.com');
    if (resolvedSofficeCom) return resolvedSofficeCom;

    // 3) Fallback: Kommando-Namen (kein absoluter Pfad)
    const tryCmd = (cmd) => {
      try { const r = spawnSync(cmd, ['--version'], { stdio: 'pipe', shell: true }); return r.status === 0; } catch { return false; }
    };
    if (tryCmd('soffice')) return 'soffice';
    if (tryCmd('lowriter')) return 'lowriter';
    if (tryCmd('soffice.com')) return 'soffice.com';
  } catch {}
  return null;
}

// Datum: Parser/Formatter für DD.MM.YYYY
function parseDateDDMMYYYY(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const monthIndex = Number(m[2]) - 1; // 0-basierter Monat
    const year = Number(m[3]);
    return new Date(year, monthIndex, day);
  }
  try { return new Date(value); } catch { return null; }
}
function formatDateDDMMYYYY(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

app.whenReady().then(() => {
  const win = createWindow();

  autoUpdater.on('update-available', () => mainWindow?.webContents.send('update:available'));
  autoUpdater.on('download-progress', (p) => mainWindow?.webContents.send('update:progress', p));
  autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update:downloaded'));
  autoUpdater.on('error', (err) => mainWindow?.webContents.send('update:error', err == null ? '' : String(err)));

  ipcMain.handle('update:check', async () => {
    if (isDev) return { dev: true };
    const res = await autoUpdater.checkForUpdatesAndNotify();
    return { checked: true, res };
  });
  ipcMain.handle('update:install', () => { if (!isDev) autoUpdater.quitAndInstall(); });

  ipcMain.handle('config:get', () => readConfig());
  ipcMain.handle('config:set', (_e, partial) => {
    const current = readConfig();
    const next = { ...current, ...partial };
    writeConfig(next);
    return next;
  });
  // Einstellungen exportieren
  ipcMain.handle('settings:export', async () => {
    const cfg = readConfig();
    // Baue Export-Payload mit relevanten Feldern
    const payload = {
      tableSettings: cfg.tableSettings || {},
      invoiceTemplateDisplayNames: cfg.invoiceTemplateDisplayNames || {},
      emailTemplates: cfg.emailTemplates || {},
      autoInvoicePrefs: cfg.autoInvoicePrefs || {},
      mail: {
        googleClientId: cfg.googleClientId || null,
        googleClientSecret: cfg.googleClientSecret || null,
      },
      paths: {
        datenDir: cfg.datenDir || null,
        altDatenDir: cfg.altDatenDir || null,
        vorlagenDir: cfg.vorlagenDir || null,
        rechnungsvorlageDir: cfg.rechnungsvorlageDir || null,
        libreOfficePath: cfg.libreOfficePath || null,
      }
    };
    return { ok: true, payload };
  });
  // Einstellungen importieren (Merge)
  ipcMain.handle('settings:import', async (_e, imported) => {
    try {
      const current = readConfig();
      const src = imported || {};
      const next = { ...current };
      if (src.tableSettings && typeof src.tableSettings === 'object') {
        next.tableSettings = { ...(current.tableSettings || {}), ...src.tableSettings };
      }
      if (src.invoiceTemplateDisplayNames && typeof src.invoiceTemplateDisplayNames === 'object') {
        next.invoiceTemplateDisplayNames = { ...(current.invoiceTemplateDisplayNames || {}), ...src.invoiceTemplateDisplayNames };
      }
      if (src.emailTemplates && typeof src.emailTemplates === 'object') {
        next.emailTemplates = { ...(current.emailTemplates || {}), ...src.emailTemplates };
      }
      if (src.mail && typeof src.mail === 'object') {
        if (typeof src.mail.googleClientId === 'string') next.googleClientId = src.mail.googleClientId;
        if (typeof src.mail.googleClientSecret === 'string') next.googleClientSecret = src.mail.googleClientSecret;
      }
      if (src.autoInvoicePrefs && typeof src.autoInvoicePrefs === 'object') {
        next.autoInvoicePrefs = { ...(current.autoInvoicePrefs || {}), ...src.autoInvoicePrefs };
      }
      if (src.paths && typeof src.paths === 'object') {
        const p = src.paths;
        if (p.datenDir) next.datenDir = p.datenDir;
        if (p.altDatenDir) next.altDatenDir = p.altDatenDir;
        if (p.vorlagenDir) next.vorlagenDir = p.vorlagenDir;
        if (p.rechnungsvorlageDir) next.rechnungsvorlageDir = p.rechnungsvorlageDir;
        if (p.libreOfficePath) next.libreOfficePath = p.libreOfficePath;
      }
      writeConfig(next);
      return { ok: true, next };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });
  
  // Mail – Google OAuth Platzhalter & Versand-Stubs
  ipcMain.handle('mail:google:startAuth', async () => {
    const cfg = readConfig();
    const clientId = cfg.googleClientId;
    const clientSecret = cfg.googleClientSecret;
    if (!clientId || !clientSecret) {
      return { ok: false, message: 'Bitte Google Client ID & Client Secret in den Einstellungen eintragen.' };
    }
    // Starte echten OAuth-Login über lokalen Redirect (Loopback)
    const http = require('http');
    const crypto = require('crypto');
    const port = 53219 + Math.floor(Math.random()*1000);
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/gmail.send openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

    return await new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (!req.url) return;
          const urlObj = new URL(req.url, `http://127.0.0.1:${port}`);
          if (urlObj.pathname !== '/callback') return;
          const code = urlObj.searchParams.get('code');
          const returnedState = urlObj.searchParams.get('state');
          if (!code || returnedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('OAuth Fehler');
            server.close();
            return resolve({ ok: false, message: 'Ungültiger Code/State' });
          }
          // Tausche Code gegen Tokens
          const data = new URLSearchParams();
          data.set('code', code);
          data.set('client_id', clientId);
          data.set('client_secret', clientSecret);
          data.set('redirect_uri', redirectUri);
          data.set('grant_type', 'authorization_code');
          const https = require('https');
          const tokenRes = await new Promise((res2, rej2) => {
            const req2 = https.request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, (r) => {
              const chunks = [];
              r.on('data', c => chunks.push(c));
              r.on('end', () => {
                try { res2(JSON.parse(Buffer.concat(chunks).toString('utf-8'))); } catch (e) { rej2(e); }
              });
            });
            req2.on('error', rej2);
            req2.write(data.toString());
            req2.end();
          });
          const accessToken = tokenRes.access_token;
          const refreshToken = tokenRes.refresh_token;
          // Userinfo abfragen (E-Mail)
          let email = '';
          if (accessToken) {
            try {
              const userinfo = await new Promise((res2, rej2) => {
                const req3 = https.request('https://www.googleapis.com/oauth2/v3/userinfo', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } }, (r) => {
                  const chunks = [];
                  r.on('data', c => chunks.push(c));
                  r.on('end', () => {
                    try { res2(JSON.parse(Buffer.concat(chunks).toString('utf-8'))); } catch (e) { rej2(e); }
                  });
                });
                req3.on('error', rej2);
                req3.end();
              });
              email = userinfo && userinfo.email ? String(userinfo.email) : '';
            } catch {}
          }
          const current2 = readConfig();
          const next2 = { ...current2, googleOAuthTokens: tokenRes || null, googleRefreshToken: refreshToken || current2.googleRefreshToken, fromAddress: email || current2.fromAddress };
          writeConfig(next2);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Login erfolgreich. Sie können dieses Fenster schließen.</h3></body></html>');
          server.close();
          return resolve({ ok: true, email: email || null });
        } catch (e) {
          try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Fehler'); } catch {}
          server.close();
          return resolve({ ok: false, message: String(e) });
        }
      });
      server.listen(port, async () => {
        try { await shell.openExternal(authUrl); } catch {}
      });
    });
  });
  ipcMain.handle('mail:google:storeTokens', async (_e, tokens) => {
    const current = readConfig();
    const next = { ...current, googleOAuthTokens: tokens || null, googleRefreshToken: tokens?.refresh_token || current.googleRefreshToken };
    writeConfig(next);
    return { ok: true };
  });
  ipcMain.handle('mail:google:disconnect', async () => {
    const current = readConfig();
    const next = { ...current, googleOAuthTokens: null };
    writeConfig(next);
    return { ok: true };
  });
  ipcMain.handle('mail:send', async (_e, payload) => {
    // payload: { to, subject, text, html, attachments, fromName, fromAddress }
    const cfg = readConfig();
    if (!cfg.googleOAuthTokens) {
      return { ok: false, message: 'Mail nicht konfiguriert (Google nicht verbunden)' };
    }
    try {
      const { sendMailWithOAuth2 } = require('./mailService');
      return await sendMailWithOAuth2(app, cfg, payload || {});
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });
  ipcMain.handle('mail:sendBatch', async (_e, list) => {
    const cfg = readConfig();
    if (!cfg.googleOAuthTokens) {
      return { ok: false, message: 'Mail nicht konfiguriert (Google nicht verbunden)' };
    }
    try {
      const { sendMailWithOAuth2 } = require('./mailService');
      const results = [];
      const arr = Array.isArray(list) ? list : [];
      for (const item of arr) {
        // eslint-disable-next-line no-await-in-loop
        const r = await sendMailWithOAuth2(app, cfg, item || {});
        results.push(r);
      }
      const ok = results.every(r => r && r.ok);
      return { ok, results };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });
  ipcMain.handle('mail:logs', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const p = path.join(userDataPath, 'mail-log.json');
      if (!fs.existsSync(p)) return [];
      const data = JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
      return Array.isArray(data) ? data.slice(-200).reverse() : [];
    } catch (e) {
      return [];
    }
  });
  ipcMain.handle('mail:logs:delete', async (_e, timeIso) => {
    try {
      const p = path.join(app.getPath('userData'), 'mail-log.json');
      if (!fs.existsSync(p)) return { ok: true };
      const arr = JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
      const next = arr.filter((x) => x && x.time !== timeIso);
      fs.writeFileSync(p, JSON.stringify(next, null, 2));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });
  ipcMain.handle('mail:logs:clear', async () => {
    try {
      const p = path.join(app.getPath('userData'), 'mail-log.json');
      fs.writeFileSync(p, JSON.stringify([], null, 2));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });
  ipcMain.handle('dialog:chooseDirectory', async (_e, title) => {
    const res = await dialog.showOpenDialog({ title: title || 'Ordner wählen', properties: ['openDirectory'] });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });
  ipcMain.handle('dialog:chooseFile', async (_e, args) => {
    const opts = { title: (args && args.title) || 'Datei wählen', properties: ['openFile'], filters: (args && args.filters) || undefined };
    const res = await dialog.showOpenDialog(opts);
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });
  ipcMain.handle('dialog:saveFile', async (_e, args) => {
    const opts = { 
      title: (args && args.title) || 'Datei speichern', 
      defaultPath: (args && args.defaultPath) || 'rechnungsprotokoll.txt',
      filters: (args && args.filters) || [{ name: 'Textdateien', extensions: ['txt'] }]
    };
    const res = await dialog.showSaveDialog(opts);
    if (res.canceled || !res.filePath) return null;
    return res.filePath;
  });
  ipcMain.handle('file:writeText', async (_e, args) => {
    const { filePath, content } = args || {};
    if (!filePath || typeof content !== 'string') throw new Error('Ungültige Parameter');
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true };
  });

  // Ordner-Struktur sicherstellen (Dokumente/KundenDaten | Dokumente/BetreuerDaten)
  ipcMain.handle('folders:ensureStructure', async (_e, args) => {
    try {
      const baseDir = (args && args.baseDir) || '';
      const personType = (args && args.personType) === 'betreuer' ? 'betreuer' : 'kunden';
      const names = Array.isArray(args && args.names) ? args.names : [];
      const subfolders = Array.isArray(args && args.subfolders) ? args.subfolders : [];
      if (!baseDir || !fs.existsSync(baseDir)) return { ok: false, message: 'Dokumente-Ordner ungültig oder nicht gesetzt' };
      const root = path.join(baseDir, personType === 'betreuer' ? 'BetreuerDaten' : 'KundenDaten');
      if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
      // Archiv-Ordner erstellen
      const archiveDir = path.join(root, 'Archiv');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
      let createdCount = 0;
      let createdSubCount = 0;
      for (const name of names) {
        if (!name || typeof name !== 'string') continue;
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-').trim();
        if (!safeName) continue;
        const personDir = path.join(root, safeName);
        if (!fs.existsSync(personDir)) { fs.mkdirSync(personDir, { recursive: true }); createdCount++; }
        for (const sf of subfolders) {
          let segments = [];
          if (Array.isArray(sf)) {
            segments = sf.map(s => String(s || '').trim()).filter(Boolean);
          } else {
            const sfTrim = String(sf || '').trim();
            if (!sfTrim) continue;
            segments = sfTrim.split(/[\\/]+/).map(s => s.trim()).filter(Boolean);
          }
          if (!segments.length) continue;
          const sanitized = segments.map(seg => seg.replace(/[\\/:*?"<>|]/g, '-'));
          const subDir = path.join(personDir, ...sanitized);
          if (!fs.existsSync(subDir)) { fs.mkdirSync(subDir, { recursive: true }); createdSubCount++; }
        }
      }
      return { ok: true, root, createdCount, createdSubCount };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });

  // Hilfsfunktion: Ordner in Archiv verschieben
  async function moveFolderToArchive(args) {
    try {
      const baseDir = (args && args.baseDir) || '';
      const personType = (args && args.personType) === 'betreuer' ? 'betreuer' : 'kunden';
      const personName = String(args && args.personName || '').trim();
      if (!baseDir || !fs.existsSync(baseDir)) return { ok: false, message: 'Dokumente-Ordner ungültig oder nicht gesetzt' };
      if (!personName) return { ok: false, message: 'Personenname fehlt' };
      
      const root = path.join(baseDir, personType === 'betreuer' ? 'BetreuerDaten' : 'KundenDaten');
      const archiveDir = path.join(root, 'Archiv');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
      
      const safeName = personName.replace(/[\\/:*?"<>|]/g, '-').trim();
      const personDir = path.join(root, safeName);
      
      if (!fs.existsSync(personDir)) {
        // Ordner existiert nicht, versuche alternative Namensvarianten
        const nameParts = safeName.split(/\s+/).filter(Boolean);
        if (nameParts.length >= 2) {
          const altName1 = nameParts.join(' ');
          const altName2 = [...nameParts].reverse().join(' ');
          const altDir1 = path.join(root, altName1);
          const altDir2 = path.join(root, altName2);
          if (fs.existsSync(altDir1)) {
            const targetDir = path.join(archiveDir, altName1);
            if (fs.existsSync(targetDir)) {
              // Ziel existiert bereits, füge Timestamp hinzu
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
              const targetDirWithTimestamp = path.join(archiveDir, `${altName1}_${timestamp}`);
              fs.renameSync(altDir1, targetDirWithTimestamp);
            } else {
              fs.renameSync(altDir1, targetDir);
            }
            return { ok: true, message: 'Ordner erfolgreich ins Archiv verschoben' };
          } else if (fs.existsSync(altDir2)) {
            const targetDir = path.join(archiveDir, altName2);
            if (fs.existsSync(targetDir)) {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
              const targetDirWithTimestamp = path.join(archiveDir, `${altName2}_${timestamp}`);
              fs.renameSync(altDir2, targetDirWithTimestamp);
            } else {
              fs.renameSync(altDir2, targetDir);
            }
            return { ok: true, message: 'Ordner erfolgreich ins Archiv verschoben' };
          }
        }
        return { ok: false, message: 'Ordner nicht gefunden' };
      }
      
      const targetDir = path.join(archiveDir, safeName);
      if (fs.existsSync(targetDir)) {
        // Ziel existiert bereits, füge Timestamp hinzu
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const targetDirWithTimestamp = path.join(archiveDir, `${safeName}_${timestamp}`);
        fs.renameSync(personDir, targetDirWithTimestamp);
      } else {
        fs.renameSync(personDir, targetDir);
      }
      return { ok: true, message: 'Ordner erfolgreich ins Archiv verschoben' };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  }

  // Ordner in Archiv verschieben (IPC Handler)
  ipcMain.handle('folders:moveToArchive', async (_e, args) => {
    return await moveFolderToArchive(args);
  });

  // Inhalte für Personenordner auflisten
  ipcMain.handle('folders:listForPersons', async (_e, args) => {
    try {
      const baseDir = (args && args.baseDir) || '';
      const personType = (args && args.personType) === 'betreuer' ? 'betreuer' : 'kunden';
      const names = Array.isArray(args && args.names) ? args.names : [];
      if (!baseDir || !fs.existsSync(baseDir)) return { ok: false, message: 'Dokumente-Ordner ungültig oder nicht gesetzt' };
      const root = path.join(baseDir, personType === 'betreuer' ? 'BetreuerDaten' : 'KundenDaten');
      const result = [];
      for (const name of names) {
        const safeName = String(name || '').replace(/[\\/:*?"<>|]/g, '-').trim();
        if (!safeName) continue;
        const personDir = path.join(root, safeName);
        const exists = fs.existsSync(personDir);
        const entry = { name: safeName, dir: personDir, exists, subfolders: [] };
        if (exists) {
          const items = fs.readdirSync(personDir, { withFileTypes: true });
          for (const it of items) {
            if (it.isDirectory()) {
              const subDir = path.join(personDir, it.name);
              const files = fs.readdirSync(subDir, { withFileTypes: true })
                .filter(f => f.isFile())
                .map(f => f.name);
              entry.subfolders.push({ name: it.name, files });
            }
          }
        }
        result.push(entry);
      }
      return { ok: true, root, result };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });

  // Datei-Pfad für Email-Anhänge ermitteln
  ipcMain.handle('folders:getFilePath', async (_e, args) => {
    try {
      const baseDir = (args && args.baseDir) || '';
      const personType = (args && args.personType) === 'betreuer' ? 'betreuer' : 'kunden';
      const personName = String(args && args.personName || '').trim();
      const folderPath = Array.isArray(args && args.folderPath) ? args.folderPath : [];
      const fileName = String(args && args.fileName || '').trim();
      if (!baseDir || !fs.existsSync(baseDir) || !personName || !fileName) return { ok: false, exists: false };
      const root = path.join(baseDir, personType === 'betreuer' ? 'BetreuerDaten' : 'KundenDaten');
      let filePath = path.join(root, personName);
      for (const seg of folderPath) {
        filePath = path.join(filePath, String(seg || '').replace(/[\\/:*?"<>|]/g, '-'));
      }
      const fullPath = path.join(filePath, fileName);
      const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
      return { ok: true, exists, path: exists ? fullPath : null };
    } catch (e) {
      return { ok: false, exists: false, message: String(e) };
    }
  });

  ipcMain.handle('folders:moveFile', async (_e, args) => {
    try {
      const baseDir = (args && args.baseDir) || '';
      const fromPersonType = (args && args.fromPersonType) === 'betreuer' ? 'betreuer' : 'kunden';
      const toPersonType = (args && args.toPersonType) === 'betreuer' ? 'betreuer' : 'kunden';
      const fromPersonName = String(args && args.fromPersonName || '').trim();
      const toPersonName = String(args && args.toPersonName || '').trim();
      const fromPath = Array.isArray(args && args.fromPath) ? args.fromPath : [];
      const toPath = Array.isArray(args && args.toPath) ? args.toPath : [];
      const fileName = String(args && args.fileName || '').trim();
      if (!baseDir || !fs.existsSync(baseDir)) return { ok: false, message: 'Dokumente-Ordner ungültig' };
      if (!fromPersonName || !toPersonName || !fileName) return { ok: false, message: 'Parameter unvollständig' };
      function sanitizeName(name) {
        return String(name || '').replace(/[\\/:*?"<>|]/g, '-').trim();
      }
      function buildPersonDir(personType, personName) {
        const root = path.join(baseDir, personType === 'betreuer' ? 'BetreuerDaten' : 'KundenDaten');
        return path.join(root, sanitizeName(personName));
      }
      function sanitizePathSegments(list) {
        return list.map(seg => sanitizeName(seg)).filter(Boolean);
      }
      const sourceDir = path.join(buildPersonDir(fromPersonType, fromPersonName), ...sanitizePathSegments(fromPath));
      const targetDir = path.join(buildPersonDir(toPersonType, toPersonName), ...sanitizePathSegments(toPath));
      const sourceFile = path.join(sourceDir, sanitizeName(fileName));
      if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) {
        return { ok: false, message: 'Quelldatei nicht gefunden', missing: true };
      }
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetFile = path.join(targetDir, sanitizeName(fileName));
      fs.renameSync(sourceFile, targetFile);
      return { ok: true, from: sourceFile, to: targetFile };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });

  // Neues Fenster für Ordner-Management-Dialog öffnen
  ipcMain.handle('window:openFolderDialog', async (_e, args) => {
    try {
      const personType = (args && args.personType) === 'betreuer' ? 'betreuer' : 'kunden';
      const urlHash = `#/dialog/ordner?personType=${encodeURIComponent(personType)}`;
      const child = new BrowserWindow({
        width: 560,
        height: 560,
        modal: false,
        parent: mainWindow || undefined,
        resizable: true,
        minimizable: false,
        maximizable: false,
        title: 'Ordner-Management',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        }
      });
      childWindows.add(child);
      child.on('closed', () => { childWindows.delete(child); });
      if (isDev) {
        const devUrl = (process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || 'http://localhost:5173') + urlHash;
        child.loadURL(devUrl);
      } else {
        const indexHtml = path.join(__dirname, 'renderer', 'dist', 'index.html');
        child.loadFile(indexHtml, { hash: urlHash.replace('#', '') });
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });

  // Neues Fenster für Mail-Vorlagen-Dialog öffnen
  ipcMain.handle('window:openMailTemplatesDialog', async () => {
    try {
      const urlHash = '#/dialog/dateien-mail'
      const child = new BrowserWindow({
        width: 800,
        height: 640,
        modal: false,
        parent: mainWindow || undefined,
        resizable: true,
        minimizable: false,
        maximizable: false,
        title: 'Vorlagen bearbeiten',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        }
      });
      childWindows.add(child);
      child.on('closed', () => { childWindows.delete(child); });
      if (isDev) {
        const devUrl = (process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || 'http://localhost:5173') + urlHash;
        child.loadURL(devUrl);
      } else {
        const indexHtml = path.join(__dirname, 'renderer', 'dist', 'index.html');
        child.loadFile(indexHtml, { hash: urlHash.replace('#', '') });
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });

  // LibreOffice Installation
  ipcMain.handle('api:checkLibreOffice', async () => {
    const { spawnSync } = require('child_process');
    try {
      // Auto-Detect und speichern, falls gefunden
      try {
        const detected = findSofficeExecutable();
        if (detected) {
          const cfg = readConfig();
          if (!cfg.libreOfficePath) writeConfig({ ...cfg, libreOfficePath: detected });
        }
      } catch {}
      // Wenn bereits in config gesetzt und Datei existiert → installiert
      try {
        const cfg0 = readConfig();
        if (cfg0.libreOfficePath && fs.existsSync(cfg0.libreOfficePath)) return true;
      } catch {}
      // 1) Direkt über PATH
      const result1 = spawnSync('soffice', ['--version'], { stdio: 'pipe', shell: true });
      if (result1.status === 0) return true;

      const result2 = spawnSync('lowriter', ['--version'], { stdio: 'pipe', shell: true });
      if (result2.status === 0) return true;

      // soffice.com (CLI-Stub auf Windows)
      const result3 = spawnSync('soffice.com', ['--version'], { stdio: 'pipe', shell: true });
      if (result3.status === 0) return true;

      // 2) Windows: versuche 'where' und Standard-Installpfade
      try {
        const os = require('os');
        if (os.platform() === 'win32') {
          // Schneller Existenz-Check der Standardpfade
          const pf = process.env['ProgramFiles'] || 'C\\\\Program Files';
          const pfx86 = process.env['ProgramFiles(x86)'];
          const pathMod = require('path');
          const stdCandidates = [
            pathMod.join(pf, 'LibreOffice', 'program', 'soffice.exe'),
            pathMod.join(pf, 'LibreOffice', 'program', 'soffice.com'),
            pfx86 ? pathMod.join(pfx86, 'LibreOffice', 'program', 'soffice.exe') : null,
            pfx86 ? pathMod.join(pfx86, 'LibreOffice', 'program', 'soffice.com') : null,
          ].filter(Boolean);
          for (const c of stdCandidates) {
            try { if (fs.existsSync(c)) return true; } catch {}
          }
          const tryWhere = (cmd) => {
            const w = spawnSync('where', [cmd], { stdio: 'pipe', shell: true });
            const out = String(w.stdout || '').trim();
            if (w.status === 0 && out) {
              const exe = out.split(/\r?\n/).find(Boolean);
              if (exe) {
                const r = spawnSync(exe, ['--version'], { stdio: 'pipe', shell: true });
                if (r.status === 0) return true;
              }
            }
            return false;
          };
          if (tryWhere('soffice') || tryWhere('soffice.exe') || tryWhere('soffice.com')) return true;
          const baseDirs = [pf, pfx86].filter(Boolean);
          const candidates = [];
          for (const base of baseDirs) {
            try {
              // Finde Ordner, die mit "LibreOffice" beginnen (z.B. LibreOffice, LibreOffice 24, etc.)
              const entries = fs.readdirSync(base, { withFileTypes: true });
              for (const e of entries) {
                if (e.isDirectory() && /^LibreOffice/i.test(e.name)) {
                  const prg = pathMod.join(base, e.name, 'program');
                  candidates.push(pathMod.join(prg, 'soffice.exe'));
                  candidates.push(pathMod.join(prg, 'soffice.com'));
                }
              }
            } catch {}
            // Standardordner ohne Versionssuffix
            candidates.push(pathMod.join(base, 'LibreOffice', 'program', 'soffice.exe'));
            candidates.push(pathMod.join(base, 'LibreOffice', 'program', 'soffice.com'));
          }
          for (const c of candidates) {
            try {
              if (c && fs.existsSync(c)) {
                // Pfad mit Leerzeichen: zuerst ohne Shell ausführen
                let r = spawnSync(c, ['--version'], { stdio: 'pipe', shell: false });
                if (r.status !== 0) {
                  // Fallback: über cmd.exe mit komplett gequoteter Befehlszeile
                  const cmdline = '"' + c.replace(/"/g, '""') + '" --version';
                  r = spawnSync('cmd', ['/c', cmdline], { stdio: 'pipe', shell: false });
                }
                if (r.status === 0) return true;
              }
            } catch {}
          }
        }
      } catch {}

      // 3) macOS/Linux: nothing else to check here beyond PATH
      return false;
    } catch (error) {
      return false;
    }
  });

  // Detaillierter LibreOffice-Check mit Logging
  ipcMain.handle('api:checkLibreOfficeDetailed', async () => {
    const { spawnSync } = require('child_process');
    const os = require('os');
    const pathMod = require('path');
    const steps = {};
    let ok = false;
    try {
      // PATH Checks
      const r1 = spawnSync('soffice', ['--version'], { stdio: 'pipe', shell: true });
      steps.path_soffice = { code: r1.status, out: String(r1.stdout||''), err: String(r1.stderr||'') };
      if (r1.status === 0) ok = true;
      if (!ok) {
        const r2 = spawnSync('lowriter', ['--version'], { stdio: 'pipe', shell: true });
        steps.path_lowriter = { code: r2.status, out: String(r2.stdout||''), err: String(r2.stderr||'') };
        if (r2.status === 0) ok = true;
      }
      if (!ok) {
        const r3 = spawnSync('soffice.com', ['--version'], { stdio: 'pipe', shell: true });
        steps.path_soffice_com = { code: r3.status, out: String(r3.stdout||''), err: String(r3.stderr||'') };
        if (r3.status === 0) ok = true;
      }

      // Windows: where und Standardpfade
      const candidates = [];
      if (os.platform() === 'win32') {
        const tryWhere = (cmdKey) => {
          const w = spawnSync('where', [cmdKey], { stdio: 'pipe', shell: true });
          steps['where_'+cmdKey] = { code: w.status, out: String(w.stdout||''), err: String(w.stderr||'') };
          const out = String(w.stdout||'').trim();
          if (w.status === 0 && out) {
            const exe = out.split(/\r?\n/).find(Boolean);
            if (exe) candidates.push(exe);
          }
        };
        tryWhere('soffice');
        tryWhere('soffice.exe');
        tryWhere('soffice.com');
        const pf = process.env['ProgramFiles'] || 'C\\\\Program Files';
        const pfx86 = process.env['ProgramFiles(x86)'];
        const baseDirs = [pf, pfx86].filter(Boolean);
        for (const base of baseDirs) {
          try {
            const entries = fs.readdirSync(base, { withFileTypes: true });
            for (const e of entries) {
              if (e.isDirectory() && /^LibreOffice/i.test(e.name)) {
                const prg = pathMod.join(base, e.name, 'program');
                candidates.push(pathMod.join(prg, 'soffice.exe'));
                candidates.push(pathMod.join(prg, 'soffice.com'));
              }
            }
          } catch {}
          candidates.push(pathMod.join(base, 'LibreOffice', 'program', 'soffice.exe'));
          candidates.push(pathMod.join(base, 'LibreOffice', 'program', 'soffice.com'));
        }
      }
      const tested = [];
      for (const c of Array.from(new Set(candidates))) {
        try {
          if (c && fs.existsSync(c)) {
            const r = spawnSync(c, ['--version'], { stdio: 'pipe', shell: true });
            steps['exec_'+c] = { code: r.status, out: String(r.stdout||''), err: String(r.stderr||'') };
            tested.push(c);
            if (r.status === 0) { ok = true; break; }
          } else if (c) {
            steps['exists_'+c] = { exists: false };
          }
        } catch (e) {
          steps['exec_'+c] = { code: -1, err: String(e) };
        }
      }

      const logObj = { ok, steps, tested };
      try {
        const logPath = pathMod.join(app.getPath('userData'), 'libreoffice-check.json');
        fs.writeFileSync(logPath, JSON.stringify(logObj, null, 2));
        logObj.logPath = logPath;
      } catch {}
      return logObj;
    } catch (error) {
      return { ok: false, error: String(error), steps };
    }
  });

  // Prüfe Homebrew Verfügbarkeit (macOS)
  ipcMain.handle('api:checkHomebrew', async () => {
    try {
      const os = require('os');
      if (os.platform() !== 'darwin') return false;
      const { spawnSync } = require('child_process');
      const whichBrew = spawnSync('which', ['brew'], { stdio: 'pipe' });
      if (whichBrew.status === 0) return true;
      // Prüfe Standardpfade
      try {
        if (fs.existsSync('/opt/homebrew/bin/brew')) return true;
        if (fs.existsSync('/usr/local/bin/brew')) return true;
      } catch {}
      return false;
    } catch {
      return false;
    }
  });

  // macOS: Homebrew installieren (non-interactive)
  ipcMain.handle('api:installHomebrew', async () => {
    try {
      const os = require('os');
      if (os.platform() !== 'darwin') return { ok: false, message: 'not-macos' };
      const { spawnSync } = require('child_process');
      // Wenn bereits vorhanden → ok
      try {
        if (fs.existsSync('/opt/homebrew/bin/brew') || fs.existsSync('/usr/local/bin/brew')) {
          return { ok: true, alreadyInstalled: true };
        }
      } catch {}
      // Offizielles Installscript non-interactive ausführen
      const cmd = '/bin/bash';
      const args = ['-c', 'NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'];
      const res = spawnSync(cmd, args, { stdio: 'pipe', timeout: 1200000, shell: false });
      // Nach-Check
      const ok = fs.existsSync('/opt/homebrew/bin/brew') || fs.existsSync('/usr/local/bin/brew');
      return {
        ok,
        code: res.status,
        stdout: String(res.stdout || ''),
        stderr: String(res.stderr || ''),
      };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  });

  // Plattform abrufen
  ipcMain.handle('api:getPlatform', async () => {
    try { return require('os').platform(); } catch { return process.platform; }
  });

  // App neu starten
  ipcMain.handle('app:restart', async () => {
    try {
      app.relaunch();
      app.exit(0);
      return true;
    } catch (e) {
      return false;
    }
  });

  // Windows: Chocolatey prüfen
  ipcMain.handle('api:checkChocolatey', async () => {
    try {
      const os = require('os');
      if (os.platform() !== 'win32') return false;
      const { spawnSync } = require('child_process');
      const choco = spawnSync('choco', ['-v'], { stdio: 'pipe', shell: true });
      return choco.status === 0;
    } catch {
      return false;
    }
  });

  ipcMain.handle('api:installLibreOffice', async () => {
    const { spawnSync } = require('child_process');
    const os = require('os');
    const platform = os.platform();
    const https = require('https');
    const { URL } = require('url');
    async function downloadFileWithProgress(fileUrl, destPath) {
      return await new Promise((resolve) => {
        try {
          const urlObj = new URL(fileUrl);
          const req = https.get({ protocol: urlObj.protocol, hostname: urlObj.hostname, path: urlObj.pathname + (urlObj.search || '') }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return resolve(downloadFileWithProgress(res.headers.location, destPath));
            }
            const total = Number(res.headers['content-length'] || 0);
            let received = 0;
            const out = fs.createWriteStream(destPath);
            res.on('data', (chunk) => {
              received += chunk.length;
              try { if (total > 0) { const percent = Math.min(99, Math.floor((received / total) * 100)); mainWindow?.webContents.send('libre:install:progress', { step: 'download', message: 'Lade Installer herunter...', percent }); } } catch {}
              out.write(chunk);
            });
            res.on('end', () => { try { out.end(); } catch {}; try { mainWindow?.webContents.send('libre:install:progress', { step: 'download', message: 'Download abgeschlossen', percent: 100 }); } catch {}; resolve({ ok: true }); });
            res.on('error', (e) => { try { out.destroy(); } catch {}; resolve({ ok: false, error: String(e) }); });
          });
          req.on('error', (e) => resolve({ ok: false, error: String(e) }));
        } catch (e) { resolve({ ok: false, error: String(e) }); }
      });
    }
 
     
     try {
       if (platform === 'darwin') {
         // macOS: LibreOffice via Homebrew installieren (nur Brew, kein DMG)
         try { if (fs.existsSync('/Applications/LibreOffice.app')) return true; } catch {}
         // Finde Homebrew Pfad (GUI-Apps haben oft kein PATH)
         let brewPath = 'brew';
         const whichBrew = require('child_process').spawnSync('which', ['brew'], { stdio: 'pipe' });
         if (whichBrew.status === 0) {
           brewPath = String(whichBrew.stdout || '').toString().trim() || 'brew';
         } else if (fs.existsSync('/opt/homebrew/bin/brew')) {
           brewPath = '/opt/homebrew/bin/brew';
         } else if (fs.existsSync('/usr/local/bin/brew')) {
           brewPath = '/usr/local/bin/brew';
         } else {
           return { ok: false, message: 'Homebrew not found', brewPath: null };
         }
         // Versuche vorherige fehlerhafte Cask-Installation zu entfernen
         const uninst = require('child_process').spawnSync(brewPath, ['uninstall', '--cask', '--force', 'libreoffice'], {
           stdio: 'pipe',
           timeout: 300000
         });
         const inst = require('child_process').spawnSync(brewPath, ['install', '--cask', 'libreoffice'], { 
           stdio: 'pipe',
           timeout: 900000
         });
         return {
           ok: inst.status === 0,
           brewPath,
           uninstall: {
             code: uninst.status,
             stdout: String(uninst.stdout || '').toString(),
             stderr: String(uninst.stderr || '').toString(),
           },
           install: {
             code: inst.status,
             stdout: String(inst.stdout || '').toString(),
             stderr: String(inst.stderr || '').toString(),
           }
         };
       } else if (platform === 'win32') {
         // Windows – mehrstufiger Installer (Chocolatey → Winget → Direkter MSI Download)
         const result = { steps: {} };
 
         // 1) Versuche Chocolatey zu finden/zu installieren
         const ensureChoco = () => {
          try { mainWindow?.webContents.send('libre:install:progress', { step: 'choco-check', message: 'Prüfe Chocolatey...', percent: 5 }); } catch {}
           const chk = require('child_process').spawnSync('choco', ['-v'], { stdio: 'pipe', shell: true });
           if (chk.status === 0) {
             return { ok: true, installed: false, stdout: String(chk.stdout||''), stderr: String(chk.stderr||'') };
           }
           // Versuche erhöhte Installation via UAC-Prompt
          try { mainWindow?.webContents.send('libre:install:progress', { step: 'choco-install', message: 'Installiere Chocolatey...', percent: 10 }); } catch {}
           const elevated = require('child_process').spawnSync('powershell.exe', [
             '-NoProfile',
             '-ExecutionPolicy', 'Bypass',
             '-Command',
             'Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command \"[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor 3072; iwr https://community.chocolatey.org/install.ps1 -UseBasicParsing | iex\""'
           ], { stdio: 'pipe', shell: false, timeout: 900000 });
           const verify = require('child_process').spawnSync('choco', ['-v'], { stdio: 'pipe', shell: true });
           return { ok: verify.status === 0, installed: true, stdout: String(elevated.stdout||'') + String(verify.stdout||''), stderr: String(elevated.stderr||'') + String(verify.stderr||'') };
         };
 
         const chocoRes = ensureChoco();
         result.steps.chocolatey = chocoRes;
         if (chocoRes.ok) {
          try { mainWindow?.webContents.send('libre:install:progress', { step: 'choco-libreo', message: 'Installiere LibreOffice über Chocolatey...', percent: 25 }); } catch {}
           const inst = require('child_process').spawnSync('choco', ['install', 'libreoffice', '-y'], { stdio: 'pipe', shell: true, timeout: 1200000 });
           result.steps.chocoInstall = { code: inst.status, stdout: String(inst.stdout||''), stderr: String(inst.stderr||'') };
           if (inst.status === 0) return { ok: true, ...result };
         }
 
         // 2) Fallback: Winget
         try { mainWindow?.webContents.send('libre:install:progress', { step: 'winget-check', message: 'Prüfe Winget...', percent: 35 }); } catch {}
         const wingetChk = require('child_process').spawnSync('winget', ['--version'], { stdio: 'pipe', shell: true });
         result.steps.wingetCheck = { code: wingetChk.status, stdout: String(wingetChk.stdout||''), stderr: String(wingetChk.stderr||'') };
         if (wingetChk.status === 0) {
          try { mainWindow?.webContents.send('libre:install:progress', { step: 'winget-install', message: 'Installiere LibreOffice über Winget...', percent: 45 }); } catch {}
           const wg = require('child_process').spawnSync('winget', ['install', '--id', 'TheDocumentFoundation.LibreOffice', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'], { stdio: 'pipe', shell: true, timeout: 1200000 });
           result.steps.wingetInstall = { code: wg.status, stdout: String(wg.stdout||''), stderr: String(wg.stderr||'') };
           if (wg.status === 0) return { ok: true, ...result };
         }
 
         // 3) Fallback: Direkter Download + MSI Silent Install
         try { mainWindow?.webContents.send('libre:install:progress', { step: 'download-start', message: 'Starte direkten Download...', percent: 55 }); } catch {}
         const tmpDir = app.getPath('temp');
         const msiPath = path.join(tmpDir, 'LibreOffice_Win_x64.msi');
         const fileUrl = 'https://download.documentfoundation.org/libreoffice/stable/7.6.7/win/x86_64/LibreOffice_7.6.7_Win_x86-64.msi';
         const dlRes = await downloadFileWithProgress(fileUrl, msiPath);
         result.steps.directDownload = { code: dlRes.ok ? 0 : 1, error: dlRes.error || null };
         if (dlRes.ok && fs.existsSync(msiPath)) {
           try { mainWindow?.webContents.send('libre:install:progress', { step: 'msi-install', message: 'Installiere LibreOffice...', percent: 90 }); } catch {}
           // Silent install
           const msiexec = require('child_process').spawnSync('msiexec', ['/i', msiPath, '/qn', 'ALLUSERS=1'], { stdio: 'pipe', shell: true, timeout: 1200000 });
           result.steps.msiexec = { code: msiexec.status, stdout: String(msiexec.stdout||''), stderr: String(msiexec.stderr||'') };
           if (msiexec.status === 0) return { ok: true, ...result };
         }
 
         return { ok: false, message: 'LibreOffice installation failed (need admin?)', ...result };
       } else {
         // Linux - apt/yum/dnf
         let result;
         if (require('child_process').spawnSync('which', ['apt'], { stdio: 'pipe' }).status === 0) {
           result = require('child_process').spawnSync('sudo', ['apt', 'update', '&&', 'sudo', 'apt', 'install', '-y', 'libreoffice'], { 
             stdio: 'pipe',
             timeout: 300000,
             shell: true
           });
         } else if (require('child_process').spawnSync('which', ['yum'], { stdio: 'pipe' }).status === 0) {
           result = require('child_process').spawnSync('sudo', ['yum', 'install', '-y', 'libreoffice'], { 
             stdio: 'pipe',
             timeout: 300000
           });
         } else if (require('child_process').spawnSync('which', ['dnf'], { stdio: 'pipe' }).status === 0) {
           result = require('child_process').spawnSync('sudo', ['dnf', 'install', '-y', 'libreoffice'], { 
             stdio: 'pipe',
             timeout: 300000
           });
         } else {
           return false;
         }
         return result.status === 0;
       }
     } catch (error) {
       console.error('LibreOffice installation error:', error);
       return { ok: false, message: String(error) };
     }
   });

  // Data lists
  ipcMain.handle('data:getLists', () => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const kundenPath = path.join(datenDir, 'Kundendaten.xlsx');
    const betreuerPath = path.join(datenDir, 'Betreuerinnendaten.xlsx');
    let kunden = [];
    let betreuer = [];
    if (fs.existsSync(kundenPath)) {
      const wb = XLSX.readFile(kundenPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      kunden = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map(fixDates);
    }
    if (fs.existsSync(betreuerPath)) {
      const wb = XLSX.readFile(betreuerPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      betreuer = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map(fixDates);
    }
    const getKundenKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    const getBetreuerKey = (b) => `${String(b['Vor.Nam']||'').toLowerCase()}__${String(b['Fam. Nam']||'').toLowerCase()}`;
    const kundenWithDisplay = kunden.map(k => ({ ...k, __display: `${k.kvname || ''} ${k.kfname || ''}`.trim(), __key: getKundenKey(k) }));
    const betreuerWithDisplay = betreuer.map(b => ({ ...b, __display: `${b['Vor.Nam'] || ''} ${b['Fam. Nam'] || ''}`.trim(), __key: getBetreuerKey(b) }));
    return { kunden: kundenWithDisplay, betreuer: betreuerWithDisplay };
  });

  // CRUD Kunden
  ipcMain.handle('kunden:add', (_e, row) => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const filePath = path.join(datenDir, 'Kundendaten.xlsx');
    let data = [];
    if (fs.existsSync(filePath)) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    data.push(row || {});
    writeExcel(filePath, data);
    return true;
  });
  ipcMain.handle('kunden:update', (_e, payload) => {
    const { __key, updates } = payload || {};
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const filePath = path.join(datenDir, 'Kundendaten.xlsx');
    let data = [];
    if (fs.existsSync(filePath)) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    const getKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    const idx = data.findIndex(k => getKey(k) === __key);
    if (idx >= 0) {
      data[idx] = { ...data[idx], ...(updates||{}) };
      writeExcel(filePath, data);
      return true;
    }
    return false;
  });
  ipcMain.handle('kunden:delete', async (_e, __key) => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const filePath = path.join(datenDir, 'Kundendaten.xlsx');
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTkundendaten.xlsx');
    let data = [];
    if (fs.existsSync(filePath)) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    const getKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    const idx = data.findIndex(k => getKey(k) === __key);
    if (idx >= 0) {
      const removed = data.splice(idx, 1)[0];
      writeExcel(filePath, data);
      let alt = [];
      if (fs.existsSync(altPath)) {
        try {
          const wbAlt = XLSX.readFile(altPath);
          const sheetAlt = wbAlt.Sheets[wbAlt.SheetNames[0]];
          alt = XLSX.utils.sheet_to_json(sheetAlt, { defval: '' });
        } catch {}
      }
      alt.push(removed);
      writeExcel(altPath, alt);
      
      // Ordner ins Archiv verschieben
      const kfname = String(removed.kfname || '').trim();
      const kvname = String(removed.kvname || '').trim();
      if (kfname || kvname) {
        const personName = `${kfname} ${kvname}`.trim();
        const baseDir = cfg.dokumenteDir || '';
        if (baseDir && fs.existsSync(baseDir)) {
          await moveFolderToArchive({ baseDir, personType: 'kunden', personName });
        }
      }
      
      return true;
    }
    return false;
  });

  // CRUD Betreuer
  ipcMain.handle('betreuer:add', (_e, row) => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const filePath = path.join(datenDir, 'Betreuerinnendaten.xlsx');
    let data = [];
    if (fs.existsSync(filePath)) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    data.push(row || {});
    writeExcel(filePath, data);
    return true;
  });
  ipcMain.handle('betreuer:update', (_e, payload) => {
    const { __key, updates } = payload || {};
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const filePath = path.join(datenDir, 'Betreuerinnendaten.xlsx');
    let data = [];
    if (fs.existsSync(filePath)) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    const getKey = (b) => `${String(b['Vor.Nam']||'').toLowerCase()}__${String(b['Fam. Nam']||'').toLowerCase()}`;
    const idx = data.findIndex(b => getKey(b) === __key);
    if (idx >= 0) {
      data[idx] = { ...data[idx], ...(updates||{}) };
      writeExcel(filePath, data);
      return true;
    }
    return false;
  });
  ipcMain.handle('betreuer:delete', async (_e, __key) => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const filePath = path.join(datenDir, 'Betreuerinnendaten.xlsx');
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTbetreuerinnendaten.xlsx');
    let data = [];
    if (fs.existsSync(filePath)) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    const getKey = (b) => `${String(b['Vor.Nam']||'').toLowerCase()}__${String(b['Fam. Nam']||'').toLowerCase()}`;
    const idx = data.findIndex(b => getKey(b) === __key);
    if (idx >= 0) {
      const removed = data.splice(idx, 1)[0];
      writeExcel(filePath, data);
      let alt = [];
      if (fs.existsSync(altPath)) {
        try {
          const wbAlt = XLSX.readFile(altPath);
          const sheetAlt = wbAlt.Sheets[wbAlt.SheetNames[0]];
          alt = XLSX.utils.sheet_to_json(sheetAlt, { defval: '' });
        } catch {}
      }
      alt.push(removed);
      writeExcel(altPath, alt);
      
      // Ordner ins Archiv verschieben
      const famNam = String(removed['Fam. Nam'] || '').trim();
      const vorNam = String(removed['Vor.Nam'] || '').trim();
      if (famNam || vorNam) {
        const personName = `${famNam} ${vorNam}`.trim();
        const baseDir = cfg.dokumenteDir || '';
        if (baseDir && fs.existsSync(baseDir)) {
          await moveFolderToArchive({ baseDir, personType: 'betreuer', personName });
        }
      }
      
      return true;
    }
    return false;
  });

  // Archiv – Listen aus ALT-Dateien lesen
  ipcMain.handle('archiv:kunden:list', () => {
    const cfg = readConfig();
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTkundendaten.xlsx');
    let kunden = [];
    if (fs.existsSync(altPath)) {
      try {
        const wb = XLSX.readFile(altPath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        kunden = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map(fixDates);
      } catch {}
    }
    const getKundenKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    const withDisplay = kunden.map(k => ({ ...k, __display: `${k.kvname || ''} ${k.kfname || ''}`.trim(), __key: getKundenKey(k) }));
    return withDisplay;
  });
  ipcMain.handle('archiv:betreuer:list', () => {
    const cfg = readConfig();
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTbetreuerinnendaten.xlsx');
    let betreuer = [];
    if (fs.existsSync(altPath)) {
      try {
        const wb = XLSX.readFile(altPath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        betreuer = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map(fixDates);
      } catch {}
    }
    const getBetreuerKey = (b) => `${String(b['Vor.Nam']||'').toLowerCase()}__${String(b['Fam. Nam']||'').toLowerCase()}`;
    const withDisplay = betreuer.map(b => ({ ...b, __display: `${b['Vor.Nam'] || ''} ${b['Fam. Nam'] || ''}`.trim(), __key: getBetreuerKey(b) }));
    return withDisplay;
  });

  // Archiv – Wiederherstellen (von ALT nach aktiv)
  ipcMain.handle('kunden:restore', (_e, __key) => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const mainPath = path.join(datenDir, 'Kundendaten.xlsx');
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTkundendaten.xlsx');
    let main = [];
    if (fs.existsSync(mainPath)) {
      const wb = XLSX.readFile(mainPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      main = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    let alt = [];
    if (fs.existsSync(altPath)) {
      const wbAlt = XLSX.readFile(altPath);
      const sheetAlt = wbAlt.Sheets[wbAlt.SheetNames[0]];
      alt = XLSX.utils.sheet_to_json(sheetAlt, { defval: '' });
    }
    const getKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    const idx = alt.findIndex(k => getKey(k) === __key);
    if (idx >= 0) {
      const restored = alt.splice(idx, 1)[0];
      main.push(restored);
      writeExcel(mainPath, main);
      writeExcel(altPath, alt);
      return true;
    }
    return false;
  });
  ipcMain.handle('betreuer:restore', (_e, __key) => {
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const mainPath = path.join(datenDir, 'Betreuerinnendaten.xlsx');
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTbetreuerinnendaten.xlsx');
    let main = [];
    if (fs.existsSync(mainPath)) {
      const wb = XLSX.readFile(mainPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      main = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    let alt = [];
    if (fs.existsSync(altPath)) {
      const wbAlt = XLSX.readFile(altPath);
      const sheetAlt = wbAlt.Sheets[wbAlt.SheetNames[0]];
      alt = XLSX.utils.sheet_to_json(sheetAlt, { defval: '' });
    }
    const getKey = (b) => `${String(b['Vor.Nam']||'').toLowerCase()}__${String(b['Fam. Nam']||'').toLowerCase()}`;
    const idx = alt.findIndex(b => getKey(b) === __key);
    if (idx >= 0) {
      const restored = alt.splice(idx, 1)[0];
      main.push(restored);
      writeExcel(mainPath, main);
      writeExcel(altPath, alt);
      return true;
    }
    return false;
  });

  // Archiv – endgültig löschen (nur aus ALT entfernen)
  ipcMain.handle('archiv:kunden:delete', (_e, __key) => {
    const cfg = readConfig();
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTkundendaten.xlsx');
    let alt = [];
    if (fs.existsSync(altPath)) {
      const wbAlt = XLSX.readFile(altPath);
      const sheetAlt = wbAlt.Sheets[wbAlt.SheetNames[0]];
      alt = XLSX.utils.sheet_to_json(sheetAlt, { defval: '' });
    }
    const getKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    const idx = alt.findIndex(k => getKey(k) === __key);
    if (idx >= 0) {
      alt.splice(idx, 1);
      writeExcel(altPath, alt);
      return true;
    }
    return false;
  });
  ipcMain.handle('archiv:betreuer:delete', (_e, __key) => {
    const cfg = readConfig();
    const altPath = path.join(cfg.altDatenDir || path.join(__dirname, 'AlteDaten'), 'ALTbetreuerinnendaten.xlsx');
    let alt = [];
    if (fs.existsSync(altPath)) {
      const wbAlt = XLSX.readFile(altPath);
      const sheetAlt = wbAlt.Sheets[wbAlt.SheetNames[0]];
      alt = XLSX.utils.sheet_to_json(sheetAlt, { defval: '' });
    }
    const getKey = (b) => `${String(b['Vor.Nam']||'').toLowerCase()}__${String(b['Fam. Nam']||'').toLowerCase()}`;
    const idx = alt.findIndex(b => getKey(b) === __key);
    if (idx >= 0) {
      alt.splice(idx, 1);
      writeExcel(altPath, alt);
      return true;
    }
    return false;
  });

  // Archiv – Diagnose: Pfade und Existenz prüfen
  ipcMain.handle('archiv:debug', () => {
    const cfg = readConfig();
    const altDir = cfg.altDatenDir || path.join(__dirname, 'AlteDaten');
    const kundenPath = path.join(altDir, 'ALTkundendaten.xlsx');
    const betreuerPath = path.join(altDir, 'ALTbetreuerinnendaten.xlsx');
    return {
      altDir,
      kundenPath,
      betreuerPath,
      altDirExists: fs.existsSync(altDir),
      kundenExists: fs.existsSync(kundenPath),
      betreuerExists: fs.existsSync(betreuerPath),
    };
  });

  // Vorlagen
  ipcMain.handle('vorlagen:getTree', () => {
    const cfg = readConfig();
    const dir = cfg.vorlagenDir || path.join(__dirname, 'Vorlagen');
    return buildDocxTree(dir);
  });
  ipcMain.handle('vorlagen:list', () => {
    const cfg = readConfig();
    const dir = cfg.vorlagenDir || path.join(__dirname, 'Vorlagen');
    return buildDocxTree(dir);
  });
  ipcMain.handle('rechnungsvorlagen:list', () => {
    const cfg = readConfig();
    const dir = cfg.rechnungsvorlageDir || path.join(__dirname, 'RechnungsVorlagen');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(file => {
        // ausblenden: Temp/Systemdateien und versteckte Dateien
        if (
          file.startsWith('~$') ||
          file.startsWith('._') ||
          file === '.DS_Store' ||
          file === 'Thumbs.db' ||
          file === 'desktop.ini' ||
          file.startsWith('.')
        ) return false;
        return file.toLowerCase().endsWith('.docx');
      })
      .map(file => ({ name: file, absPath: path.join(dir, file) }));
  });

  // Vorlagen-Gruppen Management
  ipcMain.handle('vorlagengruppen:getAll', () => {
    const cfg = readConfig();
    const groups = cfg.templateGroups || {};
    let order = cfg.templateGroupOrder || [];

    // Fallback: Wenn order leer ist aber groups vorhanden, verwende die Keys von groups
    if (order.length === 0 && Object.keys(groups).length > 0) {
      order = Object.keys(groups);
    }

    return {
      groups: groups,
      order: order
    };
  });

  ipcMain.handle('vorlagengruppen:create', (_e, name) => {
    const cfg = readConfig();
    const groups = cfg.templateGroups || {};
    const order = cfg.templateGroupOrder || [];

    if (groups[name]) throw new Error(`Gruppe "${name}" existiert bereits`);

    const newGroups = { ...groups, [name]: [] };
    const newOrder = order.includes(name) ? order : [...order, name];

    const next = {
      ...cfg,
      templateGroups: newGroups,
      templateGroupOrder: newOrder
    };

    writeConfig(next);
    return true;
  });

  ipcMain.handle('vorlagengruppen:rename', (_e, oldName, newName) => {
    const cfg = readConfig();
    const groups = cfg.templateGroups || {};
    if (!groups[oldName]) throw new Error(`Gruppe "${oldName}" existiert nicht`);
    if (groups[newName]) throw new Error(`Gruppe "${newName}" existiert bereits`);

    const newGroups = { ...groups };
    newGroups[newName] = newGroups[oldName];
    delete newGroups[oldName];

    const order = cfg.templateGroupOrder || [];
    const newOrder = order.map(name => name === oldName ? newName : name);

    const next = { ...cfg, templateGroups: newGroups, templateGroupOrder: newOrder };
    writeConfig(next);
    return true;
  });

  ipcMain.handle('vorlagengruppen:delete', (_e, name) => {
    const cfg = readConfig();
    const groups = cfg.templateGroups || {};
    if (!groups[name]) throw new Error(`Gruppe "${name}" existiert nicht`);

    const newGroups = { ...groups };
    delete newGroups[name];

    const order = cfg.templateGroupOrder || [];
    const newOrder = order.filter(n => n !== name);

    const next = { ...cfg, templateGroups: newGroups, templateGroupOrder: newOrder };
    writeConfig(next);
    return true;
  });

  ipcMain.handle('vorlagengruppen:updateTemplates', (_e, groupName, templates) => {
    const cfg = readConfig();
    const groups = cfg.templateGroups || {};
    if (!groups[groupName]) throw new Error(`Gruppe "${groupName}" existiert nicht`);

    const next = { ...cfg, templateGroups: { ...groups, [groupName]: templates } };
    writeConfig(next);
    return true;
  });

  ipcMain.handle('vorlagengruppen:updateOrder', (_e, order) => {
    const cfg = readConfig();
    const next = { ...cfg, templateGroupOrder: order };
    writeConfig(next);
    return true;
  });

  // Generieren
  ipcMain.handle('docs:generate', async (_e, args) => {
    const { ordnerName, targetDir, selectedVorlagen, kunde, betreuer, alsPdf } = args || {};
    if (!Array.isArray(selectedVorlagen) || selectedVorlagen.length === 0) throw new Error('Keine Vorlagen ausgewählt');
    if (!targetDir) throw new Error('Kein Zielordner');
    const cfg = readConfig();
    const vorlagenRoot = cfg.vorlagenDir || path.join(__dirname, 'Vorlagen');
    const zielOrdner = ordnerName ? path.join(targetDir, ordnerName) : targetDir;
    if (!fs.existsSync(zielOrdner)) fs.mkdirSync(zielOrdner, { recursive: true });
    const data = { ...(kunde || {}), ...(betreuer || {}) };
    if (kunde) Object.keys(kunde).forEach(key => { if (key.startsWith('a')) data[key] = kunde[key]; });
    const generatedFiles = []
    for (const templateName of selectedVorlagen) {
      const vorlagenPath = getVorlagenPath(templateName, vorlagenRoot);
      const templateBuffer = fs.readFileSync(vorlagenPath);
      const outputBuffer = await replacePlaceholders(templateBuffer, data);
      const dateiname = path.basename(templateName);
      const zielDatei = path.join(zielOrdner, await replaceFilenamePlaceholders(dateiname, data));
      fs.writeFileSync(zielDatei, outputBuffer);
      generatedFiles.push(zielDatei)
    }
    if (alsPdf) {
      try {
        const { spawnSync } = require('child_process')
        for (const file of generatedFiles) {
          // Convert using LibreOffice if available
          const cfg2 = readConfig();
          const manual = cfg2.libreOfficePath && fs.existsSync(cfg2.libreOfficePath) ? cfg2.libreOfficePath : null;
          const detected = findSofficeExecutable();
          const soffice = manual || detected || 'soffice'
          // Wenn erkannt und noch nicht gespeichert, automatisch merken
          if (detected && !cfg2.libreOfficePath) {
            try { writeConfig({ ...cfg2, libreOfficePath: detected }); } catch {}
          }
          const res = spawnSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', zielOrdner, file], { stdio: 'ignore' })
          if (res.error) {
            // Try lowriter alias
            const res2 = spawnSync('lowriter', ['--headless', '--convert-to', 'pdf', '--outdir', zielOrdner, file], { stdio: 'ignore' })
            // ignore if also fails; user will get docx instead
          }
        }
      } catch {}
    }
    return { ok: true, zielOrdner };
  });

  // PDF aus DOCX generieren (direkte Konvertierung)
  // Hilfsfunktion um den vollständigen Pfad für eine Vorlage zu ermitteln
  function getVorlagenPath(templateName, vorlagenRoot) {
    // Prüfe ob es ein Gruppen-Template ist (nur Dateiname ohne Pfad)
    if (!templateName.includes('/') && !templateName.includes('\\')) {
      // Es ist ein Gruppen-Template - suche im Hauptordner
      const fullPath = path.join(vorlagenRoot, templateName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    // Es ist ein Ordner-Template (alter Stil)
    return path.join(vorlagenRoot, templateName);
  }

  ipcMain.handle('docs:generateHtmlPdf', async (_e, args) => {
    const { ordnerName, targetDir, selectedVorlagen, kunde, betreuer, alsPdf, selectedKundenKeys, month, year, individualRanges } = args || {};
    if (!Array.isArray(selectedVorlagen) || selectedVorlagen.length === 0) throw new Error('Keine Vorlagen ausgewählt');
    if (!targetDir) throw new Error('Kein Zielordner');
    const cfg = readConfig();
    
    // Prüfe ob es sich um Rechnungen handelt
    const isRechnung = selectedKundenKeys && selectedKundenKeys.length > 0;
    const vorlagenRoot = isRechnung ? (cfg.rechnungsvorlageDir || path.join(__dirname, 'RechnungsVorlagen')) : (cfg.vorlagenDir || path.join(__dirname, 'Vorlagen'));
    
    const zielOrdner = ordnerName ? path.join(targetDir, ordnerName) : targetDir;
    if (!fs.existsSync(zielOrdner)) fs.mkdirSync(zielOrdner, { recursive: true });
    
    let currentRechnungsnummer = Number(cfg.currentRechnungsnummer || 1);
    
    if (isRechnung) {
      // Rechnungslogik
      const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
      const kundenPath = path.join(datenDir, 'Kundendaten.xlsx');
      let kunden = [];
      if (fs.existsSync(kundenPath)) {
        const wb = XLSX.readFile(kundenPath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        kunden = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      }
      const getKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
      function getDaysInMonth(m, y) { return new Date(y, m, 0).getDate(); }
      function getVerrechnungszeitraum(m, y) { const d=getDaysInMonth(m,y); return `01.${String(m).padStart(2,'0')}.${y}-${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`; }
      function getMonatstage(m, y) { return getDaysInMonth(m, y); }
      function getMonatende(m, y) { const d=getDaysInMonth(m,y); for(let day=d; day>=1; day--){const date=new Date(y,m-1,day); const dow=date.getDay(); if(dow>=1&&dow<=5) return `${String(day).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;} return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`; }
      function getIndividuelleTage(von, bis) { const d1=parseDateDDMMYYYY(von), d2=parseDateDDMMYYYY(bis); if(!d1||!d2) return 0; return Math.floor((d2-d1)/(1000*60*60*24))+1; }
      function getIndividuellerZeitraum(von, bis) { const d1=parseDateDDMMYYYY(von), d2=parseDateDDMMYYYY(bis); return `${formatDateDDMMYYYY(d1)}-${formatDateDDMMYYYY(d2)}`; }
      function calculateGesamtsumme(k, tage) { const perDay = parseFloat(k.Money) || 0; return perDay * (tage || 0); }
      function calculateVorsteuer(sum) { return sum / 1.2; }
      function calculateSteuer(vst) { return vst * 0.2; }
      
      // Generiere Rechnungen für jeden Kunden
      const generatedDocxFiles = [];
      
      if (alsPdf) {
        // Schritt 1: Alle DOCX-Dateien generieren
        for (const key of selectedKundenKeys) {
          const kunde = kunden.find(k => getKey(k) === key);
          if (!kunde) continue;
          for (const rel of selectedVorlagen) {
            const monthNum = Number(month || cfg.verrechnungsmonat || (new Date().getMonth()+1));
            const yearNum = Number(year || cfg.verrechnungsjahr || (new Date().getFullYear()));
            let tage, zeitraum;
            const ind = individualRanges && individualRanges[key];
            if (ind && ind.von && ind.bis) { tage = getIndividuelleTage(ind.von, ind.bis); zeitraum = getIndividuellerZeitraum(ind.von, ind.bis); }
            else { tage = getMonatstage(monthNum, yearNum); zeitraum = getVerrechnungszeitraum(monthNum, yearNum); }
            const summe = calculateGesamtsumme(kunde, tage);
            const vst = calculateVorsteuer(summe);
            const st = calculateSteuer(vst);
            const data = { ...kunde, Rechnungsnummer: currentRechnungsnummer, Verrechnungsmonat: monthNum, Verrechnungsjahr: yearNum, Verrechnungszeitraum: zeitraum, Monatstage: tage, Gesamtsumme: summe.toFixed(2), Vorsteuer: vst.toFixed(2), Steuer: st.toFixed(2), Monatende: getMonatende(monthNum, yearNum) };
            
            const vorlagenPath = path.join(vorlagenRoot, rel);
            const templateBuffer = fs.readFileSync(vorlagenPath);
            const outputBuffer = await replacePlaceholders(templateBuffer, data);
            
            // Temporäre DOCX-Datei erstellen
            const tempDocxName = await replaceFilenamePlaceholders(path.basename(rel), data);
            const tempDocxPath = path.join(zielOrdner, tempDocxName);
            fs.writeFileSync(tempDocxPath, outputBuffer);
            generatedDocxFiles.push(tempDocxPath);
            
            currentRechnungsnummer++;
          }
        }
        
        // Schritt 2: Alle DOCX-Dateien zu PDF konvertieren
        try {
          const { spawnSync } = require('child_process');
          const cfg3 = readConfig();
          const manual2 = cfg3.libreOfficePath && fs.existsSync(cfg3.libreOfficePath) ? cfg3.libreOfficePath : null;
          const detected2 = findSofficeExecutable();
          const soffice = manual2 || detected2 || 'soffice';
          
          for (const tempDocxPath of generatedDocxFiles) {
            const result = spawnSync(soffice, [
              '--headless',
              '--convert-to', 'pdf',
              '--outdir', zielOrdner,
              tempDocxPath
            ], { stdio: 'pipe' });
            
            if (result.error) {
              // Fallback: lowriter versuchen
              const result2 = spawnSync('lowriter', [
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', zielOrdner,
                tempDocxPath
              ], { stdio: 'pipe' });
              
              if (result2.error) {
                console.warn('LibreOffice not available, keeping DOCX file:', tempDocxPath);
                // Datei aus Liste entfernen, damit sie nicht gelöscht wird
                const index = generatedDocxFiles.indexOf(tempDocxPath);
                if (index > -1) generatedDocxFiles.splice(index, 1);
              }
            }
          }
        } catch (error) {
          console.error('PDF conversion error:', error);
        }
        
        // Schritt 3: Alle temporären DOCX-Dateien löschen
        for (const tempDocxPath of generatedDocxFiles) {
          try {
            if (fs.existsSync(tempDocxPath)) {
              fs.unlinkSync(tempDocxPath);
            }
          } catch (deleteError) {
            console.warn('Could not delete temp DOCX file:', tempDocxPath, deleteError);
          }
        }
      } else {
        // Normale DOCX-Erstellung (keine PDF-Konvertierung)
        for (const key of selectedKundenKeys) {
          const kunde = kunden.find(k => getKey(k) === key);
          if (!kunde) continue;
          for (const rel of selectedVorlagen) {
            const monthNum = Number(month || cfg.verrechnungsmonat || (new Date().getMonth()+1));
            const yearNum = Number(year || cfg.verrechnungsjahr || (new Date().getFullYear()));
            let tage, zeitraum;
            const ind = individualRanges && individualRanges[key];
            if (ind && ind.von && ind.bis) { tage = getIndividuelleTage(ind.von, ind.bis); zeitraum = getIndividuellerZeitraum(ind.von, ind.bis); }
            else { tage = getMonatstage(monthNum, yearNum); zeitraum = getVerrechnungszeitraum(monthNum, yearNum); }
            const summe = calculateGesamtsumme(kunde, tage);
            const vst = calculateVorsteuer(summe);
            const st = calculateSteuer(vst);
            const data = { ...kunde, Rechnungsnummer: currentRechnungsnummer, Verrechnungsmonat: monthNum, Verrechnungsjahr: yearNum, Verrechnungszeitraum: zeitraum, Monatstage: tage, Gesamtsumme: summe.toFixed(2), Vorsteuer: vst.toFixed(2), Steuer: st.toFixed(2), Monatende: getMonatende(monthNum, yearNum) };
            
            const vorlagenPath = path.join(vorlagenRoot, rel);
            const templateBuffer = fs.readFileSync(vorlagenPath);
            const outputBuffer = await replacePlaceholders(templateBuffer, data);
            
            const dateiname = await replaceFilenamePlaceholders(path.basename(rel), data);
            const zielDatei = path.join(zielOrdner, dateiname);
            fs.writeFileSync(zielDatei, outputBuffer);
            
            currentRechnungsnummer++;
          }
        }
      }
      writeConfig({ ...cfg, currentRechnungsnummer });
      return { ok: true, zielOrdner, currentRechnungsnummer };
    } else {
      // Normale Vorlagenlogik

      // Lade Gruppenzuweisungen für [[Betreuer Anfang]] Platzhalter
      const tableSettings = cfg.tableSettings || {};
      const kundenGruppen = tableSettings['kunden']?.gruppen || {};

      // Funktion um das Anfangsdatum des Betreuers zu ermitteln
      function getBetreuerAnfangsdatum(kunde, betreuer) {
        if (!kunde || !betreuer) return '';

        // Finde Betreuer-Felder im Kunden - zuerst mit Gruppenzuweisungen versuchen
        let betreuer1Key = Object.keys(kundenGruppen).find(key => kundenGruppen[key]?.includes('betreuer1'));
        let betreuer2Key = Object.keys(kundenGruppen).find(key => kundenGruppen[key]?.includes('betreuer2'));
        let betreuer1AnfangKey = Object.keys(kundenGruppen).find(key => kundenGruppen[key]?.includes('betreuer1_anfang'));
        let betreuer2AnfangKey = Object.keys(kundenGruppen).find(key => kundenGruppen[key]?.includes('betreuer2_anfang'));

        // Fallback: Hartkodierte Feldnamen falls Gruppen nicht gesetzt sind
        if (!betreuer1Key) betreuer1Key = 'Betreuer 1';
        if (!betreuer2Key) betreuer2Key = 'Betreuer 2';
        if (!betreuer1AnfangKey) betreuer1AnfangKey = 'Anfang Betreuer 1';
        if (!betreuer2AnfangKey) betreuer2AnfangKey = 'Anfang Betreuer 2';

        // Erstelle vollständigen Betreuer-Namen aus Betreuer-Daten
        const betreuerVorname = String(betreuer['Vor.Nam'] || '').trim();
        const betreuerNachname = String(betreuer['Fam. Nam'] || '').trim();
        const betreuerVollname = `${betreuerVorname} ${betreuerNachname}`.trim();
        const betreuerVollnameReverse = `${betreuerNachname} ${betreuerVorname}`.trim();

        // Vergleiche mit Betreuer 1
        const kundeBetreuer1 = String(kunde[betreuer1Key] || '').trim();
        if (kundeBetreuer1 === betreuerVollname || kundeBetreuer1 === betreuerVollnameReverse) {
          const anfangDatum = String(kunde[betreuer1AnfangKey] || '').trim();
          return anfangDatum || '';
        }

        // Vergleiche mit Betreuer 2
        const kundeBetreuer2 = String(kunde[betreuer2Key] || '').trim();
        if (kundeBetreuer2 === betreuerVollname || kundeBetreuer2 === betreuerVollnameReverse) {
          const anfangDatum = String(kunde[betreuer2AnfangKey] || '').trim();
          return anfangDatum || '';
        }

        // Fehler wenn Betreuer nicht zugeordnet ist
        const betreuerName = betreuerVollname || 'Unbekannter Betreuer';
        throw new Error(`Der Betreuer "${betreuerName}" ist beim Kunden "${kunde.__display || 'Unbekannter Kunde'}" nicht als Betreuer 1 oder Betreuer 2 zugeordnet.`);
      }

      const data = { ...(kunde || {}), ...(betreuer || {}) };
      if (kunde) Object.keys(kunde).forEach(key => { if (key.startsWith('a')) data[key] = kunde[key]; });

      // Füge [[Betreuer Anfang]] Platzhalter hinzu
      if (kunde && betreuer) {
        try {
          const betreuerAnfang = getBetreuerAnfangsdatum(kunde, betreuer);
          data['Betreuer Anfang'] = betreuerAnfang;
        } catch (error) {
          // Bei Fehler eine Warnung zeigen aber Generierung fortsetzen mit leerem Platzhalter
          console.warn('WARNUNG:', error.message);
          // Zeige Warnung über Electron dialog
          const { dialog } = require('electron');
          dialog.showMessageBoxSync(null, {
            type: 'warning',
            title: 'Betreuer-Zuordnung',
            message: error.message,
            detail: 'Das Dokument wird trotzdem generiert, aber der Platzhalter [[Betreuer Anfang]] bleibt leer.'
          });
          data['Betreuer Anfang'] = '';
        }
      } else {
        data['Betreuer Anfang'] = '';
      }
      
      if (alsPdf) {
      // Optimierte DOCX zu PDF Konvertierung: Alle docx generieren, dann alle konvertieren, dann alle löschen
      const generatedDocxFiles = [];
      
      // Schritt 1: Alle DOCX-Dateien generieren
      for (const templateName of selectedVorlagen) {
        const vorlagenPath = getVorlagenPath(templateName, vorlagenRoot);
        const templateBuffer = fs.readFileSync(vorlagenPath);
        const outputBuffer = await replacePlaceholders(templateBuffer, data);
        
        // Temporäre DOCX-Datei erstellen
        const tempDocxName = path.basename(templateName);
        const tempDocxPath = path.join(zielOrdner, await replaceFilenamePlaceholders(tempDocxName, data));
        fs.writeFileSync(tempDocxPath, outputBuffer);
        generatedDocxFiles.push(tempDocxPath);
      }
      
      // Schritt 2: Alle DOCX-Dateien zu PDF konvertieren
      try {
        const { spawnSync } = require('child_process');
        const cfg4 = readConfig();
        const manual3 = cfg4.libreOfficePath && fs.existsSync(cfg4.libreOfficePath) ? cfg4.libreOfficePath : null;
        const detected3 = findSofficeExecutable() || 'soffice';
        const soffice = manual3 || detected3;
        
        for (const tempDocxPath of generatedDocxFiles) {
          const result = spawnSync(soffice, [
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', zielOrdner,
            tempDocxPath
          ], { stdio: 'pipe' });
          
          if (result.error) {
            // Fallback: lowriter versuchen
            const result2 = spawnSync('lowriter', [
              '--headless',
              '--convert-to', 'pdf',
              '--outdir', zielOrdner,
              tempDocxPath
            ], { stdio: 'pipe' });
            
            if (result2.error) {
              console.warn('LibreOffice not available, keeping DOCX file:', tempDocxPath);
              // Datei aus Liste entfernen, damit sie nicht gelöscht wird
              const index = generatedDocxFiles.indexOf(tempDocxPath);
              if (index > -1) generatedDocxFiles.splice(index, 1);
            }
          }
        }
      } catch (error) {
        console.error('PDF conversion error:', error);
      }
      
      // Schritt 3: Alle temporären DOCX-Dateien löschen
      for (const tempDocxPath of generatedDocxFiles) {
        try {
          if (fs.existsSync(tempDocxPath)) {
            fs.unlinkSync(tempDocxPath);
          }
        } catch (deleteError) {
          console.warn('Could not delete temp DOCX file:', tempDocxPath, deleteError);
        }
      }
    } else {
      // Normale DOCX-Erstellung
      for (const templateName of selectedVorlagen) {
        const vorlagenPath = getVorlagenPath(templateName, vorlagenRoot);
        const templateBuffer = fs.readFileSync(vorlagenPath);
        const outputBuffer = await replacePlaceholders(templateBuffer, data);
        const dateiname = path.basename(templateName);
        const zielDatei = path.join(zielOrdner, await replaceFilenamePlaceholders(dateiname, data));
        fs.writeFileSync(zielDatei, outputBuffer);
      }
    }
    }
    
    return { ok: true, zielOrdner };
  });

  ipcMain.handle('invoices:generate', async (_e, args) => {
    const { selectedKundenKeys, selectedVorlagenAbs, targetDir, month, year, individualRanges, alsPdf } = args || {};
    if (!Array.isArray(selectedKundenKeys) || selectedKundenKeys.length === 0) throw new Error('Keine Kunden ausgewählt');
    if (!Array.isArray(selectedVorlagenAbs) || selectedVorlagenAbs.length === 0) throw new Error('Keine Vorlagen ausgewählt');
    if (!targetDir) throw new Error('Kein Zielordner');
    const cfg = readConfig();
    const datenDir = cfg.datenDir || path.join(__dirname, 'Daten');
    const kundenPath = path.join(datenDir, 'Kundendaten.xlsx');
    let kunden = [];
    if (fs.existsSync(kundenPath)) {
      const wb = XLSX.readFile(kundenPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      kunden = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    const getKey = (k) => `${String(k.kfname||'').toLowerCase()}__${String(k.kvname||'').toLowerCase()}`;
    function getDaysInMonth(m, y) { return new Date(y, m, 0).getDate(); }
    function getVerrechnungszeitraum(m, y) { const d=getDaysInMonth(m,y); return `01.${String(m).padStart(2,'0')}.${y}-${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`; }
    function getMonatstage(m, y) { return getDaysInMonth(m, y); }
    function getMonatende(m, y) { const d=getDaysInMonth(m,y); for(let day=d; day>=1; day--){const date=new Date(y,m-1,day); const dow=date.getDay(); if(dow>=1&&dow<=5) return `${String(day).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;} return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`; }
    function getIndividuelleTage(von, bis) { const d1=parseDateDDMMYYYY(von), d2=parseDateDDMMYYYY(bis); if(!d1||!d2) return 0; return Math.floor((d2-d1)/(1000*60*60*24))+1; }
    function getIndividuellerZeitraum(von, bis) { const d1=parseDateDDMMYYYY(von), d2=parseDateDDMMYYYY(bis); return `${formatDateDDMMYYYY(d1)}-${formatDateDDMMYYYY(d2)}`; }
    function calculateGesamtsumme(k, tage) { const perDay = parseFloat(k.Money) || 0; return perDay * (tage || 0); }
    function calculateVorsteuer(sum) { return sum / 1.2; }
    function calculateSteuer(vst) { return vst * 0.2; }

    let currentRechnungsnummer = Number(cfg.currentRechnungsnummer || 1);
    const used = [];
    const usedByKey = {};
    const generatedFiles = [];
    const invoiceDataByKey = {}; // Sammle Rechnungsdaten für Protokoll
    
    for (const key of selectedKundenKeys) {
      const kunde = kunden.find(k => getKey(k) === key);
      if (!kunde) continue;
      for (const absPath of selectedVorlagenAbs) {
        const monthNum = Number(month || cfg.verrechnungsmonat || (new Date().getMonth()+1));
        const yearNum = Number(year || cfg.verrechnungsjahr || (new Date().getFullYear()));
        let tage, zeitraum;
        const ind = individualRanges && individualRanges[key];
        if (ind && ind.von && ind.bis) { tage = getIndividuelleTage(ind.von, ind.bis); zeitraum = getIndividuellerZeitraum(ind.von, ind.bis); }
        else { tage = getMonatstage(monthNum, yearNum); zeitraum = getVerrechnungszeitraum(monthNum, yearNum); }
        const summe = calculateGesamtsumme(kunde, tage);
        const vst = calculateVorsteuer(summe);
        const st = calculateSteuer(vst);
        const data = { ...kunde, Rechnungsnummer: currentRechnungsnummer, Verrechnungsmonat: monthNum, Verrechnungsjahr: yearNum, Verrechnungszeitraum: zeitraum, Monatstage: tage, Gesamtsumme: summe.toFixed(2), Vorsteuer: vst.toFixed(2), Steuer: st.toFixed(2), Monatende: getMonatende(monthNum, yearNum) };
        const templateBuffer = fs.readFileSync(absPath);
        const outputBuffer = await replacePlaceholders(templateBuffer, data);
        const filename = await replaceFilenamePlaceholders(path.basename(absPath), data);
        const zielDatei = path.join(targetDir, filename);
        fs.writeFileSync(zielDatei, outputBuffer);
        generatedFiles.push(zielDatei);
        used.push(zielDatei);
        if (!usedByKey[key]) usedByKey[key] = [];
        usedByKey[key].push(zielDatei);
        
        // Sammle Rechnungsdaten für Protokoll
        const nachname = String(kunde.kfname || kunde.nachname || '');
        const heute = formatDateDDMMYYYY(new Date());
        if (!invoiceDataByKey[key]) invoiceDataByKey[key] = [];
        invoiceDataByKey[key].push({
          rechnungsnummer: currentRechnungsnummer,
          nachname: nachname,
          gesamtsumme: summe.toFixed(2),
          datum: heute
        });
        
        currentRechnungsnummer++;
      }
    }
    
    // PDF-Konvertierung falls gewünscht (wie in generateHtmlPdf)
    if (alsPdf) {
      try {
        const { spawnSync } = require('child_process');
        const pdfFiles = [];
        
        for (const file of generatedFiles) {
          try {
            // LibreOffice für PDF-Konvertierung verwenden (wie in generateHtmlPdf)
            const soffice = findSofficeExecutable() || 'soffice';
            const result = spawnSync(soffice, [
              '--headless',
              '--convert-to', 'pdf',
              '--outdir', targetDir,
              file
            ], { stdio: 'pipe' });
            
            if (result.error) {
              // Fallback: lowriter versuchen
              const result2 = spawnSync('lowriter', [
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', targetDir,
                file
              ], { stdio: 'pipe' });
              
              if (result2.error) {
                console.warn('LibreOffice not available, keeping DOCX file');
                pdfFiles.push(file); // Behalte DOCX wenn PDF-Konvertierung fehlschlägt
              } else {
                // PDF erfolgreich erstellt
                const pdfFileName = path.basename(file, path.extname(file)) + '.pdf';
                const pdfFilePath = path.join(targetDir, pdfFileName);
                if (fs.existsSync(pdfFilePath)) {
                  pdfFiles.push(pdfFilePath);
                }
                // Temporäre DOCX-Datei löschen nach erfolgreicher PDF-Konvertierung
                try {
                  fs.unlinkSync(file);
                } catch (deleteError) {
                  console.warn('Could not delete temp DOCX file:', deleteError);
                }
              }
            } else {
              // PDF erfolgreich erstellt
              const pdfFileName = path.basename(file, path.extname(file)) + '.pdf';
              const pdfFilePath = path.join(targetDir, pdfFileName);
              if (fs.existsSync(pdfFilePath)) {
                pdfFiles.push(pdfFilePath);
              }
              // Temporäre DOCX-Datei löschen nach erfolgreicher PDF-Konvertierung
              try {
                fs.unlinkSync(file);
              } catch (deleteError) {
                console.warn('Could not delete temp DOCX file:', deleteError);
              }
            }
          } catch (error) {
            console.error('PDF conversion error for file:', file, error);
            pdfFiles.push(file); // Behalte DOCX bei Fehler
          }
        }
        
        // Ersetze used-Liste mit PDF-Dateien und aktualisiere Mapping
        if (pdfFiles.length > 0) {
          // Mapping neu aufbauen anhand von Basenamen
          const pdfByBase = Object.fromEntries(pdfFiles.map(p => [path.basename(p, path.extname(p)), p]));
          const newUsed = [];
          const newUsedByKey = {};
          for (const [k, files] of Object.entries(usedByKey)) {
            for (const f of files) {
              const base = path.basename(f, path.extname(f));
              const pdf = pdfByBase[base];
              if (pdf) {
                if (!newUsedByKey[k]) newUsedByKey[k] = [];
                newUsedByKey[k].push(pdf);
                newUsed.push(pdf);
              } else {
                if (!newUsedByKey[k]) newUsedByKey[k] = [];
                newUsedByKey[k].push(f);
                newUsed.push(f);
              }
            }
          }
          used.length = 0;
          used.push(...newUsed);
          Object.keys(usedByKey).forEach(key => { usedByKey[key] = newUsedByKey[key] || []; });
        }
      } catch (error) {
        console.error('PDF conversion error:', error);
      }
    }
    
    writeConfig({ ...cfg, currentRechnungsnummer });
    return { ok: true, files: used, byKey: usedByKey, currentRechnungsnummer, invoiceData: invoiceDataByKey };
  });

  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


