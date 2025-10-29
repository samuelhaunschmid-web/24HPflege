import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import LoadingDialog from '../komponenten/LoadingDialog'

type Person = { __display?: string; [k: string]: any }
type TreeNode = { type: 'folder' | 'file'; name: string; relPath: string; children?: TreeNode[] }

export default function Startseite() {
  const [kunden, setKunden] = useState<Person[]>([])
  const [betreuer, setBetreuer] = useState<Person[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [kunde, setKunde] = useState<Person | null>(null)
  const [betreuu, setBetreuu] = useState<Person | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [kundenQuery, setKundenQuery] = useState<string>('')
  const [betreuerQuery, setBetreuerQuery] = useState<string>('')
  const [showKundenDropdown, setShowKundenDropdown] = useState<boolean>(false)
  const [showBetreuerDropdown, setShowBetreuerDropdown] = useState<boolean>(false)
  const [ordnerName, setOrdnerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      const lists = await window.docgen?.getLists?.()
      if (lists) {
        setKunden(lists.kunden || [])
        setBetreuer(lists.betreuer || [])
      }
      const t = await window.docgen?.getVorlagenTree?.()
      if (t) setTree(t)
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

  function renderTree(nodes: TreeNode[]) {
    return (
      <ul style={{ listStyle: 'none', paddingLeft: 18 }}>
        {nodes.map(n => n.type === 'folder' ? (
          <li key={n.relPath}>
            <details>
              <summary style={{ 
                display: 'flex', 
                gap: 8, 
                alignItems: 'center',
                color: '#1f2937',
                fontWeight: '600',
                WebkitFontSmoothing: 'subpixel-antialiased',
                MozOsxFontSmoothing: 'auto',
                textRendering: 'optimizeLegibility'
              }}>
                <input
                  type="checkbox"
                  checked={isFolderSelected(n)}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked
                    if (checked) {
                      // Ordner auswählen: alle Dateien im Ordner hinzufügen
                      const allFiles = getAllFilesInFolder(n)
                      setSelected(prev => [...new Set([...prev, ...allFiles])])
                    } else {
                      // Ordner abwählen: alle Dateien im Ordner entfernen
                      const allFiles = getAllFilesInFolder(n)
                      setSelected(prev => prev.filter(x => !allFiles.includes(x)))
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {n.name}
              </summary>
              {n.children && renderTree(n.children)}
            </details>
          </li>
        ) : (
          <li key={n.relPath}>
            <label style={{ 
              display: 'flex', 
              gap: 8, 
              alignItems: 'center',
              color: '#1f2937',
              fontWeight: '500',
              WebkitFontSmoothing: 'subpixel-antialiased',
              MozOsxFontSmoothing: 'auto',
              textRendering: 'optimizeLegibility'
            }}>
              <input
                type="checkbox"
                checked={selected.includes(n.relPath)}
                onChange={(e) => {
                  const checked = e.currentTarget.checked
                  setSelected(prev => checked ? [...prev, n.relPath] : prev.filter(x => x !== n.relPath))
                }}
              />
              {n.name}
            </label>
          </li>
        ))}
      </ul>
    )
  }

  function isFolderSelected(folder: TreeNode): boolean {
    const allFiles = getAllFilesInFolder(folder)
    return allFiles.length > 0 && allFiles.every(file => selected.includes(file))
  }

  function getAllFilesInFolder(folder: TreeNode): string[] {
    const files: string[] = []
    if (folder.children) {
      for (const child of folder.children) {
        if (child.type === 'file') {
          files.push(child.relPath)
        } else if (child.type === 'folder') {
          files.push(...getAllFilesInFolder(child))
        }
      }
    }
    return files
  }

  const [modus, setModus] = useState<'docx'|'pdf'>('pdf')

  async function handleGenerate() {
    if (selected.length === 0) return alert('Bitte mindestens eine Vorlage wählen.')
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
        selectedVorlagen: selected,
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
          alert('Dokumente gespeichert in: ' + res.zielOrdner)
        }, 500)
      } else {
        setIsLoading(false)
        alert('Fehler beim Generieren der Dokumente')
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      setIsLoading(false)
      console.error('Generation error:', error)
      alert('Fehler beim Generieren der Dokumente: ' + (error as Error).message)
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
              <label style={{ fontWeight: 700 }}>Vorlagen</label>
            </div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, maxHeight: 420, overflow: 'auto', background: '#fff' }}>
              {renderTree(tree)}
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
    </Layout>
  )
}


