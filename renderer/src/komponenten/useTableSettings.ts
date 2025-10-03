import { useEffect, useMemo, useState } from 'react'

export type SpaltenGruppe = 'vorname' | 'nachname' | 'svnr' | 'telefon' | 'wichtig' | 'datum'

export type TableSettings = {
  displayNames: Record<string, string>
  gruppen: Record<string, SpaltenGruppe[]>
}

const DEFAULT_SETTINGS: TableSettings = {
  displayNames: {},
  gruppen: {},
}

function storageKey(tableId: string) {
  return `tableSettings:${tableId}`
}

export function useTableSettings(tableId: string, initialKeys: string[]) {
  const [settings, setSettings] = useState<TableSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(tableId))
      if (raw) {
        const parsed = JSON.parse(raw)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch {}
    setLoaded(true)
  }, [tableId])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(storageKey(tableId), JSON.stringify(settings))
    } catch {}
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


