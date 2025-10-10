import { useEffect, useMemo, useState } from 'react'

export type SpaltenGruppe =
  | 'vorname'
  | 'nachname'
  | 'svnr'
  | 'telefon'
  | 'wichtig'
  | 'datum'
  | 'geburtsdatum'
  | 'anfang'
  | 'ende'
  | 'vorlage'
  | 'betreuer1'
  | 'betreuer1_anfang'
  | 'betreuer2'
  | 'betreuer2_anfang'

export type TableSettings = {
  displayNames: Record<string, string>
  gruppen: Record<string, SpaltenGruppe[]>
}

const DEFAULT_SETTINGS: TableSettings = {
  displayNames: {},
  gruppen: {},
}

function storageKey(tableId: string) { return `tableSettings:${tableId}` }

async function loadFromConfig(tableId: string): Promise<TableSettings | null> {
  try {
    const cfg = await window.api?.getConfig?.()
    const all = cfg && cfg.tableSettings
    const current = all && all[tableId]
    if (current && typeof current === 'object') {
      return { ...DEFAULT_SETTINGS, ...current }
    }
  } catch {}
  return null
}

async function saveToConfig(tableId: string, settings: TableSettings) {
  try {
    const cfg = await window.api?.getConfig?.()
    const next = { ...(cfg || {}), tableSettings: { ...((cfg && cfg.tableSettings) || {}), [tableId]: settings } }
    await window.api?.setConfig?.(next)
  } catch {}
}

export function useTableSettings(tableId: string, initialKeys: string[]) {
  const [settings, setSettings] = useState<TableSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      // 1) bevorzugt aus App-Config laden
      const fromCfg = await loadFromConfig(tableId)
      if (fromCfg) {
        setSettings(fromCfg)
        setLoaded(true)
        return
      }
      // 2) Fallback: vorhandene localStorage-Werte migrieren und speichern
      try {
        const raw = localStorage.getItem(storageKey(tableId))
        if (raw) {
          const parsed = JSON.parse(raw)
          const merged = { ...DEFAULT_SETTINGS, ...parsed }
          setSettings(merged)
          await saveToConfig(tableId, merged)
          setLoaded(true)
          return
        }
      } catch {}
      // 3) nichts vorhanden -> Defaults
      setSettings(DEFAULT_SETTINGS)
      setLoaded(true)
    })()
  }, [tableId])

  useEffect(() => {
    if (!loaded) return
    ;(async () => {
      try {
        await saveToConfig(tableId, settings)
        // localStorage weiterhin befüllen, um ältere Builds kompatibel zu halten
        try { localStorage.setItem(storageKey(tableId), JSON.stringify(settings)) } catch {}
      } catch {}
    })()
  }, [tableId, settings, loaded])

  const knownKeys = useMemo(() => Array.from(new Set(initialKeys)), [initialKeys])

  function setDisplayName(column: string, name: string) {
    setSettings(prev => ({ ...prev, displayNames: { ...prev.displayNames, [column]: name } }))
  }

  function toggleGruppe(column: string, gruppe: SpaltenGruppe) {
    setSettings(prev => {
      const prevList = prev.gruppen[column] || []
      const exists = prevList.includes(gruppe)
      const nextList = exists ? prevList.filter(g => g !== gruppe) : [...prevList, gruppe]
      return { ...prev, gruppen: { ...prev.gruppen, [column]: nextList } }
    })
  }

  function isInGruppe(column: string, gruppe: SpaltenGruppe) {
    return (settings.gruppen[column] || []).includes(gruppe)
  }

  function replaceAll(next: TableSettings) {
    setSettings({ ...DEFAULT_SETTINGS, ...next })
  }

  return {
    settings,
    knownKeys,
    setDisplayName,
    toggleGruppe,
    isInGruppe,
    replaceAll,
  }
}


