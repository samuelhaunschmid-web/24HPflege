import { useState, useEffect, useCallback } from 'react'
import type { DateiSchema } from './typen'
import { StandardTemplateService } from './standardTemplateService'

/**
 * Hook für die Verwaltung von Datei-Schemata (z.B. für Betreuerwechsel)
 */
export function useDateiSchemata() {
  const [schemata, setSchemata] = useState<DateiSchema[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Schemata laden
  const ladeSchemata = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const geladeneSchemata = await StandardTemplateService.ladeDateiSchemata()
      setSchemata(geladeneSchemata)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Schemata')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Beim ersten Laden
  useEffect(() => {
    ladeSchemata()
  }, [ladeSchemata])

  // Schemata speichern
  const speichereSchemata = useCallback(async (neueSchemata: DateiSchema[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const erfolg = await StandardTemplateService.speichereDateiSchemata(neueSchemata)
      if (erfolg) {
        setSchemata(neueSchemata)
      } else {
        setError('Fehler beim Speichern der Schemata')
      }
      return erfolg
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Einzelnes Schema hinzufügen
  const addSchema = useCallback((schema: DateiSchema) => {
    setSchemata(prev => [...prev, schema])
  }, [])

  // Einzelnes Schema entfernen
  const removeSchema = useCallback((id: string) => {
    setSchemata(prev => prev.filter(s => s.id !== id))
  }, [])

  // Einzelnes Schema aktualisieren
  const updateSchema = useCallback((id: string, updates: Partial<DateiSchema>) => {
    setSchemata(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  return {
    schemata,
    isLoading,
    error,
    ladeSchemata,
    speichereSchemata,
    addSchema,
    removeSchema,
    updateSchema
  }
}
