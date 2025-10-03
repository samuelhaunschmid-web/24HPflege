const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { app } = require('@electron/remote');
const userDataPath = app.getPath('userData');

// Mapping für sprechende Feldnamen (ganz oben, global)
const fieldLabels = {
  'kfname': 'Nachname',
  'kfvname': 'Vorname',
  'kvname': 'Vorname',
  'kstrasse': 'Adresse',
  'kplz': 'PLZ',
  'kort': 'Ort',
  'kgebdat': 'Geburtsdatum',
  'ktel': 'Telefon',
  'Betreuer 1 Nachname': 'Betreuer 1 Nachname',
  'Betreuer 1 Vorname': 'Betreuer 1 Vorname',
  'Betreuer 2 Nachname': 'Betreuer 2 Nachname',
  'Betreuer 2 Vorname': 'Betreuer 2 Vorname',
  // Angehörigen-Felder
  'Atitel': 'Angehörige/r Titel',
  'Avname': 'Angehörige/r Vorname',
  'Afname': 'Angehörige/r Nachname',
  'Astellung': 'Angehöriger Stellung',
  'Astrasse': 'Angehöriger Straße',
  'Aplz': 'Angehöriger PLZ',
  'Aort': 'Angehöriger Ort',
  'Atel': 'Angehöriger Telefonnummer',
  'AL': 'Angehöriger Telefonnummer (L)',
  'AJ': 'Angehöriger Telefonnummer (J)',
  'AS': 'Angehöriger Telefonnummer (S)',
  'Atel+L:J:S': 'Angehöriger Telefonnummer',
  // ... weitere Felder nach Wunsch
};

// Konfigurationsdatei
const configPath = path.join(userDataPath, 'config.json');
function loadConfig() {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) { return {}; }
  }
  return {};
}
let config = loadConfig();
if (!config.datenDir) config.datenDir = path.join(__dirname, 'Daten');

const kundenPath = path.join(config.datenDir, 'Kundendaten.xlsx');
let kundenSort = { field: null, dir: 1 };
let kundenSearch = '';

// Liste gängiger akademischer Titel
const akademischeTitel = [
  'Dr.', 'Prof.', 'Prof. Dr.', 'Dipl.-Ing.', 'B.Sc.', 'M.Sc.', 'Mag.', 'Dipl.-Kfm.', 'Dipl.-Psych.', 'Dr. med.', 'Dr. rer. nat.', 'Dr. phil.', 'Dr. jur.', 'Dr. h.c.', 'B.A.', 'M.A.', 'MBA', 'LL.M.', 'Staatsexamen'
];

// Europäische Ländervorwahlen mit Länderkürzel
const euVorwahlenMitLand = [
  { code: '+49', land: 'DEU' },
  { code: '+43', land: 'AUT' },
  { code: '+41', land: 'CHE' },
  { code: '+39', land: 'ITA' },
  { code: '+33', land: 'FRA' },
  { code: '+34', land: 'ESP' },
  { code: '+420', land: 'CZE' },
  { code: '+48', land: 'POL' },
  { code: '+36', land: 'HUN' },
  { code: '+386', land: 'SVN' },
  { code: '+372', land: 'EST' },
  { code: '+370', land: 'LTU' },
  { code: '+371', land: 'LVA' },
  { code: '+358', land: 'FIN' },
  { code: '+47', land: 'NOR' },
  { code: '+46', land: 'SWE' },
  { code: '+45', land: 'DNK' },
  { code: '+351', land: 'PRT' },
  { code: '+357', land: 'CYP' },
  { code: '+353', land: 'IRL' },
  { code: '+355', land: 'ALB' },
  { code: '+359', land: 'BGR' },
  { code: '+380', land: 'UKR' },
  { code: '+375', land: 'BLR' },
  { code: '+7', land: 'RUS' },
  { code: '+30', land: 'GRC' },
  { code: '+40', land: 'ROU' },
  { code: '+421', land: 'SVK' },
  { code: '+381', land: 'SRB' },
  { code: '+382', land: 'MNE' },
  { code: '+389', land: 'MKD' },
  { code: '+357', land: 'CYP' },
  { code: '+356', land: 'MLT' },
  { code: '+378', land: 'SMR' },
  { code: '+380', land: 'UKR' },
  { code: '+423', land: 'LIE' },
  { code: '+350', land: 'GIB' },
  { code: '+299', land: 'GRL' },
  { code: '+354', land: 'ISL' },
  { code: '+385', land: 'HRV' },
  { code: '+387', land: 'BIH' },
  { code: '+373', land: 'MDA' },
  { code: '+374', land: 'ARM' },
  { code: '+376', land: 'AND' },
  { code: '+377', land: 'MCO' },
  { code: '+383', land: 'XKX' },
  { code: '+390', land: 'VAT' },
  { code: '+351', land: 'PRT' },
  { code: '+354', land: 'ISL' },
  { code: '+357', land: 'CYP' },
  { code: '+370', land: 'LTU' },
  { code: '+371', land: 'LVA' },
  { code: '+372', land: 'EST' },
  { code: '+373', land: 'MDA' },
  { code: '+374', land: 'ARM' },
  { code: '+375', land: 'BLR' },
  { code: '+376', land: 'AND' },
  { code: '+377', land: 'MCO' },
  { code: '+378', land: 'SMR' },
  { code: '+380', land: 'UKR' },
  { code: '+381', land: 'SRB' },
  { code: '+382', land: 'MNE' },
  { code: '+383', land: 'XKX' },
  { code: '+385', land: 'HRV' },
  { code: '+386', land: 'SVN' },
  { code: '+387', land: 'BIH' },
  { code: '+389', land: 'MKD' },
  { code: '+420', land: 'CZE' },
  { code: '+421', land: 'SVK' },
  { code: '+423', land: 'LIE' }
];

const anredeOptionen = ['Mann', 'Frau', 'Fam.'];

function readExcel(filePath) {
  const workbook = window.settings.XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return window.settings.XLSX.utils.sheet_to_json(sheet, { defval: '' });
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
  // Typische Datumsfelder
  const dateFields = ['kgebdat', 'Geburtsdatum'];
  Object.keys(obj).forEach(key => {
    const keyLower = key.toLowerCase();
    if (
      dateFields.includes(key) ||
      /^b\d*anfang$/i.test(key) ||
      /^b\d*ende$/i.test(key) ||
      /^betreuer ?\d+ anfang$/i.test(keyLower) ||
      /^betreuer ?\d+ ende$/i.test(keyLower)
    ) {
      obj[key] = excelDateToString(obj[key]);
    }
  });
  return obj;
}

