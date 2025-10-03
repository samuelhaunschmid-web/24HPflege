const path = require('path');
const fs = require('fs');
const { app } = require('@electron/remote');

// Mapping für sprechende Feldnamen (optional anpassen)
const fieldLabels = {
  'kfname': 'Nachname',
  'kvname': 'Vorname',
  'kstrasse': 'Adresse',
  'kplz': 'PLZ',
  'kort': 'Ort',
  'kgebdat': 'Geburtsdatum',
  'ktel': 'Telefon',
  // ... weitere Felder nach Wunsch
};

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
const config = loadConfig();
if (!config.datenDir) config.datenDir = path.join(__dirname, 'Daten');

const altkundenPath = path.join(config.altDatenDir, 'ALTkundendaten.xlsx');
let kundenSort = { field: null, dir: 1 };
let kundenSearch = '';

function readExcel(filePath) {
  const workbook = window.settings.XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return window.settings.XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function writeExcel(filePath, data) {
  const ws = window.settings.XLSX.utils.json_to_sheet(data);
  const wb = window.settings.XLSX.utils.book_new();
  window.settings.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  window.settings.XLSX.writeFile(wb, filePath);
}

function filterData(data, search) {
  if (!search) return data;
  const s = search.toLowerCase();
  return data.filter(row => Object.values(row).join(' ').toLowerCase().includes(s));
}

function sortData(data, field, dir) {
  return [...data].sort((a, b) => {
    const va = (a[field] || '').toLowerCase();
    const vb = (b[field] || '').toLowerCase();
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
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

function createAccordionTable(data, containerId, nameFields, saveCallback, filePath) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML = '<i>Keine Daten gefunden.</i>';
    return;
  }

  // Add settings button to top actions
  const topActions = document.querySelector('.top-actions');
  Array.from(topActions.querySelectorAll('button')).forEach(btn => {
    if (btn.textContent === 'Spalteneinstellungen') btn.remove();
  });
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = 'Spalteneinstellungen';
  settingsBtn.onclick = () => window.createSettingsDialog('customer');
  topActions.appendChild(settingsBtn);

  const keys = Object.keys(data[0]);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  nameFields.forEach(key => {
    const th = document.createElement('th');
    th.textContent = fieldLabels[key] || key;
    tr.appendChild(th);
  });
  const thDetails = document.createElement('th');
  thDetails.textContent = 'Details';
  tr.appendChild(thDetails);
  const thDelete = document.createElement('th');
  thDelete.textContent = 'Löschen';
  tr.appendChild(thDelete);
  const thRestore = document.createElement('th');
  thRestore.textContent = 'Wiederherstellen';
  tr.appendChild(thRestore);
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  data.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    nameFields.forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] || '';
      tr.appendChild(td);
    });
    // Details-Button
    const tdDetails = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Details anzeigen';
    btn.onclick = () => {
      detailsRow.style.display = detailsRow.style.display === 'none' ? '' : 'none';
      btn.textContent = detailsRow.style.display === 'none' ? 'Details anzeigen' : 'Details ausblenden';
    };
    tdDetails.appendChild(btn);
    tr.appendChild(tdDetails);
    // Löschen-Button
    const tdDelete = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Löschen';
    delBtn.style.color = 'red';
    delBtn.onclick = async () => {
      if (!confirm('Möchtest du diesen Altkunden wirklich löschen?')) return;
      saveCallback(rowIdx, 'delete');
    };
    tdDelete.appendChild(delBtn);
    tr.appendChild(tdDelete);
    // Wiederherstellen-Button in Hauptzeile
    const tdRestore = document.createElement('td');
    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = 'Wiederherstellen';
    restoreBtn.style.marginLeft = '0px';
    restoreBtn.style.background = '#e6ffe6';
    restoreBtn.style.color = '#007b00';
    restoreBtn.style.padding = '5px 10px';
    restoreBtn.style.border = '1px solid #007b00';
    restoreBtn.style.borderRadius = '4px';
    restoreBtn.style.cursor = 'pointer';
    restoreBtn.onclick = async () => {
      if (!confirm('Möchtest du diesen Kunden wirklich wiederherstellen?')) return;
      saveCallback(rowIdx, 'restore');
    };
    tdRestore.appendChild(restoreBtn);
    tr.appendChild(tdRestore);
    tbody.appendChild(tr);
    // Details-Zeile (versteckt)
    const detailsRow = document.createElement('tr');
    detailsRow.style.display = 'none';
    const detailsTd = document.createElement('td');
    detailsTd.colSpan = nameFields.length + 3;
    // Details-Tabelle
    const innerTable = document.createElement('table');
    innerTable.style.width = '100%';
    const innerTbody = document.createElement('tbody');
    const keys = Object.keys(row);
    keys.forEach(key => {
      if (!row[key] || !window.settings.detailViewSettings.customerDetailColumns.visible.includes(key)) return; // Nur ausgefüllte und sichtbare Felder
      const rowInner = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = fieldLabels[key] || key;
      const td = document.createElement('td');
      td.textContent = row[key];
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
      showEditDialog(row, keys, fieldLabels, (updatedRow) => {
        Object.assign(data[rowIdx], updatedRow);
        writeExcel(filePath, data);
        reloadTables();
      });
    };
    detailsTd.appendChild(editBtn);
    detailsRow.appendChild(detailsTd);
    tbody.appendChild(detailsRow);
  });
  table.appendChild(tbody);
  document.getElementById(containerId).innerHTML = '';
  document.getElementById(containerId).appendChild(table);
}

