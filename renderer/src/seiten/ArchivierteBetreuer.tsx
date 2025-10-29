import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import CountBadge from '../komponenten/CountBadge'
import ArchivDropdownZeilen from '../komponenten/ArchivDropdownZeilen'
import { useTableSettings } from '../komponenten/useTableSettings'

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
  const keys = useMemo(()=> sorted.length ? Object.keys(sorted[0]) : [], [sorted])
  const { isInGruppe, settings } = useTableSettings('betreuer', keys)
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
            <input placeholder="Suchen" value={query} onChange={e=> setQuery(e.target.value)} style={{ 
              padding: '8px 12px', 
              border: '1px solid #d1d5db', 
              borderRadius: 8,
              fontSize: '14px',
              fontFamily: 'inherit',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              boxSizing: 'border-box'
            }} />
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
              rechtsAktionen={(row)=> {
                const rowKeys = Object.keys(row)
                const resolveKey = (grp: 'anfang'|'ende') => {
                  // nur explizite Zuordnungen verwenden
                  const direct = rowKeys.find(k => isInGruppe(k as any, grp))
                  if (direct) return direct
                  const fromSettings = settings ? Object.keys(settings.gruppen||{}).find(k => (settings.gruppen[k]||[]).includes(grp) && rowKeys.includes(k)) : undefined
                  return fromSettings
                }
                const anfangKey = resolveKey('anfang')
                const endeKey = resolveKey('ende')
                const fmt = (val: string) => {
                  const d = String(val||'').replace(/\D+/g,'')
                  return d.length===8 ? `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4,8)}` : String(val||'')
                }
                const parse = (val: string) => {
                  const d = String(val||'').replace(/\D+/g,'')
                  if (d.length!==8) return null
                  const dd = Number(d.slice(0,2)), mm = Number(d.slice(2,4))-1, yy = Number(d.slice(4,8))
                  const dt = new Date(yy, mm, dd)
                  return isNaN(dt.getTime()) ? null : dt
                }
                const aText = anfangKey ? fmt(row[anfangKey]) : ''
                const eText = endeKey ? fmt(row[endeKey]) : ''
                const aDate = anfangKey ? parse(row[anfangKey]) : null
                const eDate = endeKey ? parse(row[endeKey]) : null
                let diffText = ''
                if (aDate && eDate && eDate >= aDate) {
                  let y = eDate.getFullYear() - aDate.getFullYear()
                  let m = eDate.getMonth() - aDate.getMonth()
                  let d = eDate.getDate() - aDate.getDate()
                  if (d < 0) { m -= 1; const prevMonth = new Date(eDate.getFullYear(), eDate.getMonth(), 0).getDate(); d += prevMonth }
                  if (m < 0) { y -= 1; m += 12 }
                  const w = Math.floor(d / 7)
                  diffText = `${y}y ${m}m ${w}w`
                }
                const show = (aText || eText)
                return (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {show && (
                    <div title="Zeitraum" style={{ padding: '4px 8px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fdba74', color: '#b45309', fontSize: 12 }}>
                      {(aText||'?')} - {(eText||'?')} {diffText ? `(${diffText})` : ''}
                    </div>
                  )}
                  <button title="Wiederherstellen" onClick={async () => { await (window as any).db?.betreuerRestore?.(row.__key); await refresh() }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}>Wiederherstellen</button>
                  <button title="Endgültig löschen" onClick={async () => { if (confirm('Diesen Eintrag endgültig löschen?')) { await (window as any).db?.archivBetreuerDelete?.(row.__key); await refresh() } }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Löschen</button>
                </div>
              )}}
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


