const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { dialog, app } = require('@electron/remote');

// Konfigurationsdatei
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

function loadConfig() {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) { return {}; }
  }
  return {};
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

// Standardpfade
let config = loadConfig();
if (!config.datenDir) config.datenDir = path.join(__dirname, 'Daten');
if (!config.altDatenDir) config.altDatenDir = path.join(__dirname, 'AlteDaten');
if (!config.vorlagenDir) config.vorlagenDir = path.join(__dirname, 'Vorlagen');
if (!config.rechnungsvorlageDir) config.rechnungsvorlageDir = path.join(__dirname, 'RechnungsVorlagen');

function updatePathUI() {
  document.getElementById('daten-path').textContent = config.datenDir;
  document.getElementById('alt-daten-path').textContent = config.altDatenDir;
  document.getElementById('vorlagen-path').textContent = config.vorlagenDir;
  if (document.getElementById('rechnungsvorlage-path')) {
    document.getElementById('rechnungsvorlage-path').textContent = config.rechnungsvorlageDir;
  }
}

// Hilfsfunktion: Excel einlesen und als Array von Objekten zurückgeben
function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
}

// Hilfsfunktion: Excel-Datum in TT.MM.JJJJ umwandeln
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
  // Typische Datumsfelder
  const dateFields = ['kgebdat', 'Geburtsdatum'];
  // Alle Felder, die mit 'b' beginnen (wie b2anfang, b2ende, ...)
  Object.keys(obj).forEach(key => {
    if (dateFields.includes(key) || /^b\d*anfang$/i.test(key) || /^b\d*ende$/i.test(key)) {
      obj[key] = excelDateToString(obj[key]);
    }
  });
  return obj;
}

// Daten einlesen
const kundenPath = path.join(config.datenDir, 'Kundendaten.xlsx');
const betreuerPath = path.join(config.datenDir, 'Betreuerinnendaten.xlsx');

let kunden = [];
let betreuer = [];

if (fs.existsSync(kundenPath)) {
  kunden = readExcel(kundenPath).map(fixDates);
}
if (fs.existsSync(betreuerPath)) {
  betreuer = readExcel(betreuerPath).map(fixDates);
}

// Rekursive Hilfsfunktion: Baumstruktur für .docx-Dateien und Ordner
function buildDocxTree(dir, rel = '') {
  let tree = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file.startsWith('~$')) continue;
    const filePath = path.join(dir, file);
    const relPath = rel ? path.join(rel, file) : file;
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      tree.push({
        type: 'folder',
        name: file,
        relPath: relPath,
        children: buildDocxTree(filePath, relPath)
      });
    } else if (file.endsWith('.docx')) {
      tree.push({
        type: 'file',
        name: file,
        relPath: relPath
      });
    }
  }
  return tree;
}

// Vorlagen als Baumstruktur einlesen
const vorlagenDir = config.vorlagenDir;
let vorlagenTree = [];
if (fs.existsSync(vorlagenDir)) {
  vorlagenTree = buildDocxTree(vorlagenDir);
}

async function replacePlaceholders(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '[[', end: ']]' },
    nullGetter: function(part) {
      // part = { tag, scopePath, ... }
      // Wir geben ein Word-XML-Fragment zurück, das den Platzhalternamen in Rot darstellt
      return {
        "raw":
          `<w:r><w:rPr><w:color w:val=\"FF0000\"/></w:rPr><w:t>${part.tag}</w:t></w:r>`
      };
    }
  });
  doc.setData(data);
  try {
    doc.render();
  } catch (error) {
    await showInfoDialog('Fehler beim Ersetzen der Platzhalter: ' + error.message, 'kunden-search');
    return null;
  }
  return doc.getZip().generate({ type: 'nodebuffer' });
}

async function replaceFilenamePlaceholders(filename, data) {
  let hadWarning = false;
  const replaced = await filename.replace(/\[\[(.*?)\]\]/g, async (match, key) => {
    if (data[key] === undefined) {
      hadWarning = true;
      await showInfoDialog(`Warnung: Platzhalter "${match}" im Dateinamen konnte nicht ersetzt werden.`, 'kunden-search');
      return match;
    }
    return data[key];
  });
  return replaced;
}

// Hilfsfunktion für modales Eingabefeld
function showInputDialog(message) {
  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.3)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    // Dialog
    const dialog = document.createElement('div');
    dialog.style.background = '#fff';
    dialog.style.padding = '30px';
    dialog.style.borderRadius = '10px';
    dialog.style.boxShadow = '0 2px 8px #888';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.alignItems = 'center';

    const label = document.createElement('label');
    label.textContent = message;
    label.style.marginBottom = '10px';
    dialog.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.style.marginBottom = '10px';
    input.style.padding = '8px';
    input.style.width = '250px';
    dialog.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(input.value.trim());
    };
    btnRow.appendChild(okBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
    btnRow.appendChild(cancelBtn);

    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    input.focus();
  });
}

