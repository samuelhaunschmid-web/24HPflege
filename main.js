const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const mammoth = require('mammoth');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL;

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
  } else {
    const indexHtml = path.join(__dirname, 'renderer', 'dist', 'index.html');
    win.loadFile(indexHtml);
  }

  return win;
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
    if (file.startsWith('~$')) continue;
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

app.whenReady().then(() => {
  const win = createWindow();

  autoUpdater.on('update-available', () => win.webContents.send('update:available'));
  autoUpdater.on('download-progress', (p) => win.webContents.send('update:progress', p));
  autoUpdater.on('update-downloaded', () => win.webContents.send('update:downloaded'));
  autoUpdater.on('error', (err) => win.webContents.send('update:error', err == null ? '' : String(err)));

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
  ipcMain.handle('dialog:chooseDirectory', async (_e, title) => {
    const res = await dialog.showOpenDialog({ title: title || 'Ordner wählen', properties: ['openDirectory'] });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  // LibreOffice Installation
  ipcMain.handle('api:checkLibreOffice', async () => {
    const { spawnSync } = require('child_process');
    try {
      // Prüfe soffice
      const result1 = spawnSync('soffice', ['--version'], { stdio: 'pipe' });
      if (result1.status === 0) return true;
      
      // Prüfe lowriter
      const result2 = spawnSync('lowriter', ['--version'], { stdio: 'pipe' });
      return result2.status === 0;
    } catch (error) {
      return false;
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
    
    try {
      if (platform === 'darwin') {
        // macOS: LibreOffice via Homebrew installieren (nur Brew, kein DMG)
        try { if (fs.existsSync('/Applications/LibreOffice.app')) return true; } catch {}
        // Finde Homebrew Pfad (GUI-Apps haben oft kein PATH)
        let brewPath = 'brew';
        const whichBrew = spawnSync('which', ['brew'], { stdio: 'pipe' });
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
        const uninst = spawnSync(brewPath, ['uninstall', '--cask', '--force', 'libreoffice'], {
          stdio: 'pipe',
          timeout: 300000
        });
        const inst = spawnSync(brewPath, ['install', '--cask', 'libreoffice'], { 
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
        // Windows - Chocolatey Installation LibreOffice; falls choco fehlt, versuchen zu installieren
        const ensureChoco = () => {
          const chk = spawnSync('choco', ['-v'], { stdio: 'pipe', shell: true });
          if (chk.status === 0) {
            return { ok: true, installed: false, stdout: String(chk.stdout||''), stderr: String(chk.stderr||'') };
          }
          // Installiere Chocolatey (benötigt erhöhte Rechte)
          const psCmd = 'Set-ExecutionPolicy Bypass -Scope Process -Force; ' +
            "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; " +
            'iwr https://community.chocolatey.org/install.ps1 -UseBasicParsing | iex';
          const inst = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], { stdio: 'pipe', shell: false, timeout: 600000 });
          const verify = spawnSync('choco', ['-v'], { stdio: 'pipe', shell: true });
          return { ok: verify.status === 0, installed: true, stdout: String(inst.stdout||'') + String(verify.stdout||''), stderr: String(inst.stderr||'') + String(verify.stderr||'') };
        };
        const chocoRes = ensureChoco();
        if (!chocoRes.ok) {
          return { ok: false, message: 'Chocolatey installation failed or requires admin privileges', chocolatey: chocoRes };
        }
        const inst = spawnSync('choco', ['install', 'libreoffice', '-y'], { stdio: 'pipe', shell: true, timeout: 900000 });
        return {
          ok: inst.status === 0,
          chocolatey: chocoRes,
          install: {
            code: inst.status,
            stdout: String(inst.stdout || ''),
            stderr: String(inst.stderr || ''),
          }
        };
      } else {
        // Linux - apt/yum/dnf
        let result;
        if (spawnSync('which', ['apt'], { stdio: 'pipe' }).status === 0) {
          result = spawnSync('sudo', ['apt', 'update', '&&', 'sudo', 'apt', 'install', '-y', 'libreoffice'], { 
            stdio: 'pipe',
            timeout: 300000,
            shell: true
          });
        } else if (spawnSync('which', ['yum'], { stdio: 'pipe' }).status === 0) {
          result = spawnSync('sudo', ['yum', 'install', '-y', 'libreoffice'], { 
            stdio: 'pipe',
            timeout: 300000
          });
        } else if (spawnSync('which', ['dnf'], { stdio: 'pipe' }).status === 0) {
          result = spawnSync('sudo', ['dnf', 'install', '-y', 'libreoffice'], { 
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
      .filter(file => file.toLowerCase().endsWith('.docx') && !file.startsWith('~$'))
      .map(file => ({ name: file, absPath: path.join(dir, file) }));
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
    for (const rel of selectedVorlagen) {
      const vorlagenPath = path.join(vorlagenRoot, rel);
      const templateBuffer = fs.readFileSync(vorlagenPath);
      const outputBuffer = await replacePlaceholders(templateBuffer, data);
      const dateiname = path.basename(rel);
      const zielDatei = path.join(zielOrdner, await replaceFilenamePlaceholders(dateiname, data));
      fs.writeFileSync(zielDatei, outputBuffer);
      generatedFiles.push(zielDatei)
    }
    if (alsPdf) {
      try {
        const { spawnSync } = require('child_process')
        for (const file of generatedFiles) {
          // Convert using LibreOffice if available
          const res = spawnSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', zielOrdner, file], { stdio: 'ignore' })
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
      function getIndividuelleTage(von, bis) { const d1=new Date(von), d2=new Date(bis); return Math.floor((d2-d1)/(1000*60*60*24))+1; }
      function getIndividuellerZeitraum(von, bis) { const f=(d)=>`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; const d1=new Date(von), d2=new Date(bis); return `${f(d1)}-${f(d2)}`; }
      function calculateGesamtsumme(k, tage) { const perDay = parseFloat(k.Money) || 0; return perDay * (tage || 0); }
      function calculateVorsteuer(sum) { return sum / 1.2; }
      function calculateSteuer(vst) { return vst * 0.2; }
      
      // Generiere Rechnungen für jeden Kunden
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
          
          if (alsPdf) {
            // Temporäre DOCX-Datei erstellen
            const tempDocxName = await replaceFilenamePlaceholders(path.basename(rel), data);
            const tempDocxPath = path.join(zielOrdner, tempDocxName);
            fs.writeFileSync(tempDocxPath, outputBuffer);
            
            try {
              // LibreOffice für PDF-Konvertierung verwenden
              const { spawnSync } = require('child_process');
              const result = spawnSync('soffice', [
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
                  console.warn('LibreOffice not available, keeping DOCX file');
                } else {
                  // Temporäre DOCX-Datei löschen nach erfolgreicher PDF-Konvertierung
                  try {
                    fs.unlinkSync(tempDocxPath);
                  } catch (deleteError) {
                    console.warn('Could not delete temp DOCX file:', deleteError);
                  }
                }
              } else {
                // Temporäre DOCX-Datei löschen nach erfolgreicher PDF-Konvertierung
                try {
                  fs.unlinkSync(tempDocxPath);
                } catch (deleteError) {
                  console.warn('Could not delete temp DOCX file:', deleteError);
                }
              }
            } catch (error) {
              console.error('PDF conversion error:', error);
            }
          } else {
            // Normale DOCX-Erstellung
            const dateiname = await replaceFilenamePlaceholders(path.basename(rel), data);
            const zielDatei = path.join(zielOrdner, dateiname);
            fs.writeFileSync(zielDatei, outputBuffer);
          }
          currentRechnungsnummer++;
        }
      }
      writeConfig({ ...cfg, currentRechnungsnummer });
      return { ok: true, zielOrdner, currentRechnungsnummer };
    } else {
      // Normale Vorlagenlogik
      const data = { ...(kunde || {}), ...(betreuer || {}) };
      if (kunde) Object.keys(kunde).forEach(key => { if (key.startsWith('a')) data[key] = kunde[key]; });
      
      if (alsPdf) {
      // Direkte DOCX zu PDF Konvertierung mit LibreOffice
      for (const rel of selectedVorlagen) {
        const vorlagenPath = path.join(vorlagenRoot, rel);
        const templateBuffer = fs.readFileSync(vorlagenPath);
        const outputBuffer = await replacePlaceholders(templateBuffer, data);
        
        // Temporäre DOCX-Datei erstellen
        const tempDocxName = path.basename(rel);
        const tempDocxPath = path.join(zielOrdner, await replaceFilenamePlaceholders(tempDocxName, data));
        fs.writeFileSync(tempDocxPath, outputBuffer);
        
        try {
          // LibreOffice für PDF-Konvertierung verwenden
          const { spawnSync } = require('child_process');
          const result = spawnSync('soffice', [
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
              console.warn('LibreOffice not available, keeping DOCX file');
            } else {
              // Temporäre DOCX-Datei löschen nach erfolgreicher PDF-Konvertierung
              try {
                fs.unlinkSync(tempDocxPath);
              } catch (deleteError) {
                console.warn('Could not delete temp DOCX file:', deleteError);
              }
            }
          } else {
            // Temporäre DOCX-Datei löschen nach erfolgreicher PDF-Konvertierung
            try {
              fs.unlinkSync(tempDocxPath);
            } catch (deleteError) {
              console.warn('Could not delete temp DOCX file:', deleteError);
            }
          }
        } catch (error) {
          console.error('PDF conversion error:', error);
        }
      }
    } else {
      // Normale DOCX-Erstellung
      for (const rel of selectedVorlagen) {
        const vorlagenPath = path.join(vorlagenRoot, rel);
        const templateBuffer = fs.readFileSync(vorlagenPath);
        const outputBuffer = await replacePlaceholders(templateBuffer, data);
        const dateiname = path.basename(rel);
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
    function getIndividuelleTage(von, bis) { const d1=new Date(von), d2=new Date(bis); return Math.floor((d2-d1)/(1000*60*60*24))+1; }
    function getIndividuellerZeitraum(von, bis) { const f=(d)=>`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; const d1=new Date(von), d2=new Date(bis); return `${f(d1)}-${f(d2)}`; }
    function calculateGesamtsumme(k, tage) { const perDay = parseFloat(k.Money) || 0; return perDay * (tage || 0); }
    function calculateVorsteuer(sum) { return sum / 1.2; }
    function calculateSteuer(vst) { return vst * 0.2; }

    let currentRechnungsnummer = Number(cfg.currentRechnungsnummer || 1);
    const used = [];
    const generatedFiles = [];
    
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
            const result = spawnSync('soffice', [
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
        
        // Ersetze used-Liste mit PDF-Dateien
        if (pdfFiles.length > 0) {
          used.length = 0; // Leere das Array
          used.push(...pdfFiles); // Füge PDF-Dateien hinzu
        }
      } catch (error) {
        console.error('PDF conversion error:', error);
      }
    }
    
    writeConfig({ ...cfg, currentRechnungsnummer });
    return { ok: true, files: used, currentRechnungsnummer };
  });

  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