function reloadTables() {
  let kunden = [];
  if (fs.existsSync(altkundenPath)) {
    kunden = readExcel(altkundenPath);
  }
  window.altkundenCount = kunden.length;
  const infobox = document.getElementById('altkunden-infobox');
  if (infobox) {
    infobox.textContent = 'Gesamtanzahl Altkunden: ' + window.altkundenCount;
  }
  let kundenFiltered = filterData(kunden, kundenSearch);
  
  // Standard-Sortierung nach Nachname aufsteigend, falls keine andere Sortierung aktiv ist
  if (!kundenSort.field) {
    kundenSort = { field: 'kvname', dir: 1 };
  }
  
  renderSortControls('altkunden-sort-controls', (field, dir) => {
    kundenSort = { field, dir };
    reloadTables();
  }, kundenSort, ['kvname', 'kfname']);
  let kundenSorted = kundenFiltered;
  if (kundenSort.field) kundenSorted = sortData(kundenFiltered, kundenSort.field, kundenSort.dir);
  // Mapping von gefiltertem zu Original-Index
  const indexMap = kundenSorted.map(filteredRow => kunden.findIndex(origRow => JSON.stringify(origRow) === JSON.stringify(filteredRow)));
  createAccordionTable(kundenSorted, 'altkunden-tabelle', ['kvname', 'kfname'], (filteredIdx, action) => {
    const origIdx = indexMap[filteredIdx];
    if (origIdx === -1) return;
    if (action === 'restore') {
      // Wiederherstellen
      const row = kunden[origIdx];
      // 1. Aus Archiv entfernen
      kunden.splice(origIdx, 1);
      writeExcel(altkundenPath, kunden);
      // 2. In aktive Datei einfügen
      const kundenPath = path.join(config.datenDir, 'Kundendaten.xlsx');
      let aktive = [];
      if (fs.existsSync(kundenPath)) {
        aktive = readExcel(kundenPath);
      }
      // Prüfe ob der Kunde bereits existiert
      const kundeExistiert = aktive.some(k => k.kfname === row.kfname && k.kvname === row.kvname);
      if (kundeExistiert) {
        if (!confirm('Ein Kunde mit diesem Namen existiert bereits. Trotzdem wiederherstellen?')) {
          // Wenn abgebrochen, füge den Kunden wieder zurück ins Archiv
          kunden.splice(origIdx, 0, row);
          writeExcel(altkundenPath, kunden);
          return;
        }
      }
      aktive.push(row);
      writeExcel(kundenPath, aktive);
      reloadTables();
      alert('Kunde wurde erfolgreich wiederhergestellt!');
    } else {
      // Löschen
      kunden.splice(origIdx, 1);
      writeExcel(altkundenPath, kunden);
      reloadTables();
    }
  }, altkundenPath);
}

window.addEventListener('DOMContentLoaded', () => {
  reloadTables();
  document.getElementById('altkunden-search').addEventListener('input', (e) => {
    kundenSearch = e.target.value;
    reloadTables();
  });
  document.getElementById('refresh-btn').onclick = () => {
    reloadTables();
  };
});

window.reloadAltkundenTables = reloadTables;

function getFieldLabel(key) {
  // Optional: Mapping wie in kundendaten.js
  return fieldLabels[key] || key;
}

function toDateInputValue(val) {
  if (!val) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
    const [d, m, y] = val.split('.');
    return `${y}-${m}-${d}`;
  }
  if (!isNaN(val) && Number(val) > 30000) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  return val;
}

