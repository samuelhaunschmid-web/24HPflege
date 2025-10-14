import { useEffect, useMemo, useState } from 'react'
import { EU_VORWAHLEN, findeVorwahlLabel } from '../daten/vorwahlen-europa'
import type { SpaltenGruppe } from './useTableSettings'

type Props = {
  offen: boolean
  onClose: () => void
  keys: string[]
  displayNames?: Record<string,string>
  titel?: string
  onSpeichern: (row: Record<string, any>) => Promise<boolean | void> | void
  initialValues?: Record<string, any>
  gruppen?: Record<string, SpaltenGruppe[]>
  vorhandeneVorwahlen?: string[]
  vorlagenWerte?: Record<string, string[]>
  betreuerListe?: any[]
}

export default function NeuerEintragDialog({ offen, onClose, keys, displayNames = {}, titel = 'Neuer Eintrag', onSpeichern, initialValues, gruppen = {}, vorlagenWerte = {}, betreuerListe = [] }: Props) {
  const felder = useMemo(()=> keys.filter(k=> !k.startsWith('__')), [keys])
  const [werte, setWerte] = useState<Record<string, any>>({})
  const [openSuggestKey, setOpenSuggestKey] = useState<string | null>(null)

  // Standardisierte Input-Styles für konsistentes Design
  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const
  }

  // Split helpers for Telefon and SVNR - separate state for each phone field
  const [telefonStates, setTelefonStates] = useState<Record<string, { vorwahl: string; rest: string; oesterreich: { vorwahl: string; bereich: string; nummer: string } }>>({})
  const [svnrA, setSvnrA] = useState('')
  const [svnrB, setSvnrB] = useState('')
  // const [geburtsKey] = useState<string | null>(null) // Not used in current implementation

  useEffect(() => {
    if (!offen) return
    const init = initialValues ? { ...initialValues } : {}
    // Stelle sicher, dass alle Felder in werte vorhanden sind
    const allFields = felder.reduce((acc, k) => {
      acc[k] = init[k] ?? ''
      return acc
    }, {} as Record<string, any>)
    setWerte(allFields)
    // preset split values from initialValues for telefon/svnr - handle multiple phone fields
    const telefonKeys = felder.filter(k => (gruppen[k]||[]).some(g => g.includes('telefon')))
    const newTelefonStates: Record<string, { vorwahl: string; rest: string; oesterreich: { vorwahl: string; bereich: string; nummer: string } }> = {}
    telefonKeys.forEach(telKey => {
      if (typeof init[telKey] === 'string') {
        const fullNumber = String(init[telKey]).trim()
        
               // Check for Austrian format: +43 XXX XXXXXXX or +43 XXXX XXXXXX etc.
               const austrianMatch = fullNumber.match(/^(\+43)\s+(\d+)\s+(\d+)$/)
               if (austrianMatch) {
                 newTelefonStates[telKey] = { 
                   vorwahl: '+43', 
                   rest: '', 
                   oesterreich: { 
                     vorwahl: austrianMatch[1], 
                     bereich: austrianMatch[2], 
                     nummer: austrianMatch[3] 
                   }
                 }
               } else {
          // Regular format: +43 123456789 or similar
          const m = fullNumber.match(/^(\+?[\d]+)\s*(.*)$/)
          if (m) { 
            newTelefonStates[telKey] = { 
              vorwahl: m[1] || '', 
              rest: (m[2] || '').replace(/\s+/g,''),
              oesterreich: { vorwahl: '', bereich: '', nummer: '' }
            }
          } else { 
            newTelefonStates[telKey] = { 
              vorwahl: '', 
              rest: fullNumber,
              oesterreich: { vorwahl: '', bereich: '', nummer: '' }
            }
          }
        }
      } else {
        newTelefonStates[telKey] = { 
          vorwahl: '', 
          rest: '', 
          oesterreich: { vorwahl: '', bereich: '', nummer: '' }
        }
      }
    })
    setTelefonStates(newTelefonStates)
    const svKey = felder.find(k => (gruppen[k]||[]).some(g => g.includes('svnr')))
    if (svKey && typeof init[svKey] === 'string') {
      const clean = String(init[svKey]).replace(/\D+/g,'')
      if (clean.length <= 6) {
        setSvnrA('')
        setSvnrB(clean.slice(0,6))
      } else {
        setSvnrA(clean.slice(0,4))
        setSvnrB(clean.slice(4,10))
      }
    } else { setSvnrA(''); setSvnrB('') }
    const gk = felder.find(k => (gruppen[k]||[]).some(g => g.includes('geburtsdatum'))) || null
    // setGeburtsKey(gk) // Not used in current implementation
    if (gk && init[gk]) {
      const only = String(init[gk]).replace(/\D+/g,'')
      if (only.length >= 8) {
        const dd = only.slice(0,2), mm = only.slice(2,4), yy = only.slice(6,8)
        if (!svnrB) setSvnrB(`${dd}${mm}${yy}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen])

  function handleSave() {
    const result: Record<string, any> = { ...werte }
    // combine telefon for all phone fields
    const telefonKeys = felder.filter(k => (gruppen[k]||[]).some(g => g.includes('telefon')))
    telefonKeys.forEach(telKey => {
      const state = telefonStates[telKey]
      if (state) {
        // Check if Austrian format should be used
        if (state.vorwahl === '+43' && state.oesterreich.bereich && state.oesterreich.nummer) {
          result[telKey] = `+43 ${state.oesterreich.bereich} ${state.oesterreich.nummer}`
        } else {
          const combined = `${state.vorwahl}`.trim() + (state.rest ? ` ${state.rest}` : '')
          result[telKey] = combined.trim()
        }
      }
    })
    const svKey = felder.find(k => (gruppen[k]||[]).some(g => g.includes('svnr')))
    if (svKey) {
      const a = svnrA.replace(/\D+/g,'').slice(0,4)
      const b = svnrB.replace(/\D+/g,'').slice(0,6)
      result[svKey] = (a + b)
    }
    // normalize date format DD.MM.YYYY for date groups (datum/anfang/ende/betreuer*_anfang)
    felder.forEach(k => {
      const list = (gruppen[k]||[])
      const isBetAnfang = list.some(g => g.includes('betreuer') && g.includes('anfang'))
      if (list.includes('datum') || list.includes('anfang') || list.includes('ende') || isBetAnfang) {
        const raw = String(result[k] || '').trim()
        if (raw) {
          const only = raw.replace(/[^\d]/g,'')
          let d = only
          if (only.length === 8) {
            d = `${only.slice(0,2)}.${only.slice(2,4)}.${only.slice(4,8)}`
          }
          result[k] = d
        }
      }
    })
    return onSpeichern(result)
  }

  const vorwahlOptionen = useMemo(() => {
    // feste EU-Liste; optional bereits gesetzte benutzerdefinierte Vorwahl aufnehmen, falls nicht vorhanden
    const list = [...EU_VORWAHLEN]
    // collect all custom prefixes from all phone fields
    const customPrefixes = Object.values(telefonStates).map(s => s.vorwahl).filter(Boolean)
    customPrefixes.forEach(prefix => {
      if (!list.some(v => v.prefix === prefix)) {
        list.push({ iso2: 'XX', name: 'Benutzerdefiniert', prefix, flag: '🔧' })
      }
    })
    
    // Priorität für häufig verwendete Länder: Österreich, Deutschland, Rumänien, Slowakei, Tschechien
    const priorityCountries = ['AT', 'DE', 'RO', 'SK', 'CZ']
    const priorityList = list.filter(v => priorityCountries.includes(v.iso2))
    const otherList = list.filter(v => !priorityCountries.includes(v.iso2))
    
    // Sortierung: Priorität zuerst, dann alphabetisch
    return [
      ...priorityList.sort((a,b) => priorityCountries.indexOf(a.iso2) - priorityCountries.indexOf(b.iso2)),
      ...otherList.sort((a,b) => (a.name.localeCompare(b.name) || a.prefix.localeCompare(b.prefix)))
    ]
  }, [telefonStates])

  if (!offen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 800, maxWidth: '96vw', maxHeight: '92vh', background: '#fff', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #eee' }}>
          <strong>{titel}</strong>
          <button onClick={onClose}>Schließen</button>
        </div>
        <div style={{ padding: 12, overflow: 'auto', flex: '1 1 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {felder.map(k => {
              const gruppenList = (gruppen[k]||[])
              const isTel = gruppenList.some(g => g.includes('telefon'))
              const isSv = gruppenList.some(g => g.includes('svnr'))
              const isVorlage = gruppenList.some(g => g.includes('vorlage'))
              const isBetreuer1 = gruppenList.some(g => g.includes('betreuer1') && !g.includes('anfang'))
              const isBetreuer2 = gruppenList.some(g => g.includes('betreuer2') && !g.includes('anfang'))
              const isBetreuerAnfang = gruppenList.some(g => g.includes('betreuer') && g.includes('anfang'))
              const isGenericDate = gruppenList.includes('datum') || gruppenList.includes('anfang') || gruppenList.includes('ende') || isBetreuerAnfang
              const isDatum = isGenericDate
              const isReadonly = k.startsWith('__')
              const label = displayNames[k] || k
              
              return (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                  {isDatum ? (
                    <input
                      name={k}
                      placeholder="DD.MM.YYYY"
                      value={String(werte[k] ?? '')}
                      onChange={(e)=> {
                        const raw = (e?.currentTarget?.value ?? '')
                        const digits = raw.replace(/\D+/g,'').slice(0,8)
                        let formatted = digits
                        if (digits.length > 2 && digits.length <= 4) {
                          formatted = `${digits.slice(0,2)}.${digits.slice(2)}`
                        } else if (digits.length > 4) {
                          formatted = `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4)}`
                        }
                        setWerte(prev => ({ ...prev, [k]: formatted }))
                        if ((gruppen[k]||[]).includes('geburtsdatum')) {
                          if (digits.length === 8) {
                            const dd = digits.slice(0,2)
                            const mm = digits.slice(2,4)
                            const yy = digits.slice(6,8)
                            setSvnrB(`${dd}${mm}${yy}`)
                          }
                        }
                      }}
                      onBlur={(e)=> {
                        const raw = (e?.currentTarget?.value ?? '')
                        const d = raw.replace(/\D+/g,'')
                        if (d.length === 8) setWerte(prev => ({ ...prev, [k]: `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4,8)}` }))
                      }}
                      inputMode="numeric"
                      style={inputStyle}
                    />
                  ) : isTel ? (
                    <div>
                      {telefonStates[k]?.vorwahl === '+43' ? (
                        // Austrian format: +43 XXX XXXXXXX
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr', gap: 8, alignItems: 'stretch' }}>
                          <input
                            name={`${k}-vorwahl`}
                            value="+43"
                            disabled
                            style={{ ...inputStyle, background: '#f5f5f5', color: '#666' }}
                          />
                          <input
                            name={`${k}-bereich`}
                            value={telefonStates[k]?.oesterreich?.bereich || ''}
                            onChange={e=> {
                              const newValue = e.currentTarget.value.replace(/\D+/g,'')
                              setTelefonStates(prev => ({
                                ...prev,
                                [k]: { 
                                  ...prev[k], 
                                  oesterreich: { 
                                    ...prev[k]?.oesterreich, 
                                    bereich: newValue 
                                  }
                                }
                              }))
                            }}
                            inputMode="numeric"
                            placeholder="699"
                            style={inputStyle}
                          />
                          <input
                            name={`${k}-nummer`}
                            value={telefonStates[k]?.oesterreich?.nummer || ''}
                            onChange={e=> {
                              const newValue = e.currentTarget.value.replace(/\D+/g,'')
                              setTelefonStates(prev => ({
                                ...prev,
                                [k]: { 
                                  ...prev[k], 
                                  oesterreich: { 
                                    ...prev[k]?.oesterreich, 
                                    nummer: newValue 
                                  }
                                }
                              }))
                            }}
                            inputMode="numeric"
                            placeholder="1234567"
                            style={inputStyle}
                          />
                        </div>
                      ) : (
                        // Regular format: Vorwahl + Nummer
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'stretch' }}>
                          <input
                            name={`${k}-vorwahl`}
                            list={`${k}-vorwahl-list`}
                            value={telefonStates[k]?.vorwahl || ''}
                            onChange={e=> {
                              const newValue = e.currentTarget.value
                              setTelefonStates(prev => ({
                                ...prev,
                                [k]: { 
                                  ...prev[k], 
                                  vorwahl: newValue,
                                  oesterreich: { vorwahl: '', bereich: '', nummer: '' }
                                }
                              }))
                            }}
                            placeholder="Vorwahl"
                            style={inputStyle}
                          />
                          <datalist id={`${k}-vorwahl-list`}>
                            {vorwahlOptionen.map(v => (
                              <option key={`${v.iso2}-${v.prefix}`} value={v.prefix}>
                                {findeVorwahlLabel(v)}
                              </option>
                            ))}
                          </datalist>
                          <input 
                            name={`${k}-rest`} 
                            value={telefonStates[k]?.rest || ''} 
                            onChange={e=> {
                              const newValue = e.currentTarget.value.replace(/\D+/g,'')
                              setTelefonStates(prev => ({
                                ...prev,
                                [k]: { ...prev[k], rest: newValue }
                              }))
                            }} 
                            inputMode="numeric" 
                            placeholder="Nummer"
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>
                  ) : isSv ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, alignItems: 'stretch' }}>
                      <input 
                        name={`${k}-sv-a`} 
                        value={svnrA} 
                        onChange={e=> setSvnrA(e.currentTarget.value.replace(/\D+/g,'').slice(0,4))} 
                        inputMode="numeric" 
                        placeholder="1234"
                        style={inputStyle}
                      />
                      <input 
                        name={`${k}-sv-b`} 
                        value={svnrB} 
                        onChange={e=> setSvnrB(e.currentTarget.value.replace(/\D+/g,'').slice(0,6))} 
                        inputMode="numeric" 
                        placeholder="123456"
                        style={inputStyle}
                      />
                    </div>
                  ) : isVorlage ? (
                    <div style={{ position: 'relative' }}>
                      <input
                        name={k}
                        value={String(werte[k] ?? '')}
                        onChange={(e)=> { setWerte(prev => ({ ...prev, [k]: e.target.value })); setOpenSuggestKey(k) }}
                        onFocus={()=> setOpenSuggestKey(k)}
                        onBlur={()=> setTimeout(()=> setOpenSuggestKey(prev => prev===k ? null : prev), 120)}
                        placeholder="Vorlage eingeben oder auswählen"
                        style={inputStyle}
                        autoComplete="off"
                      />
                      {openSuggestKey === k && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2000, background: '#fff', border: '1px solid #ddd', borderRadius: 6, maxHeight: 260, overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', marginTop: 4 }}>
                          {(vorlagenWerte[k] || [])
                            .filter(v => String(v||'').toLowerCase().includes(String(werte[k]||'').toLowerCase()))
                            .map(v => (
                              <div
                                key={v}
                                onMouseDown={(e)=> { e.preventDefault(); setWerte(prev => ({ ...prev, [k]: v || '' })); setOpenSuggestKey(null) }}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                              >
                                {v}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (isBetreuer1 || isBetreuer2) ? (
                    <div style={{ position: 'relative' }}>
                      <input
                        name={k}
                        value={String(werte[k] ?? '')}
                        onChange={(e)=> { setWerte(prev => ({ ...prev, [k]: e.target.value })); setOpenSuggestKey(k) }}
                        onFocus={()=> setOpenSuggestKey(k)}
                        onBlur={()=> setTimeout(()=> setOpenSuggestKey(prev => prev===k ? null : prev), 120)}
                        placeholder="Betreuer eingeben oder auswählen"
                        style={inputStyle}
                        autoComplete="off"
                      />
                      {openSuggestKey === k && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2000, background: '#fff', border: '1px solid #ddd', borderRadius: 6, maxHeight: 260, overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', marginTop: 4 }}>
                          {betreuerListe
                            .filter(b => String(b.__display||'').toLowerCase().includes(String(werte[k]||'').toLowerCase()))
                            .slice()
                            .sort((a,b)=>{
                              const an = String(a.__display||'').trim();
                              const bn = String(b.__display||'').trim();
                              const al = an.split(/\s+/).slice(-1)[0].toLowerCase();
                              const bl = bn.split(/\s+/).slice(-1)[0].toLowerCase();
                              if (al === bl) return an.localeCompare(bn);
                              return al.localeCompare(bl);
                            })
                            .map(b => (
                              <div
                                key={b.__key}
                                onMouseDown={(e)=> { e.preventDefault(); setWerte(prev => ({ ...prev, [k]: b.__display || '' })); setOpenSuggestKey(null) }}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                              >
                                {b.__display || ''}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : isReadonly ? (
                    <div style={{ 
                      ...inputStyle,
                      background: '#f5f5f5', 
                      color: '#666',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div>{String(werte[k] ?? '') || 'Nicht editierbar'}</div>
                      {isBetreuerAnfang && (
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Betreuer-Anfangsdaten werden über die Betreuer-Zuweisung verwaltet
                        </div>
                      )}
                      {k.startsWith('__') && (
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Interne Felder sind nicht editierbar
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      name={k}
                      type="text"
                      value={String(werte[k] ?? '')}
                      autoComplete="off"
                      onChange={(e)=> {
                        const value = e.target.value
                        setWerte(prev => ({ ...prev, [k]: value }))
                      }}
                      style={inputStyle}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #eee' }}>
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7' }}>Abbrechen</button>
            <button onClick={async ()=> { await handleSave(); onClose(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: '#005bd1', color: '#fff' }}>Speichern</button>
          </div>
        </div>
      </div>
    </div>
  )
}