// Hilfsfunktion: Baumstruktur als HTML-Elemente rendern
function renderVorlagenTree(tree, vorlagenCheckboxes) {
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.paddingLeft = '18px';
  for (const node of tree) {
    if (node.type === 'folder') {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      // Ordner-Checkbox
      const folderCb = document.createElement('input');
      folderCb.type = 'checkbox';
      folderCb.style.marginRight = '6px';
      summary.appendChild(folderCb);
      summary.appendChild(document.createTextNode(node.name));
      details.appendChild(summary);
      const childUl = renderVorlagenTree(node.children, vorlagenCheckboxes);
      details.appendChild(childUl);
      ul.appendChild(details);
      // Wenn Ordner-Checkbox geklickt wird, alle Kind-Checkboxen setzen
      folderCb.addEventListener('change', () => {
        const setAll = (el, checked) => {
          if (el.tagName === 'INPUT' && el.type === 'checkbox') {
            el.checked = checked;
            el.dispatchEvent(new Event('change'));
          }
          Array.from(el.children).forEach(child => setAll(child, checked));
        };
        setAll(childUl, folderCb.checked);
      });
    } else if (node.type === 'file') {
      const li = document.createElement('li');
      const box = document.createElement('label');
      box.style.border = '1px solid #ccc';
      box.style.borderRadius = '6px';
      box.style.padding = '7px';
      box.style.background = '#f9f9f9';
      box.style.cursor = 'pointer';
      box.style.display = 'flex';
      box.style.alignItems = 'center';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = node.relPath;
      vorlagenCheckboxes.push(cb);
      box.appendChild(cb);
      box.appendChild(document.createTextNode(' ' + node.name));
      li.appendChild(box);
      ul.appendChild(li);
    }
  }
  return ul;
}

