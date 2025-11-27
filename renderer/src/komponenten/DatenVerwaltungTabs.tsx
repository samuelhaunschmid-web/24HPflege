import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTableSettings } from './useTableSettings'

type Props = {
  personType: 'kunden' | 'betreuer'
  row: any
  allPersons: any[]
  allKeys: string[]
  wichtigeFelder: string[]
  displayNames: Record<string, string>
  gruppen: Record<string, any[]>
  keys: string[]
}

export default function DatenVerwaltungTabs({ personType, row, allPersons, allKeys, wichtigeFelder, displayNames, gruppen, keys }: Props) {
  const [baseDir, setBaseDir] = useState<string>('')
  const [liste, setListe] = useState<Array<{ name: string; dir: string; exists: boolean; subfolders: Array<{ name: string; files: string[] }> }>>([])
  const [cfg, setCfg] = useState<any>({})

  const { settings } = useTableSettings(personType, allKeys)
  const otherPersonType = personType === 'kunden' ? 'betreuer' : 'kunden'
  const otherPersons = personType === 'kunden' ? [] : allPersons // betreuer brauchen kunden für nk1
  const otherKeys = otherPersons.length ? Object.keys(otherPersons[0]) : []
  const { settings: otherSettings } = useTableSettings(otherPersonType, otherKeys)

  // Namen für diese Person generieren (wie in den alten Seiten)
  const personNames = useMemo(() => {
    const vorKey = allKeys.find(k => (settings.gruppen[k] || []).includes('vorname'))
    const nachKey = allKeys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    const vor = String(vorKey ? row[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row[nachKey] || '' : '').trim()
    const a = `${vor} ${nach}`.trim()
    const b = `${nach} ${vor}`.trim()
    return [a, b].filter(Boolean)
  }, [row, allKeys, settings])

  useEffect(() => {
    ;(async () => {
      const cfgVal = await window.api?.getConfig?.()
      setCfg(cfgVal || {})
      const d = cfgVal?.dokumenteDir || ''
      setBaseDir(d)
    })()
  }, [])

  const refreshStructure = useCallback(async () => {
    if (!baseDir || !personNames.length) { setListe([]); return }
    try {
      const res = await window.api?.folders?.listForPersons?.({ baseDir, personType, names: personNames })
      setListe(res?.ok ? (res?.result || []) : [])
    } catch {
      setListe([])
    }
  }, [baseDir, personType, personNames])

  useEffect(() => {
    if (baseDir && personNames.length) { void refreshStructure() }
  }, [baseDir, personNames.join('|'), refreshStructure])

  useEffect(() => {
    function handleFocus() {
      if (baseDir && personNames.length) { void refreshStructure() }
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [baseDir, personNames.join('|'), refreshStructure])

  // dedupListe und sortedListe wie in den alten Seiten
  const dedupListe = useMemo(() => {
    if (!liste.length) return liste
    const vorKey = allKeys.find(k => (settings.gruppen[k] || []).includes('vorname'))
    const nachKey = allKeys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    if (!vorKey || !nachKey) return liste
    const result: typeof liste = []
    for (const r of allPersons) {
      const vor = String(r?.[vorKey] || '').trim()
      const nach = String(r?.[nachKey] || '').trim()
      if (!vor && !nach) continue
      const a = `${vor} ${nach}`.trim()
      const b = `${nach} ${vor}`.trim()
      const ea = liste.find(x => x.name === a)
      const eb = liste.find(x => x.name === b)
      const chosen = (ea && ea.exists) ? ea : (eb && eb.exists) ? eb : ea || eb
      if (chosen) result.push(chosen)
      else result.push({ name: a, dir: '', exists: false, subfolders: [] })
    }
    const seen = new Set<string>()
    const out: typeof liste = []
    for (const e of result) {
      const key = `${e.name}|${e.dir}|${e.exists}`
      if (!seen.has(key)) { seen.add(key); out.push(e) }
    }
    return out
  }, [liste, allPersons, allKeys, settings])

  const sortedListe = useMemo(() => {
    const nachKey = allKeys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    if (!nachKey) return dedupListe
    return [...dedupListe].sort((a, b) => {
      const rowA = (() => {
        const vorKey = allKeys.find(k => (settings.gruppen[k] || []).includes('vorname'))
        const nachKey2 = nachKey
        return allPersons.find(r => {
          const vor = String(vorKey ? r[vorKey] || '' : '').trim()
          const nach = String(nachKey2 ? r[nachKey2] || '' : '').trim()
          const a1 = `${vor} ${nach}`.trim()
          const a2 = `${nach} ${vor}`.trim()
          return a.name === a1 || a.name === a2
        })
      })()
      const rowB = (() => {
        const vorKey = allKeys.find(k => (settings.gruppen[k] || []).includes('vorname'))
        const nachKey2 = nachKey
        return allPersons.find(r => {
          const vor = String(vorKey ? r[vorKey] || '' : '').trim()
          const nach = String(nachKey2 ? r[nachKey2] || '' : '').trim()
          const b1 = `${vor} ${nach}`.trim()
          const b2 = `${nach} ${vor}`.trim()
          return b.name === b1 || b.name === b2
        })
      })()
      const nachA = rowA ? String(rowA[nachKey] || '').trim() : ''
      const nachB = rowB ? String(rowB[nachKey] || '').trim() : ''
      return nachA.localeCompare(nachB)
    })
  }, [dedupListe, allPersons, personNames, allKeys, settings])

  function formatDisplay(row: any) {
    const vorKey = allKeys.find(k => (settings.gruppen[k] || []).includes('vorname'))
    const nachKey = allKeys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    const vor = String(vorKey ? row?.[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row?.[nachKey] || '' : '').trim()
    return `${nach} ${vor}`.trim()
  }

  function replacePlaceholders(tpl: string, row: any): string {
    const vorKey = allKeys.find(k => (settings.gruppen[k] || []).includes('vorname'))
    const nachKey = allKeys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    const vor = String(vorKey ? row[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row[nachKey] || '' : '').trim()

    let nk1 = ''
    if (personType === 'betreuer' && otherPersons.length && otherKeys.length) {
      const kundenB1Key = otherKeys.find(k => (otherSettings.gruppen[k] || []).includes('betreuer1'))
      const kundenB2Key = otherKeys.find(k => (otherSettings.gruppen[k] || []).includes('betreuer2'))
      const kundenNachKey = otherKeys.find(k => (otherSettings.gruppen[k] || []).includes('nachname'))
      const betreuerFull = `${vor} ${nach}`.trim()
      for (const kunde of otherPersons) {
        const b1Val = String(kundenB1Key ? kunde[kundenB1Key] || '' : '').trim()
        const b2Val = String(kundenB2Key ? kunde[kundenB2Key] || '' : '').trim()
        if (b1Val === betreuerFull || b2Val === betreuerFull) {
          nk1 = String(kundenNachKey ? kunde[kundenNachKey] || '' : '').trim()
          break
        }
      }
    }

    const b1Key = personType === 'kunden' ? allKeys.find(k => (settings.gruppen[k] || []).includes('betreuer1')) : null
    const b2Key = personType === 'kunden' ? allKeys.find(k => (settings.gruppen[k] || []).includes('betreuer2')) : null
    const b1Full = String(b1Key ? row[b1Key] || '' : '').trim()
    const b2Full = String(b2Key ? row[b2Key] || '' : '').trim()
    const getNachname = (full: string) => {
      const parts = full.split(/\s+/).filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : ''
    }
    const nb1 = getNachname(b1Full)
    const nb2 = getNachname(b2Full)

    return String(tpl || '')
      .replace(/\{vorname\}/gi, vor)
      .replace(/\{nachname\}/gi, nach)
      .replace(/\{kvname\}/gi, vor)
      .replace(/\{kfname\}/gi, nach)
      .replace(/\{bvname\}/gi, vor)
      .replace(/\{bfname\}/gi, nach)
      .replace(/\{nb1\}/gi, nb1)
      .replace(/\{nb2\}/gi, nb2)
      .replace(/\{nk1\}/gi, nk1)
  }

  function getMissingCountFor(person: { name: string }, row: any): number {
    const rules = cfg?.folderTemplatesRules?.[personType] || []
    if (!Array.isArray(rules) || !rules.length) return 0
    const entry = liste.find(x => x.name === person.name)
    if (!entry || !entry.exists) return 0
    let missing = 0
    for (const r of rules) {
      const pathSegs = (r?.path || []).filter(Boolean)
      const folderName = pathSegs[pathSegs.length - 1]
      const sf = entry.subfolders.find(s => s.name === folderName)
      if (!sf) { missing += (r?.files || []).length; continue }
      const files = new Set(sf.files || [])
      for (const f of (r?.files || [])) {
        const expected = replacePlaceholders(String(f), row)
        if (!files.has(expected)) missing++
      }
    }
    return missing
  }

  const personDisplay = formatDisplay(row)
  const personEntry = sortedListe.find(p => p.name === personNames[0] || p.name === personNames[1])

  const missingCount = personEntry ? getMissingCountFor(personEntry, row) : 0

  function openFolderDialog() {
    void window.api?.openFolderDialog?.(personType)
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {!baseDir && (
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Dokumente-Ordner nicht gesetzt
        </div>
      )}
      {baseDir && personEntry && (
        <div style={{ background: '#ffffff', border: '1px solid #e6e8ef', borderRadius: 8, padding: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontWeight: 600, color: '#1f2937' }}>
              {personDisplay} {personEntry.exists ? '' : '(Ordner fehlt)'}
            </div>
            {missingCount > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 12, border: '1px solid #fecaca' }}>
                {missingCount}
              </span>
            )}
            <button
              title="Ordner-Management"
              onClick={openFolderDialog}
              style={{
                border: '1px solid #d1d5db',
                background: '#fff',
                borderRadius: 8,
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#1f2937'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.28 1.35.78 1.82.5.47 1.17.72 1.85.68H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
          {!!personEntry.subfolders.length && (
            <div style={{ display: 'grid', gap: 6 }}>
              {personEntry.subfolders.map(sf => {
                const rules = (cfg?.folderTemplatesRules?.[personType] || []) as Array<{ path: string[]; files: string[] }>
                const expectedForFolder: string[] = (() => {
                  if (!Array.isArray(rules)) return []
                  const own = rules.filter(r => (r.path || []).slice(-1)[0] === sf.name)
                  const tplFiles = own.flatMap(r => r.files || [])
                  return (tplFiles || []).map(f => replacePlaceholders(String(f), row || {}))
                })()
                const existing = new Set(sf.files || [])
                const missingFiles = expectedForFolder.filter(f => !existing.has(f))
                return (
                  <div key={sf.name} style={{ border: '1px dashed #e5e7eb', borderRadius: 6, padding: 8, position: 'relative' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      <span style={{ flex: 1 }}>{sf.name}</span>
                      {missingFiles.length > 0 && (
                        <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 11, border: '1px solid #fecaca' }}>{missingFiles.length}</span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 2, marginTop: 6 }}>
                      {(sf.files || []).map(fn => {
                        const isStandard = expectedForFolder.includes(fn)
                        return (
                          <div key={fn} style={{ fontSize: 12, color: isStandard ? '#166534' : '#334155' }}>{fn}</div>
                        )
                      })}
                      {(!sf.files || sf.files.length === 0) && <div style={{ fontSize: 12, color: '#64748b' }}>–</div>}
                      {missingFiles.map(fn => (
                        <div key={`missing-${fn}`} style={{ fontSize: 12, color: '#991b1b' }}>{fn}</div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {baseDir && !personEntry && (
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Keine Ordner-Daten gefunden für {personDisplay}
        </div>
      )}
    </div>
  )
}
