import { useEffect, useState } from 'react'
import Layout from '../seite-shared/Layout'
import { useMemo } from 'react'
import { useTableSettings } from '../komponenten/useTableSettings'

export default function KundenDaten() {
  const [baseDir, setBaseDir] = useState<string>('')
  const [kundenDatenDir, setKundenDatenDir] = useState<string>('')
  const [kunden, setKunden] = useState<any[]>([])
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [liste, setListe] = useState<Array<{ name: string; dir: string; exists: boolean; subfolders: Array<{ name: string; files: string[] }> }>>([])
  const [cfg, setCfg] = useState<any>({})

  useEffect(() => {
    ;(async () => {
      const cfgVal = await window.api?.getConfig?.()
      setCfg(cfgVal || {})
      const d = cfgVal?.dokumenteDir || ''
      setBaseDir(d)
      setKundenDatenDir(d ? `${d.replace(/\\+$/,'')}\\KundenDaten` : '')
      const lists = await window.docgen?.getLists?.()
      if (lists?.kunden) setKunden(lists.kunden)
      if (lists?.betreuer) setBetreuer(lists.betreuer)
    })()
  }, [])

  const kundenKeys = useMemo(() => (kunden.length ? Object.keys(kunden[0]) : []), [kunden])
  const { settings: kundenSettings } = useTableSettings('kunden', kundenKeys)
  const names = useMemo(() => {
    if (!kunden.length) return [] as string[]
    const vorKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
    return kunden.map((row: any) => `${String(vorKey ? row[vorKey] || '' : '').trim()} ${String(nachKey ? row[nachKey] || '' : '').trim()}`.trim()).filter(Boolean)
  }, [kunden, kundenKeys, kundenSettings])

  async function refreshStructure() {
    if (!baseDir || !names.length) { setListe([]); return }
    const res = await window.api?.folders?.listForPersons?.({ baseDir, personType: 'kunden', names })
    setListe(res?.ok ? (res?.result || []) : [])
  }

  useEffect(() => {
    if (baseDir && names.length) { void refreshStructure() }
  }, [baseDir, names.join('|')])

  const sortedListe = useMemo(() => {
    const nachKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
    if (!nachKey) return liste
    return [...liste].sort((a, b) => {
      const rowA = kunden[names.findIndex(n => n === a.name)]
      const rowB = kunden[names.findIndex(n => n === b.name)]
      const nachA = rowA ? String(rowA[nachKey] || '').trim() : ''
      const nachB = rowB ? String(rowB[nachKey] || '').trim() : ''
      return nachA.localeCompare(nachB)
    })
  }, [liste, kunden, names, kundenKeys, kundenSettings])

  function formatDisplay(n: string) {
    const parts = String(n || '').split(' ').filter(Boolean)
    if (parts.length >= 2) return `${parts[1]} ${parts[0]}`
    return n
  }

  function replacePlaceholders(tpl: string, row: any): string {
    const vorKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
    const b1Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer1'))
    const b2Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer2'))
    const vor = String(vorKey ? row[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row[nachKey] || '' : '').trim()
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
      .replace(/\{nb1\}/gi, nb1)
      .replace(/\{nb2\}/gi, nb2)
  }

  function getMissingCountFor(person: { name: string }, row: any): number {
    const rules = cfg?.folderTemplatesRules?.kunden || []
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
          <div style={{ fontWeight: 700, flex: 1 }}>Kunden-Daten Verwaltung</div>
          <div>
            <button onClick={() => window.api?.openFolderDialog?.('kunden')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>Ordner-Management</button>
          </div>
        </div>
        {(!baseDir || liste.length === 0) && (
          <>
            <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
              Dokumente-Ordner: {baseDir || 'nicht gesetzt'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Erwarteter Unterordner: {kundenDatenDir || '—'}
            </div>
          </>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {sortedListe.map(p => {
            const row = kunden[names.findIndex(n => n === p.name)]
            const missing = row ? getMissingCountFor(p, row) : 0
            return (
            <details key={p.name} style={{ background: '#ffffff', border: '1px solid #e6e8ef', borderRadius: 8, padding: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1 }}>{formatDisplay(p.name)} {p.exists ? '' : '(Ordner fehlt)'}</span>
                {missing > 0 && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 12, border: '1px solid #fecaca' }}>{missing}</span>
                )}
              </summary>
              {!!p.subfolders.length && (
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  {p.subfolders.map(sf => {
                    const rules = (cfg?.folderTemplatesRules?.kunden || []) as Array<{ path: string[]; files: string[] }>
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


