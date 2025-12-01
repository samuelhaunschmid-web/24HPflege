import type {
  PersonTyp,
  PersonNamenResult,
  StandardOrdnerKontext,
  OrdnerStrukturMitFehlenden,
  GefundeneDatei,
  VerschiebungKontext,
  ListForPersonsResponse,
  GetFilePathResponse,
  EnsureStructureResponse,
  MoveFileResponse,
  OrdnerTemplateRegel
} from './typen'
import { ersetzePlatzhalter, extrahiereNamen, erstelleNamensVarianten, sanitisiereDateiname } from './platzhalter'

/**
 * Zentraler Service für alle Ordner- und Datei-Operationen
 * Kapselt alle window.api.folders.* Aufrufe
 */
export class StandardOrdnerService {

  /**
   * Ermittelt Anzeigenamen und Namensvarianten für eine Person
   * Anzeigename und primäre Ordner-Variante: Nachname Vorname
   */
  static ermittlePersonNamen(row: any, _personType: PersonTyp, tableSettings: any): PersonNamenResult {
    const { vorname, nachname } = extrahiereNamen(row, tableSettings)
    const varianten = erstelleNamensVarianten(vorname, nachname).map(sanitisiereDateiname)

    return {
      anzeigeName: `${nachname} ${vorname}`.trim(), // Anzeige: Nachname Vorname
      varianten // Primäre Variante ist bereits Nachname Vorname
    }
  }

  /**
   * Lädt Ordnerstruktur für eine oder mehrere Personen
   */
  static async ladeOrdnerFuerPersonen(
    baseDir: string,
    personType: PersonTyp,
    namen: string[]
  ): Promise<OrdnerStrukturMitFehlenden[]> {
    if (!baseDir || !namen.length) return []

    const res: ListForPersonsResponse | undefined = await window.api?.folders?.listForPersons?.({
      baseDir,
      personType,
      names: namen
    })

    return res?.ok ? (res.result || []) : []
  }

  /**
   * Lädt Ordnerstruktur für eine einzelne Person mit Berechnung fehlender Dateien
   */
  static async ladeOrdnerFuerPerson(
    kontext: StandardOrdnerKontext,
    templateRegeln: OrdnerTemplateRegel[]
  ): Promise<OrdnerStrukturMitFehlenden | null> {
    const { baseDir, personType, row, settings } = kontext
    if (!baseDir) return null

    const { varianten } = this.ermittlePersonNamen(row, personType, settings)
    const ordnerListe = await this.ladeOrdnerFuerPersonen(baseDir, personType, varianten)

    // Finde passenden Ordner-Eintrag
    const personEintrag = ordnerListe.find(e => varianten.includes(e.name)) || null
    if (!personEintrag) return null

    // Berechne fehlende Standarddateien
    const fehlendeDateien = this.berechneFehlendeDateien(personEintrag, templateRegeln, kontext)

    return {
      ...personEintrag,
      fehlendeDateien
    }
  }

  /**
   * Erstellt Standardordner-Struktur für Personen
   */
  static async erstelleStandardStruktur(
    baseDir: string,
    personType: PersonTyp,
    personen: any[],
    tableSettings: any,
    templates: (string | string[])[]
  ): Promise<EnsureStructureResponse> {
    if (!baseDir) {
      return { ok: false, message: 'Kein Basis-Ordner gesetzt' }
    }

    // Namen für alle Personen ermitteln
    const namen: string[] = []
    for (const person of personen) {
      const { varianten } = this.ermittlePersonNamen(person, personType, tableSettings)
      namen.push(...varianten)
    }

    const uniqueNamen = [...new Set(namen)]
    if (!uniqueNamen.length) {
      return { ok: false, message: 'Keine gültigen Namen gefunden' }
    }

    const res: EnsureStructureResponse | undefined = await window.api?.folders?.ensureStructure?.({
      baseDir,
      personType,
      names: uniqueNamen,
      subfolders: templates
    })

    return res || { ok: false, message: 'Unbekannter Fehler' }
  }

