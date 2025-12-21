# 24h Pflege - Projekt-Dokumentation

> **Letzte Aktualisierung:** 10.12.2025
> 
> Diese Datei dient als Übersicht über die Struktur und Funktionen der App. Sie soll zukünftig bei Änderungen aktualisiert werden.

---

## Inhaltsverzeichnis

1. [Komponentenbaum](#1-komponentenbaum)
2. [Seiten-Beschreibungen](#2-seiten-beschreibungen)
3. [Komponenten-Beschreibungen](#3-komponenten-beschreibungen)
4. [Logik-Module](#4-logik-module)
5. [Fußnoten / Begriffserklärungen](#5-fußnoten--begriffserklärungen)

---

## 1. Komponentenbaum

Diese Übersicht zeigt, welche Dateien auf welchen Seiten verwendet werden.

```
📁 renderer/src/
│
├── 📄 main.tsx ─────────────────────────── Einstiegspunkt¹
│   │
│   ├── 📁 seiten/
│   │   │
│   │   ├── 📄 Startseite.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingDialog.tsx
│   │   │   ├── VorlagenGruppenDialog.tsx
│   │   │   └── MessageModal.tsx
│   │   │
│   │   ├── 📄 Kunden.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── CountBadge.tsx
│   │   │   ├── TabelleDropdownZeilen.tsx
│   │   │   │   ├── NeuerEintragDialog.tsx
│   │   │   │   ├── BetreuerZuweisungDialog.tsx
│   │   │   │   ├── BetreuerWechselDialog.tsx
│   │   │   │   ├── SchemataVerwaltenDialog.tsx
│   │   │   │   ├── DatenVerwaltungTabs.tsx
│   │   │   │   │   └── DateiVerwaltungsPanel.tsx
│   │   │   │   └── ConfirmModal.tsx
│   │   │   ├── TabellenEinstellungenDialog.tsx
│   │   │   ├── NeuerEintragDialog.tsx
│   │   │   └── useTableSettings.ts (Hook²)
│   │   │
│   │   ├── 📄 Betreuer.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── CountBadge.tsx
│   │   │   ├── TabelleDropdownZeilen.tsx
│   │   │   │   └── (gleiche Unterkomponenten wie Kunden)
│   │   │   ├── TabellenEinstellungenDialog.tsx
│   │   │   ├── NeuerEintragDialog.tsx
│   │   │   ├── OrdnerAutomatischErstellen.tsx
│   │   │   └── useTableSettings.ts (Hook²)
│   │   │
│   │   ├── 📄 Rechnungen.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingDialog.tsx
│   │   │   └── MessageModal.tsx
│   │   │
│   │   ├── 📄 RechnungenAutomatisch.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingDialog.tsx
│   │   │   └── MessageModal.tsx
│   │   │
│   │   ├── 📄 Einstellungen.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingDialog.tsx
│   │   │   └── MessageModal.tsx
│   │   │
│   │   ├── 📄 DateienMail.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── MessageModal.tsx
│   │   │   └── useTableSettings.ts (Hook²)
│   │   │
│   │   ├── 📄 ArchivierteKunden.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── CountBadge.tsx
│   │   │   ├── ArchivDropdownZeilen.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── useTableSettings.ts (Hook²)
│   │   │
│   │   ├── 📄 ArchivierteBetreuer.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── CountBadge.tsx
│   │   │   ├── ArchivDropdownZeilen.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── useTableSettings.ts (Hook²)
│   │   │
│   │   └── 📄 DateienSortieren.tsx
│   │       ├── Layout.tsx
│   │       ├── OrdnerListe.tsx
│   │       ├── DateiListe.tsx
│   │       ├── ConfirmModal.tsx
│   │       ├── MessageModal.tsx
│   │       ├── LoadingDialog.tsx
│   │       └── useDateiSortierung.ts (Hook²)
│   │
│   └── 📁 seiten-dialog/
│       │
│       ├── 📄 DateienMailDialog.tsx
│       │   ├── ConfirmModal.tsx
│       │   └── StandardTemplateService.ts
│       │
│       └── 📄 OrdnerManagmentDialog.tsx
│           ├── MessageModal.tsx
│           ├── useTableSettings.ts (Hook²)
│           └── useOrdnerTemplates.ts (Hook²)
│
├── 📁 seite-shared/
│   └── 📄 Layout.tsx ──────────────────── Seitenrahmen mit Navigation
│
├── 📁 komponenten/
│   ├── 📄 Tabelle.tsx
│   ├── 📄 TabelleDropdownZeilen.tsx
│   ├── 📄 ArchivDropdownZeilen.tsx
│   ├── 📄 CountBadge.tsx
│   ├── 📄 LoadingDialog.tsx
│   ├── 📄 MessageModal.tsx
│   ├── 📄 ConfirmModal.tsx
│   ├── 📄 NeuerEintragDialog.tsx
│   ├── 📄 VorlagenGruppenDialog.tsx
│   ├── 📄 TabellenEinstellungenDialog.tsx
│   ├── 📄 BetreuerZuweisungDialog.tsx
│   ├── 📄 BetreuerWechselDialog.tsx
│   ├── 📄 SchemataVerwaltenDialog.tsx
│   ├── 📄 DatenVerwaltungTabs.tsx
│   ├── 📄 DateiVerwaltungsPanel.tsx
│   ├── 📄 DateiVorschauDialog.tsx
│   ├── 📄 DateiAktionenMenue.tsx
│   ├── 📄 OrdnerManagment.tsx
│   ├── 📄 OrdnerAutomatischErstellen.tsx
│   ├── 📄 OrdnerListe.tsx
│   ├── 📄 DateiListe.tsx
│   ├── 📄 PdfLoadingDialog.tsx
│   └── 📄 useTableSettings.ts (Hook²)
│
└── 📁 logik/dateiVerwaltung/
    ├── 📄 typen.ts
    ├── 📄 platzhalter.ts
    ├── 📄 mailService.ts
    ├── 📄 standardOrdnerService.ts
    ├── 📄 standardTemplateService.ts
    ├── 📄 dateiSortierService.ts
    ├── 📄 useDateienMailTemplates.ts (Hook²)
    ├── 📄 useDateienMailVersand.ts (Hook²)
    ├── 📄 useDateiSchemata.ts (Hook²)
    ├── 📄 useDateiSortierung.ts (Hook²)
    ├── 📄 useOrdnerTemplates.ts (Hook²)
    └── 📄 useStandardOrdner.ts (Hook²)
```

---

## 2. Seiten-Beschreibungen

### 2.1 Startseite.tsx
**Pfad:** `renderer/src/seiten/Startseite.tsx`

**Wann wird sie aufgerufen?**
- Beim Start der App
- Wenn man auf "Dokumentengenerator" in der Seitenleiste klickt
- Über die URL³ `/`

**Grundfunktionen:**
- Auswahl eines Kunden aus der Datenbank
- Auswahl eines Betreuers aus der Datenbank oder zweier Betreuer (A/B) für Wechsel-Dokumente
- Auswahl von Dokumentvorlagen (organisiert in Gruppen)
- Generierung von Dokumenten als DOCX oder PDF
- Festlegung eines Ordnernamens für die erzeugten Dateien
- Übergabe zusätzlicher Platzhalter für Betreuer A/B (`[[ba.<Feld>]]`, `[[bb.<Feld>]]`) in Vorlagen

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `LoadingDialog` – Zeigt Ladefortschritt beim Generieren
- `VorlagenGruppenDialog` – Verwalten der Vorlagen-Gruppen
- `MessageModal` – Zeigt Erfolgs-/Fehlermeldungen

---

### 2.2 Kunden.tsx
**Pfad:** `renderer/src/seiten/Kunden.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Kunden" in der Seitenleiste klickt
- Über die URL³ `/kunden`

**Grundfunktionen:**
- Liste aller aktiven Kunden anzeigen (sortiert nach Nachname)
- Suche nach Kunden
- Neuen Kunden anlegen
- Kunden-Details anzeigen/bearbeiten (aufklappbare Zeilen)
- Betreuer zuweisen oder wechseln
- Dateiverwaltung für jeden Kunden (Dokumente, Standardordner)
- Kunden archivieren oder löschen
- Tabellen-Einstellungen anpassen (Spaltenanzeige, Gruppen)

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `CountBadge` – Zeigt Anzahl der Kunden an
- `TabelleDropdownZeilen` – Hauptliste mit aufklappbaren Details
- `TabellenEinstellungenDialog` – Anpassen der Spalten
- `NeuerEintragDialog` – Formular für neuen Kunden
- `useTableSettings` – Speichert Tabellen-Einstellungen

---

### 2.3 Betreuer.tsx
**Pfad:** `renderer/src/seiten/Betreuer.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Betreuer" in der Seitenleiste klickt
- Über die URL³ `/betreuer`

**Grundfunktionen:**
- Liste aller aktiven Betreuer anzeigen (sortiert nach Nachname)
- Suche nach Betreuern
- Neuen Betreuer anlegen
- Betreuer-Details anzeigen/bearbeiten (aufklappbare Zeilen)
- Zugewiesene Kunden einsehen
- Dateiverwaltung für jeden Betreuer
- Betreuer archivieren oder löschen
- Automatische Ordnererstellung bei neuem Betreuer

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `CountBadge` – Zeigt Anzahl der Betreuer an
- `TabelleDropdownZeilen` – Hauptliste mit aufklappbaren Details
- `TabellenEinstellungenDialog` – Anpassen der Spalten
- `NeuerEintragDialog` – Formular für neuen Betreuer
- `OrdnerAutomatischErstellen` – Erstellt Ordnerstruktur

---

### 2.4 Rechnungen.tsx
**Pfad:** `renderer/src/seiten/Rechnungen.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Rechnungen" → "Manuell" in der Seitenleiste klickt
- Über die URL³ `/rechnungen/manuell`

**Grundfunktionen:**
- Auswahl von Rechnungsvorlagen
- Auswahl der Kunden, für die Rechnungen erstellt werden
- Festlegung von Monat und Jahr für den Abrechnungszeitraum
- Individueller Zeitraum pro Kunde möglich
- Generierung als DOCX oder PDF
- Optionaler E-Mail-Versand der Rechnungen
- E-Mail-Vorlagen verwalten und personalisieren⁴
- Verwaltung der Rechnungsnummer (fortlaufend)

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `LoadingDialog` – Zeigt Fortschritt beim Generieren
- `MessageModal` – Zeigt Erfolgs-/Fehlermeldungen

---

### 2.5 RechnungenAutomatisch.tsx
**Pfad:** `renderer/src/seiten/RechnungenAutomatisch.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Rechnungen" → "Automatisch" in der Seitenleiste klickt
- Über die URL³ `/rechnungen/automatisch`

**Grundfunktionen:**
- Übersicht aller Kunden mit individuellen Einstellungen
- Pro Kunde festlegen: E-Mail, Rechnungsvorlage, E-Mail-Vorlage, Zeitraum
- Einstellungen werden automatisch gespeichert
- Massen-Versand: Rechnungen erstellen und per E-Mail versenden
- Optional: Rechnungsprotokoll erstellen (Übersicht aller versendeten Rechnungen)

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `LoadingDialog` – Zeigt Fortschritt beim Versenden
- `MessageModal` – Zeigt Erfolgs-/Fehlermeldungen

---

### 2.6 Einstellungen.tsx
**Pfad:** `renderer/src/seiten/Einstellungen.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Einstellungen" in der Seitenleiste klickt
- Über die URL³ `/einstellungen`

**Grundfunktionen:**
- E-Mail-Konfiguration (Google OAuth⁵-Verbindung, Absender)
- Testmail versenden
- E-Mail-Verlauf anzeigen
- Ordner-Konfiguration:
  - Daten-Ordner (wo die Datenbank liegt)
  - Alte-Ordner (für archivierte Einträge)
  - Vorlagen-Ordner (DOCX-Vorlagen für Dokumentengenerator)
  - Rechnungsvorlage-Ordner (Vorlagen für Rechnungen)
  - Dokumente-Ordner (Kunden-/Betreuerdaten)
  - LibreOffice-Pfad (für PDF-Konvertierung)
- App-Updates prüfen und installieren
- Einstellungen exportieren/importieren (über die Komponente `EinstellungenExportImport`):
  - Exportiert/Importiert werden:
    - Tabellen-Einstellungen (`tableSettings`) für Kunden/Betreuer
    - Anzeigenamen der Rechnungsvorlagen (`invoiceTemplateDisplayNames`)
    - E-Mail-Vorlagen für Rechnungen (`emailTemplates`)
    - Einstellungen für automatische Rechnungen (`autoInvoicePrefs`)
    - Mail-Konfiguration (Google OAuth: `googleClientId`, `googleClientSecret`)
    - Standardordner-Templates inkl. erwarteter Dateien:
      - `folderTemplatesPaths` (Ordner-Struktur für Kunden/Betreuer)
      - `folderTemplatesRules` (Regeln + Standard-Dateien pro Ordner)
    - Datei-Schemata für Betreuerwechsel (`wechselDateiSchemata`)
    - Mailvorlagen der Mail-Seite (`dateienMailTemplates`)
  - **Nicht** exportiert/importiert werden:
    - Physische Pfade wie `datenDir`, `altDatenDir`, `vorlagenDir`, `rechnungsvorlageDir`, `libreOfficePath`
    - Dokumente-Ordner (`dokumenteDir`) selbst (nur die Templates/Regeln, nicht die echten Dateien)
- LibreOffice Installation

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `LoadingDialog` – Zeigt Fortschritt bei Installationen
- `MessageModal` – Zeigt Erfolgs-/Fehlermeldungen
 - `EinstellungenExportImport` – Export/Import der App-Einstellungen als JSON

---

### 2.7 DateienMail.tsx
**Pfad:** `renderer/src/seiten/DateienMail.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Mail" in der Seitenleiste klickt
- Über die URL³ `/mail`

**Grundfunktionen:**
- Übersicht aller E-Mail-Vorlagen für Dateianhänge
- Pro Vorlage: Kunde und/oder Betreuer auswählen
- Prüfung, ob alle benötigten Dateien vorhanden sind (grüner Haken / rotes X)
- Massen-Versand ausgewählter Vorlagen
- Wenn eine Vorlage keine feste E-Mail-Adresse hat (leeres `to`-Feld), kann der Empfänger manuell eingegeben werden

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `MessageModal` – Zeigt Erfolgs-/Fehlermeldungen
- `useTableSettings` – Für Personen-Anzeige
- Logik-Module⁶ für Dateiverwaltung

---

### 2.8 ArchivierteKunden.tsx
**Pfad:** `renderer/src/seiten/ArchivierteKunden.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Archiv" → "Kunden" in der Seitenleiste klickt
- Über die URL³ `/archiv/kunden`

**Grundfunktionen:**
- Liste aller archivierten Kunden anzeigen
- Suche nach archivierten Kunden
- Details anzeigen (aufklappbare Zeilen)
- Zeitraum-Anzeige (von-bis, wie lange beschäftigt)
- Wiederherstellen eines Kunden
- Endgültig löschen (mit Bestätigung)

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `CountBadge` – Zeigt Anzahl an
- `ArchivDropdownZeilen` – Liste mit aufklappbaren Details
- `ConfirmModal` – Bestätigungsdialog für Löschen

---

### 2.9 ArchivierteBetreuer.tsx
**Pfad:** `renderer/src/seiten/ArchivierteBetreuer.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Archiv" → "Betreuer" in der Seitenleiste klickt
- Über die URL³ `/archiv/betreuer`

**Grundfunktionen:**
- Identisch mit ArchivierteKunden, aber für Betreuer

**Verwendete Komponenten:**
- Gleiche wie ArchivierteKunden

---

### 2.10 DateienSortieren.tsx
**Pfad:** `renderer/src/seiten/DateienSortieren.tsx`

**Wann wird sie aufgerufen?**
- Wenn man auf "Dateien Sortieren" in der Seitenleiste klickt
- Über die URL³ `/dateien/sortieren`

**Grundfunktionen:**
- Quellordner festlegen (Drive-Ordner mit unterschriebenen Dokumenten)
- Ordner im Quellpfad anzeigen
- Dateien automatisch Kunden/Betreuern zuordnen (basierend auf Dateinamen)
- Dateien in die entsprechenden Zielordner importieren (verschieben)
- Konfliktbehandlung bei bereits existierenden Dateien (Umbenennung)
- Warnung bei Dateikonflikten vor dem Import

**Verwendete Komponenten:**
- `Layout` – Rahmen mit Seitenleiste
- `OrdnerListe` – Zeigt Ordner im Quellpfad
- `DateiListe` – Zeigt Dateien mit Zuordnungsstatus
- `ConfirmModal` – Warnung bei Konflikten
- `MessageModal` – Zeigt Erfolgs-/Fehlermeldungen
- `LoadingDialog` – Zeigt Fortschritt beim Import
- `useDateiSortierung` – Hook für State-Management

---

## 2.11 Dialog-Seiten

Diese Seiten werden in separaten Fenstern geöffnet:

### DateienMailDialog.tsx
**Pfad:** `renderer/src/seiten-dialog/DateienMailDialog.tsx`

**Wann wird sie aufgerufen?**
- Über Button "Vorlagen bearbeiten" auf der Mail-Seite
- Öffnet sich in einem separaten Fenster

**Grundfunktionen:**
- Neue E-Mail-Vorlage erstellen
- Bestehende Vorlagen bearbeiten
- Vorlagen löschen
- Konfiguration: Name, Empfänger, Betreff, Text
- Auswahl der anzuhängenden Standard-Dateien (aus Ordnerstruktur)
- **Empfänger-Feld kann leer gelassen werden**: Wenn das "An"-Feld leer ist, wird beim Versenden ein Eingabefeld in der Mail-Seite angezeigt, um den Empfänger manuell einzugeben

---

### OrdnerManagmentDialog.tsx
**Pfad:** `renderer/src/seiten-dialog/OrdnerManagmentDialog.tsx`

**Wann wird sie aufgerufen?**
- Über Button in der Dateiverwaltung
- Öffnet sich in einem separaten Fenster

**Grundfunktionen:**
- Ordner-Struktur-Vorlagen bearbeiten (für Kunden oder Betreuer)
- Ordner hinzufügen/entfernen
- Unterordner erstellen
- Standard-Dateien pro Ordner definieren (mit Platzhaltern⁷)
- Struktur sofort für alle Personen erstellen

---

## 3. Komponenten-Beschreibungen

### 3.1 Layout.tsx
**Pfad:** `renderer/src/seite-shared/Layout.tsx`

**Funktion:** 
Der Rahmen für alle Seiten. Enthält die Seitenleiste (Navigation) links und den Inhaltsbereich rechts.

**Was macht sie:**
- Zeigt die Navigation mit allen Menüpunkten
- "Archiv" und "Rechnungen" sind ausklappbare Untermenüs
- Speichert den Zustand (auf/zu) der Untermenüs
- Zeigt Copyright-Hinweis unten in der Seitenleiste

---

### 3.2 TabelleDropdownZeilen.tsx
**Pfad:** `renderer/src/komponenten/TabelleDropdownZeilen.tsx`

**Funktion:**
Die Hauptliste für Kunden und Betreuer mit aufklappbaren Details.

**Was macht sie:**
- Zeigt alle Einträge als klickbare Zeilen
- Beim Klick öffnet sich ein Detail-Bereich
- Detail-Bereich hat zwei Tabs⁸: "Stammdaten" und "Dateiverwaltung"
- Stammdaten: Alle Felder bearbeiten, Betreuer zuweisen, etc.
- Dateiverwaltung: Ordnerstruktur, Dateien hochladen/öffnen
- Aktionen: Bearbeiten, Archivieren, Löschen

---

### 3.3 Tabelle.tsx
**Pfad:** `renderer/src/komponenten/Tabelle.tsx`

**Funktion:**
Eine einfache Tabelle zur Anzeige von Daten (aktuell nicht aktiv genutzt).

---

### 3.4 ArchivDropdownZeilen.tsx
**Pfad:** `renderer/src/komponenten/ArchivDropdownZeilen.tsx`

**Funktion:**
Ähnlich wie TabelleDropdownZeilen, aber vereinfacht für das Archiv.

**Was macht sie:**
- Zeigt archivierte Einträge als klickbare Zeilen
- Beim Klick werden alle Felder angezeigt
- Buttons für "Wiederherstellen" und "Löschen" rechts

---

### 3.5 CountBadge.tsx
**Pfad:** `renderer/src/komponenten/CountBadge.tsx`

**Funktion:**
Ein kleines rundes Abzeichen, das eine Zahl anzeigt (z.B. Anzahl der Einträge).

---

### 3.6 LoadingDialog.tsx
**Pfad:** `renderer/src/komponenten/LoadingDialog.tsx`

**Funktion:**
Ein Lade-Dialog⁹, der während längerer Vorgänge angezeigt wird.

**Was macht sie:**
- Verdunkelt den Hintergrund
- Zeigt einen drehenden Kreis (Spinner)
- Zeigt Titel und Nachricht
- Optional: Fortschrittsbalken mit Prozentangabe

---

### 3.7 MessageModal.tsx
**Pfad:** `renderer/src/komponenten/MessageModal.tsx`

**Funktion:**
Ein einfaches Nachrichtenfenster mit "OK"-Button.

**Was macht sie:**
- Zeigt eine Nachricht an (Erfolg, Fehler oder Info)
- Schließt sich beim Klick auf "OK" oder Drücken von Escape

---

### 3.8 ConfirmModal.tsx
**Pfad:** `renderer/src/komponenten/ConfirmModal.tsx`

**Funktion:**
Ein Bestätigungsdialog mit "Abbrechen" und "Bestätigen" Buttons.

**Was macht sie:**
- Fragt den Benutzer, ob er eine Aktion wirklich durchführen möchte
- Wird verwendet vor dem Löschen von Einträgen

---

### 3.9 NeuerEintragDialog.tsx
**Pfad:** `renderer/src/komponenten/NeuerEintragDialog.tsx`

**Funktion:**
Formular zum Anlegen eines neuen Kunden oder Betreuers.

**Was macht sie:**
- Zeigt Eingabefelder für alle Spalten
- Spezielle Felder: Telefon (mit Vorwahl-Auswahl), Sozialversicherungsnummer
- Vorschläge basierend auf bestehenden Einträgen
- Betreuer-Auswahl für neue Kunden

---

### 3.10 VorlagenGruppenDialog.tsx
**Pfad:** `renderer/src/komponenten/VorlagenGruppenDialog.tsx`

**Funktion:**
Verwalten der Vorlagen-Gruppen für den Dokumentengenerator.

**Was macht sie:**
- Gruppen erstellen, umbenennen, löschen
- Vorlagen (DOCX-Dateien) zu Gruppen zuordnen
- Reihenfolge der Gruppen per Drag & Drop¹⁰ ändern

---

### 3.11 TabellenEinstellungenDialog.tsx
**Pfad:** `renderer/src/komponenten/TabellenEinstellungenDialog.tsx`

**Funktion:**
Einstellungen für die Kunden-/Betreuer-Tabelle.

**Was macht sie:**
- Spaltennamen anpassen (Anzeigename)
- Spalten zu Gruppen zuordnen (z.B. "vorname", "nachname", "telefon")
- Diese Zuordnungen werden für Sortierung und Anzeige verwendet

---

### 3.12 BetreuerZuweisungDialog.tsx
**Pfad:** `renderer/src/komponenten/BetreuerZuweisungDialog.tsx`

**Funktion:**
Dialog zum Zuweisen eines Betreuers zu einem Kunden.

**Was macht sie:**
- Liste aller verfügbaren Betreuer anzeigen
- Suche nach Betreuern
- Betreuer auswählen und zuweisen (Betreuer 1 oder 2)

---

### 3.13 BetreuerWechselDialog.tsx
**Pfad:** `renderer/src/komponenten/BetreuerWechselDialog.tsx`

**Funktion:**
Dialog für den Wechsel des Betreuers bei einem Kunden.

**Was macht sie:**
- Zeigt aktuell zugewiesene Betreuer
- Neuen Betreuer auswählen
- Optional: Dateien vom alten zum neuen Betreuer verschieben

---

### 3.14 SchemataVerwaltenDialog.tsx
**Pfad:** `renderer/src/komponenten/SchemataVerwaltenDialog.tsx`

**Funktion:**
Verwalten der Schemata¹¹ für Dateiverschiebung bei Betreuerwechsel.

**Was macht sie:**
- Definiert, welche Dateien wohin verschoben werden
- Verwendet Platzhalter⁷ für dynamische Pfade

---

### 3.15 DatenVerwaltungTabs.tsx
**Pfad:** `renderer/src/komponenten/DatenVerwaltungTabs.tsx`

**Funktion:**
Container für die Dateiverwaltung in den Kunden-/Betreuer-Details.

**Was macht sie:**
- Lädt die Ordnerstruktur für eine Person
- Zeigt den DateiVerwaltungsPanel

---

### 3.16 DateiVerwaltungsPanel.tsx
**Pfad:** `renderer/src/komponenten/DateiVerwaltungsPanel.tsx`

**Funktion:**
Zeigt die Ordnerstruktur einer Person mit Status der Standard-Dateien.

**Was macht sie:**
- Baumansicht der Ordner
- Zeigt an, welche Standard-Dateien fehlen (rot) oder vorhanden sind (grün)
- Ordner im Explorer öffnen

---

### 3.17 DateiVorschauDialog.tsx
**Pfad:** `renderer/src/komponenten/DateiVorschauDialog.tsx`

**Funktion:**
Vorschau von Dateien (z.B. Bilder, PDFs).

---

### 3.18 DateiAktionenMenue.tsx
**Pfad:** `renderer/src/komponenten/DateiAktionenMenue.tsx`

**Funktion:**
Kontextmenü für Dateiaktionen (Öffnen, Löschen, etc.).

---

### 3.19 OrdnerManagment.tsx
**Pfad:** `renderer/src/komponenten/OrdnerManagment.tsx`

**Funktion:**
Verwaltung der Ordner-Struktur-Templates (inline, nicht als Dialog).

---

### 3.20 OrdnerAutomatischErstellen.tsx
**Pfad:** `renderer/src/komponenten/OrdnerAutomatischErstellen.tsx`

**Funktion:**
Funktion zum automatischen Erstellen der Ordnerstruktur für eine neue Person.

---

### 3.21 PdfLoadingDialog.tsx
**Pfad:** `renderer/src/komponenten/PdfLoadingDialog.tsx`

**Funktion:**
Spezieller Ladedialog für PDF-Erstellung.

---

### 3.22 OrdnerListe.tsx
**Pfad:** `renderer/src/komponenten/OrdnerListe.tsx`

**Funktion:**
Zeigt die Liste der Ordner im Quellpfad für die Dateisortierung.

**Was macht sie:**
- Zeigt Ordnernamen mit Dateianzahl
- Expandierbare Ordner zum Anzeigen der Dateien
- Button zum Öffnen im Explorer
- Button zum Importieren der zugeordneten Dateien

---

### 3.23 DateiListe.tsx
**Pfad:** `renderer/src/komponenten/DateiListe.tsx`

**Funktion:**
Zeigt die Dateien in einem Ordner mit Zuordnungsstatus.

**Was macht sie:**
- Zeigt Dateinamen mit Status (zugeordnet/nicht zugeordnet)
- Zeigt Ziel-Person und Zielordner
- Zeigt Konflikt-Warnung bei bereits existierenden Dateien

---

### 3.24 useTableSettings.ts (Hook²)
**Pfad:** `renderer/src/komponenten/useTableSettings.ts`

**Funktion:**
Verwaltet die Einstellungen für Tabellen (Kunden/Betreuer).

**Was macht sie:**
- Speichert Anzeigenamen für Spalten
- Speichert Gruppen-Zuordnungen (z.B. welche Spalte ist "Nachname")
- Lädt/speichert Einstellungen automatisch

---

## 4. Logik-Module

### 4.1 typen.ts
**Pfad:** `renderer/src/logik/dateiVerwaltung/typen.ts`

**Funktion:**
Definiert Datentypen¹² für die Dateiverwaltung.

---

### 4.2 platzhalter.ts
**Pfad:** `renderer/src/logik/dateiVerwaltung/platzhalter.ts`

**Funktion:**
Ersetzt Platzhalter⁷ in Texten durch echte Werte.

**Beispiel:**
`{nachname}_{vorname}.pdf` wird zu `Müller_Max.pdf`

- Namensvarianten werden nicht mehr doppelt erzeugt: Ordnernamen und Dateisuchen
  nutzen ausschließlich die Reihenfolge `Nachname Vorname`.
- `{nk1}` füllt bei Betreuer-Vorlagen automatisch den Nachnamen des ersten zugewiesenen Kunden (Betreuer1/Betreuer2) aus, damit Standarddateien korrekt benannt werden.
- `{svnr}` ersetzt die Sozialversicherungsnummer eines Betreuers. Im Kunden-Kontext wird sie befüllt, wenn ein Betreuer mitgegeben wird (z.B. für Mail-Platzhalter).

---

### 4.3 mailService.ts
**Pfad:** `renderer/src/logik/dateiVerwaltung/mailService.ts`

**Funktion:**
Hilfsfunktionen für den E-Mail-Versand.

---

### 4.4 standardOrdnerService.ts
**Pfad:** `renderer/src/logik/dateiVerwaltung/standardOrdnerService.ts`

**Funktion:**
Verwaltet die Standard-Ordnerstruktur für Kunden/Betreuer.

**Was macht sie:**
- Erstellt Ordner nach Vorlage
- Prüft, ob Standard-Dateien vorhanden sind
- Findet Dateien mit Platzhaltern⁷
- Ordnernamen werden nur in der Form `Nachname Vorname` erzeugt und gesucht (keine
  parallele Variante mehr mit `Vorname Nachname`).

---

### 4.5 dateiSortierService.ts
**Pfad:** `renderer/src/logik/dateiVerwaltung/dateiSortierService.ts`

**Funktion:**
Service für automatische Dateisortierung und -zuordnung.

**Was macht sie:**
- Erkennt Dateien anhand ihres Namens
- Ordnet Dateien automatisch Kunden/Betreuern zu
- Vergleicht Dateinamen mit erwarteten Standard-Dateien
- Erwartet nur die Ordner- und Namenskonvention `Nachname Vorname`
- Verschiebt Dateien mit Konfliktbehandlung

---

### 4.6 standardTemplateService.ts
**Pfad:** `renderer/src/logik/dateiVerwaltung/standardTemplateService.ts`

**Funktion:**
Lädt und speichert die Ordner-Struktur-Templates.

---

### 4.7 Hooks² für Dateiverwaltung

- **useDateienMailTemplates.ts** – Lädt E-Mail-Vorlagen für Dateianhänge
- **useDateienMailVersand.ts** – Versendet E-Mails mit Dateianhängen
- **useDateiSchemata.ts** – Verwaltet Schemata¹¹ für Dateiverschiebung
- **useDateiSortierung.ts** – Verwaltet Dateisortierung (Quellpfad, Ordner, Import)
- **useOrdnerTemplates.ts** – Verwaltet Ordner-Struktur-Templates
- **useStandardOrdner.ts** – Lädt Ordnerstruktur für eine Person

---

### 4.8 main.js (Dokumenten- und PDF-Backend)
**Pfad:** `main.js`

**Funktion:**
- Generiert DOCX über Docxtemplater und konvertiert optional zu PDF.
- Startet bei Bedarf einen einmaligen LibreOffice-Listener (UNO-Socket) und nutzt Batch-Konvertierung, um Start-Overhead zu sparen.

**Was macht sich geändert:**
- Statt je Datei einen eigenen `soffice`-Prozess zu starten, werden alle erzeugten DOCX einer Anfrage gebündelt konvertiert.
- Falls `unoconv` verfügbar ist, wird der laufende LibreOffice-Listener genutzt; sonst fällt die App auf einen einmaligen Batch-Aufruf von `soffice` zurück.
- Erfolgreich konvertierte DOCX werden nach dem PDF-Export gelöscht, damit nur PDFs im Zielordner verbleiben.

---

## 5. Fußnoten / Begriffserklärungen

| Nr. | Begriff | Erklärung |
|-----|---------|-----------|
| ¹ | **Einstiegspunkt** | Die Datei, die beim Start der App als erstes geladen wird. Von hier aus wird entschieden, welche Seite angezeigt wird. |
| ² | **Hook** | Eine wiederverwendbare Funktion, die Daten oder Logik bereitstellt. Hooks beginnen immer mit "use" (z.B. `useTableSettings`). Sie helfen dabei, Code nicht mehrfach schreiben zu müssen. |
| ³ | **URL** | Die Adresse im Browser (z.B. `/kunden`). In dieser App wird die URL verwendet, um die richtige Seite anzuzeigen. |
| ⁴ | **Personalisieren** | Platzhalter wie `{{vorname}}` werden durch die echten Daten des Kunden ersetzt. |
| ⁵ | **OAuth** | Ein Verfahren, mit dem sich die App mit Google verbindet, ohne dass das Passwort in der App gespeichert werden muss. Google erlaubt der App den E-Mail-Versand. |
| ⁶ | **Logik-Module** | Dateien, die Berechnungen und Abläufe enthalten, aber keine sichtbaren Elemente (Buttons, Listen, etc.) |
| ⁷ | **Platzhalter** | Texte wie `{vorname}` oder `{nachname}`, die später durch echte Werte ersetzt werden. Beispiel: `{nachname}_{vorname}.pdf` → `Müller_Max.pdf` |
| ⁸ | **Tab** | Ein Reiter zum Umschalten zwischen verschiedenen Ansichten, ohne die Seite zu wechseln. |
| ⁹ | **Dialog** | Ein kleines Fenster, das über der Seite erscheint und eine Aktion erfordert (z.B. Bestätigen oder Abbrechen). |
| ¹⁰ | **Drag & Drop** | Elemente mit der Maus greifen, verschieben und loslassen, um die Reihenfolge zu ändern. |
| ¹¹ | **Schema** | Eine Vorlage/Regel, die beschreibt, wie etwas strukturiert ist. Hier: Welche Dateien wohin verschoben werden. |
| ¹² | **Datentypen** | Beschreibungen, wie Daten aussehen müssen. Zum Beispiel: "Ein Kunde hat einen Nachnamen (Text) und ein Geburtsdatum (Datum)". |
| ¹³ | **Komponente** | Ein wiederverwendbarer Baustein der Benutzeroberfläche, z.B. ein Button, ein Eingabefeld oder eine ganze Liste. |
| ¹⁴ | **State** | Der aktuelle Zustand einer Komponente. Zum Beispiel: "Das Dropdown ist geöffnet" oder "Der Benutzer hat 'Müller' eingegeben". |
| ¹⁵ | **Props** | Daten, die eine Komponente von außen erhält. Zum Beispiel: Ein Button erhält den Text "Speichern" als Prop. |

---

## Aktualisierungshinweise

Diese Dokumentation sollte aktualisiert werden, wenn:

1. **Neue Seiten** hinzugefügt werden → Abschnitt 2 ergänzen
2. **Neue Komponenten** erstellt werden → Abschnitt 3 ergänzen
3. **Komponenten in anderen Seiten verwendet werden** → Komponentenbaum aktualisieren
4. **Neue Logik-Module** erstellt werden → Abschnitt 4 ergänzen
5. **Neue Fachbegriffe** verwendet werden → Fußnoten ergänzen

---

*Erstellt für das 24h Pflege Projekt – © Samuel Haunschmid*

