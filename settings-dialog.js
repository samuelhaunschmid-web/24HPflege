// Settings Dialog für Spalteneinstellungen
function createSettingsDialog(type) {
  // Vor dem Erstellen eines neuen Overlays: alle alten Overlays entfernen
  document.querySelectorAll('[id^="dialog-overlay"]').forEach(el => el.remove());

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
  dialog.style.minWidth = '400px';
  dialog.style.maxHeight = '80vh';
  dialog.style.overflowY = 'auto';

  const title = document.createElement('h3');
  title.textContent = type === 'customer' ? 'Kundendaten Spalteneinstellungen' : 'Betreuerdaten Spalteneinstellungen';
  dialog.appendChild(title);

  const description = document.createElement('p');
  description.textContent = 'Wählen Sie die Spalten aus, die in der Detailansicht angezeigt werden sollen:';
  description.style.marginBottom = '20px';
  dialog.appendChild(description);

  // Dynamische Spaltenliste aus settings.js
  const columns = type === 'customer' ? window.settings.detailViewSettings.customerDetailColumns : window.settings.detailViewSettings.caretakerDetailColumns;
  const allColumns = columns.all;

  const checkboxes = {};
  allColumns.forEach(column => {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.marginBottom = '10px';
    label.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = columns.visible.includes(column);
    checkbox.style.marginRight = '10px';
    checkboxes[column] = checkbox;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(column));
    dialog.appendChild(label);
  });

  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.gap = '10px';
  buttonRow.style.marginTop = '20px';

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Speichern';
  saveButton.onclick = () => {
    columns.visible = Object.entries(checkboxes)
      .filter(([_, cb]) => cb.checked)
      .map(([column]) => column);
    window.settings.saveSettings();
    overlay.remove();
    
    // Aktualisiere die Detailansicht
    if (type === 'customer' && window.reloadTables) {
      window.reloadTables();
    } else if (type === 'caretaker' && window.reloadCaretakerTables) {
      window.reloadCaretakerTables();
    }
  };

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Abbrechen';
  cancelButton.onclick = () => overlay.remove();

  buttonRow.appendChild(saveButton);
  buttonRow.appendChild(cancelButton);
  dialog.appendChild(buttonRow);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

// Make the function available globally
window.createSettingsDialog = createSettingsDialog;

// Settings Dialog für Spalteneinstellungen
document.addEventListener('DOMContentLoaded', () => {
  const settingsButton = document.getElementById('settingsButton');
  if (!settingsButton) return; // Exit if button doesn't exist

  const settingsDialog = document.getElementById('settingsDialog');
  const closeSettingsButton = document.getElementById('closeSettingsButton');
  const customerColumnsList = document.getElementById('customerColumnsList');
  const caretakerColumnsList = document.getElementById('caretakerColumnsList');
  const saveSettingsButton = document.getElementById('saveSettingsButton');

  // Öffne Dialog
  settingsButton.addEventListener('click', () => {
    // Lade aktuelle Einstellungen
    window.settings.loadSettings();
    // Fülle Listen
    updateColumnLists();
    settingsDialog.showModal();
  });

  // Schließe Dialog
  closeSettingsButton.addEventListener('click', () => {
    settingsDialog.close();
  });

  // Aktualisiere die Listen mit den aktuellen Spalten
  function updateColumnLists() {
    // Kunden-Spalten
    customerColumnsList.innerHTML = '';
    window.settings.detailViewSettings.customerDetailColumns.visible.forEach(column => {
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.id = `customer-${column}`;
      checkbox.dataset.column = column;
      
      const label = document.createElement('label');
      label.htmlFor = `customer-${column}`;
      label.textContent = column;
      
      li.appendChild(checkbox);
      li.appendChild(label);
      customerColumnsList.appendChild(li);
    });

    // Betreuer-Spalten
    caretakerColumnsList.innerHTML = '';
    window.settings.detailViewSettings.caretakerDetailColumns.visible.forEach(column => {
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.id = `caretaker-${column}`;
      checkbox.dataset.column = column;
      
      const label = document.createElement('label');
      label.htmlFor = `caretaker-${column}`;
      label.textContent = column;
      
      li.appendChild(checkbox);
      li.appendChild(label);
      caretakerColumnsList.appendChild(li);
    });
  }

  // Speichere Einstellungen
  saveSettingsButton.addEventListener('click', () => {
    // Sammle ausgewählte Kunden-Spalten
    const selectedCustomerColumns = Array.from(customerColumnsList.querySelectorAll('input:checked'))
      .map(checkbox => checkbox.dataset.column);
    
    // Sammle ausgewählte Betreuer-Spalten
    const selectedCaretakerColumns = Array.from(caretakerColumnsList.querySelectorAll('input:checked'))
      .map(checkbox => checkbox.dataset.column);
    
    // Aktualisiere Einstellungen
    window.settings.detailViewSettings.customerDetailColumns.visible = selectedCustomerColumns;
    window.settings.detailViewSettings.caretakerDetailColumns.visible = selectedCaretakerColumns;
    
    // Speichere Einstellungen
    window.settings.saveSettings();
    
    // Schließe Dialog
    settingsDialog.close();
    
    // Aktualisiere die Detailansichten
    if (window.reloadTables) {
      window.reloadTables();
    }
    if (window.reloadCaretakerTables) {
      window.reloadCaretakerTables();
    }
  });
}); 