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

  const kundenSorted = useMemo(() => [...kunden].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [kunden])
  const betreuerSorted = useMemo(() => [...betreuer].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [betreuer])

  function renderTree(nodes: TreeNode[]) {
    return (
      <ul style={{ listStyle: 'none', paddingLeft: 18 }}>
        {nodes.map(n => n.type === 'folder' ? (
          <li key={n.relPath}>
            <details>
              <summary style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

  const [modus, setModus] = useState<'docx'|'pdf'>('docx')

  async function handleGenerate() {
    if (!ordnerName) return alert('Bitte Ordnernamen angeben.')
    if (selected.length === 0) return alert('Bitte mindestens eine Vorlage wählen.')
    const dir = await window.api?.chooseDirectory?.('Zielordner wählen')
    if (!dir) return
    
    // Loading State starten
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingMessage(modus === 'pdf' ? 'PDFs werden erstellt...' : 'Dokumente werden generiert...')
    
    let progressInterval: number | null = null
    
    try {
      const payload = {
        ordnerName,
        targetDir: dir,
        selectedVorlagen: selected,
        kunde,
        betreuer: betreuu,
        alsPdf: modus === 'pdf',
      }
      
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
      <h2>Dokumentengenerator</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>Kunde</label>
          <input list="kunden-list" placeholder="Kunde wählen" onChange={(e) => {
            const v = e.currentTarget.value
            const k = kunden.find(x => x.__display === v)
            setKunde(k || null)
          }} />
          <datalist id="kunden-list">
            {kundenSorted.map((k, i) => <option value={k.__display || ''} key={i} />)}
          </datalist>

          <label>Betreuer</label>
          <input list="betreuer-list" placeholder="Betreuer wählen" onChange={(e) => {
            const v = e.currentTarget.value
            const b = betreuer.find(x => x.__display === v)
            setBetreuu(b || null)
          }} />
          <datalist id="betreuer-list">
            {betreuerSorted.map((b, i) => <option value={b.__display || ''} key={i} />)}
          </datalist>

          <label>Neuer Ordnername</label>
          <input value={ordnerName} onChange={(e)=> setOrdnerName(e.currentTarget.value)} placeholder="z.B. Vertragsmappe_Müller" />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="modus" checked={modus==='docx'} onChange={()=> setModus('docx')} /> DOCX
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="modus" checked={modus==='pdf'} onChange={()=> setModus('pdf')} /> PDF
            </label>
          </div>
          <button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Wird generiert...' : 'Dokumente generieren'}
          </button>
        </div>
        <div>
          <label>Vorlagen</label>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, maxHeight: 420, overflow: 'auto' }}>
            {renderTree(tree)}
          </div>
        </div>
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


