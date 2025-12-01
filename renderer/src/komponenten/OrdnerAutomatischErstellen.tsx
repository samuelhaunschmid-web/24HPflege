import { StandardOrdnerService } from '../logik/dateiVerwaltung/standardOrdnerService'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'

/**
 * Hilfsfunktion zum automatischen Erstellen von Ordnern für eine neu angelegte Person
 */

type PersonData = Record<string, any>
type GruppenConfig = Record<string, string[]>

/**
 * Erstellt automatisch die Ordner-Struktur für eine neu angelegte Person
 * @param personData - Die Daten der neu angelegten Person
 * @param personType - 'kunden' oder 'betreuer'
 * @param gruppen - Die Gruppen-Konfiguration für die Tabelleneinstellungen
 * @returns Promise<boolean> - true wenn erfolgreich, false bei Fehler
 */
export async function ordnerAutomatischErstellen(
  personData: PersonData,
  personType: 'kunden' | 'betreuer',
  gruppen: GruppenConfig
): Promise<boolean> {
  try {
    // Basis-Ordner prüfen
    const baseDir = await StandardTemplateService.ladeBasisOrdner()
    if (!baseDir) {
      // Kein Fehler, wenn kein Dokumente-Ordner gesetzt ist
      return true
    }

    // Namen ermitteln
    const { anzeigeName } = StandardOrdnerService.ermittlePersonNamen(personData, personType, { gruppen })
    if (!anzeigeName) {
      // Kein Name gefunden, aber kein Fehler
      return true
    }

    // Ordner-Templates laden
    const templateRegeln = await StandardTemplateService.ladeOrdnerTemplates(personType)
    const templatePfade = StandardTemplateService.baumZuPfade(
      StandardTemplateService.pfadeZuBaum(
        templateRegeln.map(r => r.path),
        templateRegeln
      )
    )

    // Ordner erstellen
    const res = await StandardOrdnerService.erstelleStandardStruktur(
      baseDir,
      personType,
      [personData],
      { gruppen },
      templatePfade
    )

    if (!res.ok) {
      // Fehler beim Erstellen, aber nicht blockieren
      console.warn('Fehler beim automatischen Erstellen der Ordner:', res.message)
      return false
    }

    return true
  } catch (error) {
    console.warn('Fehler beim automatischen Erstellen der Ordner:', error)
    return false
  }
}

