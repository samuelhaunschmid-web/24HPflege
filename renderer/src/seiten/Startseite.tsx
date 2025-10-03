import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'

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
              <summary>{n.name}</summary>
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

  const [alsPdf, setAlsPdf] = useState(false)

  async function handleGenerate() {
    if (!ordnerName) return alert('Bitte Ordnernamen angeben.')
    if (selected.length === 0) return alert('Bitte mindestens eine Vorlage wählen.')
    const dir = await window.api?.chooseDirectory?.('Zielordner wählen')
    if (!dir) return
    const res = await window.docgen?.generateDocs?.({
      ordnerName,
      targetDir: dir,
      selectedVorlagen: selected,
      kunde,
      betreuer: betreuu,
      alsPdf,
    })
    if (res?.ok) alert('Dokumente gespeichert in: ' + res.zielOrdner)
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={alsPdf} onChange={(e)=> setAlsPdf(e.currentTarget.checked)} />
            Als PDF exportieren (falls verfügbar)
          </label>
          <button onClick={handleGenerate}>Dokumente generieren</button>
        </div>
        <div>
          <label>Vorlagen</label>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, maxHeight: 420, overflow: 'auto' }}>
            {renderTree(tree)}
          </div>
        </div>
      </div>
    </Layout>
  )
}


