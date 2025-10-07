# Rechnungsvorlagen - Platzhalter Dokumentation

Diese Dokumentation beschreibt alle verfügbaren Platzhalter, die in Rechnungsvorlagen verwendet werden können.

## Verwendung der Platzhalter

Alle Platzhalter werden mit doppelten eckigen Klammern umschlossen: `[[PlatzhalterName]]`

## Verfügbare Platzhalter

### Kundendaten
Alle Felder aus der Kundendaten-Excel-Datei stehen als Platzhalter zur Verfügung:
- `[[kfname]]` - Kunden Vorname
- `[[kvname]]` - Kunden Nachname
- `[[kadresse]]` - Kunden Adresse
- `[[kplz]]` - Kunden Postleitzahl
- `[[kort]]` - Kunden Ort
- `[[Money]]` - Tagespreis (für Berechnungen)

### Rechnungsdaten
- `[[Rechnungsnummer]]` - Aktuelle Rechnungsnummer (automatisch hochgezählt)
- `[[Verrechnungsmonat]]` - Monat (1-12)
- `[[Verrechnungsjahr]]` - Jahr (z.B. 2024)
- `[[Verrechnungszeitraum]]` - Zeitraum als String (z.B. "01.01.2024-31.01.2024")
- `[[Monatstage]]` - Anzahl der Tage im Verrechnungszeitraum
- `[[Monatende]]` - Letzter Werktag des Monats (z.B. "31.01.2024")

### Berechnungen
- `[[Gesamtsumme]]` - Gesamtsumme (Tagespreis × Anzahl Tage)
- `[[Vorsteuer]]` - Vorsteuer (Gesamtsumme / 1.2)
- `[[Steuer]]` - Steuer (Vorsteuer × 0.2)

## Beispiel einer Rechnungsvorlage

```
Rechnung Nr. [[Rechnungsnummer]]

An: [[kfname]] [[kvname]]
    [[kadresse]]
    [[kplz]] [[kort]]

Zeitraum: [[Verrechnungszeitraum]]
Anzahl Tage: [[Monatstage]]

Gesamtsumme: [[Gesamtsumme]] €
Vorsteuer: [[Vorsteuer]] €
Steuer: [[Steuer]] €
```

## Hinweise

- Alle Platzhalter werden automatisch durch die entsprechenden Werte ersetzt
- Fehlende Platzhalter werden rot markiert
- Die Rechnungsnummer wird automatisch hochgezählt
- Berechnungen erfolgen automatisch basierend auf dem Tagespreis und der Anzahl der Tage

