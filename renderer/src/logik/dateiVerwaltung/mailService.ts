import type { MailBatchKontext, BatchMail, DateiAnhang, SendBatchResponse, StandardOrdnerKontext } from './typen'
import { StandardOrdnerService } from './standardOrdnerService'
import { ersetzePlatzhalter } from './platzhalter'

/**
 * Service für E-Mail-Operationen mit Datei-Anhängen
 */
export class MailService {

  /**
   * Baut einen E-Mail-Batch aus Templates, Personenauswahlen und Datei-Anhängen
   */
  static async baueMailBatch(kontext: MailBatchKontext): Promise<BatchMail[]> {
    const { baseDir, templates, selections, kunden, betreuer, tableSettings } = kontext

    if (!baseDir) {
      throw new Error('Kein Basis-Ordner gesetzt')
    }

    const batch: BatchMail[] = []

    // Für jedes ausgewählte Template
    for (const [templateId, selection] of Object.entries(selections)) {
      if (!selection.selected) continue

      const template = templates.find(t => t.id === templateId)
      if (!template) continue

      // Prüfe, ob Template Dateien für Kunden/Betreuer benötigt
      const needsKundenFiles = template.selectedFiles.some(f => f.personType === 'kunden')
      const needsBetreuerFiles = template.selectedFiles.some(f => f.personType === 'betreuer')

      // Prüfe Platzhalter in E-Mail-Feldern und Dateinamen
      const textContent = `${template.to} ${template.subject} ${template.text}`.toLowerCase()
      const fileTemplatesContent = template.selectedFiles.map(f => f.fileTemplate).join(' ').toLowerCase()
      const allContent = `${textContent} ${fileTemplatesContent}`
      const hasKundenPlaceholders = /\{(?:vorname|nachname|kvname|kfname|nb1|nb2)\}/i.test(textContent)
      const hasBetreuerPlaceholders = /\{(?:vorname|nachname|bvname|bfname|nk1|svnr)\}/i.test(textContent)
      const hasBetreuerkunde = /\{betreuerkunde\}/i.test(allContent)

      const needsKunden = needsKundenFiles || hasKundenPlaceholders || hasBetreuerkunde
      const needsBetreuer = needsBetreuerFiles || hasBetreuerPlaceholders || hasBetreuerkunde

      if (needsKunden && needsBetreuer) {
        // Kombinierte E-Mails: Für jede Kunden-Betreuer-Kombination
        await this.baueKombinierteMails(template, selection, kunden, betreuer, tableSettings, baseDir, batch)
      } else {
        // Einzelne E-Mails: Nur Kunden oder nur Betreuer
        // Übergebe selection und betreuer für {betreuerkunde} Unterstützung
        if (needsKunden && selection.kundenKeys.length) {
          await this.baueEinzelMails(template, 'kunden', selection.kundenKeys, kunden, tableSettings, baseDir, batch, selection, betreuer)
        }
        if (needsBetreuer && selection.betreuerKeys.length) {
          await this.baueEinzelMails(template, 'betreuer', selection.betreuerKeys, betreuer, tableSettings, baseDir, batch, selection, betreuer)
        }
      }
    }

    return batch
  }

  /**
   * Sendet einen vorbereiteten E-Mail-Batch
   */
  static async sendeBatch(batch: BatchMail[]): Promise<SendBatchResponse> {
    if (!batch.length) {
      return { ok: false, message: 'Keine E-Mails zum Versenden' }
    }

    const res = await window.api?.mail?.sendBatch?.(batch)
    return (res as SendBatchResponse) || { ok: false, message: 'Unbekannter Fehler beim Versenden' }
  }

