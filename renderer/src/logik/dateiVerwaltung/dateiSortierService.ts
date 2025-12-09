import type { PersonTyp, TabellenEinstellungen, StandardOrdnerKontext } from './typen'
import { extrahiereNamen, erstelleNamensVarianten, sanitisiereDateiname } from './platzhalter'
import { StandardTemplateService } from './standardTemplateService'
import { StandardOrdnerService } from './standardOrdnerService'

/**
 * Ergebnis der Dateizuordnung
 */
export type DateiZuordnung = {
  dateiName: string
  dateiPfad: string
  personType: PersonTyp | null
  personName: string | null
  personRow: any | null
  zielOrdner: string[]
  templateName: string | null
  istZugeordnet: boolean
  konflikt: boolean
  neuerDateiName?: string
}

/**
 * Eintrag für fehlende Standarddatei
 */
type FehlendeStandardDatei = {
  dateiName: string
  personType: PersonTyp
  personRow: any
  personName: string
  zielOrdner: string[]
  templateName: string
  hatDateitypPlatzhalter: boolean // True wenn Template {dateityp} enthält
}

/**
 * Service für automatische Dateisortierung
 * Erkennt Dateien anhand ihres Namens und ordnet sie Kunden/Betreuern zu
 */
export class DateiSortierService {

  /**
   * Lädt alle fehlenden Standarddateien für alle Kunden und Betreuer
   */
  static async ladeAlleFehlendenStandardDateien(
    kunden: any[],
    betreuer: any[],
    kundenSettings: TabellenEinstellungen,
    betreuerSettings: TabellenEinstellungen,
    baseDir: string
  ): Promise<Map<string, FehlendeStandardDatei[]>> {
    const dateiMap = new Map<string, FehlendeStandardDatei[]>()
    
    // Prüfe ob baseDir gesetzt ist
    if (!baseDir) {
      console.log('[DateiSortierService] baseDir nicht gesetzt!')
      return dateiMap
    }
    
    console.log('[DateiSortierService] Lade fehlende Dateien für', kunden.length, 'Kunden und', betreuer.length, 'Betreuer')
    console.log('[DateiSortierService] baseDir:', baseDir)
    
    // Lade Templates
    const kundenTemplates = await StandardTemplateService.ladeOrdnerTemplates('kunden')
    const betreuerTemplates = await StandardTemplateService.ladeOrdnerTemplates('betreuer')
    
    console.log('[DateiSortierService] Kunden-Templates:', kundenTemplates.length, 'Regeln')
    console.log('[DateiSortierService] Betreuer-Templates:', betreuerTemplates.length, 'Regeln')

    // Lade fehlende Dateien für alle Kunden
    for (const kunde of kunden) {
      const kontext: StandardOrdnerKontext = {
        baseDir,
        personType: 'kunden',
        row: kunde,
        settings: kundenSettings
      }
      
      const struktur = await StandardOrdnerService.ladeOrdnerFuerPerson(kontext, kundenTemplates)
      if (struktur) {
        const { vorname, nachname } = extrahiereNamen(kunde, kundenSettings)
        const varianten = erstelleNamensVarianten(vorname, nachname)
        const personName = sanitisiereDateiname(varianten[0])
        
        if (struktur.fehlendeDateien && struktur.fehlendeDateien.length > 0) {
          console.log('[DateiSortierService] Kunde', personName, 'hat', struktur.fehlendeDateien.length, 'fehlende Dateien')
        } else {
          console.log('[DateiSortierService] Kunde', personName, 'hat keine fehlenden Dateien (oder Ordner existiert nicht)')
        }

        if (struktur.fehlendeDateien && struktur.fehlendeDateien.length > 0) {
          for (const fehlend of struktur.fehlendeDateien) {
            // Prüfe ob Template {dateityp} enthält
            const hatDateityp = /\{dateityp\}/i.test(fehlend.template)
            
            // Für {dateityp}: Verwende Basisnamen (ohne Erweiterung) als Key
            // Für normale Dateien: Verwende vollständigen Namen
            let dateiNameKey: string
            if (hatDateityp) {
              // Entferne Erweiterung und normalisiere
              const baseName = fehlend.file.replace(/\.[^.]+$/, '').replace(/^\.+|\.+$/g, '').trim()
              dateiNameKey = baseName.toLowerCase().trim()
            } else {
              dateiNameKey = fehlend.file.toLowerCase().trim()
            }
            
            const eintrag: FehlendeStandardDatei = {
              dateiName: fehlend.file.trim(), // Original-Name für Anzeige
              personType: 'kunden',
              personRow: kunde,
              personName,
              zielOrdner: fehlend.folderPath.split(' / ').filter(Boolean),
              templateName: fehlend.template,
              hatDateitypPlatzhalter: hatDateityp
            }

            if (!dateiMap.has(dateiNameKey)) {
              dateiMap.set(dateiNameKey, [])
            }
            dateiMap.get(dateiNameKey)!.push(eintrag)
          }
        }
      }
    }

    // Lade fehlende Dateien für alle Betreuer
    for (const betreuerPerson of betreuer) {
      const kontext: StandardOrdnerKontext = {
        baseDir,
        personType: 'betreuer',
        row: betreuerPerson,
        settings: betreuerSettings
      }
      
      const struktur = await StandardOrdnerService.ladeOrdnerFuerPerson(kontext, betreuerTemplates)
      if (struktur) {
        const { vorname, nachname } = extrahiereNamen(betreuerPerson, betreuerSettings)
        const varianten = erstelleNamensVarianten(vorname, nachname)
        const personName = sanitisiereDateiname(varianten[0])
        
        if (struktur.fehlendeDateien && struktur.fehlendeDateien.length > 0) {
          console.log('[DateiSortierService] Betreuer', personName, 'hat', struktur.fehlendeDateien.length, 'fehlende Dateien')
        } else {
          console.log('[DateiSortierService] Betreuer', personName, 'hat keine fehlenden Dateien (oder Ordner existiert nicht)')
        }

        if (struktur.fehlendeDateien && struktur.fehlendeDateien.length > 0) {
          for (const fehlend of struktur.fehlendeDateien) {
            // Prüfe ob Template {dateityp} enthält
            const hatDateityp = /\{dateityp\}/i.test(fehlend.template)
            
            // Für {dateityp}: Verwende Basisnamen (ohne Erweiterung) als Key
            // Für normale Dateien: Verwende vollständigen Namen
            let dateiNameKey: string
            if (hatDateityp) {
              // Entferne Erweiterung und normalisiere
              const baseName = fehlend.file.replace(/\.[^.]+$/, '').replace(/^\.+|\.+$/g, '').trim()
              dateiNameKey = baseName.toLowerCase().trim()
            } else {
              dateiNameKey = fehlend.file.toLowerCase().trim()
            }
            
            const eintrag: FehlendeStandardDatei = {
              dateiName: fehlend.file.trim(), // Original-Name für Anzeige
              personType: 'betreuer',
              personRow: betreuerPerson,
              personName,
              zielOrdner: fehlend.folderPath.split(' / ').filter(Boolean),
              templateName: fehlend.template,
              hatDateitypPlatzhalter: hatDateityp
            }

            if (!dateiMap.has(dateiNameKey)) {
              dateiMap.set(dateiNameKey, [])
            }
            dateiMap.get(dateiNameKey)!.push(eintrag)
          }
        }
      }
    }

    // Debug: Zeige Anzahl geladener fehlender Dateien
    console.log('[DateiSortierService] Geladene fehlende Dateien:', dateiMap.size, 'eindeutige Dateinamen')
    if (dateiMap.size > 0) {
      console.log('[DateiSortierService] Beispiel-Dateinamen:', Array.from(dateiMap.keys()).slice(0, 5))
    }

    return dateiMap
  }

