import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import LoadingDialog from '../komponenten/LoadingDialog'
import VorlagenGruppenDialog from '../komponenten/VorlagenGruppenDialog'
import MessageModal from '../komponenten/MessageModal'

type Person = { __display?: string; [k: string]: any }

export default function Startseite() {
  const [kunden, setKunden] = useState<Person[]>([])
  const [betreuer, setBetreuer] = useState<Person[]>([])
  const [kunde, setKunde] = useState<Person | null>(null)
  const [betreuu, setBetreuu] = useState<Person | null>(null)
  const [kundenQuery, setKundenQuery] = useState<string>('')
  const [betreuerQuery, setBetreuerQuery] = useState<string>('')
  const [showKundenDropdown, setShowKundenDropdown] = useState<boolean>(false)
  const [showBetreuerDropdown, setShowBetreuerDropdown] = useState<boolean>(false)
  const [ordnerName, setOrdnerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')

  // Hilfsfunktion um Dateinamen aus Pfad zu extrahieren
  function getFilenameFromPath(path: string): string {
    return path.split(/[/\\]/).pop() || path
  }

  // Gruppen-basiertes Vorlagen-System
  const [templateGroups, setTemplateGroups] = useState<Record<string, string[]>>({})
  const [templateGroupOrder, setTemplateGroupOrder] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedGroupTemplates, setSelectedGroupTemplates] = useState<string[]>([])
  const [gruppenDialogOffen, setGruppenDialogOffen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    ;(async () => {
      const lists = await window.docgen?.getLists?.()
      if (lists) {
        setKunden(lists.kunden || [])
        setBetreuer(lists.betreuer || [])
      }

      // Lade Vorlagen-Gruppen
      const groupsData = await window.docgen?.getVorlagenGruppen?.()
      if (groupsData) {
        const groups = groupsData.groups || {}
        let order = groupsData.order || []

        // Fallback: Wenn order leer ist aber groups vorhanden, verwende die Keys von groups
        if (order.length === 0 && Object.keys(groups).length > 0) {
          order = Object.keys(groups)
        }

        setTemplateGroups(groups)
        setTemplateGroupOrder(order)
      }
    })()
  }, [])

  // Anzeige mit Nachnamen zuerst (Kunden: kfname = Nachname, kvname = Vorname)
  const kundenLabels = useMemo(() => {
    const list = kunden.map(k => ({ key: k.__key, label: `${String(k.kfname||'').trim()} ${String(k.kvname||'').trim()}`.trim() }))
    return list.sort((a,b)=> a.label.localeCompare(b.label))
  }, [kunden])
  // Anzeige mit Nachnamen zuerst (Betreuer: 'Fam. Nam' = Nachname, 'Vor.Nam' = Vorname)
  const betreuerLabels = useMemo(() => {
    const list = betreuer.map(b => ({ key: b.__key, label: `${String(b['Fam. Nam']||'').trim()} ${String(b['Vor.Nam']||'').trim()}`.trim() }))
    return list.sort((a,b)=> a.label.localeCompare(b.label))
  }, [betreuer])

  const kundenFiltered = useMemo(() => {
    const q = kundenQuery.trim().toLowerCase()
    if (!q) return kundenLabels
    return kundenLabels.filter(k => k.label.toLowerCase().includes(q))
  }, [kundenLabels, kundenQuery])
  const betreuerFiltered = useMemo(() => {
    const q = betreuerQuery.trim().toLowerCase()
    if (!q) return betreuerLabels
    return betreuerLabels.filter(b => b.label.toLowerCase().includes(q))
  }, [betreuerLabels, betreuerQuery])

  function renderGroups() {
    // Verwende templateGroupOrder oder falle auf die Keys von templateGroups zurück
    const effectiveOrder = templateGroupOrder.length > 0 ? templateGroupOrder : Object.keys(templateGroups)

    if (effectiveOrder.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
          <p>Keine Vorlagen-Gruppen gefunden.</p>
          <p>Verwende den "Gruppen verwalten" Button, um Gruppen zu erstellen.</p>
        </div>
      )
    }

    return (
      <div style={{ maxHeight: 420, overflow: 'auto' }}>
        {effectiveOrder.map(groupName => {
          const templates = templateGroups[groupName] || []
          const isExpanded = expandedGroups.has(groupName)
          const isGroupSelected = selectedGroups.includes(groupName)
          const selectedTemplateCount = selectedGroupTemplates.filter(t => templates.includes(t)).length

          return (
            <div key={groupName} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, background: '#fafafa' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#1f2937',
                  fontWeight: '600',
                  WebkitFontSmoothing: 'subpixel-antialiased',
                  MozOsxFontSmoothing: 'auto',
                  textRendering: 'optimizeLegibility'
                }}
                onClick={() => {
                  setExpandedGroups(prev => {
                    const newSet = new Set(prev)
                    if (newSet.has(groupName)) {
                      newSet.delete(groupName)
                    } else {
                      newSet.add(groupName)
                    }
                    return newSet
                  })
                }}
              >
                <input
                  type="checkbox"
                  checked={isGroupSelected}
                  onChange={(e) => {
                    e.stopPropagation()
                    const checked = e.currentTarget.checked
                    if (checked) {
                      setSelectedGroups(prev => [...prev, groupName])
                      setSelectedGroupTemplates(prev => [...new Set([...prev, ...templates])])
                      // Expandiere die Gruppe automatisch wenn ausgewählt
                      setExpandedGroups(prev => {
                        const newSet = new Set(prev)
                        newSet.add(groupName)
                        return newSet
                      })
                    } else {
                      setSelectedGroups(prev => prev.filter(g => g !== groupName))
                      setSelectedGroupTemplates(prev => prev.filter(t => !templates.includes(t)))
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                  width: 12,
                  textAlign: 'center'
                }}>
                  ▶
                </span>
                {groupName}
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
                  {selectedTemplateCount}/{templates.length} ausgewählt
                </span>
              </div>

              {isExpanded && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', background: '#ffffff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                    {templates.map(template => (
                      <label key={template} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: selectedGroupTemplates.includes(template) ? '#dbeafe' : '#f9fafb',
                        cursor: 'pointer',
                        fontSize: 13,
                        border: '1px solid #e5e7eb'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedGroupTemplates.includes(template)}
                          onChange={(e) => {
                            const checked = e.currentTarget.checked
                            setSelectedGroupTemplates(prev =>
                              checked
                                ? [...prev, template]
                                : prev.filter(t => t !== template)
                            )
                          }}
                        />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getFilenameFromPath(template)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }


  const [modus, setModus] = useState<'docx'|'pdf'>('pdf')
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  async function handleGenerate() {
    if (selectedGroupTemplates.length === 0) {
      setMessageModal({ isOpen: true, message: 'Bitte mindestens eine Vorlage wählen.', type: 'info' })
      return
    }
    const dir = await window.api?.chooseDirectory?.('Zielordner wählen')
    if (!dir) return

    // Loading State starten
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingMessage(modus === 'pdf' ? 'PDFs werden erstellt...' : 'Dokumente werden generiert...')

    let progressInterval: number | null = null

    try {
      const basePayload = {
        targetDir: dir,
        selectedVorlagen: selectedGroupTemplates,
        kunde,
        betreuer: betreuu,
        alsPdf: modus === 'pdf',
      }
      const payload = ordnerName
        ? { ...basePayload, ordnerName }
        : basePayload
      
      // Simuliere Progress für bessere UX
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev // Bei 90% stoppen, bis tatsächlich fertig
          return prev + Math.random() * 10
        })
      }, 500)
      
      const res = await (modus==='pdf' ? 
        (window.docgen && window.docgen.generateHtmlPdf ? 
          window.docgen.generateHtmlPdf(payload) : 
          window.docgen?.generateDocs?.(payload)) : 
        window.docgen?.generateDocs?.(payload))
      
      if (progressInterval) clearInterval(progressInterval)
      setLoadingProgress(100)
      
      if (res?.ok) {
        setLoadingMessage('Fertig!')
        setTimeout(() => {
          setIsLoading(false)
          setMessageModal({ isOpen: true, message: 'Dokumente gespeichert in: ' + res.zielOrdner, type: 'success' })
        }, 500)
      } else {
        setIsLoading(false)
        setMessageModal({ isOpen: true, message: 'Fehler beim Generieren der Dokumente', type: 'error' })
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      setIsLoading(false)
      console.error('Generation error:', error)
      setMessageModal({ isOpen: true, message: 'Fehler beim Generieren der Dokumente: ' + (error as Error).message, type: 'error' })
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Dokumentengenerator</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Kunde</label>
                <div style={{ position: 'relative' }}>
                <input 
                  value={kundenQuery}
                  placeholder="Kunde wählen" 
                  onChange={(e) => {
                    const v = e.currentTarget.value
                    setKundenQuery(v)
                    const found = kundenLabels.find(x => x.label === v)
                    if (found) {
                      const k = kunden.find(x => x.__key === found.key)
                      setKunde(k || null)
                    } else {
                      setKunde(null)
                    }
                  }}
                  onFocus={() => setShowKundenDropdown(true)}
                  onBlur={() => setTimeout(() => setShowKundenDropdown(false), 150)}
                  style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 8, 
                    width: '100%', 
                    maxWidth: '100%', 
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff',
                    color: '#1f2937'
                  }}
                />
                {/* native datalist entfernt, wir verwenden das benutzerdefinierte Dropdown */}
                {showKundenDropdown && (
                  <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                    {kundenFiltered.length === 0 ? (
                      <div style={{ padding: '8px 10px', color: '#64748b', fontWeight: '600', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}>Keine Treffer</div>
                    ) : (
                      kundenFiltered.map((k, i) => (
                        <div
                          key={k.key + String(i)}
                          onMouseDown={(e)=>{
                            e.preventDefault()
                            const match = kunden.find(x => x.__key === k.key)
                            setKunde(match || null)
                            setKundenQuery(k.label)
                            setShowKundenDropdown(false)
                          }}
                          style={{ padding: '8px 10px', cursor: 'pointer', color: '#1f2937', fontWeight: '600', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}
                          onMouseEnter={(e)=>{ (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
                          onMouseLeave={(e)=>{ (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                        >
                          {k.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Betreuer</label>
                <div style={{ position: 'relative' }}>
                <input 
                  value={betreuerQuery}
                  placeholder="Betreuer wählen" 
                  onChange={(e) => {
                    const v = e.currentTarget.value
                    setBetreuerQuery(v)
                    const found = betreuerLabels.find(x => x.label === v)
                    if (found) {
                      const b = betreuer.find(x => x.__key === found.key)
                      setBetreuu(b || null)
                    } else {
                      setBetreuu(null)
                    }
                  }}
                  onFocus={() => setShowBetreuerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBetreuerDropdown(false), 150)}
                  style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 8, 
                    width: '100%', 
                    maxWidth: '100%', 
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff',
                    color: '#1f2937'
                  }}
                />
                {/* native datalist entfernt, wir verwenden das benutzerdefinierte Dropdown */}
                {showBetreuerDropdown && (
                  <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                    {betreuerFiltered.length === 0 ? (
                      <div style={{ padding: '8px 10px', color: '#64748b', fontWeight: '600', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}>Keine Treffer</div>
                    ) : (
                      betreuerFiltered.map((b, i) => (
                        <div
                          key={b.key + String(i)}
                          onMouseDown={(e)=>{
                            e.preventDefault()
                            const match = betreuer.find(x => x.__key === b.key)
                            setBetreuu(match || null)
                            setBetreuerQuery(b.label)
                            setShowBetreuerDropdown(false)
                          }}
                          style={{ padding: '8px 10px', cursor: 'pointer', color: '#1f2937', fontWeight: '600', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}
                          onMouseEnter={(e)=>{ (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
                          onMouseLeave={(e)=>{ (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                        >
                          {b.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Neuer Ordnername</label>
                <input 
                  value={ordnerName} 
                  onChange={(e)=> setOrdnerName(e.currentTarget.value)} 
                  placeholder="Ordnernamen"
                  style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 8, 
                    width: '100%', 
                    maxWidth: '100%', 
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff',
                    color: '#1f2937'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Ausgabeformat</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="modus" checked={modus==='docx'} onChange={()=> setModus('docx')} /> 
                DOCX
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="modus" checked={modus==='pdf'} onChange={()=> setModus('pdf')} /> 
                PDF
              </label>
            </div>
          </div>
        </div>

        <div>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontWeight: 700 }}>Vorlagen-Gruppen</label>
              <button
                onClick={() => setGruppenDialogOffen(true)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  background: '#f9fafb',
                  color: '#1f2937',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Gruppen verwalten
              </button>
            </div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, maxHeight: 420, overflow: 'auto', background: '#fff' }}>
              {renderGroups()}
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
          {isLoading ? 'Wird generiert...' : (modus==='pdf' ? 'Dokumente als PDF generieren' : 'Dokumente als DOCX generieren')}
        </button>
      </div>
      
      <LoadingDialog
        isOpen={isLoading}
        title={modus === 'pdf' ? 'PDF-Erstellung' : 'Dokumentengenerierung'}
        message={loadingMessage}
        progress={loadingProgress}
        showProgress={true}
      />

      <VorlagenGruppenDialog
        offen={gruppenDialogOffen}
        onClose={async () => {
          setGruppenDialogOffen(false)
          // Reload groups after dialog closes
          const groupsData = await window.docgen?.getVorlagenGruppen?.()
          if (groupsData) {
            const groups = groupsData.groups || {}
            let order = groupsData.order || []

            // Fallback: Wenn order leer ist aber groups vorhanden, verwende die Keys von groups
            if (order.length === 0 && Object.keys(groups).length > 0) {
              order = Object.keys(groups)
            }

            setTemplateGroups(groups)
            setTemplateGroupOrder(order)
          }
        }}
      />
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
    </Layout>
  )
}


