import { useEffect, useState, useMemo } from 'react'
import type { OrdnerStrukturMitFehlenden, StandardOrdnerKontext } from './typen'
import { StandardOrdnerService } from './standardOrdnerService'
import { StandardTemplateService } from './standardTemplateService'

/**
 * Hook für die Verwaltung von Standardordnern einer Person
 * Lädt Ordnerstruktur und berechnet fehlende Dateien
 */
export function useStandardOrdner(
  personType: 'kunden' | 'betreuer',
  row: any,
  tableSettings: any
) {
  const [ordnerStruktur, setOrdnerStruktur] = useState<OrdnerStrukturMitFehlenden | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [basisOrdner, setBasisOrdner] = useState('')

  // Basis-Ordner laden
  useEffect(() => {
    StandardTemplateService.ladeBasisOrdner().then(setBasisOrdner)
  }, [])

  // Ordnerstruktur laden wenn sich Parameter ändern
  useEffect(() => {
    if (!row || !tableSettings || !basisOrdner) {
      setOrdnerStruktur(null)
      return
    }

    const ladeOrdner = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const templateRegeln = await StandardTemplateService.ladeOrdnerTemplates(personType)
        const kontext: StandardOrdnerKontext = {
          baseDir: basisOrdner,
          personType,
          row,
          settings: tableSettings
        }

        const struktur = await StandardOrdnerService.ladeOrdnerFuerPerson(kontext, templateRegeln)
        setOrdnerStruktur(struktur)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        setOrdnerStruktur(null)
      } finally {
        setIsLoading(false)
      }
    }

    ladeOrdner()
  }, [personType, row, tableSettings, basisOrdner])

  // Anzeigename der Person
  const personDisplayName = useMemo(() => {
    if (!row || !tableSettings) return ''
    return StandardOrdnerService.ermittlePersonNamen(row, personType, tableSettings).anzeigeName
  }, [row, personType, tableSettings])

  // Fehlende Dateien zählen
  const fehlendeDateienAnzahl = useMemo(() => {
    return ordnerStruktur ? StandardOrdnerService.berechneFehlendeAnzahl(ordnerStruktur) : 0
  }, [ordnerStruktur])

  // Reload-Funktion
  const reload = async () => {
    if (!row || !tableSettings || !basisOrdner) return

    setIsLoading(true)
    setError(null)

    try {
      const templateRegeln = await StandardTemplateService.ladeOrdnerTemplates(personType)
      const kontext: StandardOrdnerKontext = {
        baseDir: basisOrdner,
        personType,
        row,
        settings: tableSettings
      }

      const struktur = await StandardOrdnerService.ladeOrdnerFuerPerson(kontext, templateRegeln)
      setOrdnerStruktur(struktur)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Neuladen')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    ordnerStruktur,
    personDisplayName,
    fehlendeDateienAnzahl,
    isLoading,
    error,
    basisOrdnerVorhanden: !!basisOrdner,
    reload
  }
}
