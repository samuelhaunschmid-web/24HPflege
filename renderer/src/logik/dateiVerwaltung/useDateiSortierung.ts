import { useState, useEffect, useCallback } from 'react'
import { DateiSortierService, type DateiZuordnung } from './dateiSortierService'
import { StandardTemplateService } from './standardTemplateService'
import type { TabellenEinstellungen } from './typen'

/**
 * Ordner-Eintrag aus dem Quellpfad
 */
export type QuellOrdner = {
  name: string
  path: string
  fileCount: number
  isExpanded: boolean
  dateien: { name: string; path: string }[]
  zuordnungen: DateiZuordnung[]
  isLoading: boolean
  ausgewaehlteDateien: Set<string> // Set von dateiPfad für ausgewählte Dateien
}

/**
 * Hook für die Dateisortierungs-Funktionalität
 */
export function useDateiSortierung() {
  const [quellPfad, setQuellPfad] = useState('')
  const [ordner, setOrdner] = useState<QuellOrdner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [baseDir, setBaseDir] = useState('')
  
  // Personen-Daten
  const [kunden, setKunden] = useState<any[]>([])
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [kundenSettings, setKundenSettings] = useState<TabellenEinstellungen | null>(null)
  const [betreuerSettings, setBetreuerSettings] = useState<TabellenEinstellungen | null>(null)

  // Lade Quellpfad und Basis-Ordner aus Config beim Start
  useEffect(() => {
    const ladeConfig = async () => {
      try {
        const cfg = await window.api?.getConfig?.()
        if (cfg?.dateienSortierenQuellpfad) {
          setQuellPfad(cfg.dateienSortierenQuellpfad)
        }
        // Lade Basis-Ordner für Dokumente
        const basisOrdner = await StandardTemplateService.ladeBasisOrdner()
        setBaseDir(basisOrdner)
      } catch (err) {
        console.error('Fehler beim Laden der Config:', err)
      }
    }
    ladeConfig()
  }, [])

  // Lade Personen-Daten
  useEffect(() => {
    const ladePersonen = async () => {
      try {
        console.log('[useDateiSortierung] Starte Laden der Personen...')
        const data = await window.docgen?.getLists?.()
        console.log('[useDateiSortierung] getLists Ergebnis:', data)
        
        if (data) {
          // getLists gibt direkt { kunden: [...], betreuer: [...] } zurück
          const kundenArray = Array.isArray(data.kunden) ? data.kunden : []
          const betreuerArray = Array.isArray(data.betreuer) ? data.betreuer : []
          
          setKunden(kundenArray)
          setBetreuer(betreuerArray)
          
          console.log('[useDateiSortierung] Geladene Personen:', {
            kunden: kundenArray.length,
            betreuer: betreuerArray.length,
            kundenBeispiel: kundenArray.slice(0, 2).map(k => k.__display || 'kein display'),
            betreuerBeispiel: betreuerArray.slice(0, 2).map(b => b.__display || 'kein display')
          })
          
          // Lade Table-Settings
          const cfg = await window.api?.getConfig?.()
          const tableSettings = cfg?.tableSettings || {}
          
          setKundenSettings({
            gruppen: tableSettings.kunden?.gruppen || {}
          })
          setBetreuerSettings({
            gruppen: tableSettings.betreuer?.gruppen || {}
          })
        } else {
          console.log('[useDateiSortierung] Keine Daten von getLists erhalten')
        }
      } catch (err) {
        console.error('[useDateiSortierung] Fehler beim Laden der Personen:', err)
      }
    }
    ladePersonen()
  }, [])

  // Aktualisiere Zuordnungen automatisch, wenn Personen-Daten geladen werden
  useEffect(() => {
    // Wenn Personen-Daten geladen wurden und Ordner bereits geöffnet sind, aktualisiere Zuordnungen
    if ((kunden.length > 0 || betreuer.length > 0) && kundenSettings && betreuerSettings && baseDir) {
      const geoeffneteOrdner = ordner.filter(o => o.isExpanded && o.dateien.length > 0)
      if (geoeffneteOrdner.length > 0) {
        // Aktualisiere Zuordnungen für alle geöffneten Ordner
        geoeffneteOrdner.forEach(() => {
          const ordnerIndex = ordner.findIndex(o => o.isExpanded && o.dateien.length > 0)
          if (ordnerIndex >= 0) {
            aktualisiereZuordnungen(ordnerIndex)
          }
        })
      }
    }
  }, [kunden.length, betreuer.length, kundenSettings, betreuerSettings, baseDir])

  // Speichere Quellpfad in Config
  const speichereQuellPfad = useCallback(async (pfad: string) => {
    try {
      await window.api?.setConfig?.({ dateienSortierenQuellpfad: pfad })
      setQuellPfad(pfad)
    } catch (err) {
      console.error('Fehler beim Speichern des Quellpfads:', err)
    }
  }, [])

  // Lade Ordner aus Quellpfad
  const ladeOrdner = useCallback(async () => {
    if (!quellPfad) {
      setOrdner([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api?.folders?.listDirectory?.({ path: quellPfad })
      
      if (!result?.ok) {
        setError(result?.message || 'Fehler beim Laden der Ordner')
        setOrdner([])
        return
      }

      const neueOrdner: QuellOrdner[] = (result.folders || []).map((f: { name: string; path: string; fileCount: number }) => ({
        name: f.name,
        path: f.path,
        fileCount: f.fileCount,
        isExpanded: false,
        dateien: [],
        zuordnungen: [],
        isLoading: false,
        ausgewaehlteDateien: new Set<string>()
      }))

      setOrdner(neueOrdner)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setOrdner([])
    } finally {
      setIsLoading(false)
    }
  }, [quellPfad])

  // Lade Ordner wenn Quellpfad sich ändert
  useEffect(() => {
    if (quellPfad) {
      ladeOrdner()
    }
  }, [quellPfad, ladeOrdner])

  // Öffne/Schließe Ordner und lade Dateien
  const toggleOrdner = useCallback(async (ordnerIndex: number) => {
    setOrdner(prev => {
      const neu = [...prev]
      const ordnerItem = neu[ordnerIndex]
      
      if (ordnerItem.isExpanded) {
        // Schließen
        neu[ordnerIndex] = { ...ordnerItem, isExpanded: false }
      } else {
        // Öffnen - markiere als loading
        neu[ordnerIndex] = { ...ordnerItem, isExpanded: true, isLoading: true }
      }
      
      return neu
    })

    // Wenn Ordner geöffnet wird, lade Dateien
    const ordnerItem = ordner[ordnerIndex]
    if (!ordnerItem.isExpanded && ordnerItem.dateien.length === 0) {
      try {
        const result = await window.api?.folders?.listFilesInDirectory?.({ path: ordnerItem.path })
        
        if (result?.ok && result.files) {
          const dateien = result.files as { name: string; path: string }[]
          
          // Ordne Dateien zu
          let zuordnungen: DateiZuordnung[] = []
          if (kundenSettings && betreuerSettings && baseDir && (kunden.length > 0 || betreuer.length > 0)) {
            console.log('[useDateiSortierung] Starte Zuordnung mit', kunden.length, 'Kunden und', betreuer.length, 'Betreuern')
            zuordnungen = await DateiSortierService.ordneDateienZu(
              dateien,
              kunden,
              betreuer,
              kundenSettings,
              betreuerSettings,
              baseDir
            )
          } else {
            console.log('[useDateiSortierung] Zuordnung nicht möglich:', {
              hatKundenSettings: !!kundenSettings,
              hatBetreuerSettings: !!betreuerSettings,
              hatBaseDir: !!baseDir,
              kundenAnzahl: kunden.length,
              betreuerAnzahl: betreuer.length
            })
          }

          // Standardmäßig alle zugeordneten Dateien auswählen
          const standardAuswahl = new Set<string>()
          zuordnungen.filter(z => z.istZugeordnet).forEach(z => {
            standardAuswahl.add(z.dateiPfad)
          })

          setOrdner(prev => {
            const neu = [...prev]
            neu[ordnerIndex] = {
              ...neu[ordnerIndex],
              dateien,
              zuordnungen,
              isLoading: false,
              ausgewaehlteDateien: standardAuswahl
            }
            return neu
          })
        } else {
          setOrdner(prev => {
            const neu = [...prev]
            neu[ordnerIndex] = { ...neu[ordnerIndex], isLoading: false }
            return neu
          })
        }
      } catch (err) {
        console.error('Fehler beim Laden der Dateien:', err)
        setOrdner(prev => {
          const neu = [...prev]
          neu[ordnerIndex] = { ...neu[ordnerIndex], isLoading: false }
          return neu
        })
      }
    }
  }, [ordner, kunden, betreuer, kundenSettings, betreuerSettings, baseDir])

  // Aktualisiere Zuordnungen für einen Ordner
  const aktualisiereZuordnungen = useCallback(async (ordnerIndex: number) => {
    const ordnerItem = ordner[ordnerIndex]
    if (!ordnerItem || !kundenSettings || !betreuerSettings || !baseDir) return

    setOrdner(prev => {
      const neu = [...prev]
      neu[ordnerIndex] = { ...neu[ordnerIndex], isLoading: true }
      return neu
    })

    try {
      const zuordnungen = await DateiSortierService.ordneDateienZu(
        ordnerItem.dateien,
        kunden,
        betreuer,
        kundenSettings,
        betreuerSettings,
        baseDir
      )

      // Standardmäßig alle zugeordneten Dateien auswählen
      const standardAuswahl = new Set<string>()
      zuordnungen.filter(z => z.istZugeordnet).forEach(z => {
        standardAuswahl.add(z.dateiPfad)
      })

      setOrdner(prev => {
        const neu = [...prev]
        neu[ordnerIndex] = {
          ...neu[ordnerIndex],
          zuordnungen,
          isLoading: false,
          ausgewaehlteDateien: standardAuswahl
        }
        return neu
      })
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Zuordnungen:', err)
      setOrdner(prev => {
        const neu = [...prev]
        neu[ordnerIndex] = { ...neu[ordnerIndex], isLoading: false }
        return neu
      })
    }
  }, [ordner, kunden, betreuer, kundenSettings, betreuerSettings, baseDir])

  // Toggle Datei-Auswahl
  const toggleDateiAuswahl = useCallback((ordnerIndex: number, dateiPfad: string) => {
    setOrdner(prev => {
      const neu = [...prev]
      const ordnerItem = neu[ordnerIndex]
      if (!ordnerItem) return neu

      const neueAuswahl = new Set(ordnerItem.ausgewaehlteDateien)
      if (neueAuswahl.has(dateiPfad)) {
        neueAuswahl.delete(dateiPfad)
      } else {
        neueAuswahl.add(dateiPfad)
      }

      neu[ordnerIndex] = {
        ...ordnerItem,
        ausgewaehlteDateien: neueAuswahl
      }
      return neu
    })
  }, [])

  // Importiere Dateien aus einem Ordner (nur ausgewählte)
  const importiereDateien = useCallback(async (
    ordnerIndex: number,
    onProgress?: (current: number, total: number, datei: string) => void
  ) => {
    const ordnerItem = ordner[ordnerIndex]
    if (!ordnerItem || !baseDir) {
      return { erfolgreich: 0, fehlgeschlagen: 0, umbenannt: 0, details: [] }
    }

    // Nur ausgewählte und zugeordnete Dateien importieren
    const zuImportieren = ordnerItem.zuordnungen.filter(z => 
      z.istZugeordnet && ordnerItem.ausgewaehlteDateien.has(z.dateiPfad)
    )
    
    if (zuImportieren.length === 0) {
      return { erfolgreich: 0, fehlgeschlagen: 0, umbenannt: 0, details: [] }
    }

    const result = await DateiSortierService.verschiebeDateien(
      zuImportieren,
      baseDir,
      onProgress
    )

    // Aktualisiere Ordner nach Import
    await ladeOrdner()

    return result
  }, [ordner, baseDir, ladeOrdner])

  // Öffne Ordner im Explorer
  const oeffneOrdnerImExplorer = useCallback(async (pfad: string) => {
    try {
      await window.api?.openFile?.(pfad)
    } catch (err) {
      console.error('Fehler beim Öffnen des Ordners:', err)
    }
  }, [])

  // Wähle Quellpfad
  const waehleQuellPfad = useCallback(async () => {
    try {
      const pfad = await window.api?.chooseDirectory?.('Quellordner für Dateisortierung wählen')
      if (pfad) {
        await speichereQuellPfad(pfad)
      }
    } catch (err) {
      console.error('Fehler beim Wählen des Quellpfads:', err)
    }
  }, [speichereQuellPfad])

  return {
    quellPfad,
    ordner,
    isLoading,
    error,
    baseDir,
    kunden,
    betreuer,
    waehleQuellPfad,
    speichereQuellPfad,
    ladeOrdner,
    toggleOrdner,
    aktualisiereZuordnungen,
    toggleDateiAuswahl,
    importiereDateien,
    oeffneOrdnerImExplorer
  }
}

