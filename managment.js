const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { app } = require('@electron/remote');

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
let config = loadConfig();
if (!config.datenDir) config.datenDir = path.join(__dirname, 'Daten');
if (!config.vorlagenDir) config.vorlagenDir = path.join(__dirname, 'Vorlagen');

const kundenPath = path.join(config.datenDir, 'Kundendaten.xlsx');
const betreuerPath = path.join(config.datenDir, 'Betreuerinnendaten.xlsx');

let kundenSort = { field: null, dir: 1 };
let betreuerSort = { field: null, dir: 1 };
let kundenSearch = '';
let betreuerSearch = '';

function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function writeExcel(filePath, data) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filePath);
}

function createAccordionTable(data, containerId, nameFields, saveCallback, filePath) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML = '<i>Keine Daten gefunden.</i>';
    return;
  }
  const keys = Object.keys(data[0]);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  nameFields.forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    tr.appendChild(th);
  });
  const thDetails = document.createElement('th');
  thDetails.textContent = 'Details';
  tr.appendChild(thDetails);
  const thDelete = document.createElement('th');
  thDelete.textContent = 'Löschen';
  tr.appendChild(thDelete);
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
    delBtn.onclick = () => {
      if (confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
        saveCallback(rowIdx, 'delete');
      }
    };
    tdDelete.appendChild(delBtn);
    tr.appendChild(tdDelete);
    tbody.appendChild(tr);

    // Details-Zeile (versteckt)
    const detailsRow = document.createElement('tr');
    detailsRow.style.display = 'none';
    const detailsTd = document.createElement('td');
    detailsTd.colSpan = nameFields.length + 2;
    // Details-Tabelle
    const innerTable = document.createElement('table');
    innerTable.style.width = '100%';
    const innerTbody = document.createElement('tbody');
    keys.forEach(key => {
      if (nameFields.includes(key)) return;
      const rowInner = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = key;
      const td = document.createElement('td');
      td.contentEditable = true;
      td.textContent = row[key];
      td.addEventListener('input', () => {
        data[rowIdx][key] = td.textContent;
        td.style.background = '#fffbe6';
      });
      rowInner.appendChild(th);
      rowInner.appendChild(td);
      innerTbody.appendChild(rowInner);
    });
    innerTable.appendChild(innerTbody);
    detailsTd.appendChild(innerTable);

    // Speichern-Button für diesen Datensatz
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Speichern';
    saveBtn.style.marginTop = '10px';
    saveBtn.onclick = () => {
      saveCallback(rowIdx, 'edit');
    };
    detailsTd.appendChild(saveBtn);

    detailsRow.appendChild(detailsTd);
    tbody.appendChild(detailsRow);
  });
  table.appendChild(tbody);
  document.getElementById(containerId).innerHTML = '';
  document.getElementById(containerId).appendChild(table);
}