  /**
   * Findet die passende Person (Kunde/Betreuer) für eine Datei basierend auf fehlenden Standarddateien
   */
  static async findePersonFuerDatei(
    dateiName: string,
    fehlendeDateienMap: Map<string, FehlendeStandardDatei[]>
  ): Promise<{
    personType: PersonTyp | null
    personRow: any | null
    personName: string | null
    zielOrdner: string[]
    templateName: string | null
  }> {
    // Normalisiere Dateiname: lowercase, trim
    const dateiNameKey = dateiName.toLowerCase().trim()
    
    // Suche exakte Übereinstimmung
    const matches = fehlendeDateienMap.get(dateiNameKey)
    
    if (matches && matches.length > 0) {
      // Wenn mehrere Matches gefunden werden, nimm den ersten
      // (könnte später erweitert werden um alle zu berücksichtigen)
      const match = matches[0]
      return {
        personType: match.personType,
        personRow: match.personRow,
        personName: match.personName,
        zielOrdner: match.zielOrdner,
        templateName: match.templateName
      }
    }

    // Wenn kein exaktes Match gefunden wurde, prüfe ob es ein {dateityp} Match sein könnte
    // Entferne Erweiterung und suche nach Basisnamen
    const baseName = dateiName.replace(/\.[^.]+$/, '').trim()
    const baseNameKey = baseName.toLowerCase().trim()
    const baseNameMatches = fehlendeDateienMap.get(baseNameKey)
    
    if (baseNameMatches && baseNameMatches.length > 0) {
      // Prüfe ob einer der Matches ein {dateityp} Template ist
      const dateitypMatch = baseNameMatches.find(m => m.hatDateitypPlatzhalter)
      if (dateitypMatch) {
        return {
          personType: dateitypMatch.personType,
          personRow: dateitypMatch.personRow,
          personName: dateitypMatch.personName,
          zielOrdner: dateitypMatch.zielOrdner,
          templateName: dateitypMatch.templateName
        }
      }
    }

    // Debug: Zeige was gesucht wurde
    console.log('[DateiSortierService] Kein Match gefunden für:', dateiNameKey, '(Basisname:', baseNameKey + ')')
    console.log('[DateiSortierService] Verfügbare Keys:', Array.from(fehlendeDateienMap.keys()).slice(0, 10))

    // Keine Zuordnung gefunden
    return {
      personType: null,
      personRow: null,
      personName: null,
      zielOrdner: [],
      templateName: null
    }
  }

