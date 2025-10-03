import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  kundenListe?: any[]
  kundenGruppen?: Record<string, SpaltenGruppe[]>
  openRowId?: string | null
}

export default function TabelleDropdownZeilen({ daten, displayNames = {}, wichtigeFelder = [], ausblenden = ['__display'], tableId, onChanged, makeTitle, gruppen = {}, vorhandeneVorwahlen = [], betreuerListe = [], kundenListe = [], kundenGruppen = {}, openRowId = null }: Props) {
  const navigate = useNavigate()
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

  // Öffne das Dropdown für die übergebene Row-ID
  useEffect(() => {
    if (openRowId && daten.length > 0) {
      const rowIndex = daten.findIndex(row => row.__key === openRowId)
      if (rowIndex !== -1) {
        setOffenIndex(rowIndex)
        // Scrolle zum geöffneten Dropdown nach einem kurzen Delay
        setTimeout(() => {
          const element = document.getElementById(`dropdown-${openRowId}`)
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            })
          }
        }, 100)
      }
    }
  }, [openRowId, daten])

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


  function handleBetreuerClick(betreuerName: string) {
    // Navigiere zur Betreuer-Seite mit dem Betreuer-Namen als URL-Parameter
    navigate(`/betreuer?open=${encodeURIComponent(betreuerName)}`)
  }

  function handleKundeClick(kundeName: string) {
    // Navigiere zur Kunden-Seite mit dem Kunden-Namen als URL-Parameter
    navigate(`/kunden?open=${encodeURIComponent(kundeName)}`)
  }

  function getZugeordneteKunden(betreuerName: string) {
    if (!kundenListe || kundenListe.length === 0) return []
    
    const zugeordneteKunden: Array<{ kunde: any, position: 1 | 2 }> = []
    
    // Verwende die Kunden-Gruppen-Konfiguration
    const kundenKeys = kundenListe.length > 0 ? Object.keys(kundenListe[0]) : []
    const betreuer1Key = kundenKeys.find(k => (kundenGruppen[k] || []).includes('betreuer1'))
    const betreuer2Key = kundenKeys.find(k => (kundenGruppen[k] || []).includes('betreuer2'))
    
    kundenListe.forEach(kunde => {
      // Prüfe Betreuer 1
      if (betreuer1Key) {
        const betreuer1Name = String(kunde[betreuer1Key] || '').trim()
        if (betreuer1Name && betreuer1Name === betreuerName) {
          zugeordneteKunden.push({ kunde, position: 1 })
        }
      }
      
      // Prüfe Betreuer 2
      if (betreuer2Key) {
        const betreuer2Name = String(kunde[betreuer2Key] || '').trim()
        if (betreuer2Name && betreuer2Name === betreuerName) {
          zugeordneteKunden.push({ kunde, position: 2 })
        }
      }
    })
    
    return zugeordneteKunden
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
          <div 
            key={i} 
            id={`dropdown-${row.__key}`}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: '100%' }}
          >
            <div style={{ width: '100%', padding: '10px 12px', background: '#f7f9fc', position: 'relative' }}>
              <div onClick={() => setOffenIndex(istOffen ? null : i)} style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none', paddingRight: 56, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              
              {/* Betreuer-Anzeige in der Mitte für Kunden */}
              {!istOffen && tableId === 'kunden' && (
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: '50%', 
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  {(() => {
                    const betreuer1Key = getBetreuerFieldKey(1)
                    const betreuer2Key = getBetreuerFieldKey(2)
                    const betreuer1 = betreuer1Key ? String(row[betreuer1Key] || '') : ''
                    const betreuer2 = betreuer2Key ? String(row[betreuer2Key] || '') : ''
                    
                    if (!betreuer1 && !betreuer2) return null
                    
                    return (
                      <>
                        {betreuer1 && (
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '2px 6px',
                              background: '#e3f2fd',
                              borderRadius: '4px',
                              border: '1px solid #bbdefb',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBetreuerClick(betreuer1)
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#bbdefb'
                              e.currentTarget.style.transform = 'scale(1.02)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e3f2fd'
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                            title="Klicken um Betreuer zu öffnen"
                          >
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: '#3b82f6' 
                            }} />
                            <span style={{ 
                              color: '#1976d2',
                              fontWeight: '500'
                            }}>{betreuer1}</span>
                          </div>
                        )}
                        {betreuer2 && (
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '2px 6px',
                              background: '#e8f5e8',
                              borderRadius: '4px',
                              border: '1px solid #c8e6c9',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBetreuerClick(betreuer2)
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#c8e6c9'
                              e.currentTarget.style.transform = 'scale(1.02)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e8f5e8'
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                            title="Klicken um Betreuer zu öffnen"
                          >
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: '#10b981' 
                            }} />
                            <span style={{ 
                              color: '#2e7d32',
                              fontWeight: '500'
                            }}>{betreuer2}</span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Kunden-Anzeige in der Mitte für Betreuer */}
              {!istOffen && tableId === 'betreuer' && (() => {
                const betreuerName = row.__display || ''
                const zugeordneteKunden = getZugeordneteKunden(betreuerName)
                
                if (zugeordneteKunden.length === 0) return null
                
                return (
                  <div style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    top: '50%', 
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {zugeordneteKunden.map(({ kunde, position }, index) => (
                      <div 
                        key={index}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 6px',
                          background: position === 1 ? '#e8f5e8' : '#fff3e0',
                          borderRadius: '4px',
                          border: position === 1 ? '1px solid #c8e6c9' : '1px solid #ffcc02',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleKundeClick(kunde.__display || '')
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = position === 1 ? '#c8e6c9' : '#ffcc02'
                          e.currentTarget.style.transform = 'scale(1.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = position === 1 ? '#e8f5e8' : '#fff3e0'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: position === 1 ? '#4caf50' : '#ff9800'
                        }} />
                        <span>{kunde.__display || ''}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>({position})</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
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
                        const highlightEmpty = showEmpty && isEmpty
                        const highlightFilled = showEmpty && !isEmpty
                        return { k, value, isEmpty, showEmpty, show, highlightEmpty, highlightFilled }
                      }).filter(x => x.show)
                      // Wichtig & leer zuerst, dann wichtig & gefüllt
                      items.sort((a,b)=> {
                        if (a.highlightEmpty && !b.highlightEmpty) return -1
                        if (!a.highlightEmpty && b.highlightEmpty) return 1
                        if (a.highlightFilled && !b.highlightFilled) return -1
                        if (!a.highlightFilled && b.highlightFilled) return 1
                        return 0
                      })
                      return items.flatMap(({k, value, highlightEmpty, highlightFilled, isEmpty}) => {
                        const labelStyle = {
                          padding: '8px 10px',
                          borderRight: '1px solid #eee',
                          borderBottom: '1px solid #eee',
                          background: highlightEmpty ? '#fee2e2' : highlightFilled ? '#dcfce7' : '#fafafa',
                          color: highlightEmpty ? '#dc2626' : highlightFilled ? '#16a34a' : '#444',
                          fontWeight: (highlightEmpty || highlightFilled) ? '600' : 'normal'
                        } as React.CSSProperties
                        const valueStyle = {
                          padding: '6px 8px',
                          borderBottom: '1px solid #eee',
                          whiteSpace: 'nowrap',
                          background: highlightEmpty ? '#fee2e2' : highlightFilled ? '#dcfce7' : '#fff',
                          color: highlightEmpty ? '#dc2626' : highlightFilled ? '#16a34a' : '#333',
                          fontWeight: highlightFilled ? '500' : 'normal'
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
          
          if (!betreuerKey || !anfangsKey) {
            console.error('Betreuer- oder Anfangs-Feld nicht gefunden!')
            return false
          }
          
          // Verwende den vollständigen Namen aus __display (derselbe wie im Dropdown)
          const betreuerName = betreuer.__display || 'Unbekannter Betreuer'
          
          const updates: any = {}
          updates[betreuerKey] = betreuerName
          updates[anfangsKey] = anfangsdatum
          
          if (tableId === 'kunden') {
            await window.db?.kundenUpdate?.({ __key, updates })
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