function sortData(data, field, dir) {
  return data.slice().sort((a, b) => {
    const va = (a[field] || '').toLowerCase();
    const vb = (b[field] || '').toLowerCase();
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function filterData(data, search) {
  if (!search) return data;
  const s = search.toLowerCase();
  return data.filter(row => Object.values(row).some(val => (val || '').toString().toLowerCase().includes(s)));
}

function renderSortControls(containerId, setSort, currentSort, fields) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  fields.forEach(field => {
    ['asc', 'desc'].forEach(dir => {
      const btn = document.createElement('button');
      btn.textContent = `${field} ${dir === 'asc' ? '↑' : '↓'}`;
      btn.style.marginRight = '8px';
      btn.onclick = () => setSort(field, dir === 'asc' ? 1 : -1);
      if (currentSort.field === field && currentSort.dir === (dir === 'asc' ? 1 : -1)) {
        btn.style.background = '#d0eaff';
      }
      container.appendChild(btn);
    });
  });
}

function writeExcel(filePath, data) {
  // --- ALLE ZEILEN AUF GLEICHE FELDER BRINGEN ---
  const allKeys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  data.forEach(obj => {
    allKeys.forEach(k => { if (!(k in obj)) obj[k] = ''; });
  });
  const ws = window.settings.XLSX.utils.json_to_sheet(data);
  const wb = window.settings.XLSX.utils.book_new();
  window.settings.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  window.settings.XLSX.writeFile(wb, filePath);
}

function createAccordionTable(data, containerId, nameFields, saveCallback, filePath) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML = '<i>Keine Daten gefunden.</i>';
    return;
  }

  // Add settings button to top actions
  const topActions = document.querySelector('.top-actions');
  // Entferne alte Spalteneinstellungen-Buttons
  Array.from(topActions.querySelectorAll('button')).forEach(btn => {
    if (btn.textContent === 'Spalteneinstellungen') btn.remove();
  });
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = 'Spalteneinstellungen';
  settingsBtn.onclick = () => window.createSettingsDialog('customer');
  topActions.appendChild(settingsBtn);

  // Wichtigste Felder für die Übersicht
  const mainFields = [
    { label: 'Name', keys: ['kvname', 'kfname'] },
    { label: 'Adresse', keys: ['kstrasse','kplz','kort']},    
    { label: 'Betreuer 1', keys: ['Betreuer 1 Vorname', 'Betreuer 1 Nachname'] },
    { label: 'Betreuer 2', keys: ['Betreuer 2 Vorname', 'Betreuer 2 Nachname'] }
  ];
  const keys = Object.keys(data[0]);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  mainFields.forEach(f => {
    const th = document.createElement('th');
    th.textContent = f.label;
    tr.appendChild(th);
  });
  const thDetails = document.createElement('th');
  thDetails.textContent = 'Details';
  tr.appendChild(thDetails);
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    // Wichtigste Infos (nicht editierbar)
    mainFields.forEach((f, colIdx) => {
      const td = document.createElement('td');
      // Für Betreuer 1/2 klickbar machen
      if (f.label.startsWith('Betreuer')) {
        const vor = row[f.keys[0]] || '';
        const nach = row[f.keys[1]] || '';
        const name = (vor + ' ' + nach).trim();
        td.textContent = name;
      } else {
        td.textContent = f.keys.map(k => row[k] || '').filter(Boolean).join(' ');
      }
      tr.appendChild(td);
    });
    // Details-Button + Betreuerwechsel-Button nebeneinander
    const tdDetails = document.createElement('td');
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.alignItems = 'center';
    // Details-Button
    const btn = document.createElement('button');
    btn.textContent = 'Details anzeigen';
    btn.onclick = () => {
      detailsRow.style.display = detailsRow.style.display === 'none' ? '' : 'none';
      btn.textContent = detailsRow.style.display === 'none' ? 'Details anzeigen' : 'Details ausblenden';
    };
    btnRow.appendChild(btn);
    // Betreuerwechsel-Button
    const wechselBtn = document.createElement('button');
    wechselBtn.textContent = 'Betreuerwechsel';
    wechselBtn.style.marginLeft = '0';
    wechselBtn.onclick = async () => {
      await saveCallback(rowIdx, 'wechsel');
    };
    btnRow.appendChild(wechselBtn);
    tdDetails.appendChild(btnRow);
    tr.appendChild(tdDetails);
    tbody.appendChild(tr);

    // Details-Zeile (versteckt, nicht editierbar, nur ausgefüllte Felder)
    const detailsRow = document.createElement('tr');
    detailsRow.style.display = 'none';
    const detailsTd = document.createElement('td');
    detailsTd.colSpan = mainFields.length + 1;
    // Details-Tabelle (nur ausgefüllte Felder, nicht editierbar)
    const innerTable = document.createElement('table');
    innerTable.style.width = '100%';
    const innerTbody = document.createElement('tbody');
    keys.forEach(key => {
      // Diese Felder IMMER anzeigen, auch wenn sie leer sind
      const alwaysShow = ['ktel', 'ksvn', 'atel+L:J:S'];
      const isAlwaysShow = alwaysShow.includes(key);
      if ((!row[key] && !isAlwaysShow) || !window.settings.detailViewSettings.customerDetailColumns.visible.includes(key)) return; // Nur ausgefüllte und sichtbare Felder, außer alwaysShow
      const rowInner = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = getFieldLabel(key);
      const td = document.createElement('td');
      td.textContent = row[key] || '';
      // Angehörigenfelder hellblau
      if (/^a(?!ltbetreuer)/i.test(key)) {
        th.style.background = '#e6f7ff';
        td.style.background = '#e6f7ff';
      }
      // Altbetreuer-Felder hellgrün
      if (/^altbetreuer/i.test(key)) {
        th.style.background = '#eaffea';
        td.style.background = '#eaffea';
      }
      // Betreuer 1/2 Felder hellrot
      if (/^betreuer 1/i.test(key) || /^betreuer 2/i.test(key)) {
        th.style.background = '#ffeaea';
        td.style.background = '#ffeaea';
      }
      // Wenn alwaysShow und leer: dunkelrot
      if (isAlwaysShow && !row[key]) {
        th.style.background = '#8B0000'; // dunkelrot
        th.style.color = '#fff';
        td.style.background = '#8B0000';
        td.style.color = '#fff';
      }
      rowInner.appendChild(th);
      rowInner.appendChild(td);
      innerTbody.appendChild(rowInner);
    });
    innerTable.appendChild(innerTbody);
    detailsTd.appendChild(innerTable);
    // Bearbeiten-Button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Bearbeiten';
    editBtn.style.marginTop = '10px';
    editBtn.onclick = () => {
      saveCallback(rowIdx, 'edit');
    };
    detailsTd.appendChild(editBtn);
    // Entfernen-Button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Entfernen';
    removeBtn.style.marginLeft = '10px';
    removeBtn.style.background = '#ffdddd';
    removeBtn.style.color = '#b00';
    removeBtn.onclick = async () => {
      if (!await showConfirmDialog('Möchtest du diesen Kunden wirklich entfernen? Die Daten werden ins Archiv (ALTkundendaten.xlsx) verschoben.', 'kunden-search')) return;
      saveCallback(rowIdx, 'delete');
    };
    detailsTd.appendChild(removeBtn);
    detailsRow.appendChild(detailsTd);
    tbody.appendChild(detailsRow);
  });
  table.appendChild(tbody);
  document.getElementById(containerId).innerHTML = '';
  document.getElementById(containerId).appendChild(table);
}

