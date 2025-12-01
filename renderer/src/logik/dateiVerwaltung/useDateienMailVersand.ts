import { useState, useCallback } from 'react'
import type { MailBatchKontext, BatchMail, EmailTemplateSelection } from './typen'
import { MailService } from './mailService'
import { StandardTemplateService } from './standardTemplateService'

/**
 * Hook für den E-Mail-Versand mit Datei-Anhängen
 */
export function useDateienMailVersand() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Bereitet einen E-Mail-Batch vor (ohne zu versenden)
   */
  const previewBatch = useCallback(async (
    templates: any[],
    selections: Record<string, EmailTemplateSelection>,
    kunden: any[],
    betreuer: any[],
    tableSettings: any
  ): Promise<BatchMail[]> => {
    setError(null)

    try {
      const baseDir = await StandardTemplateService.ladeBasisOrdner()
      if (!baseDir) {
        throw new Error('Kein Basis-Ordner gesetzt')
      }

      const kontext: MailBatchKontext = {
        baseDir,
        templates,
        selections,
        kunden,
        betreuer,
        tableSettings
      }

      return await MailService.baueMailBatch(kontext)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Fehler bei der Batch-Vorbereitung'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  /**
   * Versendet ausgewählte E-Mail-Templates
   */
  const sendeAuswahl = useCallback(async (
    templates: any[],
    selections: Record<string, EmailTemplateSelection>,
    kunden: any[],
    betreuer: any[],
    tableSettings: any
  ): Promise<{ erfolg: boolean; anzahl: number; message: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const batch = await previewBatch(templates, selections, kunden, betreuer, tableSettings)

      if (!batch.length) {
        return { erfolg: false, anzahl: 0, message: 'Keine E-Mails zum Versenden gefunden' }
      }

      const versandErgebnis = await MailService.sendeBatch(batch)

      if (versandErgebnis.ok) {
        return {
          erfolg: true,
          anzahl: batch.length,
          message: `E-Mails erfolgreich an ${batch.length} Empfänger versendet`
        }
      } else {
        return {
          erfolg: false,
          anzahl: batch.length,
          message: versandErgebnis.message || 'Unbekannter Fehler beim Versenden'
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Versenden'
      setError(errorMsg)
      return { erfolg: false, anzahl: 0, message: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [previewBatch])

  return {
    isLoading,
    error,
    previewBatch,
    sendeAuswahl
  }
}
