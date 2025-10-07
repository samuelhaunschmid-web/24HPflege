import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import CountBadge from '../komponenten/CountBadge'
import ArchivDropdownZeilen from '../komponenten/ArchivDropdownZeilen'

export default function ArchivierteBetreuer() {
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    ;(async () => {
      const list = await (window as any).db?.archivBetreuerList?.()
      setBetreuer(list || [])
    })()
  }, [])

  const sorted = useMemo(() => [...betreuer].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [betreuer])
  const gefiltert = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    const vorCol = sorted.length ? Object.keys(sorted[0]).find(k => /Vor\.Nam|vor|vorname/i.test(k)) : null
    const nachCol = sorted.length ? Object.keys(sorted[0]).find(k => /Fam\. Nam|nach|nachname|familien/i.test(k)) : null
    return sorted.filter(r => {
      const vor = vorCol ? String(r[vorCol]||'') : ''
      const nach = nachCol ? String(r[nachCol]||'') : ''
      const a = `${nach} ${vor}`.trim().toLowerCase()
      const b = `${vor} ${nach}`.trim().toLowerCase()
      const disp = String(r.__display||'').toLowerCase()
      return a.includes(q) || b.includes(q) || disp.includes(q)
    })
  }, [sorted, query])

  async function refresh() {
    const list = await (window as any).db?.archivBetreuerList?.()
    setBetreuer(list || [])
  }

  return (
    <Layout>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Archivierte Betreuer</h2>
          <CountBadge count={gefiltert.length} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <input placeholder="Suchen" value={query} onChange={e=> setQuery(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} />
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 12 }}>
          {!gefiltert.length && (
            <div style={{ padding: 16, color: '#64748b' }}>
              Kein Eintrag
              <DebugBox />
            </div>
          )}
          {!!gefiltert.length && (
            <ArchivDropdownZeilen
              daten={gefiltert}
              makeTitle={(row)=> {
                const keys = Object.keys(row)
                const vorCol = keys.find(k => /Vor\.Nam|vor|vorname/i.test(k))
                const nachCol = keys.find(k => /Fam\. Nam|nach|nachname|familien/i.test(k))
                const vor = vorCol ? String(row[vorCol]||'') : ''
                const nach = nachCol ? String(row[nachCol]||'') : ''
                const full = `${nach} ${vor}`.trim()
                return full || row.__display || row.__key
              }}
              rechtsAktionen={(row)=> (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button title="Wiederherstellen" onClick={async () => { await (window as any).db?.betreuerRestore?.(row.__key); await refresh() }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}>Wiederherstellen</button>
                  <button title="Endgültig löschen" onClick={async () => { if (confirm('Diesen Eintrag endgültig löschen?')) { await (window as any).db?.archivBetreuerDelete?.(row.__key); await refresh() } }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Löschen</button>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}

function DebugBox() {
  const [dbg, setDbg] = useState<any | null>(null)
  useEffect(() => { (async()=> setDbg(await (window as any).db?.archivDebug?.()))() }, [])
  if (!dbg) return null
  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: 12, color: '#334155' }}>
      <div><b>Alt-Ordner</b>: {dbg.altDir}</div>
      <div><b>Kunden-Datei</b>: {dbg.kundenPath} {dbg.kundenExists ? '✓' : '✗ nicht gefunden'}</div>
      <div><b>Betreuer-Datei</b>: {dbg.betreuerPath} {dbg.betreuerExists ? '✓' : '✗ nicht gefunden'}</div>
    </div>
  )
}