function fromDateInputValue(val) {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}.${m}.${y}`;
  }
  return val;
}

async function showEditDialog(row, keys, fieldLabels, onSave) {
  // Vor dem Erstellen eines neuen Overlays: alle alten Overlays entfernen
  document.querySelectorAll('[id^="dialog-overlay"]').forEach(el => el.remove());
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
  titleEl.textContent = 'Altkunde bearbeiten';
  dialog.appendChild(titleEl);

  const inputs = {};
  keys.forEach(key => {
    const label = document.createElement('label');
    label.textContent = getFieldLabel(key);
    label.style.marginTop = '10px';
    label.style.display = 'block';
    let input;
    if (/anrede$/i.test(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'anrede-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
    } else if (/titel$/i.test(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'titel-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
    } else if (key === 'ktel' || key === 'atel+L:J:S') {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '8px';
      const vorwahl = document.createElement('input');
      vorwahl.setAttribute('list', 'eu-vorwahlen');
      vorwahl.style.width = '110px';
      vorwahl.placeholder = '+49';
      const nummer = document.createElement('input');
      nummer.type = 'tel';
      nummer.pattern = '^[0-9 ()/\-]{4,}$';
      nummer.placeholder = '123456789';
      nummer.style.width = '130px';
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
      inputs[key + '_vorwahl'] = vorwahl;
      inputs[key + '_nummer'] = nummer;
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
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = row[key] || '';
      input.style.width = '250px';
      input.style.marginTop = '4px';
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
    ['Dr.', 'Prof.', 'Prof. Dr.', 'Dipl.-Ing.', 'B.Sc.', 'M.Sc.', 'Mag.', 'Dipl.-Kfm.', 'Dipl.-Psych.', 'Dr. med.', 'Dr. rer. nat.', 'Dr. phil.', 'Dr. jur.', 'Dr. h.c.', 'B.A.', 'M.A.', 'MBA', 'LL.M.', 'Staatsexamen'].forEach(t => {
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
    [
      { code: '+49', land: 'DEU' }, { code: '+43', land: 'AUT' }, { code: '+41', land: 'CHE' },
      { code: '+39', land: 'ITA' }, { code: '+33', land: 'FRA' }, { code: '+34', land: 'ESP' },
      { code: '+420', land: 'CZE' }, { code: '+48', land: 'POL' }, { code: '+36', land: 'HUN' },
      { code: '+386', land: 'SVN' }, { code: '+372', land: 'EST' }, { code: '+370', land: 'LTU' },
      { code: '+371', land: 'LVA' }, { code: '+358', land: 'FIN' }, { code: '+47', land: 'NOR' },
      { code: '+46', land: 'SWE' }, { code: '+45', land: 'DNK' }, { code: '+351', land: 'PRT' },
      { code: '+357', land: 'CYP' }, { code: '+353', land: 'IRL' }, { code: '+355', land: 'ALB' },
      { code: '+359', land: 'BGR' }, { code: '+380', land: 'UKR' }, { code: '+375', land: 'BLR' },
      { code: '+7', land: 'RUS' }, { code: '+30', land: 'GRC' }, { code: '+40', land: 'ROU' },
      { code: '+421', land: 'SVK' }, { code: '+381', land: 'SRB' }, { code: '+382', land: 'MNE' },
      { code: '+389', land: 'MKD' }, { code: '+357', land: 'CYP' }, { code: '+356', land: 'MLT' },
      { code: '+378', land: 'SMR' }, { code: '+380', land: 'UKR' }, { code: '+423', land: 'LIE' },
      { code: '+350', land: 'GIB' }, { code: '+299', land: 'GRL' }, { code: '+354', land: 'ISL' },
      { code: '+385', land: 'HRV' }, { code: '+387', land: 'BIH' }, { code: '+373', land: 'MDA' },
      { code: '+374', land: 'ARM' }, { code: '+376', land: 'AND' }, { code: '+377', land: 'MCO' },
      { code: '+383', land: 'XKX' }, { code: '+390', land: 'VAT' }
    ].forEach(vw => {
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
    ['Mann', 'Frau', 'Fam.'].forEach(opt => {
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
      if (/tel$/i.test(key)) {
        const vorwahlInput = inputs[key + '_vorwahl'];
        const nummerInput = inputs[key + '_nummer'];
        if (vorwahlInput && nummerInput) {
          const vorwahl = typeof vorwahlInput.value === 'string' ? vorwahlInput.value.trim() : '';
          const nummer = typeof nummerInput.value === 'string' ? nummerInput.value.trim() : '';
          updated[key] = vorwahl && nummer ? `${vorwahl} ${nummer}` : nummer;
        } else if (inputs[key]) {
          let val = inputs[key].value;
          updated[key] = (typeof val === 'string' && val.trim) ? val.trim() : (val || '');
        } else {
          updated[key] = '';
        }
      } else {
        let val = inputs[key].value;
        if (inputs[key].type === 'date' && val) {
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
  };
  btnRow.appendChild(cancelBtn);

  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  Object.values(inputs)[0].focus();
} 