function toDateInputValue(val) {
  // Wandelt TT.MM.JJJJ oder Excel-Seriennummer in YYYY-MM-DD für <input type="date">
  if (!val) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
    const [d, m, y] = val.split('.');
    return `${y}-${m}-${d}`;
  }
  if (!isNaN(val) && Number(val) > 30000) {
    // Excel-Seriennummer
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  return val;
}

function fromDateInputValue(val) {
  // Wandelt YYYY-MM-DD in TT.MM.JJJJ
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}.${m}.${y}`;
  }
  return val;
}

async function showAddDialog(fields, title) {
  // Vor dem Erstellen eines neuen Overlays: alle alten Overlays entfernen
  document.querySelectorAll('[id^="dialog-overlay"]').forEach(el => el.remove());
  // Betreuerliste laden
  let betreuerList = [];
  try {
    const betreuerPath = path.join(config.datenDir, 'Betreuerinnendaten.xlsx');
    if (fs.existsSync(betreuerPath)) {
      betreuerList = readExcel(betreuerPath);
    }
  } catch (e) {}
  // PLZ/Ort-Liste laden (jetzt aus JSON)
  let plzOrtList = [];
  let plzSet = new Set();
  let ortSet = new Set();
  const plzOrtPath = path.join(__dirname, 'plz_ort_at.json');
  if (fs.existsSync(plzOrtPath)) {
    try {
      plzOrtList = JSON.parse(fs.readFileSync(plzOrtPath, 'utf-8'));
      plzOrtList.forEach(row => {
        if (row.PLZ) plzSet.add(String(row.PLZ));
        if (row.Ort) ortSet.add(row.Ort);
      });
    } catch (e) {}
  }
  // Datalists erzeugen (nur einmal, immer im <body>)
  if (!document.body.querySelector('#plz-at-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'plz-at-list';
    plzSet.forEach(plz => {
      const option = document.createElement('option');
      option.value = plz;
      datalist.appendChild(option);
    });
    document.body.appendChild(datalist);
  }
  if (!document.body.querySelector('#ort-at-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'ort-at-list';
    ortSet.forEach(ort => {
      const option = document.createElement('option');
      option.value = ort;
      datalist.appendChild(option);
    });
    document.body.appendChild(datalist);
  }
  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'dialog-overlay';
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
    dialog.style.minWidth = '350px';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    const inputs = {};
    fields.forEach(field => {
      if (/^__EMPTY/.test(field)) return; // Überspringe leere Felder
      if (/^Altbetreuer/.test(field)) return; // Altbetreuer-Felder nur im Add-Dialog ausblenden
      const label = document.createElement('label');
      label.textContent = getFieldLabel(field);
      label.style.marginTop = '10px';
      label.style.display = 'block';
      let input;
      if (field === 'ksvn') {
        // SVN: 2 Felder
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.marginTop = '4px';
        // 4 Ziffern
        const teil1 = document.createElement('input');
        teil1.type = 'text';
        teil1.pattern = '\\d{4}';
        teil1.maxLength = 4;
        teil1.placeholder = '1234';
        teil1.style.width = '60px';
        // TTMMYY
        const teil2 = document.createElement('input');
        teil2.type = 'text';
        teil2.pattern = '\\d{6}';
        teil2.maxLength = 6;
        teil2.placeholder = 'TTMMYY';
        teil2.style.width = '80px';
        // Automatisch aus Geburtsdatum befüllen, wenn vorhanden
        let userOverride = false;
        teil2.addEventListener('input', () => { userOverride = true; });
        function updateSVTeil2(val) {
          let d = null;
          if (typeof val === 'object' && val instanceof Date) {
            d = val;
          } else if (typeof val === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
              const [y, m, t] = val.split('-');
              d = new Date(Number(y), Number(m) - 1, Number(t));
            } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
              const [t, m, y] = val.split('.');
              d = new Date(Number(y), Number(m) - 1, Number(t));
            }
          }
          if (d && !isNaN(d.getTime()) && (!userOverride || !teil2.value)) {
            const tag = String(d.getDate()).padStart(2, '0');
            const monat = String(d.getMonth() + 1).padStart(2, '0');
            const jahr = String(d.getFullYear()).slice(-2);
            teil2.value = `${tag}${monat}${jahr}`;
          }
        }
        setTimeout(() => {
          const gebdatFeld = dialog.querySelector('input[type="date"]');
          if (gebdatFeld) {
            gebdatFeld.addEventListener('input', () => {
              if (gebdatFeld.value.length === 10) {
                updateSVTeil2(gebdatFeld.valueAsDate || gebdatFeld.value);
              }
            });
            gebdatFeld.addEventListener('blur', () => {
              updateSVTeil2(gebdatFeld.valueAsDate || gebdatFeld.value);
            });
            if (gebdatFeld.value.length === 10) {
              updateSVTeil2(gebdatFeld.valueAsDate || gebdatFeld.value);
            }
          }
        }, 0);
        wrapper.appendChild(teil1);
        wrapper.appendChild(document.createTextNode('-'));
        wrapper.appendChild(teil2);
        label.appendChild(document.createElement('br'));
        dialog.appendChild(label);
        dialog.appendChild(wrapper);
        inputs[field + '_teil1'] = teil1;
        inputs[field + '_teil2'] = teil2;
        inputs[field] = wrapper;
        return;
      } else if (/anrede$/i.test(field)) {
        // Input mit Datalist für Anrede (Combobox)
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'anrede-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
        if (typeof row !== 'undefined' && row && row[field]) input.value = row[field];
        // Datalist erstellen
        let datalist = document.getElementById('anrede-list');
        if (!datalist) {
          datalist = document.createElement('datalist');
          datalist.id = 'anrede-list';
          // Standardoptionen
          const anredeOptionen = ['Herr', 'Frau', 'Divers', 'Familie', 'Herr und Frau'];
          anredeOptionen.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            datalist.appendChild(option);
          });
          // Alle existierenden Anrede-Werte aus der Tabelle
          let kunden = [];
          if (fs.existsSync(kundenPath)) {
            kunden = readExcel(kundenPath);
          }
          const anredeValues = new Set(kunden.map(k => k.Anrede || k.anrede).filter(Boolean));
          anredeValues.forEach(value => {
            if (!anredeOptionen.includes(value)) {
              const option = document.createElement('option');
              option.value = value;
              datalist.appendChild(option);
            }
          });
          dialog.appendChild(datalist);
        }
        inputs[field] = input;
      } else if (/titel$/i.test(field)) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'titel-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else if (field === 'DGKP') {
        // Input mit Datalist für DGKP (Combobox)
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'dgkp-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
        if (typeof row !== 'undefined' && row && row[field]) input.value = row[field];
        // Datalist erstellen
        let datalist = document.getElementById('dgkp-list');
        if (!datalist) {
          datalist = document.createElement('datalist');
          datalist.id = 'dgkp-list';
          // Alle existierenden DGKP-Werte als Optionen hinzufügen
          let kunden = [];
          if (fs.existsSync(kundenPath)) {
            kunden = readExcel(kundenPath);
          }
          const dgkpValues = new Set(kunden.map(k => k.DGKP || k.dgkp || k.Dgkp).filter(Boolean));
          dgkpValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            datalist.appendChild(option);
          });
          dialog.appendChild(datalist);
        }
      } else if (field === 'ktel' || field === 'atel+L:J:S') {
        // Vorwahl-Combobox + Nummernfeld nur für diese beiden Felder
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        // Vorwahl
        const vorwahl = document.createElement('input');
        vorwahl.setAttribute('list', 'eu-vorwahlen');
        vorwahl.style.width = '110px';
        vorwahl.placeholder = '+43';
        // Nummer
        const nummer = document.createElement('input');
        nummer.type = 'tel';
        nummer.pattern = '^[0-9 ()/\-]{4,}$';
        nummer.placeholder = '123456789';
        nummer.style.width = '130px';
        wrapper.appendChild(vorwahl);
        wrapper.appendChild(nummer);
        input = wrapper;
        // Für das Ergebnis
        inputs[field + '_vorwahl'] = vorwahl;
        inputs[field + '_nummer'] = nummer;
      } else if ([
        'Betreuer 1 Vorname', 'Betreuer 1 Nachname',
        'Betreuer 2 Vorname', 'Betreuer 2 Nachname'
      ].includes(field)) {
        input = createBetreuerInput(field, null, betreuerList, inputs, dialog);
      } else if (
        field.toLowerCase() === 'geburtsdatum' ||
        field.toLowerCase() === 'kgebdat' ||
        /anfang/i.test(field) ||
        /ende/i.test(field)
      ) {
        input = document.createElement('input');
        input.type = 'date';
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else if (['kplz', 'aplz'].includes(field.toLowerCase())) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'plz-at-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else if (['kort', 'aort'].includes(field.toLowerCase())) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'ort-at-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.style.width = '250px';
        input.style.marginTop = '4px';
      }
      // Angehörigenfelder farblich hervorheben
      if (/^a/i.test(field)) {
        label.style.background = '#e6f7ff';
        input.style.background = '#e6f7ff';
      }
      // Betreuer 1/2 Felder hellrot
      if (/^betreuer 1/i.test(field) || /^betreuer 2/i.test(field)) {
        label.style.background = '#ffeaea';
        input.style.background = '#ffeaea';
      }
      label.appendChild(document.createElement('br'));
      label.appendChild(input);
      dialog.appendChild(label);
      inputs[field] = input;
    });

    // Titel-Datalist nur einmal anhängen
    if (!document.getElementById('titel-list')) {
      const datalist = document.createElement('datalist');
      datalist.id = 'titel-list';
      akademischeTitel.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        datalist.appendChild(opt);
      });
      dialog.appendChild(datalist);
    }

    // Vorwahlen-Datalist nur einmal anhängen
    if (!document.getElementById('eu-vorwahlen')) {
      const datalist = document.createElement('datalist');
      datalist.id = 'eu-vorwahlen';
      euVorwahlenMitLand.forEach(vw => {
        const opt = document.createElement('option');
        opt.value = vw.code;
        opt.label = `${vw.code} (${vw.land})`;
        opt.textContent = `${vw.code} (${vw.land})`;
        datalist.appendChild(opt);
      });
      dialog.appendChild(datalist);
    }

    // Anrede-Datalist nur einmal anhängen
    if (!document.getElementById('anrede-list')) {
      const datalist = document.createElement('datalist');
      datalist.id = 'anrede-list';
      anredeOptionen.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        datalist.appendChild(option);
      });
      dialog.appendChild(datalist);
    }

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    btnRow.style.marginTop = '20px';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'Hinzufügen';
    okBtn.onclick = () => {
      const result = {};
      fields.forEach(field => {
        if (!inputs[field] && !inputs[field + '_teil1'] && !inputs[field + '_vorwahl']) {
          console.warn('Kein Input für Feld:', field);
          result[field] = '';
          return;
        }
        if (field === 'ksvn') {
          const teil1 = inputs[field + '_teil1'];
          const teil2 = inputs[field + '_teil2'];
          const val1 = teil1 ? teil1.value.trim() : '';
          const val2 = teil2 ? teil2.value.trim() : '';
          result[field] = val1 && val2 ? `${val1} ${val2}` : val1 || val2;
        } else if (/tel$/i.test(field)) {
          // Robust: Prüfe, ob Vorwahl/Nummer existieren
          const vorwahlInput = inputs[field + '_vorwahl'];
          const nummerInput = inputs[field + '_nummer'];
          if (vorwahlInput && nummerInput) {
            const vorwahl = typeof vorwahlInput.value === 'string' ? vorwahlInput.value.trim() : '';
            const nummer = typeof nummerInput.value === 'string' ? nummerInput.value.trim() : '';
            result[field] = vorwahl && nummer ? `${vorwahl} ${nummer}` : nummer;
          } else if (inputs[field]) {
            // Fallback: normales Textfeld
            let val = inputs[field].value;
            result[field] = (typeof val === 'string' && val.trim) ? val.trim() : (val || '');
          } else {
            result[field] = '';
          }
        } else {
          let val = inputs[field] ? inputs[field].value : '';
          if (inputs[field] && inputs[field].type === 'date' && val) {
            val = fromDateInputValue(val);
          }
          result[field] = (typeof val === 'string' && val.trim) ? val.trim() : (val || '');
        }
      });
      document.body.removeChild(overlay);
      const mainInput = document.getElementById('kunden-search') || document.body;
      if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
      resolve(result);
    };
    btnRow.appendChild(okBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      const mainInput = document.getElementById('kunden-search') || document.body;
      if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
      resolve(null);
    };
    btnRow.appendChild(cancelBtn);

    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    Object.values(inputs)[0].focus();
  });
}

function createBetreuerInput(key, row, betreuerList, inputs, dialog) {
  const input = document.createElement('input');
  input.type = 'text';
  input.setAttribute('list', `betreuer-${key.includes('Vorname') ? 'vorname' : 'nachname'}-list`);
  input.style.width = '250px';
  input.style.marginTop = '4px';
  if (row && row[key]) input.value = row[key];

  // Datalist erstellen
  const datalist = document.createElement('datalist');
  datalist.id = `betreuer-${key.includes('Vorname') ? 'vorname' : 'nachname'}-list`;
  
  // Aktuellen Wert als Option hinzufügen (falls vorhanden)
  if (row && row[key]) {
    const option = document.createElement('option');
    option.value = row[key];
    datalist.appendChild(option);
  }
  
  // Betreuerliste als Optionen hinzufügen
  betreuerList.forEach(b => {
    const value = key.includes('Vorname') ? (b['Vor.Nam']||'') : (b['Fam. Nam']||'');
    if (value && (!row || value !== row[key])) {  // Nur wenn nicht bereits als Option vorhanden
      const option = document.createElement('option');
      option.value = value;
      datalist.appendChild(option);
    }
  });
  
  dialog.appendChild(datalist);
  
  input.onchange = () => {
    if (!input.value) return;
    // Das jeweils andere Feld automatisch setzen
    const is1 = key.includes('1');
    const isVor = key.includes('Vorname');
    const otherField = is1
      ? (isVor ? 'Betreuer 1 Nachname' : 'Betreuer 1 Vorname')
      : (isVor ? 'Betreuer 2 Nachname' : 'Betreuer 2 Vorname');
    const selected = betreuerList.find(b => (isVor ? b['Vor.Nam'] : b['Fam. Nam']) === input.value);
    if (selected && inputs[otherField]) {
      inputs[otherField].value = isVor ? (selected['Fam. Nam']||'') : (selected['Vor.Nam']||'');
    }
  };

  return input;
}

function reloadTables() {
  let kunden = [];
  if (fs.existsSync(kundenPath)) {
    kunden = readExcel(kundenPath).map(fixDates);
  }
  window.kundenCount = kunden.length;
  const infobox = document.getElementById('kunden-infobox');
  if (infobox) {
    infobox.textContent = 'Gesamtanzahl Kunden: ' + window.kundenCount;
  }
  let kundenFiltered = filterData(kunden, kundenSearch);
  
  // Standard-Sortierung nach Nachname aufsteigend, falls keine andere Sortierung aktiv ist
  if (!kundenSort.field) {
    kundenSort = { field: 'kfname', dir: 1 };
  }
  
  renderSortControls('kunden-sort-controls', (field, dir) => {
    kundenSort = { field, dir };
    reloadTables();
  }, kundenSort, ['kfname', 'kvname']);
  let kundenSorted = kundenFiltered;
  if (kundenSort.field) kundenSorted = sortData(kundenFiltered, kundenSort.field, kundenSort.dir);
  // Mapping von gefiltertem zu Original-Index
  const indexMap = kundenSorted.map(filteredRow => kunden.findIndex(origRow => JSON.stringify(origRow) === JSON.stringify(filteredRow)));
  createAccordionTable(kundenSorted, 'kunden-tabelle', ['kvname', 'kfname'], async (filteredIdx, action) => {
    const origIdx = indexMap[filteredIdx];
    if (origIdx === -1) return;
    if (action === 'edit') {
      const row = kunden[origIdx];
      showEditDialog(row, Object.keys(row), fieldLabels, async (updatedRow) => {
        Object.assign(kunden[origIdx], updatedRow);
        writeExcel(kundenPath, kunden);
        await showInfoDialog('Kunde gespeichert!', 'kunden-search');
        reloadTables();
      });
    } else if (action === 'delete') {
      // Entfernen
      const row = kunden[origIdx];
      // 1. Aus Datei entfernen
      kunden.splice(origIdx, 1);
      writeExcel(kundenPath, kunden);
      // 2. In Archiv einfügen
      const altPath = path.join(config.altDatenDir, 'ALTkundendaten.xlsx');
      let altkunden = [];
      if (fs.existsSync(altPath)) {
        altkunden = readExcel(altPath);
      }
      altkunden.push(row);
      writeExcel(altPath, altkunden);
      await showInfoDialog('Kunde entfernt und archiviert!', 'kunden-search');
      reloadTables();
    } else if (action === 'wechsel') {
      const row = kunden[origIdx];
      // 1. Auswahl: Welcher Betreuer?
      const betreuerNum = await showComboboxDialog(
        'Welcher Betreuer soll gewechselt werden?',
        [1, 2],
        n => {
          const vorname = row[`Betreuer ${n} Vorname`] || '';
          const nachname = row[`Betreuer ${n} Nachname`] || '';
          if (!vorname && !nachname) return `Betreuer ${n}`;
          return `Betreuer ${n}: ${(vorname + ' ' + nachname).trim()}`;
        }
      );
      if (!betreuerNum) return;
      // 2. Auswahl: Mit wem?
      // Lade aktuelle Betreuerliste
      let betreuerList = [];
      try {
        const betreuerPath = path.join(config.datenDir, 'Betreuerinnendaten.xlsx');
        if (fs.existsSync(betreuerPath)) {
          betreuerList = readExcel(betreuerPath);
        }
      } catch (e) {}
      const neuerBetreuer = await showComboboxDialog(
        'Mit welchem Betreuer soll gewechselt werden?',
        betreuerList,
        b => `${b['Vor.Nam'] || ''} ${b['Fam. Nam'] || ''}`
      );
      if (!neuerBetreuer) return;
      // 3. Alten Betreuer in nächste freie Altbetreuer-Spalte schieben (erst Altbetreuer 1-7, dann ggf. neue)
      const vornameKey = `Betreuer ${betreuerNum} Vorname`;
      const nachnameKey = `Betreuer ${betreuerNum} Nachname`;
      const anfangKey = `Betreuer ${betreuerNum} Anfang`;
      const altPrefix = 'Altbetreuer';
      let altIndex = 1;
      let vKey, nKey, vonKey, bisKey;
      for (; altIndex <= 7; altIndex++) {
        vKey = `${altPrefix} ${altIndex} Vorname`;
        nKey = `${altPrefix} ${altIndex} Nachname`;
        vonKey = `${altPrefix} ${altIndex} Von`;
        bisKey = `${altPrefix} ${altIndex} Bis`;
        // Prüfe, ob alle vier Felder leer sind
        if (!row[vKey] && !row[nKey] && !row[vonKey] && !row[bisKey]) {
          break;
        }
      }
      // 3a. Nach Anfangsdatum für neuen Betreuer fragen
      const neuAnfang = await showDateDialog('Ab wann ist der neue Betreuer tätig?', ['ab']);
      if (!neuAnfang || !neuAnfang.ab) return;
      // 3b. Enddatum Altbetreuer automatisch berechnen (neuer Anfang - 14 Tage)
      let altBisDate;
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(neuAnfang.ab)) {
        // Format TT.MM.JJJJ
        const [tag, monat, jahr] = neuAnfang.ab.split('.');
        altBisDate = new Date(Number(jahr), Number(monat) - 1, Number(tag));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(neuAnfang.ab)) {
        // Format JJJJ-MM-TT
        const [jahr, monat, tag] = neuAnfang.ab.split('-');
        altBisDate = new Date(Number(jahr), Number(monat) - 1, Number(tag));
      } else {
        // Fallback: direkt an Date übergeben
        altBisDate = new Date(neuAnfang.ab);
      }
      altBisDate.setDate(altBisDate.getDate() - 14);
      // Formatieren als TT.MM.JJJJ
      const tag = String(altBisDate.getDate()).padStart(2, '0');
      const monat = String(altBisDate.getMonth() + 1).padStart(2, '0');
      const jahr = altBisDate.getFullYear();
      let altBisStr = `${tag}.${monat}.${jahr}`;
      // 3c. Bestätigungsdialog mit Option zur manuellen Anpassung
      let confirmed = false;
      let manuell = false;
      while (!confirmed) {
        let msg = `Das Enddatum des Altbetreuers wird automatisch auf ${altBisStr} gesetzt (2 Wochen vor Beginn des neuen Betreuers).\n\nMöchtest du dieses Datum übernehmen?`;
        if (!manuell) msg += '\n\nKlicke Abbrechen, um das Datum manuell zu wählen.';
        confirmed = await showConfirmDialog(msg, 'kunden-search');
        if (!confirmed && !manuell) {
          // Manuelle Eingabe
          const manuellBis = await showDateDialog('Bitte wähle das Enddatum des Altbetreuers (manuell):', ['bis']);
          if (!manuellBis || !manuellBis.bis) return;
          altBisStr = manuellBis.bis;
          manuell = true;
        }
      }
      // 3d. Alten Betreuer in Altbetreuer-Spalte verschieben
      row[vKey] = row[vornameKey];
      row[nKey] = row[nachnameKey];
      row[vonKey] = row[anfangKey] || '';
      row[bisKey] = altBisStr;
      // 4. Neuen Betreuer und Anfangsdatum eintragen
      row[vornameKey] = neuerBetreuer['Vor.Nam'] || '';
      row[nachnameKey] = neuerBetreuer['Fam. Nam'] || '';
      row[anfangKey] = neuAnfang.ab;
      writeExcel(kundenPath, kunden);
      await showInfoDialog('Betreuerwechsel durchgeführt!', 'kunden-search');
      reloadTables();
    }
  }, kundenPath);
}

window.addEventListener('DOMContentLoaded', () => {
  reloadTables();
  document.getElementById('kunden-search').addEventListener('input', (e) => {
    kundenSearch = e.target.value;
    reloadTables();
  });
  document.getElementById('add-kunde').onclick = async () => {
    let kunden = [];
    if (fs.existsSync(kundenPath)) {
      kunden = readExcel(kundenPath);
    }
    const fields = kunden.length > 0 ? Object.keys(kunden[0]) : ['kvname', 'kfname'];
    const result = await showAddDialog(fields, 'Neuen Kunden hinzufügen');
    if (result) {
      kunden.push(result);
      writeExcel(kundenPath, kunden);
      reloadTables();
    }
  };
  document.getElementById('refresh-btn').onclick = () => {
    reloadTables();
  };
});

async function showEditDialog(row, keys, fieldLabels, onSave) {
  // PLZ/Ort-Liste laden (jetzt aus JSON)
  let plzOrtList = [];
  let plzSet = new Set();
  let ortSet = new Set();
  const plzOrtPath = path.join(__dirname, 'plz_ort_at.json');
  if (fs.existsSync(plzOrtPath)) {
    try {
      plzOrtList = JSON.parse(fs.readFileSync(plzOrtPath, 'utf-8'));
      plzOrtList.forEach(row => {
        if (row.PLZ) plzSet.add(String(row.PLZ));
        if (row.Ort) ortSet.add(row.Ort);
      });
    } catch (e) {}
  }
  // Datalists erzeugen (nur einmal, immer im <body>)
  if (!document.body.querySelector('#plz-at-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'plz-at-list';
    plzSet.forEach(plz => {
      const option = document.createElement('option');
      option.value = plz;
      datalist.appendChild(option);
    });
    document.body.appendChild(datalist);
  }
  if (!document.body.querySelector('#ort-at-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'ort-at-list';
    ortSet.forEach(ort => {
      const option = document.createElement('option');
      option.value = ort;
      datalist.appendChild(option);
    });
    document.body.appendChild(datalist);
  }
  // Betreuerliste laden
  let betreuerList = [];
  try {
    const betreuerPath = path.join(config.datenDir, 'Betreuerinnendaten.xlsx');
    if (fs.existsSync(betreuerPath)) {
      betreuerList = readExcel(betreuerPath);
    }
  } catch (e) {}
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
  dialog.style.minWidth = '350px';
  dialog.style.maxHeight = '80vh';
  dialog.style.overflowY = 'auto';

  const titleEl = document.createElement('h3');
  titleEl.textContent = 'Kunde bearbeiten';
  dialog.appendChild(titleEl);

  const inputs = {};
  keys.forEach(key => {
    if (/^__EMPTY/.test(key)) return; // Überspringe leere Felder
    const label = document.createElement('label');
    label.textContent = getFieldLabel(key);
    label.style.marginTop = '10px';
    label.style.display = 'block';
    let input;
    if (key === 'ksvn') {
      // SVN: 2 Felder
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '8px';
      wrapper.style.marginTop = '4px';
      // 4 Ziffern
      const teil1 = document.createElement('input');
      teil1.type = 'text';
      teil1.pattern = '\\d{4}';
      teil1.maxLength = 4;
      teil1.placeholder = '1234';
      teil1.style.width = '60px';
      // TTMMYY
      const teil2 = document.createElement('input');
      teil2.type = 'text';
      teil2.pattern = '\\d{6}';
      teil2.maxLength = 6;
      teil2.placeholder = 'TTMMYY';
      teil2.style.width = '80px';
      // Bestehende SV-Nummer laden und in die zwei Felder aufteilen
      if (row[key]) {
        const svValue = String(row[key]).trim();
        // Format: "1234 567890" oder "1234567890"
        const match = svValue.match(/^(\d{4})\s*(\d{6})$/);
        if (match) {
          teil1.value = match[1];
          teil2.value = match[2];
        } else {
          // Fallback: Versuche andere Formate
          const cleanSV = svValue.replace(/\s+/g, '');
          if (/^\d{10}$/.test(cleanSV)) {
            teil1.value = cleanSV.substring(0, 4);
            teil2.value = cleanSV.substring(4, 10);
          }
        }
      }
      
      // Automatisch aus Geburtsdatum befüllen, wenn vorhanden
      let userOverride = false;
      teil2.addEventListener('input', () => { userOverride = true; });
      function updateSVTeil2(val) {
        let d = null;
        if (typeof val === 'object' && val instanceof Date) {
          d = val;
        } else if (typeof val === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, t] = val.split('-');
            d = new Date(Number(y), Number(m) - 1, Number(t));
          } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
            const [t, m, y] = val.split('.');
            d = new Date(Number(y), Number(m) - 1, Number(t));
          }
        }
        if (d && !isNaN(d.getTime()) && (!userOverride || !teil2.value)) {
          const tag = String(d.getDate()).padStart(2, '0');
          const monat = String(d.getMonth() + 1).padStart(2, '0');
          const jahr = String(d.getFullYear()).slice(-2);
          teil2.value = `${tag}${monat}${jahr}`;
        }
      }
      setTimeout(() => {
        const gebdatFeld = dialog.querySelector('input[type="date"]');
        if (gebdatFeld) {
          gebdatFeld.addEventListener('input', () => {
            if (gebdatFeld.value.length === 10) {
              updateSVTeil2(gebdatFeld.valueAsDate || gebdatFeld.value);
            }
          });
          gebdatFeld.addEventListener('blur', () => {
            updateSVTeil2(gebdatFeld.valueAsDate || gebdatFeld.value);
          });
          if (gebdatFeld.value.length === 10) {
            updateSVTeil2(gebdatFeld.valueAsDate || gebdatFeld.value);
          }
        }
      }, 0);
      wrapper.appendChild(teil1);
      wrapper.appendChild(document.createTextNode('-'));
      wrapper.appendChild(teil2);
      label.appendChild(document.createElement('br'));
      dialog.appendChild(label);
      dialog.appendChild(wrapper);
      inputs[key + '_teil1'] = teil1;
      inputs[key + '_teil2'] = teil2;
      inputs[key] = wrapper;
      return;
    } else if (/anrede$/i.test(key)) {
      // Input mit Datalist für Anrede (Combobox)
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'anrede-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (typeof row !== 'undefined' && row && row[key]) input.value = row[key];
      // Datalist erstellen
      let datalist = document.getElementById('anrede-list');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'anrede-list';
        // Standardoptionen
        const anredeOptionen = ['Herr', 'Frau', 'Divers', 'Familie', 'Herr und Frau'];
        anredeOptionen.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          datalist.appendChild(option);
        });
        // Alle existierenden Anrede-Werte aus der Tabelle
        let kunden = [];
        if (fs.existsSync(kundenPath)) {
          kunden = readExcel(kundenPath);
        }
        const anredeValues = new Set(kunden.map(k => k.Anrede || k.anrede).filter(Boolean));
        anredeValues.forEach(value => {
          if (!anredeOptionen.includes(value)) {
            const option = document.createElement('option');
            option.value = value;
            datalist.appendChild(option);
          }
        });
        dialog.appendChild(datalist);
      }
      inputs[key] = input;
    } else if (/titel$/i.test(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'titel-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
    } else if (key === 'DGKP') {
      // Input mit Datalist für DGKP (Combobox)
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'dgkp-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (typeof row !== 'undefined' && row && row[key]) input.value = row[key];
      // Datalist erstellen
      let datalist = document.getElementById('dgkp-list');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'dgkp-list';
        // Alle existierenden DGKP-Werte als Optionen hinzufügen
        let kunden = [];
        if (fs.existsSync(kundenPath)) {
          kunden = readExcel(kundenPath);
        }
        const dgkpValues = new Set(kunden.map(k => k.DGKP || k.dgkp || k.Dgkp).filter(Boolean));
        dgkpValues.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          datalist.appendChild(option);
        });
        dialog.appendChild(datalist);
      }
    } else if (key === 'ktel' || key === 'atel+L:J:S') {
      // Vorwahl-Combobox + Nummernfeld nur für diese beiden Felder
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '8px';
      // Vorwahl
      const vorwahl = document.createElement('input');
      vorwahl.setAttribute('list', 'eu-vorwahlen');
      vorwahl.style.width = '110px';
      vorwahl.placeholder = '+49';
      // Nummer
      const nummer = document.createElement('input');
      nummer.type = 'tel';
      nummer.pattern = '^[0-9 ()/\-]{4,}$';
      nummer.placeholder = '123456789';
      nummer.style.width = '130px';
      // Vorbelegen, falls vorhanden
      if (row[key]) {
        const match = row[key].match(/^(\+\d{1,4})\s*(.*)$/);
        if (match) {
          vorwahl.value = match[1];
          nummer.value = match[2];
        } else {
          nummer.value = row[key];
        }
      }
      wrapper.appendChild(vorwahl);
      wrapper.appendChild(nummer);
      input = wrapper;
      // Für das Ergebnis
      inputs[key + '_vorwahl'] = vorwahl;
      inputs[key + '_nummer'] = nummer;
    } else if ([
      'Betreuer 1 Vorname', 'Betreuer 1 Nachname',
      'Betreuer 2 Vorname', 'Betreuer 2 Nachname'
    ].includes(key)) {
      input = createBetreuerInput(key, row, betreuerList, inputs, dialog);
    } else if (
      key.toLowerCase() === 'geburtsdatum' ||
      key.toLowerCase() === 'kgebdat' ||
      /anfang/i.test(key) ||
      /ende/i.test(key)
    ) {
      input = document.createElement('input');
      input.type = 'date';
      input.value = toDateInputValue(row[key]);
      input.style.width = '250px';
      input.style.marginTop = '4px';
    } else if (['kplz', 'aplz'].includes(key.toLowerCase())) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'plz-at-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
    } else if (['kort', 'aort'].includes(key.toLowerCase())) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'ort-at-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = row[key] || '';
      input.style.width = '250px';
      input.style.marginTop = '4px';
    }
    // Angehörigenfelder farblich hervorheben
    if (/^a/i.test(key)) {
      label.style.background = '#e6f7ff';
      input.style.background = '#e6f7ff';
    }
    // Betreuer 1/2 Felder hellrot
    if (/^betreuer 1/i.test(key) || /^betreuer 2/i.test(key)) {
      label.style.background = '#ffeaea';
      input.style.background = '#ffeaea';
    }
    label.appendChild(document.createElement('br'));
    label.appendChild(input);
    dialog.appendChild(label);
    inputs[key] = input;
  });

  // Titel-Datalist nur einmal anhängen
  if (!document.getElementById('titel-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'titel-list';
    akademischeTitel.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      datalist.appendChild(opt);
    });
    dialog.appendChild(datalist);
  }

  // Vorwahlen-Datalist nur einmal anhängen
  if (!document.getElementById('eu-vorwahlen')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'eu-vorwahlen';
    euVorwahlenMitLand.forEach(vw => {
      const opt = document.createElement('option');
      opt.value = vw.code;
      opt.label = `${vw.code} (${vw.land})`;
      opt.textContent = `${vw.code} (${vw.land})`;
      datalist.appendChild(opt);
    });
    dialog.appendChild(datalist);
  }

  // Anrede-Datalist nur einmal anhängen
  if (!document.getElementById('anrede-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'anrede-list';
    anredeOptionen.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      datalist.appendChild(option);
    });
    dialog.appendChild(datalist);
  }

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '10px';
  btnRow.style.marginTop = '20px';

  const okBtn = document.createElement('button');
  okBtn.textContent = 'Speichern';
  okBtn.onclick = () => {
    const updated = {};
    keys.forEach(key => {
      if (key === 'ksvn') {
        const teil1 = inputs[key + '_teil1'];
        const teil2 = inputs[key + '_teil2'];
        const val1 = teil1 ? teil1.value.trim() : '';
        const val2 = teil2 ? teil2.value.trim() : '';
        updated[key] = val1 && val2 ? `${val1} ${val2}` : val1 || val2;
      } else if (/tel$/i.test(key)) {
        // Robust: Prüfe, ob Vorwahl/Nummer existieren
        const vorwahlInput = inputs[key + '_vorwahl'];
        const nummerInput = inputs[key + '_nummer'];
        if (vorwahlInput && nummerInput) {
          const vorwahl = typeof vorwahlInput.value === 'string' ? vorwahlInput.value.trim() : '';
          const nummer = typeof nummerInput.value === 'string' ? nummerInput.value.trim() : '';
          updated[key] = vorwahl && nummer ? `${vorwahl} ${nummer}` : nummer;
        } else if (inputs[key]) {
          // Fallback: normales Textfeld
          let val = inputs[key].value;
          updated[key] = (typeof val === 'string' && val.trim) ? val.trim() : (val || '');
        } else {
          updated[key] = '';
        }
      } else {
        let val = inputs[key] ? inputs[key].value : '';
        if (inputs[key] && inputs[key].type === 'date' && val) {
          val = fromDateInputValue(val);
        }
        updated[key] = (typeof val === 'string' && val.trim) ? val.trim() : (val || '');
      }
    });
    document.body.removeChild(overlay);
    onSave(updated);
  };
  btnRow.appendChild(okBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
    const mainInput = document.getElementById('kunden-search') || document.body;
    if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
  };
  btnRow.appendChild(cancelBtn);

  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  Object.values(inputs)[0].focus();
}

// Hilfsfunktion für sprechende Labels
function getFieldLabel(key) {
  const lowerKey = key.toLowerCase();
  // Mapping case-insensitive durchsuchen
  for (const mapKey in fieldLabels) {
    if (mapKey.toLowerCase() === lowerKey) return fieldLabels[mapKey];
  }
  if (/^kplz$/i.test(key)) return 'PLZ';
  if (/^kort$/i.test(key)) return 'Ort';
  if (/^kstrasse$/i.test(key)) return 'Adresse';
  if (/^kvname$/i.test(key)) return 'Vorname';
  if (/^kfname$/i.test(key)) return 'Nachname';
  if (/^kgebdat$/i.test(key)) return 'Geburtsdatum';
  if (/^ktel$/i.test(key)) return 'Telefon';
  if (/^k[a-z]+$/i.test(key)) return key.substring(1).charAt(0).toUpperCase() + key.substring(2);
  // Fallback: Key mit erstem Buchstaben groß
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Hilfsfunktion: Combobox mit Suchfunktion
async function showComboboxDialog(title, options, labelFn) {
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
    dialog.style.minWidth = '350px';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    dialog.appendChild(titleEl);
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Suchen...';
    input.style.marginBottom = '10px';
    input.style.width = '250px';
    dialog.appendChild(input);
    const select = document.createElement('select');
    select.size = 8;
    select.style.width = '250px';
    select.style.marginBottom = '10px';
    function renderOptions(filter = '') {
      select.innerHTML = '';
      options.forEach((opt, i) => {
        const label = labelFn(opt);
        if (label.toLowerCase().includes(filter.toLowerCase())) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = label;
          select.appendChild(option);
        }
      });
    }
    renderOptions();
    dialog.appendChild(select);
    input.oninput = () => renderOptions(input.value);
    dialog.appendChild(input);
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.onclick = () => {
      if (select.selectedIndex === -1) return resolve(null);
      const idx = parseInt(select.value, 10);
      document.body.removeChild(overlay);
      resolve(options[idx]);
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

// Hilfsfunktion: Datumseingabe
async function showDateDialog(title, fields) {
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
    dialog.style.minWidth = '350px';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    dialog.appendChild(titleEl);
    const inputs = {};
    fields.forEach(f => {
      const label = document.createElement('label');
      label.textContent = f;
      label.style.marginTop = '10px';
      label.style.display = 'block';
      const input = document.createElement('input');
      input.type = 'date';
      input.style.width = '250px';
      input.style.marginTop = '4px';
      label.appendChild(document.createElement('br'));
      label.appendChild(input);
      dialog.appendChild(label);
      inputs[f] = input;
    });
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    btnRow.style.marginTop = '20px';
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.onclick = () => {
      const result = {};
      fields.forEach(f => {
        result[f] = fromDateInputValue(inputs[f].value);
      });
      document.body.removeChild(overlay);
      resolve(result);
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
    Object.values(inputs)[0].focus();
  });
}

// Hilfsfunktion für modalen Info-Dialog (statt alert)
function showInfoDialog(message, focusId) {
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
    dialog.style.minWidth = '300px';
    dialog.style.maxWidth = '90vw';
    dialog.style.fontSize = '1.1em';
    // Text
    const text = document.createElement('div');
    text.textContent = message;
    text.style.marginBottom = '20px';
    dialog.appendChild(text);
    // OK-Button
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.padding = '8px 24px';
    okBtn.style.fontSize = '1em';
    okBtn.onclick = () => {
      document.body.removeChild(overlay);
      // Fokus zurücksetzen
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

// Hilfsfunktion für modalen Confirm-Dialog (statt confirm)
function showConfirmDialog(message, focusId) {
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
    dialog.style.minWidth = '350px';
    dialog.style.maxWidth = '90vw';
    dialog.style.fontSize = '1.1em';
    const text = document.createElement('div');
    text.textContent = message;
    text.style.marginBottom = '20px';
    dialog.appendChild(text);
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
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
      resolve(true);
    };
    btnRow.appendChild(okBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.style.padding = '8px 24px';
    cancelBtn.style.fontSize = '1em';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      setTimeout(() => {
        const mainInput = document.getElementById(focusId) || document.body;
        if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
      }, 0);
      resolve(false);
    };
    btnRow.appendChild(cancelBtn);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
} 