  /**
   * Findet eine Standarddatei mit Platzhalter-Ersetzung und Namensvarianten
   * Unterstützt auch {betreuerkunde} Platzhalter für intelligente Betreuer-Suche
   * Unterstützt {dateityp} Platzhalter für Wildcard-Suche (beliebige Dateierweiterung)
   */
  static async findeStandardDatei(
    kontext: StandardOrdnerKontext,
    folderPath: string[],
    dateiTemplate: string,
    betreuerRow?: any // Optional: Ausgewählter Betreuer für {betreuerkunde}
  ): Promise<GefundeneDatei> {
    const { baseDir, personType, row, settings } = kontext
    if (!baseDir) return { exists: false, path: null }

    // Prüfe, ob Template {betreuerkunde} enthält
    const hatBetreuerkunde = /\{betreuerkunde\}/i.test(dateiTemplate)
    
    // Prüfe, ob Template {dateityp} enthält (für Wildcard-Suche)
    const hatDateityp = /\{dateityp\}/i.test(dateiTemplate)

    if (hatBetreuerkunde && personType === 'kunden') {
      // Spezielle Behandlung für {betreuerkunde} bei Kunden
      return await this.findeStandardDateiMitBetreuerkunde(kontext, folderPath, dateiTemplate, betreuerRow)
    }

    if (hatDateityp) {
      // Spezielle Behandlung für {dateityp} - Wildcard-Suche
      return await this.findeStandardDateiMitDateityp(kontext, folderPath, dateiTemplate, betreuerRow)
    }

    const { varianten } = this.ermittlePersonNamen(row, personType, settings)
    const platzhalterKontext = { personType, row, settings, betreuerRow }
    const expectedName = ersetzePlatzhalter(dateiTemplate, platzhalterKontext)

    // Versuche alle Namensvarianten
    for (const nameVariant of varianten) {
      const res: GetFilePathResponse | undefined = await window.api?.folders?.getFilePath?.({
        baseDir,
        personType,
        personName: nameVariant,
        folderPath,
        fileName: expectedName
      })

      if (res?.exists && res.path) {
        return { exists: true, path: res.path }
      }
    }

    return { exists: false, path: null }
  }

  /**
   * Findet Standarddateien mit {dateityp} Platzhalter (Wildcard-Suche)
   * Sucht nach Dateien mit dem Basisnamen, unabhängig von der Dateierweiterung
   */
  private static async findeStandardDateiMitDateityp(
    kontext: StandardOrdnerKontext,
    folderPath: string[],
    dateiTemplate: string,
    betreuerRow?: any
  ): Promise<GefundeneDatei> {
    const { baseDir, personType, row, settings } = kontext
    if (!baseDir) return { exists: false, path: null }

    const { varianten } = this.ermittlePersonNamen(row, personType, settings)
    const platzhalterKontext = { personType, row, settings, betreuerRow }
    
    // Ersetze alle Platzhalter (inkl. {dateityp} wird zu leerem String)
    let basisName = ersetzePlatzhalter(dateiTemplate, platzhalterKontext)
    
    // Entferne führende/abschließende Punkte und Leerzeichen
    basisName = basisName.replace(/^\.+|\.+$/g, '').trim()
    
    if (!basisName) return { exists: false, path: null }

    // Versuche alle Namensvarianten
    for (const nameVariant of varianten) {
      const res: GetFilePathResponse | undefined = await window.api?.folders?.findFileByBaseName?.({
        baseDir,
        personType,
        personName: nameVariant,
        folderPath,
        baseFileName: basisName
      })

      if (res?.exists && res.path) {
        return { exists: true, path: res.path }
      }
    }

    return { exists: false, path: null }
  }