  /**
   * Erstellt kombinierte E-Mails (Kunde + Betreuer)
   */
  private static async baueKombinierteMails(
    template: any,
    selection: any,
    kunden: any[],
    betreuer: any[],
    tableSettings: any,
    baseDir: string,
    batch: BatchMail[]
  ): Promise<void> {
    const selectedKunden = kunden.filter(k => selection.kundenKeys.includes(k.__key))
    const selectedBetreuer = betreuer.filter(b => selection.betreuerKeys.includes(b.__key))

    for (const kunde of selectedKunden) {
      for (const bet of selectedBetreuer) {
        const attachments = await this.sammleAnhaenge(template, kunde, bet, tableSettings, baseDir)

        // Kombinierte Platzhalter-Ersetzung
        const platzhalterKontext = {
          personType: 'kunden' as const, // Hauptkontext ist Kunde
          row: kunde,
          settings: tableSettings.kunden,
          betreuerRow: bet,
          betreuerSettings: tableSettings.betreuer,
          kundeRow: kunde
        }

        // Verwende customTo aus selection, falls vorhanden, sonst template.to
        const toAddress = selection.customTo && selection.customTo.trim() 
          ? selection.customTo.trim() 
          : ersetzePlatzhalter(template.to, platzhalterKontext)
        
        // Überspringe E-Mail wenn keine Adresse vorhanden
        if (!toAddress || toAddress.trim() === '') {
          continue
        }
        
        batch.push({
          to: toAddress,
          subject: ersetzePlatzhalter(template.subject, platzhalterKontext),
          text: ersetzePlatzhalter(template.text, platzhalterKontext),
          attachments
        })
      }
    }
  }

  /**
   * Erstellt einzelne E-Mails (nur Kunden oder nur Betreuer)
   * Wenn {betreuerkunde} verwendet wird und ein Betreuer ausgewählt ist, wird dieser verwendet
   */
  private static async baueEinzelMails(
    template: any,
    personType: 'kunden' | 'betreuer',
    keys: string[],
    personen: any[],
    tableSettings: any,
    baseDir: string,
    batch: BatchMail[],
    selection?: any, // Optional: Selection-Objekt für Betreuer-Auswahl bei {betreuerkunde}
    betreuer?: any[] // Optional: Betreuer-Liste für {betreuerkunde}
  ): Promise<void> {
    const selectedPersonen = personen.filter(p => keys.includes(p.__key))
    const settings = tableSettings[personType]

    // Prüfe, ob {betreuerkunde} verwendet wird
    const fileTemplatesContent = template.selectedFiles.map((f: { fileTemplate: string }) => f.fileTemplate).join(' ').toLowerCase()
    const textContent = `${template.to} ${template.subject} ${template.text}`.toLowerCase()
    const allContent = `${textContent} ${fileTemplatesContent}`
    const hasBetreuerkunde = /\{betreuerkunde\}/i.test(allContent)

    // Wenn {betreuerkunde} verwendet wird und ein Betreuer ausgewählt ist, hole diesen
    const selectedBetreuer = (hasBetreuerkunde && personType === 'kunden' && selection?.betreuerKeys?.length && betreuer)
      ? betreuer.find(b => b.__key === selection.betreuerKeys[0])
      : undefined
    
    // Debug-Log
    if (hasBetreuerkunde && personType === 'kunden') {
      console.log('[MAIL baueEinzelMails] {betreuerkunde} erkannt:', {
        selectedBetreuer: selectedBetreuer ? (selectedBetreuer.__display || 'kein __display') : 'kein Betreuer ausgewählt',
        selectionBetreuerKeys: selection?.betreuerKeys,
        hatBetreuerSettings: !!tableSettings.betreuer
      })
    }

    for (const person of selectedPersonen) {
      const attachments = await this.sammleAnhaenge(template, person, selectedBetreuer, tableSettings, baseDir)

      // Platzhalter-Kontext: Wenn Betreuer vorhanden, übergebe diesen für {betreuerkunde}
      const platzhalterKontext = {
        personType,
        row: person,
        settings,
        ...(selectedBetreuer ? { 
          betreuerRow: selectedBetreuer,
          betreuerSettings: tableSettings.betreuer // Betreuer-Settings für {betreuerkunde} Platzhalter
        } : {})
      }

      // Verwende customTo aus selection, falls vorhanden, sonst template.to
      const toAddress = selection?.customTo && selection.customTo.trim() 
        ? selection.customTo.trim() 
        : ersetzePlatzhalter(template.to, platzhalterKontext)
      
      // Überspringe E-Mail wenn keine Adresse vorhanden
      if (!toAddress || toAddress.trim() === '') {
        continue
      }
      
      batch.push({
        to: toAddress,
        subject: ersetzePlatzhalter(template.subject, platzhalterKontext),
        text: ersetzePlatzhalter(template.text, platzhalterKontext),
        attachments
      })
    }
  }

