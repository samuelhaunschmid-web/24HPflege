const path = require('path');
const fs = require('fs');
const { app } = require('@electron/remote');

// Mapping für sprechende Feldnamen
const fieldLabels = {
  'Fam. Nam': 'Nachname',
  'Vor.Nam': 'Vorname',
  'Andrede': 'Geschlecht',
  'Email': 'E-Mail',
  'Geburtsdatum': 'Geburtsdatum',
  'IdentDat': 'Identitätsdatum',
  'Sv - Nummer': 'Sozialversicherungsnummer',
  'Adresse Heimat': 'Adresse',
  'PLZ': 'PLZ',
  'Ort': 'Ort',
  'Land': 'Land',
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

const betreuerPath = path.join(config.datenDir, 'Betreuerinnendaten.xlsx');
let betreuerSort = { field: null, dir: 1 };
let betreuerSearch = '';

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

// Liste eurasischer Länder (nur ausgeschriebene Namen, keine Abkürzungen)
const eurasischeLaender = [
  'Afghanistan', 'Albanien', 'Andorra', 'Armenien', 'Österreich', 'Aserbaidschan',
  'Belgien', 'Bulgarien', 'Bosnien und Herzegowina', 'Belarus', 'China', 'Zypern',
  'Tschechien', 'Deutschland', 'Dänemark', 'Estland', 'Finnland', 'Frankreich',
  'Georgien', 'Vereinigtes Königreich', 'Griechenland', 'Kroatien', 'Ungarn',
  'Island', 'Irland', 'Israel', 'Italien', 'Kasachstan', 'Kirgisistan',
  'Liechtenstein', 'Litauen', 'Luxemburg', 'Lettland', 'Monaco', 'Moldau',
  'Nordmazedonien', 'Malta', 'Montenegro', 'Niederlande', 'Norwegen', 'Polen',
  'Portugal', 'Rumänien', 'Russland', 'San Marino', 'Serbien', 'Slowakei',
  'Slowenien', 'Spanien', 'Schweden', 'Schweiz', 'Tadschikistan', 'Turkmenistan',
  'Türkei', 'Ukraine', 'Usbekistan', 'Vatikanstadt', 'Mongolei', 'Saudi-Arabien',
  'Vereinigte Arabische Emirate', 'Katar', 'Kuwait', 'Oman', 'Bahrain', 'Jordanien',
  'Libanon', 'Palästina', 'Syrien', 'Irak', 'Iran', 'Pakistan', 'Indien',
  'Bangladesch', 'Thailand', 'Vietnam', 'Südkorea', 'Nordkorea', 'Japan',
  'Singapur', 'Malaysia', 'Indonesien', 'Philippinen', 'Taiwan', 'Hongkong',
  'Macau', 'Brunei', 'Laos', 'Kambodscha', 'Myanmar', 'Osttimor', 'Malediven',
  'Nepal', 'Sri Lanka'
];

// Hilfsfunktion: Excel einlesen und als Array von Objekten zurückgeben
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
  const dateFields = ['Geburtsdatum', 'IdentDat'];
  Object.keys(obj).forEach(key => {
    if (dateFields.includes(key)) {
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

function writeExcel(filePath, data) {
  const ws = window.settings.XLSX.utils.json_to_sheet(data);
  const wb = window.settings.XLSX.utils.book_new();
  window.settings.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  window.settings.XLSX.writeFile(wb, filePath);
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

// Hilfsfunktion: Prüft, ob ein Feld ein Telefonnummernfeld ist
function isTelefonFeld(field) {
  return /mobil.*ausland/i.test(field) || /telefon/i.test(field) || /fest.*ausland/i.test(field) || /mobil.*inland/i.test(field);
}

// Hilfsfunktion für SV-Nummer-Erkennung
function isSVNummerFeld(name) {
  return name.replace(/\s+/g, '').toLowerCase() === 'sv-nummer';
}

// Hilfsfunktion für modalen Info-Dialog (statt alert)
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

function showAddDialog(fields, title) {
  // Vor dem Erstellen eines neuen Overlays: alle alten Overlays entfernen
  document.querySelectorAll('[id^="dialog-overlay"]').forEach(el => el.remove());
  return new Promise((resolve) => {
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
      const label = document.createElement('label');
      label.textContent = fieldLabels[field] || field;
      label.style.marginTop = '10px';
      label.style.display = 'block';
      let input;
      // Anrede-Combobox (datalist)
      if (/anrede/i.test(field)) {
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
          const anredeOptionen = ['Mann', 'Frau', 'Fam.'];
          anredeOptionen.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            datalist.appendChild(option);
          });
          // Alle existierenden Anrede-Werte aus der Tabelle
          let betreuer = [];
          if (fs.existsSync(betreuerPath)) {
            betreuer = readExcel(betreuerPath);
          }
          const anredeValues = new Set(betreuer.map(b => b.Anrede || b.anrede || b.Andrede).filter(Boolean));
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
      }
      // GebOrt-Combobox (datalist)
      else if (/GebOrt/i.test(field)) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'gebort-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
        // Datalist erstellen
        let datalist = document.getElementById('gebort-list');
        if (!datalist) {
          datalist = document.createElement('datalist');
          datalist.id = 'gebort-list';
          // Alle existierenden GebOrt-Werte aus der Tabelle
          let betreuer = [];
          if (fs.existsSync(betreuerPath)) {
            betreuer = readExcel(betreuerPath);
          }
          const gebortValues = new Set(betreuer.map(b => b.GebOrt).filter(Boolean));
          gebortValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            datalist.appendChild(option);
          });
          dialog.appendChild(datalist);
        }
        inputs[field] = input;
      }
      // IdentBehoerde-Combobox (datalist)
      else if (/IdentBehoerde/i.test(field)) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'identbehoerde-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
        // Datalist erstellen
        let datalist = document.getElementById('identbehoerde-list');
        if (!datalist) {
          datalist = document.createElement('datalist');
          datalist.id = 'identbehoerde-list';
          // Alle existierenden IdentBehoerde-Werte aus der Tabelle
          let betreuer = [];
          if (fs.existsSync(betreuerPath)) {
            betreuer = readExcel(betreuerPath);
          }
          const identbehoerdeValues = new Set(betreuer.map(b => b.IdentBehoerde).filter(Boolean));
          identbehoerdeValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            datalist.appendChild(option);
          });
          dialog.appendChild(datalist);
        }
        inputs[field] = input;
      }
      else if (/titel/i.test(field)) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'titel-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else if (isSVNummerFeld(field)) {
        // SV-Nummer: 2 Felder
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
        // Automatisch aus Geburtsdatum befüllen, wenn leer oder nicht überschrieben
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
      } else if (isTelefonFeld(field)) {
        // Vorwahl-Combobox + Nummernfeld
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.marginTop = '4px';
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
        wrapper.appendChild(vorwahl);
        wrapper.appendChild(nummer);
        input = wrapper;
        // Für das Ergebnis
        inputs[field + '_vorwahl'] = vorwahl;
        inputs[field + '_nummer'] = nummer;
      } else if (field.toLowerCase() === 'geburtsdatum' || field.toLowerCase() === 'identdat') {
        input = document.createElement('input');
        input.type = 'date';
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else if (['Land', 'GebOrt', 'StaatsAng', 'IdentStaat'].includes(field)) {
        input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'eurasien-list');
        input.style.width = '250px';
        input.style.marginTop = '4px';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.style.width = '250px';
        input.style.marginTop = '4px';
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
    // GebOrt-Datalist nur einmal anhängen
    if (!document.getElementById('gebort-list')) {
      const datalist = document.createElement('datalist');
      datalist.id = 'gebort-list';
      eurasischeLaender.forEach(land => {
        const opt = document.createElement('option');
        opt.value = land;
        datalist.appendChild(opt);
      });
      dialog.appendChild(datalist);
    }
    // IdentBehoerde-Datalist nur einmal anhängen
    if (!document.getElementById('identbehoerde-list')) {
      const datalist = document.createElement('datalist');
      datalist.id = 'identbehoerde-list';
      eurasischeLaender.forEach(land => {
        const opt = document.createElement('option');
        opt.value = land;
        datalist.appendChild(opt);
      });
      dialog.appendChild(datalist);
    }
    // Eurasische Länder-Datalist nur einmal anhängen
    if (!document.getElementById('eurasien-list')) {
      const datalist = document.createElement('datalist');
      datalist.id = 'eurasien-list';
      eurasischeLaender.forEach(land => {
        const opt = document.createElement('option');
        opt.value = land;
        datalist.appendChild(opt);
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
        if (isSVNummerFeld(field)) {
          const teil1 = inputs[field + '_teil1'];
          const teil2 = inputs[field + '_teil2'];
          const val1 = teil1.value.trim();
          const val2 = teil2.value.trim();
          result[field] = val1 && val2 ? `${val1} ${val2}` : val1 || val2;
        } else if (isTelefonFeld(field)) {
          const vorwahlInput = inputs[field + '_vorwahl'];
          const nummerInput = inputs[field + '_nummer'];
          if (vorwahlInput && nummerInput) {
            const vorwahl = vorwahlInput.value.trim();
            const nummer = nummerInput.value.trim();
            result[field] = vorwahl && nummer ? `${vorwahl} ${nummer}` : nummer;
          } else if (inputs[field]) {
            let val = inputs[field].value;
            result[field] = val && val.trim ? val.trim() : val;
          } else {
            result[field] = '';
          }
        } else {
          let val = inputs[field] && inputs[field].value !== undefined ? inputs[field].value : '';
          if (inputs[field] && inputs[field].type === 'date' && val) {
            val = fromDateInputValue(val);
          }
          result[field] = val && val.trim ? val.trim() : val;
        }
      });
      document.body.removeChild(overlay);
      const mainInput = document.getElementById('betreuer-search') || document.body;
      if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
      resolve(result);
    };
    btnRow.appendChild(okBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      const mainInput = document.getElementById('betreuer-search') || document.body;
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

function showEditDialog(row, keys, fieldLabels, onSave) {
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
  titleEl.textContent = 'Betreuer bearbeiten';
  dialog.appendChild(titleEl);
  const inputs = {};
  keys.forEach(key => {
    const label = document.createElement('label');
    label.textContent = fieldLabels[key] || key;
    label.style.marginTop = '10px';
    label.style.display = 'block';
    let input;
    // Anrede-Combobox (datalist)
    if (/anrede/i.test(key)) {
      // Input mit Datalist für Anrede (Combobox)
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'anrede-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
      // Datalist erstellen
      let datalist = document.getElementById('anrede-list');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'anrede-list';
        // Standardoptionen
        const anredeOptionen = ['Mann', 'Frau', 'Fam.'];
        anredeOptionen.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          datalist.appendChild(option);
        });
        // Alle existierenden Anrede-Werte aus der Tabelle
        let betreuer = [];
        if (fs.existsSync(betreuerPath)) {
          betreuer = readExcel(betreuerPath);
        }
        const anredeValues = new Set(betreuer.map(b => b.Anrede || b.anrede || b.Andrede).filter(Boolean));
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
    }
    // GebOrt-Combobox (datalist)
    else if (/GebOrt/i.test(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'gebort-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
      // Datalist erstellen
      let datalist = document.getElementById('gebort-list');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'gebort-list';
        // Alle existierenden GebOrt-Werte aus der Tabelle
        let betreuer = [];
        if (fs.existsSync(betreuerPath)) {
          betreuer = readExcel(betreuerPath);
        }
        const gebortValues = new Set(betreuer.map(b => b.GebOrt).filter(Boolean));
        gebortValues.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          datalist.appendChild(option);
        });
        dialog.appendChild(datalist);
      }
      inputs[key] = input;
    }
    // IdentBehoerde-Combobox (datalist)
    else if (/IdentBehoerde/i.test(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'identbehoerde-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
      // Datalist erstellen
      let datalist = document.getElementById('identbehoerde-list');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'identbehoerde-list';
        // Alle existierenden IdentBehoerde-Werte aus der Tabelle
        let betreuer = [];
        if (fs.existsSync(betreuerPath)) {
          betreuer = readExcel(betreuerPath);
        }
        const identbehoerdeValues = new Set(betreuer.map(b => b.IdentBehoerde).filter(Boolean));
        identbehoerdeValues.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          datalist.appendChild(option);
        });
        dialog.appendChild(datalist);
      }
      inputs[key] = input;
    }
    else if (/titel/i.test(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'titel-list');
      input.style.width = '250px';
      input.style.marginTop = '4px';
      if (row[key]) input.value = row[key];
    } else if (isSVNummerFeld(key)) {
      // SV-Nummer: 2 Felder
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
      
      // Automatisch aus Geburtsdatum befüllen, wenn leer oder nicht überschrieben
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
    } else if (isTelefonFeld(key)) {
      // Vorwahl-Combobox + Nummernfeld
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '8px';
      wrapper.style.marginTop = '4px';
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
      if (typeof row[key] === 'string' && row[key]) {
        const match = row[key].match(/^(\+\d{1,4})\s*(.*)$/);
        if (match) {
          vorwahl.value = match[1];
          nummer.value = match[2];
        } else {
          nummer.value = row[key];
        }
      } else if (row[key]) {
        nummer.value = row[key];
      }
      wrapper.appendChild(vorwahl);
      wrapper.appendChild(nummer);
      input = wrapper;
      // Für das Ergebnis
      inputs[key + '_vorwahl'] = vorwahl;
      inputs[key + '_nummer'] = nummer;
    } else if (key.toLowerCase() === 'geburtsdatum' || key.toLowerCase() === 'identdat') {
      input = document.createElement('input');
      input.type = 'date';
      input.value = toDateInputValue(row[key]);
      input.style.width = '250px';
      input.style.marginTop = '4px';
    } else if (['Land', 'GebOrt', 'StaatsAng', 'IdentStaat'].includes(key)) {
      input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('list', 'eurasien-list');
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
  // GebOrt-Datalist nur einmal anhängen
  if (!document.getElementById('gebort-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'gebort-list';
    eurasischeLaender.forEach(land => {
      const opt = document.createElement('option');
      opt.value = land;
      datalist.appendChild(opt);
    });
    dialog.appendChild(datalist);
  }
  // IdentBehoerde-Datalist nur einmal anhängen
  if (!document.getElementById('identbehoerde-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'identbehoerde-list';
    eurasischeLaender.forEach(land => {
      const opt = document.createElement('option');
      opt.value = land;
      datalist.appendChild(opt);
    });
    dialog.appendChild(datalist);
  }
  // Eurasische Länder-Datalist nur einmal anhängen
  if (!document.getElementById('eurasien-list')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'eurasien-list';
    eurasischeLaender.forEach(land => {
      const opt = document.createElement('option');
      opt.value = land;
      datalist.appendChild(opt);
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
      if (isSVNummerFeld(key)) {
        const teil1 = inputs[key + '_teil1'];
        const teil2 = inputs[key + '_teil2'];
        const val1 = teil1.value.trim();
        const val2 = teil2.value.trim();
        updated[key] = val1 && val2 ? `${val1} ${val2}` : val1 || val2;
      } else if (isTelefonFeld(key)) {
        const vorwahlInput = inputs[key + '_vorwahl'];
        const nummerInput = inputs[key + '_nummer'];
        if (vorwahlInput && nummerInput) {
          const vorwahl = vorwahlInput.value.trim();
          const nummer = nummerInput.value.trim();
          updated[key] = vorwahl && nummer ? `${vorwahl} ${nummer}` : nummer;
        } else if (inputs[key]) {
          let val = inputs[key].value;
          updated[key] = val && val.trim ? val.trim() : val;
        } else {
          updated[key] = '';
        }
      } else {
        let val = inputs[key].value;
        if (inputs[key].type === 'date' && val) {
          val = fromDateInputValue(val);
        }
        updated[key] = val && val.trim ? val.trim() : val;
      }
    });
    document.body.removeChild(overlay);
    const mainInput = document.getElementById('betreuer-search') || document.body;
    if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
    onSave(updated);
  };
  btnRow.appendChild(okBtn);
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
    const mainInput = document.getElementById('betreuer-search') || document.body;
    if (mainInput && typeof mainInput.focus === 'function') mainInput.focus();
  };
  btnRow.appendChild(cancelBtn);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  Object.values(inputs)[0].focus();
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
  settingsBtn.onclick = () => window.createSettingsDialog('caretaker');
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
    // Details-Zeile (versteckt)
    const detailsRow = document.createElement('tr');
    detailsRow.style.display = 'none';
    const detailsTd = document.createElement('td');
    detailsTd.colSpan = nameFields.length + 2;
    // Details-Tabelle
    const innerTable = document.createElement('table');
    innerTable.style.width = '100%';
    const innerTbody = document.createElement('tbody');
    const keys = Object.keys(row);
    keys.forEach(key => {
      if (!row[key] || !window.settings.detailViewSettings.caretakerDetailColumns.visible.includes(key)) return; // Nur ausgefüllte und sichtbare Felder
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
    editBtn.style.background = '#007bff';
    editBtn.style.color = '#fff';
    editBtn.style.border = 'none';
    editBtn.style.borderRadius = '6px';
    editBtn.style.padding = '6px 16px';
    editBtn.style.cursor = 'pointer';
    editBtn.style.fontWeight = 'bold';
    editBtn.style.margin = '10px 0 0 0';
    editBtn.onclick = () => {
      saveCallback(rowIdx, 'edit');
    };
    detailsTd.appendChild(editBtn);
    detailsRow.appendChild(detailsTd);
    // Details-Button
    const tdDetails = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Details anzeigen';
    btn.style.background = '#007bff';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.padding = '6px 16px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.margin = '2px 0';
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
    delBtn.style.background = '#007bff';
    delBtn.style.color = '#fff';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '6px';
    delBtn.style.padding = '6px 16px';
    delBtn.style.cursor = 'pointer';
    delBtn.style.fontWeight = 'bold';
    delBtn.style.margin = '2px 0';
    delBtn.onclick = async () => {
      if (!await showConfirmDialog('Möchtest du diesen Betreuer wirklich löschen? Die Daten werden ins Archiv (ALTbetreuerinnendaten.xlsx) verschoben.', 'betreuer-search')) return;
      saveCallback(rowIdx, 'delete');
    };
    tdDelete.appendChild(delBtn);
    tr.appendChild(tdDelete);
    tbody.appendChild(tr);
    tbody.appendChild(detailsRow);
  });
  table.appendChild(tbody);
  document.getElementById(containerId).innerHTML = '';
  document.getElementById(containerId).appendChild(table);
}

function reloadTables() {
  let betreuer = [];
  if (fs.existsSync(betreuerPath)) {
    betreuer = readExcel(betreuerPath).map(fixDates);
  }
  window.betreuerCount = betreuer.length;
  const infobox = document.getElementById('betreuer-infobox');
  if (infobox) {
    infobox.textContent = 'Gesamtanzahl Betreuer: ' + window.betreuerCount;
  }
  let betreuerFiltered = filterData(betreuer, betreuerSearch);
  
  // Standard-Sortierung nach Nachname aufsteigend, falls keine andere Sortierung aktiv ist
  if (!betreuerSort.field) {
    betreuerSort = { field: 'Fam. Nam', dir: 1 };
  }
  
  renderSortControls('betreuer-sort-controls', (field, dir) => {
    betreuerSort = { field, dir };
    reloadTables();
  }, betreuerSort, ['Vor.Nam', 'Fam. Nam']);
  let betreuerSorted = betreuerFiltered;
  if (betreuerSort.field) betreuerSorted = sortData(betreuerFiltered, betreuerSort.field, betreuerSort.dir);
  // Mapping von gefiltertem zu Original-Index
  const indexMap = betreuerSorted.map(filteredRow => betreuer.findIndex(origRow => JSON.stringify(origRow) === JSON.stringify(filteredRow)));
  createAccordionTable(betreuerSorted, 'betreuer-tabelle', ['Vor.Nam', 'Fam. Nam'], async (filteredIdx, action) => {
    const origIdx = indexMap[filteredIdx];
    if (origIdx === -1) return;
    if (action === 'edit') {
      const row = betreuer[origIdx];
      showEditDialog(row, Object.keys(row), fieldLabels, (updatedRow) => {
        Object.assign(betreuer[origIdx], updatedRow);
        writeExcel(betreuerPath, betreuer);
        reloadTables();
      });
    } else if (action === 'delete') {
      // Löschen
      const row = betreuer[origIdx];
      // 1. Aus Datei entfernen
      betreuer.splice(origIdx, 1);
      writeExcel(betreuerPath, betreuer);
      // 2. In Archiv einfügen
      const altPath = path.join(config.altDatenDir, 'ALTbetreuerinnendaten.xlsx');
      let altbetreuer = [];
      if (fs.existsSync(altPath)) {
        altbetreuer = readExcel(altPath);
      }
      altbetreuer.push(row);
      writeExcel(altPath, altbetreuer);
      await showInfoDialog('Betreuer archiviert und entfernt!', 'betreuer-search');
      reloadTables();
    }
  }, betreuerPath);
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

window.addEventListener('DOMContentLoaded', () => {
  reloadTables();
  document.getElementById('betreuer-search').addEventListener('input', (e) => {
    betreuerSearch = e.target.value;
    reloadTables();
  });
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
  document.getElementById('refresh-btn').onclick = () => {
    reloadTables();
  };

  // Fake-Tab: Prüfe URL-Parameter und springe ggf. zu Betreuer
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || '';
  }
  const vor = getParam('vor');
  const nach = getParam('nach');
  if (vor || nach) {
    setTimeout(() => {
      const rows = document.querySelectorAll('#betreuer-tabelle table tbody tr');
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const tds = row.querySelectorAll('td');
        for (const td of tds) {
          if (td.textContent && td.textContent.trim() === `${vor} ${nach}`.trim()) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('highlight-betreuer');
            setTimeout(() => row.classList.remove('highlight-betreuer'), 2000);
            // Details-Zeile automatisch öffnen
            const detailsRow = rows[i + 1];
            if (detailsRow && detailsRow.querySelector('td')) {
              detailsRow.style.display = '';
              // Richtig: Simuliere Klick auf den passenden Details-Button
              const btns = row.querySelectorAll('button');
              for (const b of btns) {
                if (b.textContent.includes('Details anzeigen')) {
                  b.click();
                  break;
                }
              }
            }
            return;
          }
        }
      }
    }, 400);
  }
});

window.reloadCaretakerTables = reloadTables; 