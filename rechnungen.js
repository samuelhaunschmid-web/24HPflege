const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { dialog, app } = require('@electron/remote');

// Konfiguration laden
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

let config = loadConfig();
if (!config.datenDir) config.datenDir = path.join(__dirname, 'Daten');
if (!config.rechnungsvorlageDir) config.rechnungsvorlageDir = path.join(__dirname, 'RechnungsVorlagen');
if (!config.currentRechnungsnummer) config.currentRechnungsnummer = 1;

// Verrechnungszeitraum-Einstellungen
const currentDate = new Date();
if (!config.verrechnungsmonat) config.verrechnungsmonat = currentDate.getMonth() + 1; // 1-12
if (!config.verrechnungsjahr) config.verrechnungsjahr = currentDate.getFullYear();

// Kundendaten laden
const kundenPath = path.join(config.datenDir, 'Kundendaten.xlsx');
let kunden = [];

if (fs.existsSync(kundenPath)) {
  const workbook = XLSX.readFile(kundenPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  kunden = XLSX.utils.sheet_to_json(sheet);
}

// Rechnungsvorlagen als Baumstruktur einlesen
function findeErsteDocxDatei(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.docx') && !file.startsWith('~$')) {
      return path.join(dir, file);
    }
  }
  return null;
}

const rechnungsvorlagenDir = config.rechnungsvorlageDir;
const rechnungsvorlagePfad = findeErsteDocxDatei(rechnungsvorlagenDir);
let rechnungsvorlageName = rechnungsvorlagePfad ? path.basename(rechnungsvorlagePfad) : '(keine Vorlage gefunden)';

