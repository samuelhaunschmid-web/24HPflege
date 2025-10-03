// Settings.js - Hauptmodul für alle Einstellungen und Hilfsfunktionen
(function() {
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
  const config = loadConfig();

  // Hilfsfunktion: Excel einlesen und als Array von Objekten zurückgeben
  function readExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  // Hilfsfunktion: Alle Spalten aus Excel-Datei laden
  function getColumnsFromExcel(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const data = readExcel(filePath);
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => !key.startsWith('__EMPTY')); // Filtere leere Spalten
  }

  // Settings für Spalteneinstellungen
  const detailViewSettings = {
    customerDetailColumns: {
      visible: [],
      all: []
    },
    caretakerDetailColumns: {
      visible: [],
      all: []
    }
  };

  // Lade Spalten aus Excel-Dateien
  function loadColumnsFromExcel() {
    const kundenPath = path.join(config.datenDir || 'Daten', 'Kundendaten.xlsx');
    const betreuerPath = path.join(config.datenDir || 'Daten', 'Betreuerinnendaten.xlsx');

    // Lade alle verfügbaren Spalten
    const kundenColumns = getColumnsFromExcel(kundenPath);
    const betreuerColumns = getColumnsFromExcel(betreuerPath);

    // Speichere die Reihenfolge ALLER Spalten
    detailViewSettings.customerDetailColumns.all = kundenColumns;
    detailViewSettings.caretakerDetailColumns.all = betreuerColumns;

    // Lade gespeicherte Einstellungen
    const savedSettings = localStorage.getItem('detailViewSettings');
    if (savedSettings) {
      try {
        const saved = JSON.parse(savedSettings);
        // Behalte nur die Spalten, die noch existieren
        detailViewSettings.customerDetailColumns.visible = 
          saved.customerDetailColumns.visible.filter(col => kundenColumns.includes(col));
        detailViewSettings.caretakerDetailColumns.visible = 
          saved.caretakerDetailColumns.visible.filter(col => betreuerColumns.includes(col));
      } catch (e) {
        console.error('Fehler beim Laden der Einstellungen:', e);
      }
    }

    // Füge neue Spalten hinzu, wenn sie noch nicht in den Einstellungen sind
    kundenColumns.forEach(col => {
      if (!detailViewSettings.customerDetailColumns.visible.includes(col)) {
        detailViewSettings.customerDetailColumns.visible.push(col);
      }
    });

    betreuerColumns.forEach(col => {
      if (!detailViewSettings.caretakerDetailColumns.visible.includes(col)) {
        detailViewSettings.caretakerDetailColumns.visible.push(col);
      }
    });

    // Speichere die aktualisierten Einstellungen
    saveSettings();
  }

  // Speichere Einstellungen in localStorage
  function saveSettings() {
    try {
      localStorage.setItem('detailViewSettings', JSON.stringify(detailViewSettings));
      console.log('Einstellungen gespeichert:', detailViewSettings);
    } catch (e) {
      console.error('Fehler beim Speichern der Einstellungen:', e);
    }
  }

  // Lade Einstellungen beim Start
  loadColumnsFromExcel();

  // Exportiere alle notwendigen Module und Funktionen
  window.settings = {
    XLSX,
    path,
    fs,
    config,
    readExcel,
    saveSettings,
    loadSettings: loadColumnsFromExcel,
    detailViewSettings
  };
})(); 