function showAddDialog(fields, title) {
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
    dialog.style.minWidth = '350px';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    const inputs = {};
    fields.forEach(field => {
      const label = document.createElement('label');
      label.textContent = field;
      label.style.marginTop = '10px';
      label.style.display = 'block';
      const input = document.createElement('input');
      input.type = 'text';
      input.style.width = '250px';
      input.style.marginTop = '4px';
      label.appendChild(document.createElement('br'));
      label.appendChild(input);
      dialog.appendChild(label);
      inputs[field] = input;
    });

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    btnRow.style.marginTop = '20px';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'Hinzufügen';
    okBtn.onclick = () => {
      const result = {};
      fields.forEach(field => {
        result[field] = inputs[field].value.trim();
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

function sortData(data, field, dir) {
  return data.slice().sort((a, b) => {
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

function filterData(data, search) {
  if (!search) return data;
  const s = search.toLowerCase();
  return data.filter(row => Object.values(row).some(val => (val || '').toString().toLowerCase().includes(s)));
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
  // Alle Felder, die mit 'b' beginnen (wie b2anfang, b2ende, ...)
  Object.keys(obj).forEach(key => {
    if (dateFields.includes(key) || /^b\d*anfang$/i.test(key) || /^b\d*ende$/i.test(key)) {
      obj[key] = excelDateToString(obj[key]);
    }
  });
  return obj;
}

function reloadTables() {
  let kunden = [];
  let betreuer = [];
  if (fs.existsSync(kundenPath)) {
    kunden = readExcel(kundenPath).map(fixDates);
  }
  if (fs.existsSync(betreuerPath)) {
    betreuer = readExcel(betreuerPath).map(fixDates);
  }
  // Filter anwenden
  let betreuerFiltered = filterData(betreuer, betreuerSearch);
  let kundenFiltered = filterData(kunden, kundenSearch);
  // Sortier-Buttons
  renderSortControls('betreuer-sort-controls', (field, dir) => {
    betreuerSort = { field, dir };
    reloadTables();
  }, betreuerSort, ['Vor.Nam', 'Fam. Nam']);
  renderSortControls('kunden-sort-controls', (field, dir) => {
    kundenSort = { field, dir };
    reloadTables();
  }, kundenSort, ['kvname', 'kfname']);
  // Sortieren
  let betreuerSorted = betreuerFiltered;
  if (betreuerSort.field) betreuerSorted = sortData(betreuerFiltered, betreuerSort.field, betreuerSort.dir);
  let kundenSorted = kundenFiltered;
  if (kundenSort.field) kundenSorted = sortData(kundenFiltered, kundenSort.field, kundenSort.dir);
  // Mapping von gefiltertem zu Original-Index
  const betreuerIndexMap = betreuerSorted.map(filteredRow => betreuer.findIndex(origRow => JSON.stringify(origRow) === JSON.stringify(filteredRow)));
  const kundenIndexMap = kundenSorted.map(filteredRow => kunden.findIndex(origRow => JSON.stringify(origRow) === JSON.stringify(filteredRow)));
  createAccordionTable(betreuerSorted, 'betreuer-tabelle', ['Vor.Nam', 'Fam. Nam'], (filteredIdx, action) => {
    const origIdx = betreuerIndexMap[filteredIdx];
    if (origIdx === -1) return;
    if (action === 'edit') {
      const row = betreuer[origIdx];
      // Bearbeiten-Dialog öffnen und speichern
      // ... ggf. showEditDialog aufrufen ...
    } else if (action === 'delete') {
      betreuer.splice(origIdx, 1);
      writeExcel(betreuerPath, betreuer);
      reloadTables();
    }
  }, betreuerPath);
  createAccordionTable(kundenSorted, 'kunden-tabelle', ['kvname', 'kfname'], (filteredIdx, action) => {
    const origIdx = kundenIndexMap[filteredIdx];
    if (origIdx === -1) return;
    if (action === 'edit') {
      const row = kunden[origIdx];
      // Bearbeiten-Dialog öffnen und speichern
      // ... ggf. showEditDialog aufrufen ...
    } else if (action === 'delete') {
      kunden.splice(origIdx, 1);
      writeExcel(kundenPath, kunden);
      reloadTables();
    }
  }, kundenPath);
}

window.addEventListener('DOMContentLoaded', () => {
  reloadTables();

  // Suchevents
  document.getElementById('betreuer-search').addEventListener('input', (e) => {
    betreuerSearch = e.target.value;
    reloadTables();
  });
  document.getElementById('kunden-search').addEventListener('input', (e) => {
    kundenSearch = e.target.value;
    reloadTables();
  });

  // Hinzufügen-Buttons
  document.getElementById('add-betreuer').onclick = async () => {
    let betreuer = [];
    if (fs.existsSync(betreuerPath)) {
      betreuer = readExcel(betreuerPath);
    }
    const fields = betreuer.length > 0 ? Object.keys(betreuer[0]) : ['Vor.Nam', 'Fam. Nam'];
    const result = await showAddDialog(fields, 'Neuen Betreuer hinzufügen');
    if (result) {
      betreuer.push(result);
      writeExcel(betreuerPath, betreuer);
      reloadTables();
    }
  };
  document.getElementById('add-kunde').onclick = async () => {
    let kunden = [];
    if (fs.existsSync(kundenPath)) {
      kunden = readExcel(kundenPath);
    }
    const fields = kunden.length > 0 ? Object.keys(kunden[0]) : ['kfvname', 'kfname'];
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