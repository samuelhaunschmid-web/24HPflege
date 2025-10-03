import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'

export default function Rechnungen() {
  const [files, setFiles] = useState<Array<{ name: string; absPath: string }>>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [selected, setSelected] = useState<Record<string, { mode: 'monat' | 'ind'; von?: string; bis?: string }>>({})
  const [monat, setMonat] = useState<number>(new Date().getMonth()+1)
  const [jahr, setJahr] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    ;(async () => {
      const templates = await window.docgen?.listInvoiceTemplates?.()
      if (Array.isArray(templates)) setFiles(templates)
      const lists = await window.docgen?.getLists?.(); if (lists?.kunden) setKunden(lists.kunden)
    })()
  }, [])

  const sortedKunden = useMemo(() => [...kunden].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [kunden])
  const selectedKeys = useMemo(()=> Object.entries(selected).filter(([_,v])=> v!=null).map(([k])=>k), [selected])

  async function handleGenerate() {
    if (selectedKeys.length === 0) return alert('Bitte Kunden auswählen')
    const dir = await window.api?.chooseDirectory?.('Zielordner wählen'); if (!dir) return
    const individualRanges: any = {}
    Object.entries(selected).forEach(([key, v]) => { if (v.mode==='ind' && v.von && v.bis) individualRanges[key] = { von: v.von, bis: v.bis } })
    const res = await window.docgen?.generateInvoices?.({
      selectedKundenKeys: selectedKeys,
      selectedVorlagenAbs: files.map(f=>f.absPath),
      targetDir: dir,
      month: monat,
      year: jahr,
      individualRanges,
    })
    if (res?.ok) alert(`Rechnungen erstellt. Neue Rechnungsnummer: ${res.currentRechnungsnummer}`)
  }

  return (
    <Layout>
      <h2>Rechnungen</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <label>Vorlagen</label>
          {files.length === 0 ? <div>Keine Rechnungsvorlagen gefunden.</div> : (
            <ul>
              {files.map(f => <li key={f.absPath}>{f.name}</li>)}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <label>Monat</label>
            <input type="number" value={monat} onChange={e=> setMonat(Number(e.currentTarget.value))} min={1} max={12} style={{ width: 100 }} />
            <label>Jahr</label>
            <input type="number" value={jahr} onChange={e=> setJahr(Number(e.currentTarget.value))} min={2000} max={2100} style={{ width: 120 }} />
          </div>
        </div>
        <div>
          <label>Kundenauswahl</label>
          <div style={{ display: 'grid', gap: 8, border: '1px solid #ddd', borderRadius: 8, padding: 12, maxHeight: 420, overflow: 'auto' }}>
            {sortedKunden.map(k => {
              const sel = selected[k.__key] || { mode: 'monat' as const }
              return (
                <div key={k.__key} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!selected[k.__key]}
                      onChange={() => setSelected(prev => {
                        const exists = !!prev[k.__key]
                        const copy = { ...prev }
                        if (exists) {
                          delete copy[k.__key]
                        } else {
                          copy[k.__key] = { mode: 'monat' }
                        }
                        return copy
                      })}
                    />
                    {k.__display}
                  </label>
                  {selected[k.__key] && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <label><input type="radio" name={`mode-${k.__key}`} checked={sel.mode==='monat'} onChange={()=> setSelected(p=> ({ ...p, [k.__key]: { mode: 'monat' } }))} /> Ganzer Monat</label>
                      <label><input type="radio" name={`mode-${k.__key}`} checked={sel.mode==='ind'} onChange={()=> setSelected(p=> ({ ...p, [k.__key]: { mode: 'ind', von: '', bis: '' } }))} /> Individuell</label>
                      {sel.mode==='ind' && (
                        <>
                          <label>Von</label>
                          <input type="date" onChange={e=> setSelected(p=> ({ ...p, [k.__key]: { ...sel, von: e.currentTarget.value } }))} />
                          <label>Bis</label>
                          <input type="date" onChange={e=> setSelected(p=> ({ ...p, [k.__key]: { ...sel, bis: e.currentTarget.value } }))} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <button onClick={handleGenerate}>Rechnungen generieren</button>
        </div>
      </div>
    </Layout>
  )
}


