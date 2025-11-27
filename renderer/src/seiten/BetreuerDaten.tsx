import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import { useTableSettings } from '../komponenten/useTableSettings'

export default function BetreuerDaten() {
  const [baseDir, setBaseDir] = useState<string>('')
  const [betreuerDatenDir, setBetreuerDatenDir] = useState<string>('')
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [liste, setListe] = useState<Array<{ name: string; dir: string; exists: boolean; subfolders: Array<{ name: string; files: string[] }> }>>([])
  const [cfg, setCfg] = useState<any>({})

  useEffect(() => {
    ;(async () => {
      const cfgVal = await window.api?.getConfig?.()
      setCfg(cfgVal || {})
      const d = cfgVal?.dokumenteDir || ''
      setBaseDir(d)
      setBetreuerDatenDir(d ? `${d.replace(/\\+$/,'')}\\BetreuerDaten` : '')
      const lists = await window.docgen?.getLists?.()
      if (lists?.betreuer) setBetreuer(lists.betreuer)
      if (lists?.kunden) setKunden(lists.kunden)
    })()
  }, [])

  const betreuerKeys = useMemo(() => (betreuer.length ? Object.keys(betreuer[0]) : []), [betreuer])
  const kundenKeys = useMemo(() => (kunden.length ? Object.keys(kunden[0]) : []), [kunden])
  const { settings: betreuerSettings } = useTableSettings('betreuer', betreuerKeys)
  const { settings: kundenSettings } = useTableSettings('kunden', kundenKeys)
  const names = useMemo(() => {
    if (!betreuer.length) return [] as string[]
    const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    const list = betreuer.flatMap((row: any) => {
      const vor = String(vorKey ? row[vorKey] || '' : '').trim()
      const nach = String(nachKey ? row[nachKey] || '' : '').trim()
      const a = `${vor} ${nach}`.trim()
      const b = `${nach} ${vor}`.trim()
      return [a, b].filter(Boolean)
    })
    return Array.from(new Set(list)).filter(Boolean)
  }, [betreuer, betreuerKeys, betreuerSettings])

  const namesKey = useMemo(() => names.join('|'), [names])

  const refreshStructure = useCallback(async () => {
    if (!baseDir || !names.length) { setListe([]); return }
    try {
      const res = await window.api?.folders?.listForPersons?.({ baseDir, personType: 'betreuer', names })
      setListe(res?.ok ? (res?.result || []) : [])
    } catch {
      setListe([])
    }
  }, [baseDir, names])

  useEffect(() => {
    if (baseDir && names.length) { void refreshStructure() }
  }, [baseDir, namesKey, refreshStructure])

  useEffect(() => {
    function handleFocus() {
      if (baseDir && names.length) { void refreshStructure() }
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [baseDir, namesKey, refreshStructure])

  const dedupListe = useMemo(() => {
    if (!liste.length) return liste
    const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    if (!vorKey || !nachKey) return liste
    const result: typeof liste = []
    for (const r of betreuer) {
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
  }, [liste, betreuer, betreuerKeys, betreuerSettings])

  const sortedListe = useMemo(() => {
    const nachKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    if (!nachKey) return dedupListe
    return [...dedupListe].sort((a, b) => {
      const rowA = (() => {
        const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
        const nachKey2 = nachKey
        return betreuer.find(r => {
          const vor = String(vorKey ? r[vorKey] || '' : '').trim()
          const nach = String(nachKey2 ? r[nachKey2] || '' : '').trim()
          const a1 = `${vor} ${nach}`.trim()
          const a2 = `${nach} ${vor}`.trim()
          return a.name === a1 || a.name === a2
        })
      })()
      const rowB = (() => {
        const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
        const nachKey2 = nachKey
        return betreuer.find(r => {
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
  }, [dedupListe, betreuer, names, betreuerKeys, betreuerSettings])

  function formatDisplay(row: any) {
    const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    const vor = String(vorKey ? row?.[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row?.[nachKey] || '' : '').trim()
    return `${nach} ${vor}`.trim()
  }

  function replacePlaceholders(tpl: string, row: any): string {
    const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    const vor = String(vorKey ? row[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row[nachKey] || '' : '').trim()
    const betreuerFull = `${vor} ${nach}`.trim()
    // Finde zugewiesenen Kunden
    let nk1 = ''
    if (kunden.length && kundenKeys.length) {
      const kundenB1Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer1'))
      const kundenB2Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer2'))
      const kundenNachKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
      for (const kunde of kunden) {
        const b1Val = String(kundenB1Key ? kunde[kundenB1Key] || '' : '').trim()
        const b2Val = String(kundenB2Key ? kunde[kundenB2Key] || '' : '').trim()
        if (b1Val === betreuerFull || b2Val === betreuerFull) {
          nk1 = String(kundenNachKey ? kunde[kundenNachKey] || '' : '').trim()
          break
        }
      }
    }
    return String(tpl || '')
      .replace(/\{vorname\}/gi, vor)
      .replace(/\{nachname\}/gi, nach)
      .replace(/\{bvname\}/gi, vor)
      .replace(/\{bfname\}/gi, nach)
      .replace(/\{nk1\}/gi, nk1)
  }

  function getMissingCountFor(person: { name: string }, row: any): number {
    const rules = cfg?.folderTemplatesRules?.betreuer || []
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

  return (
    <Layout>
      <div style={{ background: '#fff', border: '1px solid #e6e8ef', borderRadius: 10, padding: 16, display: 'grid', gap: 12, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, flex: 1 }}>Betreuer-Daten Verwaltung</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void refreshStructure()} disabled={!baseDir || !names.length} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: (!baseDir || !names.length) ? 'not-allowed' : 'pointer', opacity: (!baseDir || !names.length) ? 0.6 : 1 }}>
              Aktualisieren
            </button>
            <button onClick={() => window.api?.openFolderDialog?.('betreuer')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>Ordner-Management</button>
          </div>
        </div>
        {(!baseDir || liste.length === 0) && (
          <>
            <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
              Dokumente-Ordner: {baseDir || 'nicht gesetzt'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Erwarteter Unterordner: {betreuerDatenDir || '—'}
            </div>
          </>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {sortedListe.map(p => {
            const row = (() => {
              const vorKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
              const nachKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
              return betreuer.find(r => {
                const vor = String(vorKey ? r[vorKey] || '' : '').trim()
                const nach = String(nachKey ? r[nachKey] || '' : '').trim()
                const n1 = `${vor} ${nach}`.trim()
                const n2 = `${nach} ${vor}`.trim()
                return p.name === n1 || p.name === n2
              })
            })()
            if (!row) return null
            const missing = row ? getMissingCountFor(p, row) : 0
            return (
            <details key={p.name} style={{ background: '#ffffff', border: '1px solid #e6e8ef', borderRadius: 8, padding: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1 }}>{formatDisplay(row)} {p.exists ? '' : '(Ordner fehlt)'}</span>
                {missing > 0 && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 12, border: '1px solid #fecaca' }}>{missing}</span>
                )}
              </summary>
              {!!p.subfolders.length && (
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  {p.subfolders.map(sf => {
                    const rules = (cfg?.folderTemplatesRules?.betreuer || []) as Array<{ path: string[]; files: string[] }>
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
            </details>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}


