import { useMemo, useState } from 'react'
import type { SpaltenGruppe } from './useTableSettings'
import NeuerEintragDialog from './NeuerEintragDialog'
import BetreuerZuweisungDialog from './BetreuerZuweisungDialog'

type Props = {
  daten: Record<string, any>[]
  displayNames?: Record<string, string>
  wichtigeFelder?: string[]
  ausblenden?: string[]
  tableId?: 'kunden' | 'betreuer'
  onChanged?: () => void
  makeTitle?: (row: Record<string, any>, index: number) => string
  gruppen?: Record<string, SpaltenGruppe[]>
  vorhandeneVorwahlen?: string[]
  betreuerListe?: any[]
}

export default function TabelleDropdownZeilen({ daten, displayNames = {}, wichtigeFelder = [], ausblenden = ['__display'], tableId, onChanged, makeTitle, gruppen = {}, vorhandeneVorwahlen = [], betreuerListe = [] }: Props) {
  const [offenIndex, setOffenIndex] = useState<number | null>(null)
  const [bearbeitenOffen, setBearbeitenOffen] = useState(false)
  const [bearbeitenRow, setBearbeitenRow] = useState<Record<string, any> | null>(null)
  const [betreuerDialogOffen, setBetreuerDialogOffen] = useState(false)
  const [betreuerDialogRow, setBetreuerDialogRow] = useState<Record<string, any> | null>(null)
  const [betreuerDialogNummer, setBetreuerDialogNummer] = useState<1 | 2>(1)
  const keys = useMemo(() => {
    if (!daten || daten.length === 0) return []
    return Object.keys(daten[0]).filter(k => !ausblenden.includes(k))
  }, [daten, ausblenden])

  const hasData = !!(daten && daten.length > 0)

  function isFieldEmptyForRow(row: Record<string, any>, key: string): boolean {
    const value = row[key]
    if ((gruppen[key]||[]).includes('svnr')) {
      const digits = String(value ?? '').replace(/\D+/g,'')
      return digits.length !== 10
    }
    return value == null || value === ''
  }

  function isBetreuerFieldEmpty(row: Record<string, any>, betreuerNummer: 1 | 2): boolean {
    const betreuerKey = getBetreuerFieldKey(betreuerNummer)
    return !betreuerKey || isFieldEmptyForRow(row, betreuerKey)
  }

  function getBetreuerFieldKey(betreuerNummer: 1 | 2): string | undefined {
    // Verwende die Zuordnungen aus den TabellenEinstellungen
    const betreuerGruppe = `betreuer${betreuerNummer}` as SpaltenGruppe
    return keys.find(k => (gruppen[k] || []).includes(betreuerGruppe))
  }

  function getAnfangsFieldKey(betreuerNummer: 1 | 2): string | undefined {
    // Verwende die Zuordnungen aus den TabellenEinstellungen
    const anfangsGruppe = `betreuer${betreuerNummer}_anfang` as SpaltenGruppe
    return keys.find(k => (gruppen[k] || []).includes(anfangsGruppe))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {!hasData && (
        <div>Keine Daten vorhanden.</div>
      )}
      {hasData && daten.map((row, i) => {
        const title = (makeTitle ? makeTitle(row, i) : null) || row.__display || `${i+1}. Eintrag`
        const istOffen = offenIndex === i
        const leereWichtigeAnzahl = keys.filter(k => wichtigeFelder.includes(k) && isFieldEmptyForRow(row, k)).length
        return (
          <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: '100%' }}>
            <div style={{ width: '100%', padding: '10px 12px', background: '#f7f9fc', position: 'relative' }}>
              <div onClick={() => setOffenIndex(istOffen ? null : i)} style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none', paddingRight: 56, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {!istOffen && leereWichtigeAnzahl > 0 && (
                  <div title="Leere wichtige Felder" style={{ background: '#b00020', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{leereWichtigeAnzahl}</div>
                )}
                {!istOffen && tableId === 'kunden' && (
                  <>
                    {isBetreuerFieldEmpty(row, 1) && (
                      <button 
                        title="Betreuer 1 zuweisen" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setBetreuerDialogRow(row); 
                          setBetreuerDialogNummer(1); 
                          setBetreuerDialogOffen(true); 
                        }} 
                        style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          <path d="M16 8h2v2h-2zM18 6h-2v2h2z" fill="#1d4ed8"/>
                        </svg>
                      </button>
                    )}
                    {isBetreuerFieldEmpty(row, 2) && (
                      <button 
                        title="Betreuer 2 zuweisen" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setBetreuerDialogRow(row); 
                          setBetreuerDialogNummer(2); 
                          setBetreuerDialogOffen(true); 
                        }} 
                        style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          <path d="M16 8h2v2h-2zM18 6h-2v2h2z" fill="#059669"/>
                        </svg>
                      </button>
                    )}
                  </>
                )}
                {istOffen && (
                    <>
                      <button title="Bearbeiten" onClick={(e) => { e.stopPropagation(); setBearbeitenRow(row); setBearbeitenOffen(true) }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
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
                )}
              </div>
            </div>
            {istOffen && (
              <div style={{ padding: '10px 12px', background: '#fff' }}>
                {
                  <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: 8, overflow: 'hidden' }}>
                    {(() => {
                      const items = keys.map(k => {
                        const value = row[k]
                        const isEmpty = isFieldEmptyForRow(row, k)
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
                        let text = isEmpty ? '' : String(value)
                        // format display for datum
                        if ((gruppen[k]||[]).includes('datum') && text) {
                          const digits = text.replace(/\D+/g,'')
                          if (digits.length === 8) text = `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4,8)}`
                        }
                        return [
                          <div key={`${i}-${k}-label`} style={labelStyle}>{displayNames[k] || k}</div>,
                          <div key={`${i}-${k}-value`} style={valueStyle}>{text}</div>
                        ]
                      })
                    })()}
                  </div>
                }
                
              </div>
            )}
          </div>
        )
      })}
      <NeuerEintragDialog
        offen={bearbeitenOffen}
        onClose={()=> { setBearbeitenOffen(false); setBearbeitenRow(null) }}
        keys={keys}
        displayNames={displayNames}
        titel="Eintrag bearbeiten"
        initialValues={bearbeitenRow || undefined}
        gruppen={gruppen}
        vorhandeneVorwahlen={vorhandeneVorwahlen}
        vorlagenWerte={useMemo(()=>{
          const res: Record<string,string[]> = {}
          keys.forEach(k=>{
            if ((gruppen[k]||[]).includes('vorlage')) {
              const vals = Array.from(new Set(daten.map(r => String(r[k]||'')).filter(Boolean)))
              res[k] = vals
            }
          })
          return res
        }, [daten, keys, gruppen])}
        onSpeichern={async (werte)=>{
          if (!tableId || !bearbeitenRow) return
          const __key = bearbeitenRow.__key
          const updates: any = {}
          keys.forEach(k => { if (!k.startsWith('__') && werte[k] !== undefined && werte[k] !== bearbeitenRow[k]) updates[k] = werte[k] })
          if (Object.keys(updates).length === 0) return
          if (tableId === 'kunden') await window.db?.kundenUpdate?.({ __key, updates })
          if (tableId === 'betreuer') await window.db?.betreuerUpdate?.({ __key, updates })
          onChanged?.()
          return true
        }}
      />
      
      <BetreuerZuweisungDialog
        isOpen={betreuerDialogOffen}
        onClose={() => {
          setBetreuerDialogOffen(false)
          setBetreuerDialogRow(null)
        }}
        onAssign={async (betreuer, anfangsdatum) => {
          if (!betreuerDialogRow || !tableId) return false
          
          const __key = betreuerDialogRow.__key
          const betreuerKey = getBetreuerFieldKey(betreuerDialogNummer)
          const anfangsKey = getAnfangsFieldKey(betreuerDialogNummer)
          
          console.log('Debug Betreuer-Zuweisung:', {
            betreuerDialogNummer,
            betreuerKey,
            anfangsKey,
            gruppen,
            keys,
            betreuerDialogRow
          })
          
          if (!betreuerKey || !anfangsKey) {
            console.error('Betreuer- oder Anfangs-Feld nicht gefunden!', {
              betreuerKey,
              anfangsKey,
              gruppen,
              keys
            })
            return false
          }
          
          // Verwende den vollständigen Namen aus __display (derselbe wie im Dropdown)
          const betreuerName = betreuer.__display || 'Unbekannter Betreuer'
          
          console.log('Betreuer-Daten:', {
            betreuer,
            betreuerName,
            __display: betreuer.__display
          })
          
          const updates: any = {}
          updates[betreuerKey] = betreuerName
          updates[anfangsKey] = anfangsdatum
          
          console.log('Updates vor dem Speichern:', updates)
          
          if (tableId === 'kunden') {
            const result = await window.db?.kundenUpdate?.({ __key, updates })
            console.log('Update result:', result)
          }
          
          onChanged?.()
          return true
        }}
        betreuerListe={betreuerListe}
        betreuerNummer={betreuerDialogNummer}
        kundeName={betreuerDialogRow ? (makeTitle ? makeTitle(betreuerDialogRow, 0) : betreuerDialogRow.__display || 'Unbekannt') : ''}
      />
    </div>
  )
}


