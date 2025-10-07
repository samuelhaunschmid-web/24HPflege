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

  // Split helpers for Telefon and SVNR
  const [telVorwahl, setTelVorwahl] = useState('')
  const [telRest, setTelRest] = useState('')
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
    // preset split values from initialValues for telefon/svnr
    const telKey = felder.find(k => (gruppen[k]||[]).some(g => g.includes('telefon')))
    if (telKey && typeof init[telKey] === 'string') {
      const m = String(init[telKey]).trim().match(/^(\+?[\d]+)\s*(.*)$/)
      if (m) { setTelVorwahl(m[1] || ''); setTelRest((m[2] || '').replace(/\s+/g,'')) } else { setTelVorwahl(''); setTelRest(String(init[telKey]||'')) }
    } else { setTelVorwahl(''); setTelRest('') }
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
    // combine telefon
    const telKey = felder.find(k => (gruppen[k]||[]).some(g => g.includes('telefon')))
    if (telKey) {
      const combined = `${telVorwahl}`.trim() + (telRest ? ` ${telRest}` : '')
      result[telKey] = combined.trim()
    }
    const svKey = felder.find(k => (gruppen[k]||[]).some(g => g.includes('svnr')))
    if (svKey) {
      const a = svnrA.replace(/\D+/g,'').slice(0,4)
      const b = svnrB.replace(/\D+/g,'').slice(0,6)
      result[svKey] = (a + b)
    }
    // normalize date format DD.MM.YYYY for datum gruppen
    felder.forEach(k => {
      if ((gruppen[k]||[]).some(g => g.includes('datum'))) {
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
    if (telVorwahl && !list.some(v => v.prefix === telVorwahl)) {
      list.push({ iso2: 'XX', name: 'Benutzerdefiniert', prefix: telVorwahl })
    }
    // sortiert nach Name, dann Prefix
    return list.sort((a,b)=> (a.name.localeCompare(b.name) || a.prefix.localeCompare(b.prefix)))
  }, [telVorwahl])

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
              const isDatum = (gruppen[k]||[]).some(g => g.includes('datum'))
              const isTel = (gruppen[k]||[]).some(g => g.includes('telefon'))
              const isSv = (gruppen[k]||[]).some(g => g.includes('svnr'))
              const isVorlage = (gruppen[k]||[]).some(g => g.includes('vorlage'))
              const isBetreuer1 = (gruppen[k]||[]).some(g => g.includes('betreuer1') && !g.includes('anfang'))
              const isBetreuer2 = (gruppen[k]||[]).some(g => g.includes('betreuer2') && !g.includes('anfang'))
              const isBetreuerAnfang = (gruppen[k]||[]).some(g => g.includes('betreuer') && g.includes('anfang'))
              const isReadonly = isBetreuerAnfang || k.startsWith('__') // Nur Betreuer-Anfangs-Felder und interne Felder sind nicht direkt editierbar
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
                    />
                  ) : isTel ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                      <select name={`${k}-vorwahl`} value={telVorwahl} onChange={e=> setTelVorwahl(e?.currentTarget?.value ?? '')}>
                        <option value=""></option>
                        {vorwahlOptionen.map(v => (
                          <option key={`${v.iso2}-${v.prefix}`} value={v.prefix}>{findeVorwahlLabel(v)}</option>
                        ))}
                      </select>
                      <input name={`${k}-rest`} value={telRest} onChange={e=> setTelRest(e.currentTarget.value.replace(/\D+/g,''))} inputMode="numeric" />
                    </div>
                  ) : isSv ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 120px', gap: 8 }}>
                      <input name={`${k}-sv-a`} value={svnrA} onChange={e=> setSvnrA(e.currentTarget.value.replace(/\D+/g,'').slice(0,4))} inputMode="numeric" />
                      <input name={`${k}-sv-b`} value={svnrB} onChange={e=> setSvnrB(e.currentTarget.value.replace(/\D+/g,'').slice(0,6))} inputMode="numeric" />
                    </div>
                  ) : isVorlage ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      <input
                        name={k}
                        list={`${k}-vorlagen-list`}
                        value={String(werte[k] ?? '')}
                        autoComplete="off"
                        onChange={(e)=> setWerte(prev => ({ ...prev, [k]: (e.target as any)?.value ?? '' }))}
                        onInput={(e)=> setWerte(prev => ({ ...prev, [k]: (e.target as any)?.value ?? '' }))}
                      />
                      <datalist id={`${k}-vorlagen-list`}>
                        {(vorlagenWerte[k] || []).map(v => (
                          <option key={v} value={v} />
                        ))}
                      </datalist>
                    </div>
                  ) : (isBetreuer1 || isBetreuer2) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      <input
                        name={k}
                        list={`${k}-betreuer-list`}
                        value={String(werte[k] ?? '')}
                        onChange={(e)=> setWerte(prev => ({ ...prev, [k]: e.target.value }))}
                        placeholder="Betreuer eingeben oder auswählen"
                        style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      <datalist id={`${k}-betreuer-list`}>
                        {betreuerListe.map(betreuer => (
                          <option key={betreuer.__key} value={betreuer.__display || ''} />
                        ))}
                      </datalist>
                    </div>
                  ) : isReadonly ? (
                    <div style={{ 
                      padding: '8px 12px', 
                      background: '#f5f5f5', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      color: '#666',
                      fontSize: '14px',
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
                      style={{ 
                        padding: '8px 12px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
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