  /**
   * Sammelt Datei-Anhänge für eine E-Mail
   */
  private static async sammleAnhaenge(
    template: any,
    person: any,
    betreuer?: any,
    tableSettings?: any,
    baseDir?: string
  ): Promise<DateiAnhang[]> {
    const attachments: DateiAnhang[] = []

    for (const selFile of template.selectedFiles) {
      const personType = selFile.personType
      const relevantPerson = personType === 'kunden' ? person : (betreuer || person)

      if (!relevantPerson || !baseDir) continue

      const settings = tableSettings[personType]
      
      // Prüfe, ob Template {betreuerkunde} enthält
      const hatBetreuerkunde = /\{betreuerkunde\}/i.test(selFile.fileTemplate)
      // Übergebe betreuerRow, wenn {betreuerkunde} verwendet wird und ein Betreuer vorhanden ist
      const betreuerRow = (hatBetreuerkunde && personType === 'kunden' && betreuer) ? betreuer : undefined
      
      // Für {betreuerkunde}: Wir müssen die Betreuer-Settings verwenden, um den Nachnamen zu extrahieren
      // Erweitere den Kontext um Betreuer-Settings, wenn ein Betreuer vorhanden ist
      const erweiterterKontext: StandardOrdnerKontext = (betreuerRow && personType === 'kunden')
        ? {
            baseDir,
            personType,
            row: relevantPerson,
            settings,
            betreuerSettings: tableSettings.betreuer // Betreuer-Settings für Platzhalter-Ersetzung
          }
        : {
            baseDir,
            personType,
            row: relevantPerson,
            settings
          }

      // Debug: Log vor dem Aufruf
      if (hatBetreuerkunde && betreuerRow) {
        console.log('[MAIL] Suche Datei mit {betreuerkunde}:', {
          template: selFile.fileTemplate,
          betreuerRowKeys: Object.keys(betreuerRow),
          betreuerRowDisplay: betreuerRow.__display,
          hatBetreuerSettings: !!erweiterterKontext.betreuerSettings,
          folderPath: selFile.folderPath
        })
      }
      
      const dateiErgebnis = await StandardOrdnerService.findeStandardDatei(
        erweiterterKontext,
        selFile.folderPath,
        selFile.fileTemplate,
        betreuerRow
      )
      
      // Debug: Log nach dem Aufruf
      if (hatBetreuerkunde) {
        console.log('[MAIL] {betreuerkunde} Datei-Suche Ergebnis:', {
          template: selFile.fileTemplate,
          exists: dateiErgebnis.exists,
          path: dateiErgebnis.path,
          betreuerRow: betreuerRow ? (betreuerRow.__display || 'kein __display') : 'kein Betreuer'
        })
      }

      if (dateiErgebnis.exists && dateiErgebnis.path) {
        // Platzhalter-Ersetzung: Wenn betreuerRow vorhanden, verwende diesen für {betreuerkunde}
        // Wichtig: Verwende Betreuer-Settings, wenn {betreuerkunde} verwendet wird
        const hatBetreuerkunde = /\{betreuerkunde\}/i.test(selFile.fileTemplate)
        const hatDateityp = /\{dateityp\}/i.test(selFile.fileTemplate)
        
        let expectedName: string
        
        // Wenn {dateityp} verwendet wird, extrahiere den tatsächlichen Dateinamen aus dem Pfad
        if (hatDateityp) {
          expectedName = dateiErgebnis.path.split(/[/\\]/).pop() || selFile.fileTemplate
        } else {
          // Normale Platzhalter-Ersetzung
          const platzhalterKontext = {
            personType,
            row: relevantPerson,
            settings,
            ...(betreuerRow ? { 
              betreuerRow,
              ...(hatBetreuerkunde && personType === 'kunden' && tableSettings?.betreuer ? { betreuerSettings: tableSettings.betreuer } : {})
            } : {})
          }
          expectedName = ersetzePlatzhalter(selFile.fileTemplate, platzhalterKontext)
        }
        
        // Debug-Log
        if (hatBetreuerkunde || hatDateityp) {
          console.log('[MAIL sammleAnhaenge] Dateiname-Ersetzung:', {
            template: selFile.fileTemplate,
            expectedName,
            hatBetreuerRow: !!betreuerRow,
            hatBetreuerSettings: !!tableSettings?.betreuer,
            hatDateityp,
            actualPath: dateiErgebnis.path
          })
        }

        attachments.push({
          path: dateiErgebnis.path,
          filename: expectedName
        })
      }
    }

    return attachments
  }
}
