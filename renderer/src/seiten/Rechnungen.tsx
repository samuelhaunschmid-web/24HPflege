import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import LoadingDialog from '../komponenten/LoadingDialog'

export default function Rechnungen() {
  const [files, setFiles] = useState<Array<{ name: string; absPath: string }>>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [selected, setSelected] = useState<Record<string, { mode: 'monat' | 'ind'; von?: string; bis?: string }>>({})
  const [selectedVorlagen, setSelectedVorlagen] = useState<string[]>([])
  const [monat, setMonat] = useState<number>(new Date().getMonth()+1)
  const [jahr, setJahr] = useState<number>(new Date().getFullYear())
  const [currentRechnungsnummer, setCurrentRechnungsnummer] = useState<number>(1)
  const [modus, setModus] = useState<'docx'|'pdf'>('docx')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')

  const verrechnungsZeitraum = useMemo(() => {
    const daysInMonth = new Date(jahr, monat, 0).getDate()
    const mm = String(monat).padStart(2,'0')
    const start = `01.${mm}.${jahr}`
    const end = `${String(daysInMonth).padStart(2,'0')}.${mm}.${jahr}`
    return `${start}-${end}`
  }, [monat, jahr])

  useEffect(() => {
    ;(async () => {
      const templates = await window.docgen?.listInvoiceTemplates?.()
      if (Array.isArray(templates)) setFiles(templates)
      const lists = await window.docgen?.getLists?.(); if (lists?.kunden) setKunden(lists.kunden)
      
      // Lade aktuelle Rechnungsnummer aus der Konfiguration
      const config = await window.api?.getConfig?.()
      if (config?.currentRechnungsnummer) {
        setCurrentRechnungsnummer(config.currentRechnungsnummer)
      }
    })()
  }, [])

  const sortedKunden = useMemo(() => [...kunden].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [kunden])
  const selectedKeys = useMemo(()=> Object.entries(selected).filter(([_,v])=> v!=null).map(([k])=>k), [selected])

  async function handleGenerate() {
    if (selectedKeys.length === 0) return alert('Bitte Kunden auswählen')
    if (selectedVorlagen.length === 0) return alert('Bitte mindestens eine Vorlage auswählen')
    const dir = await window.api?.chooseDirectory?.('Zielordner wählen'); if (!dir) return
    
    // Loading State starten
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingMessage(modus === 'pdf' ? 'PDFs werden erstellt...' : 'Rechnungen werden generiert...')
    
    let progressInterval: number | null = null
    
    try {
      const individualRanges: any = {}
      Object.entries(selected).forEach(([key, v]) => { if (v.mode==='ind' && v.von && v.bis) individualRanges[key] = { von: v.von, bis: v.bis } })
      
      // Filtere nur die ausgewählten Vorlagen
      const selectedVorlagenAbs = files.filter(f => selectedVorlagen.includes(f.absPath)).map(f => f.absPath)
      
      // Simuliere Progress für bessere UX
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev // Bei 90% stoppen, bis tatsächlich fertig
          return prev + Math.random() * 10
        })
      }, 500)
      
      // Speichere die manuell eingegebene Rechnungsnummer
      await window.api?.setConfig?.({ currentRechnungsnummer })
      
      const res = await window.docgen?.generateInvoices?.({
        selectedKundenKeys: selectedKeys,
        selectedVorlagenAbs,
        targetDir: dir,
        month: monat,
        year: jahr,
        individualRanges,
        alsPdf: modus === 'pdf',
      })
      
      if (progressInterval) clearInterval(progressInterval)
      setLoadingProgress(100)
      
      if (res?.ok) {
        if ('currentRechnungsnummer' in res) {
          setCurrentRechnungsnummer(res.currentRechnungsnummer)
        }
        setLoadingMessage('Fertig!')
        setTimeout(() => {
          setIsLoading(false)
          const rechnungsnummer = 'currentRechnungsnummer' in res ? res.currentRechnungsnummer : 'unbekannt'
          alert(`Rechnungen erstellt. Neue Rechnungsnummer: ${rechnungsnummer}`)
        }, 500)
      } else {
        setIsLoading(false)
        alert('Fehler beim Generieren der Rechnungen')
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      setIsLoading(false)
      console.error('Generation error:', error)
      alert('Fehler beim Generieren der Rechnungen: ' + (error as Error).message)
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Rechnungen</h2>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Rechnungsnummer</label>
            <input type="number" value={currentRechnungsnummer} onChange={e => setCurrentRechnungsnummer(Number(e.currentTarget.value))} min={1} style={{ width: 90, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
          </div>
          <div style={{ background: '#0f172a', color: '#fff', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Nächste: {currentRechnungsnummer}</div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontWeight: 700 }}>Rechnungsvorlagen</label>
            </div>
            {files.length === 0 ? (
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: 8, 
                padding: 20, 
                textAlign: 'center', 
                color: '#666',
                background: '#f9f9f9'
              }}>
                Keine Rechnungsvorlagen gefunden.
                <br />
                <small>Bitte konfigurieren Sie den Rechnungsvorlagen-Ordner in den Einstellungen.</small>
              </div>
            ) : (
              <div style={{ 
                border: '1px solid #eee', 
                borderRadius: 8, 
                padding: 8, 
                maxHeight: 300, 
                overflow: 'auto',
                background: '#fff'
              }}>
                {files.map(f => (
                  <label key={f.absPath} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid transparent',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedVorlagen.includes(f.absPath)}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked
                        setSelectedVorlagen(prev => 
                          checked 
                            ? [...prev, f.absPath]
                            : prev.filter(x => x !== f.absPath)
                        )
                      }}
                    />
                    <span>{f.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Monat</label>
              <input 
                type="number" 
                value={monat} 
                onChange={e => setMonat(Number(e.currentTarget.value))} 
                min={1} 
                max={12} 
                style={{ 
                  width: 80, 
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 8
                }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Jahr</label>
              <input 
                type="number" 
                value={jahr} 
                onChange={e => setJahr(Number(e.currentTarget.value))} 
                min={2000} 
                max={2100} 
                style={{ 
                  width: 100, 
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 8
                }} 
              />
            </div>
            <div style={{ marginTop: 18, color: '#555', fontSize: 12 }}>
              Verrechnungszeitraum: <strong>{verrechnungsZeitraum}</strong>
            </div>
          </div>
          
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Ausgabeformat</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="modus" 
                  checked={modus==='docx'} 
                  onChange={()=> setModus('docx')} 
                /> 
                DOCX
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="modus" 
                  checked={modus==='pdf'} 
                  onChange={()=> setModus('pdf')} 
                /> 
                PDF
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontWeight: 700 }}>Kundenauswahl</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={()=> setSelected(Object.fromEntries(sortedKunden.map(k=> [k.__key, { mode: 'monat' as const }])))} style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Alle auswählen</button>
                <button onClick={()=> setSelected({})} style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Alle abwählen</button>
              </div>
            </div>
            <div style={{ 
              display: 'grid', 
              gap: 8, 
              border: '1px solid #eee', 
              borderRadius: 8, 
              padding: 8, 
              maxHeight: 420, 
              overflow: 'auto',
              background: '#fff'
            }}>
            {sortedKunden.map(k => {
              const sel = selected[k.__key] || { mode: 'monat' as const }
              return (
                <div key={k.__key} style={{ 
                  border: '1px solid #eaeaea', 
                  borderRadius: 8, 
                  padding: 12,
                  background: selected[k.__key] ? '#f7faff' : '#fff'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
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
                    <span style={{ fontWeight: selected[k.__key] ? 'bold' : 'normal' }}>
                      {k.__display}
                    </span>
                  </label>
                  {selected[k.__key] && (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      alignItems: 'center', 
                      gap: 12, 
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #eee'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name={`mode-${k.__key}`} 
                          checked={sel?.mode==='monat'} 
                          onChange={()=> setSelected(p=> ({ ...p, [k.__key]: { mode: 'monat' } }))} 
                        /> 
                        Ganzer Monat
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name={`mode-${k.__key}`} 
                          checked={sel?.mode==='ind'} 
                          onChange={()=> {
                            // Berechne den aktuellen Verrechnungsmonat
                            const daysInMonth = new Date(jahr, monat, 0).getDate()
                            const mm = String(monat).padStart(2,'0')
                            const von = `01.${mm}.${jahr}`
                            const bis = `${String(daysInMonth).padStart(2,'0')}.${mm}.${jahr}`
                            setSelected(p=> ({ ...p, [k.__key]: { mode: 'ind', von, bis } }))
                          }} 
                        /> 
                        Individuell
                      </label>
                      {sel && sel.mode==='ind' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label style={{ fontSize: '12px' }}>Von:</label>
                            <input 
                              type="date" 
                              value={sel.von ? sel.von.split('.').reverse().join('-') : ''}
                              onChange={e=> {
                                const dateValue = e.currentTarget.value
                                const formattedDate = dateValue ? dateValue.split('-').reverse().join('.') : ''
                                setSelected(p=> ({ ...p, [k.__key]: { ...sel, von: formattedDate } }))
                              }}
                              style={{ 
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                fontSize: '12px'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label style={{ fontSize: '12px' }}>Bis:</label>
                            <input 
                              type="date" 
                              value={sel.bis ? sel.bis.split('.').reverse().join('-') : ''}
                              onChange={e=> {
                                const dateValue = e.currentTarget.value
                                const formattedDate = dateValue ? dateValue.split('-').reverse().join('.') : ''
                                setSelected(p=> ({ ...p, [k.__key]: { ...sel, bis: formattedDate } }))
                              }}
                              style={{ 
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                fontSize: '12px'
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      </div>
      
      <div style={{ position: 'sticky', bottom: 0, background: 'transparent', paddingTop: 12, marginTop: 12, textAlign: 'center' }}>
        <button 
          onClick={handleGenerate}
          disabled={isLoading}
          style={{
            background: isLoading ? '#6c757d' : '#005bd1',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 999,
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Wird generiert...' : `Rechnungen als ${modus.toUpperCase()} generieren`}
        </button>
      </div>
      
      <LoadingDialog
        isOpen={isLoading}
        title={modus === 'pdf' ? 'PDF-Erstellung' : 'Rechnungsgenerierung'}
        message={loadingMessage}
        progress={loadingProgress}
        showProgress={true}
      />
    </Layout>
  )
}


