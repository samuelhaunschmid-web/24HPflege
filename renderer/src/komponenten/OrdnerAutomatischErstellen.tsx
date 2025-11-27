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
    // Config laden
    const cfg = await window.api?.getConfig?.()
    if (!cfg) return false

    const baseDir = cfg.dokumenteDir || ''
    if (!baseDir) {
      // Kein Fehler, wenn kein Dokumente-Ordner gesetzt ist
      return true
    }

    // Namen aus den Daten extrahieren (basierend auf Gruppen)
    const keys = Object.keys(personData)
    const vorKey = keys.find(k => (gruppen[k] || []).includes('vorname'))
    const nachKey = keys.find(k => (gruppen[k] || []).includes('nachname'))
    
    const vor = String(vorKey ? personData[vorKey] || '' : '').trim()
    const nach = String(nachKey ? personData[nachKey] || '' : '').trim()
    const name = `${nach} ${vor}`.trim()
    
    if (!name) {
      // Kein Name gefunden, aber kein Fehler
      return true
    }

    // Ordner-Templates aus Config laden
    const paths = (cfg.folderTemplatesPaths && (personType === 'kunden' ? cfg.folderTemplatesPaths.kunden : cfg.folderTemplatesPaths.betreuer)) || []
    const legacy = (cfg.folderTemplates && (personType === 'kunden' ? cfg.folderTemplates.kunden : cfg.folderTemplates.betreuer)) || []
    
    // Pfade normalisieren
    const subfolders: (string | string[])[] = []
    
    if (Array.isArray(paths) && paths.length > 0) {
      // Neue Struktur verwenden
      subfolders.push(...paths)
    } else if (Array.isArray(legacy) && legacy.length > 0) {
      // Legacy-Struktur (nur Top-Level)
      subfolders.push(...legacy)
    }

    // Ordner erstellen
    const res = await window.api?.folders?.ensureStructure?.({
      baseDir,
      personType,
      names: [name],
      subfolders
    })

    if (!res?.ok) {
      // Fehler beim Erstellen, aber nicht blockieren
      console.warn('Fehler beim automatischen Erstellen der Ordner:', res?.message)
      return false
    }

    return true
  } catch (error) {
    console.warn('Fehler beim automatischen Erstellen der Ordner:', error)
    return false
  }
}

