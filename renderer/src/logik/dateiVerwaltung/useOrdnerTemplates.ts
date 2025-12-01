import { useState, useEffect, useCallback } from 'react'
import type { OrdnerTemplateBaum } from './typen'
import { StandardTemplateService } from './standardTemplateService'

/**
 * Hook für die Verwaltung von Ordner-Templates (Baumstruktur für Editoren)
 */
export function useOrdnerTemplates(personType: 'kunden' | 'betreuer') {
  const [baum, setBaum] = useState<OrdnerTemplateBaum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Templates laden
  const ladeTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const geladenerBaum = await StandardTemplateService.ladeOrdnerTemplatesAlsBaum(personType)
      setBaum(geladenerBaum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Templates')
    } finally {
      setIsLoading(false)
    }
  }, [personType])

  // Beim ersten Laden
  useEffect(() => {
    ladeTemplates()
  }, [ladeTemplates])

  // Templates speichern
  const speichereTemplates = useCallback(async (neuerBaum: OrdnerTemplateBaum[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const erfolg = await StandardTemplateService.speichereOrdnerTemplates(personType, neuerBaum)
      if (erfolg) {
        setBaum(neuerBaum)
      } else {
        setError('Fehler beim Speichern der Templates')
      }
      return erfolg
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [personType])

  // Baum aktualisieren (für interne Änderungen ohne Speichern)
  const aktualisiereBaum = useCallback((neuerBaum: OrdnerTemplateBaum[]) => {
    setBaum(neuerBaum)
  }, [])

  return {
    baum,
    isLoading,
    error,
    ladeTemplates,
    speichereTemplates,
    aktualisiereBaum
  }
}