// Hilfsfunktionen für Verrechnungszeitraum
function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function getVerrechnungszeitraum(month, year) {
  const daysInMonth = getDaysInMonth(month, year);
  const startDate = `01.${String(month).padStart(2, '0')}.${year}`;
  const endDate = `${String(daysInMonth).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  return `${startDate}-${endDate}`;
}

function getMonatstage(month, year) {
  return getDaysInMonth(month, year);
}

function calculateGesamtsumme(kunde, monatstage) {
  const moneyPerDay = parseFloat(kunde.Money) || 0;
  return moneyPerDay * monatstage;
}

// Vorsteuer berechnen (Nettobetrag ohne Steuer)
function calculateVorsteuer(gesamtsumme) {
  return gesamtsumme / 1.2; // Gesamtsumme / 1.2 = Nettobetrag
}

// Steuer berechnen (20% der Vorsteuer)
function calculateSteuer(vorsteuer) {
  return vorsteuer * 0.2; // 20% der Vorsteuer
}

function getMonatsname(month) {
  const monatsnamen = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return monatsnamen[month - 1] || '';
}

// Letzten Werktag des Monats berechnen
function getMonatende(month, year) {
  const daysInMonth = getDaysInMonth(month, year);
  
  // Vom letzten Tag des Monats rückwärts gehen bis zum ersten Werktag
  for (let day = daysInMonth; day >= 1; day--) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Sonntag, 6 = Samstag
    
    // Werktag gefunden (Montag bis Freitag)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
    }
  }
  
  // Fallback (sollte nie auftreten)
  return `${String(daysInMonth).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

// Individuelle Zeitraum-Berechnungen
function getIndividuellerZeitraum(vonDatum, bisDatum) {
  const von = new Date(vonDatum);
  const bis = new Date(bisDatum);
  
  const vonFormatted = `${String(von.getDate()).padStart(2, '0')}.${String(von.getMonth() + 1).padStart(2, '0')}.${von.getFullYear()}`;
  const bisFormatted = `${String(bis.getDate()).padStart(2, '0')}.${String(bis.getMonth() + 1).padStart(2, '0')}.${bis.getFullYear()}`;
  
  return `${vonFormatted}-${bisFormatted}`;
}

function getIndividuelleTage(vonDatum, bisDatum) {
  const von = new Date(vonDatum);
  const bis = new Date(bisDatum);
  
  // Berechne die Differenz in Tagen (inklusiv beide Tage)
  const differenz = (bis - von) / (1000 * 60 * 60 * 24);
  return Math.floor(differenz) + 1;
}



// Vorlagen als Checkbox-Baum rendern
function renderRechnungsvorlagenTree(tree, vorlagenCheckboxes) {
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.padding = '0';
  ul.style.margin = '0';
  
  for (const node of tree) {
    if (node.type === 'folder') {
      const li = document.createElement('li');
      const details = document.createElement('details');
      details.style.marginBottom = '5px';
      const summary = document.createElement('summary');
      summary.textContent = '📁 ' + node.name;
      summary.style.cursor = 'pointer';
      summary.style.fontWeight = 'bold';
      details.appendChild(summary);
      
      const folderCb = document.createElement('input');
      folderCb.type = 'checkbox';
      folderCb.style.marginRight = '5px';
      summary.insertBefore(folderCb, summary.firstChild);
      
      const childUl = renderRechnungsvorlagenTree(node.children, vorlagenCheckboxes);
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
      box.style.marginBottom = '5px';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = node.relPath;
      vorlagenCheckboxes.push(cb);
      box.appendChild(cb);
      box.appendChild(document.createTextNode(' 📄 ' + node.name));
      li.appendChild(box);
      ul.appendChild(li);
    }
  }
  return ul;
}

// Platzhalter in Dokumenten ersetzen
async function replacePlaceholders(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '[[', end: ']]' },
    nullGetter: function(part) {
      return {
        "raw": `<w:r><w:rPr><w:color w:val=\"FF0000\"/></w:rPr><w:t>${part.tag}</w:t></w:r>`
      };
    }
  });
  doc.setData(data);
  try {
    doc.render();
  } catch (error) {
    console.error('Template Error Details:', error);
    console.error('Error properties:', error.properties);
    
    let errorMessage = 'Fehler beim Ersetzen der Platzhalter:\n';
    
    // Detaillierte Fehlerbehandlung für XTTemplateError
    if (error.name === 'TemplateError' && error.properties && error.properties.errors) {
      errorMessage += `\nAnzahl Fehler: ${error.properties.errors.length}`;
      error.properties.errors.forEach((err, index) => {
        errorMessage += `\n${index + 1}. ${err.message}`;
        if (err.properties) {
          if (err.properties.id) {
            errorMessage += ` (Platzhalter: ${err.properties.id})`;
          }
          if (err.properties.explanation) {
            errorMessage += ` - ${err.properties.explanation}`;
          }
        }
      });
    } else {
      errorMessage += '\n' + error.message;
      if (error.properties) {
        errorMessage += '\nEigenschaften: ' + JSON.stringify(error.properties, null, 2);
      }
    }
    
    await showInfoDialog(errorMessage);
    return null;
  }
  return doc.getZip().generate({ type: 'nodebuffer' });
}

// Dateinamen-Platzhalter ersetzen (synchron!)
function replaceFilenamePlaceholders(filename, data) {
  return filename.replace(/\[\[(.*?)\]\]/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

// Info-Dialog anzeigen
function showInfoDialog(message) {
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
      resolve();
    };
    dialog.appendChild(okBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}

// Hilfsfunktion für modales Eingabefeld (wie im Dokumentengenerator)
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
    dialog.appendChild(okBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    input.focus();
  });
}

// Hilfsfunktion: Alle .docx-Dateien im Ordner (keine Unterordner)
function getAllDocxFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.toLowerCase().endsWith('.docx') && !file.startsWith('~$'))
    .map(file => ({
      name: file,
      path: path.join(dir, file)
    }));
}

let vorlagenCheckboxes = []; // global, damit sie überall verfügbar ist