// UI-Elemente erzeugen
window.addEventListener('DOMContentLoaded', () => {
  // Nur wenn die Ordnerwahl-Elemente existieren (Einstellungen.html)
  if (document.getElementById('choose-daten') && document.getElementById('choose-alt-daten') && document.getElementById('choose-vorlagen')) {
    updatePathUI();
    document.getElementById('choose-daten').onclick = async () => {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Daten-Ordner wählen',
        properties: ['openDirectory']
      });
      if (!canceled && filePaths && filePaths[0]) {
        config.datenDir = filePaths[0];
        saveConfig(config);
        updatePathUI();
        location.reload();
      }
    };
    document.getElementById('choose-vorlagen').onclick = async () => {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Vorlagen-Ordner wählen',
        properties: ['openDirectory']
      });
              if (!canceled && filePaths && filePaths[0]) {
          config.vorlagenDir = filePaths[0];
          saveConfig(config);
          updatePathUI();
          location.reload();
        }
    };
    document.getElementById('choose-alt-daten').onclick = async () => {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Alte-Ordner wählen',
        properties: ['openDirectory']
      });
      if (!canceled && filePaths && filePaths[0]) {
        config.altDatenDir = filePaths[0];
        saveConfig(config);
        updatePathUI();
        location.reload();
      }
    };
    // Neuer RechnungsVorlage-Pathfinder
    if (document.getElementById('choose-rechnungsvorlage')) {
      document.getElementById('choose-rechnungsvorlage').onclick = async () => {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          title: 'RechnungsVorlage-Ordner wählen',
          properties: ['openDirectory']
        });
        if (!canceled && filePaths && filePaths[0]) {
          config.rechnungsvorlageDir = filePaths[0];
          saveConfig(config);
          updatePathUI();
          location.reload();
        }
      };
    }
  }

  // Nur auf der Startseite: Dokumentengenerierung-UI einfügen
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
    // Kunden Combobox
    const kundenInput = document.getElementById('kunde');
    const kundenDatalist = document.getElementById('kunden-list');
    const kundenSorted = kunden.slice().sort((a, b) => {
      const nA = (a.kfname || '').toLowerCase();
      const nB = (b.kfname || '').toLowerCase();
      if (nA < nB) return -1;
      if (nA > nB) return 1;
      return 0;
    });
    
    // Datalist mit Kunden füllen
    kundenSorted.forEach((k, i) => {
      const option = document.createElement('option');
      option.value = `${k.kvname || ''} ${k.kfname || ''}`.trim();
      option.dataset.index = kunden.findIndex(originalKunde => 
        originalKunde.kfname === k.kfname && originalKunde.kvname === k.kvname
      );
      kundenDatalist.appendChild(option);
    });

    // Betreuer Combobox
    const betreuerInput = document.getElementById('betreuer');
    const betreuerDatalist = document.getElementById('betreuer-list');
    const betreuerSorted = betreuer.slice().sort((a, b) => {
      const nA = (a['Fam. Nam'] || '').toLowerCase();
      const nB = (b['Fam. Nam'] || '').toLowerCase();
      if (nA < nB) return -1;
      if (nA > nB) return 1;
      return 0;
    });
    
    // Datalist mit Betreuern füllen
    betreuerSorted.forEach((b, i) => {
      const option = document.createElement('option');
      option.value = `${b['Vor.Nam'] || ''} ${b['Fam. Nam'] || ''}`.trim();
      option.dataset.index = betreuer.findIndex(originalBetreuer => 
        originalBetreuer['Fam. Nam'] === b['Fam. Nam'] && originalBetreuer['Vor.Nam'] === b['Vor.Nam']
      );
      betreuerDatalist.appendChild(option);
    });

    // Vorlagen als Checkbox-Baum
    const vorlagenContainer = document.getElementById('vorlagen-container');
    const vorlagenCheckboxes = [];
    vorlagenContainer.appendChild(renderVorlagenTree(vorlagenTree, vorlagenCheckboxes));

    // Button zum Generieren mehrerer Dokumente
    const genMultiBtn = document.getElementById('generate');
    genMultiBtn.onclick = async () => {
      // Finde die Indizes basierend auf den eingegebenen Namen
      const kundenName = kundenInput.value.trim();
      const betreuerName = betreuerInput.value.trim();
      
      let kIndex = null;
      let bIndex = null;
      
      // Suche nach Kunden-Index
      if (kundenName) {
        const kundenOption = Array.from(kundenDatalist.options).find(opt => opt.value === kundenName);
        if (kundenOption && kundenOption.dataset.index) {
          kIndex = parseInt(kundenOption.dataset.index);
        }
      }
      
      // Suche nach Betreuer-Index
      if (betreuerName) {
        const betreuerOption = Array.from(betreuerDatalist.options).find(opt => opt.value === betreuerName);
        if (betreuerOption && betreuerOption.dataset.index) {
          bIndex = parseInt(betreuerOption.dataset.index);
        }
      }
      
      const selectedVorlagen = vorlagenCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
      if (selectedVorlagen.length === 0) {
        await showInfoDialog('Bitte wähle mindestens eine Vorlage aus!', 'kunden-search');
        return;
      }
      // Erlaube Generierung auch wenn nur Kunde oder nur Betreuer gewählt ist
      if (!kIndex && !bIndex) {
        await showInfoDialog('Bitte wähle mindestens einen Kunden oder einen Betreuer aus!', 'kunden-search');
        return;
      }
      // Ordnernamen abfragen (jetzt mit modaler Eingabe)
      const ordnerName = await showInputDialog('Wie soll der neue Ordner heißen? (z.B. Vertragsmappe_Müller)');
      if (!ordnerName) {
        await showInfoDialog('Kein Ordnername angegeben. Vorgang abgebrochen.', 'kunden-search');
        return;
      }
      // Zielordner auswählen
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Wähle den Speicherort für den neuen Ordner',
        properties: ['openDirectory', 'createDirectory']
      });
      if (canceled || !filePaths || filePaths.length === 0) {
        await showInfoDialog('Kein Speicherort ausgewählt. Vorgang abgebrochen.', 'kunden-search');
        return;
      }
      const zielOrdner = path.join(filePaths[0], ordnerName);
      if (!fs.existsSync(zielOrdner)) {
        fs.mkdirSync(zielOrdner);
      }
      const kunde = kIndex ? kunden[kIndex] : {};
      const betreu = bIndex ? betreuer[bIndex] : {};
      const data = { ...kunde, ...betreu };
      Object.keys(kunde).forEach(key => {
        if (key.startsWith('a')) data[key] = kunde[key];
      });
      let warnungen = [];
      let fehlendeProVorlage = {};
      for (const vName of selectedVorlagen) {
        const vorlagenPath = path.join(vorlagenDir, vName);
        const templateBuffer = fs.readFileSync(vorlagenPath);
        const outputBuffer = await replacePlaceholders(templateBuffer, data);
        if (!outputBuffer) continue;
        const dateiname = path.basename(vName);
        const zielDatei = path.join(zielOrdner, await replaceFilenamePlaceholders(dateiname, data));
        fs.writeFileSync(zielDatei, outputBuffer);
      }
      await showInfoDialog('Alle ausgewählten Dokumente wurden im Ordner gespeichert: ' + zielOrdner, 'kunden-search');
    };
  }
}); 

// Hilfsfunktion für modalen Info-Dialog (falls noch nicht vorhanden)
function showInfoDialog(message, focusId) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.3)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;
    const dialog = document.createElement('div');
    dialog.style.background = '#fff';
    dialog.style.padding = '30px';
    dialog.style.borderRadius = '10px';
    dialog.style.boxShadow = '0 2px 8px #888';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.alignItems = 'center';
    dialog.style.minWidth = '300px';
    dialog.style.maxWidth = '90vw';
    dialog.style.fontSize = '1.1em';
    const text = document.createElement('div');
    text.textContent = message;
    text.style.marginBottom = '20px';
    dialog.appendChild(text);
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.padding = '8px 24px';
    okBtn.style.fontSize = '1em';
    okBtn.onclick = () => {
      document.body.removeChild(overlay);
      setTimeout(() => {
        const mainInput = document.getElementById(focusId) || document.body;
        if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
      }, 0);
      resolve();
    };
    dialog.appendChild(okBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
} 