  /**
   * Ordnet mehrere Dateien automatisch zu
   */
  static async ordneDateienZu(
    dateien: { name: string; path: string }[],
    kunden: any[],
    betreuer: any[],
    kundenSettings: TabellenEinstellungen,
    betreuerSettings: TabellenEinstellungen,
    baseDir: string
  ): Promise<DateiZuordnung[]> {
    // Lade alle fehlenden Standarddateien
    const fehlendeDateienMap = await this.ladeAlleFehlendenStandardDateien(
      kunden,
      betreuer,
      kundenSettings,
      betreuerSettings,
      baseDir
    )

    const zuordnungen: DateiZuordnung[] = []

    for (const datei of dateien) {
      const match = await this.findePersonFuerDatei(datei.name, fehlendeDateienMap)

      let konflikt = false
      let neuerDateiName: string | undefined

      // Prüfe ob Datei bereits existiert (Konflikt)
      if (match.personType && match.personName && baseDir) {
        const existsResult = await window.api?.folders?.checkFileExists?.({
          baseDir,
          personType: match.personType,
          personName: match.personName,
          folderPath: match.zielOrdner,
          fileName: datei.name
        })
        if (existsResult?.exists) {
          konflikt = true
          // Berechne neuen Dateinamen
          const ext = datei.name.match(/\.[^.]+$/)?.[0] || ''
          const baseName = datei.name.replace(/\.[^.]+$/, '')
          neuerDateiName = `${baseName}_1${ext}`
        }
      }

      zuordnungen.push({
        dateiName: datei.name,
        dateiPfad: datei.path,
        personType: match.personType,
        personName: match.personName,
        personRow: match.personRow,
        zielOrdner: match.zielOrdner,
        templateName: match.templateName,
        istZugeordnet: !!match.personType,
        konflikt,
        neuerDateiName
      })
    }

    return zuordnungen
  }

  /**
   * Verschiebt eine Datei in den Zielordner
   */
  static async verschiebeDatei(
    zuordnung: DateiZuordnung,
    baseDir: string
  ): Promise<{
    ok: boolean
    message?: string
    renamed?: boolean
    finalFileName?: string
  }> {
    if (!zuordnung.istZugeordnet || !zuordnung.personType || !zuordnung.personName) {
      return { ok: false, message: 'Datei nicht zugeordnet' }
    }

    const result = await window.api?.folders?.moveFileFromPath?.({
      sourcePath: zuordnung.dateiPfad,
      baseDir,
      personType: zuordnung.personType,
      personName: zuordnung.personName,
      folderPath: zuordnung.zielOrdner,
      targetFileName: zuordnung.dateiName
    })

    if (!result?.ok) {
      return { ok: false, message: result?.message || 'Fehler beim Verschieben' }
    }

    return {
      ok: true,
      renamed: result.renamed,
      finalFileName: result.finalFileName
    }
  }

  /**
   * Verschiebt mehrere Dateien
   */
  static async verschiebeDateien(
    zuordnungen: DateiZuordnung[],
    baseDir: string,
    onProgress?: (current: number, total: number, datei: string) => void
  ): Promise<{
    erfolgreich: number
    fehlgeschlagen: number
    umbenannt: number
    details: Array<{
      dateiName: string
      ok: boolean
      message?: string
      renamed?: boolean
      finalFileName?: string
    }>
  }> {
    const nurZugeordnete = zuordnungen.filter(z => z.istZugeordnet)
    const details: Array<{
      dateiName: string
      ok: boolean
      message?: string
      renamed?: boolean
      finalFileName?: string
    }> = []
    let erfolgreich = 0
    let fehlgeschlagen = 0
    let umbenannt = 0

    for (let i = 0; i < nurZugeordnete.length; i++) {
      const zuordnung = nurZugeordnete[i]
      onProgress?.(i + 1, nurZugeordnete.length, zuordnung.dateiName)

      const result = await this.verschiebeDatei(zuordnung, baseDir)
      details.push({
        dateiName: zuordnung.dateiName,
        ...result
      })

      if (result.ok) {
        erfolgreich++
        if (result.renamed) {
          umbenannt++
        }
      } else {
        fehlgeschlagen++
      }
    }

    return { erfolgreich, fehlgeschlagen, umbenannt, details }
  }
}