// UI initialisieren
window.addEventListener('DOMContentLoaded', () => {
  // Rechnungsnummer laden und anzeigen
  const rechnungsnummerInput = document.getElementById('rechnungsnummer-start');
  rechnungsnummerInput.value = config.currentRechnungsnummer;
  
  // Rechnungsnummer speichern
  document.getElementById('save-rechnungsnummer').onclick = () => {
    const neueNummer = parseInt(rechnungsnummerInput.value);
    if (neueNummer >= 1) {
      config.currentRechnungsnummer = neueNummer;
      saveConfig(config);
      showInfoDialog('Rechnungsnummer wurde gespeichert!');
    } else {
      showInfoDialog('Bitte geben Sie eine gültige Rechnungsnummer ein (mindestens 1).');
    }
  };
  
  // Verrechnungszeitraum-Einstellungen laden und anzeigen
  const verrechnungsmonatSelect = document.getElementById('verrechnungsmonat');
  const verrechnungsjahrInput = document.getElementById('verrechnungsjahr');
  const verrechnungszeitraumDisplay = document.getElementById('verrechnungszeitraum-display');
  const monatstageDisplay = document.getElementById('monatstage-display');
  
  verrechnungsmonatSelect.value = config.verrechnungsmonat;
  verrechnungsjahrInput.value = config.verrechnungsjahr;
  
  // Verrechnungszeitraum und Monatstage anzeigen
  function updateVerrechnungszeitraumDisplay() {
    const month = parseInt(verrechnungsmonatSelect.value);
    const year = parseInt(verrechnungsjahrInput.value);
    const zeitraum = getVerrechnungszeitraum(month, year);
    const monatstage = getMonatstage(month, year);
    
    verrechnungszeitraumDisplay.textContent = zeitraum;
    monatstageDisplay.textContent = monatstage + ' Tage';
  }
  
  updateVerrechnungszeitraumDisplay();
  
  // Event-Listener für Änderungen
  verrechnungsmonatSelect.addEventListener('change', updateVerrechnungszeitraumDisplay);
  verrechnungsjahrInput.addEventListener('change', updateVerrechnungszeitraumDisplay);
  
  // Verrechnungszeitraum speichern
  document.getElementById('save-verrechnungszeitraum').onclick = () => {
    const month = parseInt(verrechnungsmonatSelect.value);
    const year = parseInt(verrechnungsjahrInput.value);
    
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      config.verrechnungsmonat = month;
      config.verrechnungsjahr = year;
      saveConfig(config);
      showInfoDialog('Verrechnungszeitraum wurde gespeichert!');
    } else {
      showInfoDialog('Bitte geben Sie gültige Werte ein (Monat: 1-12, Jahr: 2020-2030).');
    }
  };
  
  // Kunden nach Nachname sortieren
  const sortedKunden = kunden.slice().sort((a, b) => {
    const nachnameA = (a.kfname || '').toLowerCase();
    const nachnameB = (b.kfname || '').toLowerCase();
    if (nachnameA < nachnameB) return -1;
    if (nachnameA > nachnameB) return 1;
    return 0;
  });

  // Hilfsfunktion für eindeutigen Kunden-Key
  function getKundenKey(kunde) {
    return `${(kunde.kfname || '').toLowerCase()}__${(kunde.kvname || '').toLowerCase()}`;
  }

  // Kunden-Checkboxen mit individuellen Zeiträumen erstellen
  const kundenCheckboxList = document.getElementById('kunden-checkbox-list');
  const kundenCheckboxes = [];

  sortedKunden.forEach((kunde) => {
    const kundenKey = getKundenKey(kunde);
    const kundenDiv = document.createElement('div');
    kundenDiv.className = 'kunde-item';

    // Kunde Header mit Checkbox
    const headerDiv = document.createElement('div');
    headerDiv.className = 'kunde-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = kundenKey;
    checkbox.id = `kunde-${kundenKey}`;
    kundenCheckboxes.push(checkbox);

    const label = document.createElement('label');
    label.htmlFor = `kunde-${kundenKey}`;
    label.textContent = `${kunde.kvname || ''} ${kunde.kfname || ''}`.trim();

    headerDiv.appendChild(checkbox);
    headerDiv.appendChild(label);

    // Zeitraum-Einstellungen
    const zeitraumDiv = document.createElement('div');
    zeitraumDiv.className = 'kunde-zeitraum';
    zeitraumDiv.id = `zeitraum-${kundenKey}`;

    const zeitraumControls = document.createElement('div');
    zeitraumControls.className = 'zeitraum-controls';

    // Option 1: Ganzer Monat (Standard)
    const ganzerMonatDiv = document.createElement('div');
    ganzerMonatDiv.className = 'zeitraum-option';
    const ganzerMonatRadio = document.createElement('input');
    ganzerMonatRadio.type = 'radio';
    ganzerMonatRadio.name = `zeitraum-${kundenKey}`;
    ganzerMonatRadio.value = 'ganzer-monat';
    ganzerMonatRadio.id = `ganzer-monat-${kundenKey}`;
    ganzerMonatRadio.checked = true;
    const ganzerMonatLabel = document.createElement('label');
    ganzerMonatLabel.htmlFor = `ganzer-monat-${kundenKey}`;
    ganzerMonatLabel.textContent = 'Ganzer Monat';
    ganzerMonatDiv.appendChild(ganzerMonatRadio);
    ganzerMonatDiv.appendChild(ganzerMonatLabel);

    // Option 2: Individueller Zeitraum
    const individuellDiv = document.createElement('div');
    individuellDiv.className = 'zeitraum-option';
    const individuellRadio = document.createElement('input');
    individuellRadio.type = 'radio';
    individuellRadio.name = `zeitraum-${kundenKey}`;
    individuellRadio.value = 'individuell';
    individuellRadio.id = `individuell-${kundenKey}`;
    const individuellLabel = document.createElement('label');
    individuellLabel.htmlFor = `individuell-${kundenKey}`;
    individuellLabel.textContent = 'Individueller Zeitraum:';
    individuellDiv.appendChild(individuellRadio);
    individuellDiv.appendChild(individuellLabel);

    // Von-Datum
    const vonLabel = document.createElement('label');
    vonLabel.textContent = 'Von:';
    vonLabel.style.marginLeft = '10px';
    const vonInput = document.createElement('input');
    vonInput.type = 'date';
    vonInput.id = `von-${kundenKey}`;
    vonInput.disabled = true;

    // Bis-Datum
    const bisLabel = document.createElement('label');
    bisLabel.textContent = 'Bis:';
    bisLabel.style.marginLeft = '10px';
    const bisInput = document.createElement('input');
    bisInput.type = 'date';
    bisInput.id = `bis-${kundenKey}`;
    bisInput.disabled = true;

    // Event-Listener für Radio-Buttons
    ganzerMonatRadio.addEventListener('change', () => {
      vonInput.disabled = true;
      bisInput.disabled = true;
    });

    individuellRadio.addEventListener('change', () => {
      vonInput.disabled = false;
      bisInput.disabled = false;
      // Setze Standard-Werte
      const month = config.verrechnungsmonat;
      const year = config.verrechnungsjahr;
      vonInput.value = `${year}-${String(month).padStart(2, '0')}-01`;
      bisInput.value = `${year}-${String(month).padStart(2, '0')}-${String(getDaysInMonth(month, year)).padStart(2, '0')}`;
    });

    // Checkbox-Event für Zeitraum-Anzeige
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        zeitraumDiv.classList.add('active');
      } else {
        zeitraumDiv.classList.remove('active');
      }
    });

    zeitraumControls.appendChild(ganzerMonatDiv);
    zeitraumControls.appendChild(individuellDiv);
    zeitraumControls.appendChild(vonLabel);
    zeitraumControls.appendChild(vonInput);
    zeitraumControls.appendChild(bisLabel);
    zeitraumControls.appendChild(bisInput);

    zeitraumDiv.appendChild(zeitraumControls);

    kundenDiv.appendChild(headerDiv);
    kundenDiv.appendChild(zeitraumDiv);
    kundenCheckboxList.appendChild(kundenDiv);
  });
  
  // Alle Kunden auswählen/abwählen
  document.getElementById('select-all-kunden').onclick = () => {
    kundenCheckboxes.forEach((cb) => {
      cb.checked = true;
      document.getElementById(`zeitraum-${cb.value}`).classList.add('active');
    });
  };
  
  document.getElementById('deselect-all-kunden').onclick = () => {
    kundenCheckboxes.forEach((cb) => {
      cb.checked = false;
      document.getElementById(`zeitraum-${cb.value}`).classList.remove('active');
    });
  };
  
  // Kundensuche
  const kundenSearch = document.getElementById('kunden-search');
  kundenSearch.addEventListener('input', () => {
    const searchTerm = kundenSearch.value.toLowerCase();
    kundenCheckboxes.forEach((checkbox) => {
      const kunde = sortedKunden.find(k => getKundenKey(k) === checkbox.value);
      if (!kunde) return; // Skip if kunde not found
      const kundenName = `${kunde.kvname || ''} ${kunde.kfname || ''}`.trim().toLowerCase();
      const kundenItem = checkbox.closest('.kunde-item');
      
      if (kundenName.includes(searchTerm)) {
        kundenItem.style.display = 'block';
      } else {
        kundenItem.style.display = 'none';
      }
    });
  });
  
  // Rechnungsvorlagen anzeigen
  const rechnungsvorlagenContainer = document.getElementById('rechnungsvorlagen-container');
  if (rechnungsvorlagenContainer) {
    const vorlagen = getAllDocxFiles(rechnungsvorlagenDir);
    vorlagenCheckboxes = []; // leeren!
    if (vorlagen.length === 0) {
      rechnungsvorlagenContainer.textContent = 'Keine Rechnungsvorlagen gefunden.';
    } else {
      vorlagen.forEach((vorlage, idx) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = vorlage.path;
        cb.id = `vorlage-${idx}`;
        vorlagenCheckboxes.push(cb);
        const label = document.createElement('label');
        label.htmlFor = cb.id;
        // Anzeige-Name je nach Dateiname
        let displayName = vorlage.name;
        if (/Wimmer/i.test(vorlage.name)) {
          displayName = 'Rechnung Wimmer';
        } else if (/\[\[kfname\]\] - \[\[afname\]\]/i.test(vorlage.name)) {
          displayName = 'Rechnung Personenvertretung';
        } else if (/Vermittlungsprovision/i.test(vorlage.name)) {
          displayName = 'Rechnung Vermittlungsprovision';
        } else if (/\[\[kfname\]\]/i.test(vorlage.name)) {
          displayName = 'Rechnung Kunde';
        }
        label.textContent = displayName;
        div.appendChild(cb);
        div.appendChild(label);
        rechnungsvorlagenContainer.appendChild(div);
      });
    }
  }
  
  // Zeige die aktuelle Vorlage im Hinweis an
  const vorlagenDateinameSpan = document.getElementById('vorlagen-dateiname');
  if (vorlagenDateinameSpan) {
    vorlagenDateinameSpan.textContent = rechnungsvorlageName;
  }
  
  // Rechnungen generieren
  document.getElementById('generate-rechnungen').onclick = async () => {
    const selectedKundenKeys = kundenCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    if (selectedKundenKeys.length === 0) {
      await showInfoDialog('Bitte wählen Sie mindestens einen Kunden aus!');
      return;
    }
    const selectedVorlagen = vorlagenCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    if (selectedVorlagen.length === 0) {
      await showInfoDialog('Bitte wähle mindestens eine Rechnungsvorlage aus!');
      return;
    }
    // Zielordner direkt auswählen
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Wähle den Speicherort für die Rechnungen',
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      await showInfoDialog('Kein Speicherort ausgewählt. Vorgang abgebrochen.');
      return;
    }
    const zielOrdner = filePaths[0];
    let currentRechnungsnummer = config.currentRechnungsnummer;
    let generierteRechnungen = 0;
    let fehlerhafte = 0;
    const errors = [];
    
    for (const kundenKey of selectedKundenKeys) {
      const kunde = sortedKunden.find(k => getKundenKey(k) === kundenKey);
      if (!kunde) continue;
      const kundenName = `${kunde.kvname || ''} ${kunde.kfname || ''}`.trim() || `Kunde`;
      
      for (const vorlagenPath of selectedVorlagen) {
        const vorlagenName = path.basename(vorlagenPath);
        
        try {
        const templateBuffer = fs.readFileSync(vorlagenPath);
          
        // Daten für Platzhalter vorbereiten
        const data = { ...kunde };
        data.Rechnungsnummer = currentRechnungsnummer;
        const month = config.verrechnungsmonat;
        const year = config.verrechnungsjahr;
          
          // Prüfe, ob individueller Zeitraum für diesen Kunden gewählt wurde
          const individuellRadio = document.getElementById(`individuell-${kundenKey}`);
          const istIndividuell = individuellRadio && individuellRadio.checked;
          
          let monatstage, zeitraum;
          
          if (istIndividuell) {
            // Individuelle Zeitraum-Daten verwenden
            const vonInput = document.getElementById(`von-${kundenKey}`);
            const bisInput = document.getElementById(`bis-${kundenKey}`);
            
            if (vonInput && bisInput && vonInput.value && bisInput.value) {
              monatstage = getIndividuelleTage(vonInput.value, bisInput.value);
              zeitraum = getIndividuellerZeitraum(vonInput.value, bisInput.value);
            } else {
              // Fallback auf Standard-Werte
              monatstage = getMonatstage(month, year);
              zeitraum = getVerrechnungszeitraum(month, year);
            }
          } else {
            // Standard-Zeitraum verwenden (ganzer Monat)
            monatstage = getMonatstage(month, year);
            zeitraum = getVerrechnungszeitraum(month, year);
          }
          
          // Monatende ist IMMER der letzte Werktag des Verrechnungsmonats
          const monatende = getMonatende(month, year);
          
        const gesamtsumme = calculateGesamtsumme(kunde, monatstage);
          const vorsteuer = calculateVorsteuer(gesamtsumme);
          const steuer = calculateSteuer(vorsteuer);
        data.Verrechnungsmonat = getMonatsname(month);
        data.Verrechnungsjahr = year;
        data.Verrechnungszeitraum = zeitraum;
        data.Monatstage = monatstage;
        data.Gesamtsumme = gesamtsumme.toFixed(2);
          data.Vorsteuer = vorsteuer.toFixed(2);
          data.Steuer = steuer.toFixed(2);
          data.Monatende = monatende;
          
          // Debug: Log the data being passed to the template
          console.log(`Processing ${kundenName} - ${vorlagenName}:`, data);
          
          // Validate and clean template data
          const cleanData = {};
          for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
              cleanData[key] = '';
            } else if (typeof value === 'string') {
              cleanData[key] = value;
            } else {
              cleanData[key] = String(value);
            }
          }
          
          // Ensure all required fields are present
          const requiredFields = ['Rechnungsnummer', 'Verrechnungsmonat', 'Verrechnungsjahr', 'Verrechnungszeitraum', 'Monatstage', 'Gesamtsumme', 'Vorsteuer', 'Steuer', 'Monatende'];
          for (const field of requiredFields) {
            if (!cleanData[field]) {
              cleanData[field] = '';
            }
          }
          
          console.log(`Cleaned data for ${kundenName}:`, cleanData);
          
          const outputBuffer = await replacePlaceholders(templateBuffer, cleanData);
          if (!outputBuffer) {
            fehlerhafte++;
            errors.push(`${kundenName} - ${vorlagenName}: Template-Fehler`);
            continue;
          }
          
          const dateiname = replaceFilenamePlaceholders(vorlagenName, cleanData);
        const zielDatei = path.join(zielOrdner, dateiname);
        fs.writeFileSync(zielDatei, outputBuffer);
        currentRechnungsnummer++;
        generierteRechnungen++;
          
        } catch (error) {
          fehlerhafte++;
          errors.push(`${kundenName} - ${vorlagenName}: ${error.message}`);
          console.error(`Fehler bei ${kundenName} - ${vorlagenName}:`, error);
        }
      }
    }
    // Neue Rechnungsnummer speichern
    config.currentRechnungsnummer = currentRechnungsnummer;
    saveConfig(config);
    rechnungsnummerInput.value = currentRechnungsnummer;
    
    // Erfolgsmeldung mit Fehlerübersicht
    let message = `${generierteRechnungen} Rechnungen wurden erfolgreich generiert!\n\nNeue Rechnungsnummer: ${currentRechnungsnummer}\n\nSpeicherort: ${zielOrdner}`;
    
    if (fehlerhafte > 0) {
      message += `\n\n⚠️ ${fehlerhafte} Rechnung(en) konnten nicht generiert werden:`;
      errors.forEach(error => {
        message += `\n• ${error}`;
      });
    }
    
    await showInfoDialog(message);
  };
  

}); 