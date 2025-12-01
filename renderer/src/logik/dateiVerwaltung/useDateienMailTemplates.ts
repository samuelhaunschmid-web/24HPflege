import { useState, useEffect, useCallback } from 'react'
import type { EmailTemplate } from './typen'
import { StandardTemplateService } from './standardTemplateService'

/**
 * Hook für die Verwaltung von E-Mail-Templates
 */
export function useDateienMailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Templates laden
  const ladeTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const geladeneTemplates = await StandardTemplateService.ladeEmailTemplates()
      setTemplates(geladeneTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Templates')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Beim ersten Laden
  useEffect(() => {
    ladeTemplates()
  }, [ladeTemplates])

  // Templates speichern
  const speichereTemplates = useCallback(async (neueTemplates: EmailTemplate[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const erfolg = await StandardTemplateService.speichereEmailTemplates(neueTemplates)
      if (erfolg) {
        setTemplates(neueTemplates)
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
  }, [])

  // Einzelnes Template hinzufügen
  const addTemplate = useCallback((template: EmailTemplate) => {
    setTemplates(prev => [...prev, template])
  }, [])

  // Einzelnes Template entfernen
  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  // Einzelnes Template aktualisieren
  const updateTemplate = useCallback((id: string, updates: Partial<EmailTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  return {
    templates,
    isLoading,
    error,
    ladeTemplates,
    speichereTemplates,
    addTemplate,
    removeTemplate,
    updateTemplate
  }
}

// Re-export für einfacheren Import
export { useDateienMailVersand } from './useDateienMailVersand'