  /**
   * Findet Standarddateien mit {betreuerkunde} Platzhalter
   * Sucht für jeden vorhandenen Betreuer (1 oder 2) eine Datei
   */
  private static async findeStandardDateiMitBetreuerkunde(
    kontext: StandardOrdnerKontext,
    folderPath: string[],
    dateiTemplate: string,
    betreuerRow?: any
  ): Promise<GefundeneDatei> {
    const { baseDir, personType, row, settings, betreuerSettings } = kontext
    if (personType !== 'kunden') return { exists: false, path: null }

    // Wenn ein spezifischer Betreuer ausgewählt wurde (z.B. bei Mail-Versand)
    if (betreuerRow) {
      // Verwende Betreuer-Settings, wenn vorhanden, sonst Kunden-Settings
      // Die Betreuer-Settings werden benötigt, um den Nachnamen aus betreuerRow korrekt zu extrahieren
      const platzhalterKontext = { 
        personType, 
        row, 
        settings, // Kunden-Settings für Hauptkontext
        betreuerRow,
        ...(betreuerSettings ? { betreuerSettings } : {}) // Betreuer-Settings für {betreuerkunde}
      }
      const expectedName = ersetzePlatzhalter(dateiTemplate, platzhalterKontext)
      const { varianten } = this.ermittlePersonNamen(row, personType, settings)

      for (const nameVariant of varianten) {
        const res: GetFilePathResponse | undefined = await window.api?.folders?.getFilePath?.({
          baseDir,
          personType,
          personName: nameVariant,
          folderPath,
          fileName: expectedName
        })

        if (res?.exists && res.path) {
          return { exists: true, path: res.path }
        }
      }
      return { exists: false, path: null }
    }

    // Sonst: Suche für jeden vorhandenen Betreuer (1 oder 2)
    const b1Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer1'))
    const b2Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer2'))

    const b1Full = b1Key ? String(row?.[b1Key] || '').trim() : ''
    const b2Full = b2Key ? String(row?.[b2Key] || '').trim() : ''

    const getNachname = (full: string) => {
      const parts = full.split(/\s+/).filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : ''
    }

    const nb1 = getNachname(b1Full)
    const nb2 = getNachname(b2Full)

    const { varianten } = this.ermittlePersonNamen(row, personType, settings)

    // Suche für Betreuer 1, falls vorhanden
    if (nb1) {
      // Erstelle temporären Betreuer-Row für Platzhalter-Ersetzung
      const tempBetreuerRow = { [Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) || '']: nb1 }
      const platzhalterKontext = { personType, row, settings, betreuerRow: tempBetreuerRow }
      const expectedName = ersetzePlatzhalter(dateiTemplate, platzhalterKontext)

      for (const nameVariant of varianten) {
        const res: GetFilePathResponse | undefined = await window.api?.folders?.getFilePath?.({
          baseDir,
          personType,
          personName: nameVariant,
          folderPath,
          fileName: expectedName
        })

        if (res?.exists && res.path) {
          return { exists: true, path: res.path }
        }
      }
    }

    // Suche für Betreuer 2, falls vorhanden
    if (nb2) {
      const tempBetreuerRow = { [Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) || '']: nb2 }
      const platzhalterKontext = { personType, row, settings, betreuerRow: tempBetreuerRow }
      const expectedName = ersetzePlatzhalter(dateiTemplate, platzhalterKontext)

