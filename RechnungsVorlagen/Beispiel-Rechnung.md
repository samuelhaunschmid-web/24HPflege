# Beispiel-Rechnungsvorlage

Dies ist ein Beispiel für eine .docx-Rechnungsvorlage. Erstellen Sie eine Word-Datei (.docx) mit folgendem Inhalt:

## Platzhalter für die Rechnungsvorlage:

### Standard-Kundenplatzhalter:
- `[[kfvname]]` - Vorname des Kunden
- `[[kfname]]` - Nachname des Kunden
- `[[kfstrasse]]` - Straße des Kunden
- `[[kfplz]]` - PLZ des Kunden
- `[[kfort]]` - Ort des Kunden

### Standard-Betreuerplatzhalter:
- `[[Vor. Nam]]` - Vorname des Betreuers
- `[[Fam. Nam]]` - Nachname des Betreuers

### **NEUE RECHNUNGSPLATZHALTER:**

#### Rechnungsnummer:
- `[[Rechnungsnummer]]` - **Automatisch inkrementierende Rechnungsnummer**

#### Verrechnungszeitraum:
- `[[Verrechnungsmonat]]` - **Name des Verrechnungsmonats (z.B. "Mai")**
- `[[Verrechnungsjahr]]` - **Verrechnungsjahr (z.B. 2025)**
- `[[Verrechnungszeitraum]]` - **Kompletter Zeitraum (z.B. "01.05.2025-31.05.2025")**
- `[[Monatstage]]` - **Anzahl der Tage im Monat (z.B. 31)**
- `[[Gesamtsumme]]` - **Berechnete Gesamtsumme (Tagessatz × Monatstage)**

## Beispiel-Inhalt für eine Rechnung:

```
24-Stunden-Pflege GmbH
Musterstraße 123
12345 Musterstadt

Rechnung Nr. [[Rechnungsnummer]]
Datum: [[Datum]]

An:
[[kfvname]] [[kfname]]
[[kfstrasse]]
[[kfplz]] [[kfort]]

Betreuer: [[Vor. Nam]] [[Fam. Nam]]

Verrechnungszeitraum: [[Verrechnungszeitraum]]
Monatstage: [[Monatstage]] Tage
Tagessatz: [[Money]] EUR
Gesamtsumme: [[Gesamtsumme]] EUR

Vielen Dank für Ihr Vertrauen!
```

## Wichtige Hinweise:

1. **Rechnungsnummer-Platzhalter**: Verwenden Sie `[[Rechnungsnummer]]` in Ihrer Vorlage
2. **Automatische Inkrementierung**: Die Rechnungsnummer wird automatisch um 1 erhöht
3. **Mehrere Rechnungen**: Bei mehreren Rechnungen wird jede eine andere Nummer erhalten
4. **Speicherung**: Die aktuelle Rechnungsnummer wird automatisch gespeichert

## Verrechnungszeitraum-Funktionen:

1. **Automatische Monatsberechnung**: Der Verrechnungszeitraum wird automatisch vom 1. bis zum letzten Tag des Monats berechnet
2. **Schaltjahre**: Februar wird automatisch korrekt berechnet (28/29 Tage)
3. **Monatstage**: Die Anzahl der Tage wird automatisch ermittelt
4. **Gesamtsumme**: Wird automatisch berechnet (Tagessatz × Monatstage)
5. **Money-Spalte**: Die "Money"-Spalte aus der Excel-Tabelle wird als Tagessatz verwendet

## Dateiname-Platzhalter:

Sie können auch Platzhalter im Dateinamen verwenden:
- `Rechnung_[[Rechnungsnummer]]_[[kfvname]]_[[kfname]].docx`

Dies würde zu Dateinamen wie "Rechnung_1001_Max_Mustermann.docx" führen. 