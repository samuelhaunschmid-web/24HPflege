import { useMemo, useState } from 'react'

type Props = {
  daten: Record<string, any>[]
  displayNames?: Record<string, string>
  wichtigeFelder?: string[]
  ausblenden?: string[]
  tableId?: 'kunden' | 'betreuer'
  onChanged?: () => void
  makeTitle?: (row: Record<string, any>, index: number) => string
}

export default function TabelleDropdownZeilen({ daten, displayNames = {}, wichtigeFelder = [], ausblenden = ['__display'], tableId, onChanged, makeTitle }: Props) {
  const [offenIndex, setOffenIndex] = useState<number | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const keys = useMemo(() => {
    if (!daten || daten.length === 0) return []
    return Object.keys(daten[0]).filter(k => !ausblenden.includes(k))
  }, [daten, ausblenden])

  if (!daten || daten.length === 0) return <div>Keine Daten vorhanden.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {daten.map((row, i) => {
        const title = (makeTitle ? makeTitle(row, i) : null) || row.__display || `${i+1}. Eintrag`
        const istOffen = offenIndex === i
        const leereWichtigeAnzahl = keys.filter(k => wichtigeFelder.includes(k) && (row[k] == null || row[k] === '')).length
        return (
          <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: '100%' }}>
            <div style={{ width: '100%', padding: '10px 12px', background: '#f7f9fc', position: 'relative' }}>
              <div onClick={() => setOffenIndex(istOffen ? null : i)} style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none', paddingRight: 56, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {!istOffen && leereWichtigeAnzahl > 0 && (
                  <div title="Leere wichtige Felder" style={{ background: '#b00020', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{leereWichtigeAnzahl}</div>
                )}
                {istOffen && (
                  editIndex === i ? (
                    <>
                      <button title="Speichern" onClick={async (e) => {
                        e.stopPropagation()
                        if (!tableId) { setEditIndex(null); return }
                        const __key = row.__key
                        const updates: any = {}
                        keys.forEach(k => { if (!k.startsWith('__') && editValues[k] !== undefined) updates[k] = editValues[k] })
                        if (tableId === 'kunden') await window.db?.kundenUpdate?.({ __key, updates })
                        if (tableId === 'betreuer') await window.db?.betreuerUpdate?.({ __key, updates })
                        setEditIndex(null); setEditValues({})
                        onChanged?.()
                      }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a7f2e" xmlns="http://www.w3.org/2000/svg"><path d="M20.285 2.859l-11.4 11.4-5.657-5.657-2.828 2.828 8.485 8.485 14.228-14.228-2.828-2.828z"/></svg>
                      </button>
                      <button title="Abbrechen" onClick={(e) => { e.stopPropagation(); setEditIndex(null); setEditValues({}) }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#b00020" xmlns="http://www.w3.org/2000/svg"><path d="M18.3 5.71L12 12.01 5.7 5.71 4.29 7.12 10.59 13.42 4.29 19.71 5.7 21.12 12 14.83 18.29 21.12 19.7 19.71 13.41 13.42 19.71 7.12z"/></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button title="Bearbeiten" onClick={(e) => { e.stopPropagation(); setEditIndex(i); setEditValues({}) }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#333" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                      <button title="Löschen" onClick={async (e) => {
                        e.stopPropagation()
                        if (!tableId) return
                        if (!confirm('Diesen Eintrag wirklich löschen?')) return
                        const __key = row.__key
                        if (tableId === 'kunden') await window.db?.kundenDelete?.(__key)
                        if (tableId === 'betreuer') await window.db?.betreuerDelete?.(__key)
                        onChanged?.()
                      }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#b00020" xmlns="http://www.w3.org/2000/svg"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z"/></svg>
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
            {istOffen && (
              <div style={{ padding: '10px 12px', background: '#fff' }}>
                {editIndex === i ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: 8, overflow: 'hidden' }}>
                    {keys.map(k => {
                      const isMeta = k.startsWith('__')
                      if (isMeta) return null
                      return [
                        <div key={`${i}-e-${k}-label`} style={{ padding: '8px 10px', borderRight: '1px solid #eee', borderBottom: '1px solid #eee', background: '#fafafa' }}>{displayNames[k] || k}</div>,
                        <div key={`${i}-e-${k}-input`} style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
                          <input
                            style={{ width: '100%' }}
                            value={String(editValues[k] ?? row[k] ?? '')}
                            onChange={(e)=> setEditValues(prev => ({ ...prev, [k]: e.currentTarget?.value ?? '' }))}
                          />
                        </div>
                      ]
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: 8, overflow: 'hidden' }}>
                    {(() => {
                      const items = keys.map(k => {
                        const value = row[k]
                        const isEmpty = value == null || value === ''
                        const showEmpty = wichtigeFelder.includes(k)
                        const show = !isEmpty || showEmpty
                        const highlight = showEmpty && isEmpty
                        return { k, value, isEmpty, showEmpty, show, highlight }
                      }).filter(x => x.show)
                      // Wichtig & leer zuerst
                      items.sort((a,b)=> (b.highlight?1:0) - (a.highlight?1:0))
                      return items.flatMap(({k, value, highlight, isEmpty}) => {
                        const labelStyle = {
                          padding: '8px 10px',
                          borderRight: '1px solid #eee',
                          borderBottom: '1px solid #eee',
                          background: highlight ? '#fee2e2' : '#fafafa',
                          color: '#444'
                        } as React.CSSProperties
                        const valueStyle = {
                          padding: '6px 8px',
                          borderBottom: '1px solid #eee',
                          whiteSpace: 'nowrap',
                          background: highlight ? '#fee2e2' : '#fff'
                        } as React.CSSProperties
                        const text = isEmpty ? '' : String(value)
                        return [
                          <div key={`${i}-${k}-label`} style={labelStyle}>{displayNames[k] || k}</div>,
                          <div key={`${i}-${k}-value`} style={valueStyle}>{text}</div>
                        ]
                      })
                    })()}
                  </div>
                )}
                
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