      for (const nameVariant of varianten) {
        const res: GetFilePathResponse | undefined = await window.api?.folders?.getFilePath?.({
          baseDir,
          personType,
          personName: nameVariant,
          folderPath,
          fileName: expectedName
        })

        if (res?.exists && res.path) {
          return { exists: true, path: res.path }
        }
      }
    }

    return { exists: false, path: null }
  }

  /**
   * Verschiebt Dateien nach einem Schema (z.B. bei Betreuerwechsel)
   */
  static async verschiebeDateienNachSchema(kontext: VerschiebungKontext): Promise<boolean> {
    const { baseDir, schema, kunde, alterBetreuer, neuerBetreuer, position } = kontext

    if (!schema.actions?.length) return true

    const errors: string[] = []

    for (const action of schema.actions) {
      const fileNames = action.fileName
      if (!fileNames?.length) continue

      // Bestimme Source-Row basierend auf sourceContext
      let sourceRow: any
      let sourcePersonType: PersonTyp
      let sourceBetreuerRow: any | undefined // Für {betreuerkunde} Platzhalter

      switch (action.sourceContext) {
        case 'kunde':
          sourceRow = kunde
          sourcePersonType = 'kunden'
          // Für {betreuerkunde}: Verwende alterBetreuer, wenn position vorhanden ist
          if (position && alterBetreuer) {
            sourceBetreuerRow = alterBetreuer
          }
          break
        case 'alterBetreuer':
          sourceRow = alterBetreuer
          sourcePersonType = 'betreuer'
          break
        case 'neuerBetreuer':
          sourceRow = neuerBetreuer
          sourcePersonType = 'betreuer'
          break
        default:
          continue
      }

      // Bestimme Target-Row basierend auf targetContext
      let targetRow: any
      let targetPersonType: PersonTyp
      let targetBetreuerRow: any | undefined // Für {betreuerkunde} Platzhalter

      switch (action.targetContext) {
        case 'kunde':
          targetRow = kunde
          targetPersonType = 'kunden'
          // Für {betreuerkunde}: Verwende neuerBetreuer, wenn position vorhanden ist
          if (position && neuerBetreuer) {
            targetBetreuerRow = neuerBetreuer
          }
          break
        case 'alterBetreuer':
          targetRow = alterBetreuer
          targetPersonType = 'betreuer'
          break
        case 'neuerBetreuer':
          targetRow = neuerBetreuer
          targetPersonType = 'betreuer'
          break
        default:
          continue
      }

      if (!sourceRow || !targetRow) continue

      // Hole Table-Settings (vereinfacht - in Realität aus Config laden)
      const sourceSettings = await this.getTableSettings(sourcePersonType)
      const targetSettings = await this.getTableSettings(targetPersonType)

      for (const fileName of fileNames) {
        const sourceKontext = { baseDir, personType: sourcePersonType, row: sourceRow, settings: sourceSettings }

        // Übergebe betreuerRow für {betreuerkunde} Platzhalter
        const sourceFile = await this.findeStandardDatei(sourceKontext, action.fromPath, fileName, sourceBetreuerRow)
        if (!sourceFile.exists || !sourceFile.path) {
          errors.push(`Quelle nicht gefunden: ${fileName}`)
          continue
        }

        // Für targetFileName: Verwende betreuerRow für {betreuerkunde}
        const targetPlatzhalterKontext = { personType: targetPersonType, row: targetRow, settings: targetSettings, betreuerRow: targetBetreuerRow }
        const targetFileName = ersetzePlatzhalter(fileName, targetPlatzhalterKontext)

        const res: MoveFileResponse | undefined = await window.api?.folders?.moveFile?.({
          baseDir,
          fromPersonType: sourcePersonType,
          fromPersonName: sourceFile.path!.split(/[/\\]/).slice(-2)[0], // Person-Ordner aus Pfad extrahieren
          fromPath: action.fromPath,
          fileName: fileName,
          toPersonType: targetPersonType,
          toPersonName: targetFileName.split(/[/\\]/).slice(-2)[0], // Person-Ordner aus Pfad extrahieren
          toPath: action.toPath
        })

        if (!res?.ok) {
          errors.push(`Verschiebung fehlgeschlagen: ${fileName} - ${res?.message || 'Unbekannt'}`)
        }
      }
    }

    if (errors.length > 0) {
      console.error('Datei-Verschiebungsfehler:', errors)
      return false
    }

    return true
  }

  /**
   * Berechnet fehlende Standarddateien für einen Ordner-Eintrag
   * Unterstützt {betreuerkunde} Platzhalter: Erstellt für jeden vorhandenen Betreuer eine separate Erwartung
   */
  private static berechneFehlendeDateien(
    eintrag: any,
    templateRegeln: OrdnerTemplateRegel[],
    kontext: StandardOrdnerKontext
  ): any[] {
    if (!eintrag?.exists || !templateRegeln?.length) return []

    const fehlende: any[] = []

    for (const regel of templateRegeln) {
      const folderName = regel.path[regel.path.length - 1]
      const sf = eintrag.subfolders?.find((s: any) => s.name === folderName)

      if (!sf) {
        // Ganzer Ordner fehlt - alle Dateien als fehlend markieren
        // Für {betreuerkunde}: Erstelle für jeden Betreuer eine Erwartung
        for (const fileTemplate of regel.files) {
          if (/\{betreuerkunde\}/i.test(fileTemplate) && kontext.personType === 'kunden') {
            // Erstelle Erwartungen für jeden vorhandenen Betreuer
            const betreuerErwartungen = this.erstelleBetreuerkundeErwartungen(fileTemplate, kontext)
            fehlende.push(...betreuerErwartungen.map(erwartung => ({
              file: erwartung,
              folderPath: regel.path.join(' / '),
              template: fileTemplate
            })))
          } else {
            // Für {dateityp}: Ersetze Platzhalter, aber behalte {dateityp} für Anzeige
            const expectedName = ersetzePlatzhalter(fileTemplate, { personType: kontext.personType, row: kontext.row, settings: kontext.settings })
            fehlende.push({
              file: expectedName,
              folderPath: regel.path.join(' / '),
              template: fileTemplate
            })
          }
        }
        continue
      }

      const existingFiles = new Set<string>(sf.files || [])
      for (const fileTemplate of regel.files) {
        // Prüfe, ob Template {betreuerkunde} enthält
        if (/\{betreuerkunde\}/i.test(fileTemplate) && kontext.personType === 'kunden') {
          // Erstelle Erwartungen für jeden vorhandenen Betreuer
          const betreuerErwartungen = this.erstelleBetreuerkundeErwartungen(fileTemplate, kontext)
          for (const erwartung of betreuerErwartungen) {
            if (!existingFiles.has(erwartung)) {
              fehlende.push({
                file: erwartung,
                folderPath: regel.path.join(' / '),
                template: fileTemplate
              })
            }
          }
        } else if (/\{dateityp\}/i.test(fileTemplate)) {
          // Für {dateityp}: Prüfe, ob eine Datei mit dem Basisnamen existiert (unabhängig von Erweiterung)
          const expectedName = ersetzePlatzhalter(fileTemplate, {
            personType: kontext.personType,
            row: kontext.row,
            settings: kontext.settings
          })
          // Entferne führende/abschließende Punkte
          const baseName = expectedName.replace(/^\.+|\.+$/g, '').trim()
          
          // Prüfe, ob eine Datei mit diesem Basisnamen existiert
          const found = Array.from(existingFiles).some((file) => {
            const fileBaseName = String(file).replace(/\.[^.]+$/, '') // Entferne Erweiterung
            return fileBaseName === baseName
          })
          
          if (!found) {
            fehlende.push({
              file: expectedName, // Zeige Template-Name in Anzeige
              folderPath: regel.path.join(' / '),
              template: fileTemplate
            })
          }
        } else {
          // Normale Platzhalter-Ersetzung
          const expectedName = ersetzePlatzhalter(fileTemplate, {
            personType: kontext.personType,
            row: kontext.row,
            settings: kontext.settings
          })

          if (!existingFiles.has(expectedName)) {
            fehlende.push({
              file: expectedName,
              folderPath: regel.path.join(' / '),
              template: fileTemplate
            })
          }
        }
      }
    }

    return fehlende
  }

  /**
   * Erstellt Erwartungen für {betreuerkunde} Platzhalter
   * Gibt für jeden vorhandenen Betreuer (1 oder 2) eine erwartete Datei zurück
   */
  private static erstelleBetreuerkundeErwartungen(
    fileTemplate: string,
    kontext: StandardOrdnerKontext
  ): string[] {
    const { row, settings } = kontext
    const erwartungen: string[] = []

    // Extrahiere Betreuer 1 und 2
    const b1Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer1'))
    const b2Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer2'))

    const b1Full = b1Key ? String(row?.[b1Key] || '').trim() : ''
    const b2Full = b2Key ? String(row?.[b2Key] || '').trim() : ''

    const getNachname = (full: string) => {
      const parts = full.split(/\s+/).filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : ''
    }

    const nb1 = getNachname(b1Full)
    const nb2 = getNachname(b2Full)

    // Erstelle Erwartung für Betreuer 1, falls vorhanden
    if (nb1) {
      const tempBetreuerRow = { [Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) || '']: nb1 }
      const platzhalterKontext = { personType: kontext.personType, row: kontext.row, settings: kontext.settings, betreuerRow: tempBetreuerRow }
      const erwartung = ersetzePlatzhalter(fileTemplate, platzhalterKontext)
      erwartungen.push(erwartung)
    }

    // Erstelle Erwartung für Betreuer 2, falls vorhanden
    if (nb2) {
      const tempBetreuerRow = { [Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) || '']: nb2 }
      const platzhalterKontext = { personType: kontext.personType, row: kontext.row, settings: kontext.settings, betreuerRow: tempBetreuerRow }
      const erwartung = ersetzePlatzhalter(fileTemplate, platzhalterKontext)
      erwartungen.push(erwartung)
    }

    return erwartungen
  }

  /**
   * Hilfsmethode: Lädt Table-Settings für einen Personentyp
   * (Vereinfacht - in Realität aus Config-Service)
   */
  private static async getTableSettings(personType: PersonTyp): Promise<any> {
    const cfg = await window.api?.getConfig?.()
    const tableId = personType === 'kunden' ? 'kunden' : 'betreuer'
    return (cfg?.tableSettings && cfg.tableSettings[tableId]) || { gruppen: {} }
  }

  /**
   * Berechnet Gesamtanzahl fehlender Dateien für einen Ordner-Eintrag
   */
  static berechneFehlendeAnzahl(eintrag: OrdnerStrukturMitFehlenden): number {
    return eintrag.fehlendeDateien?.length || 0
  }
}
