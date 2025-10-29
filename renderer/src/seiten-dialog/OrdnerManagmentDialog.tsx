import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function OrdnerManagmentDialog() {
  const [sp] = useSearchParams()
  const personType = (sp.get('personType') === 'betreuer' ? 'betreuer' : 'kunden') as 'kunden' | 'betreuer'
  const [cfg, setCfg] = useState<any>({})
  const [baseDir, setBaseDir] = useState('')
  const [lists, setLists] = useState<{ kunden: any[]; betreuer: any[] }>({ kunden: [], betreuer: [] })
  type Node = { id: string; name: string; files?: string[]; children: Node[] }
  const [tree, setTree] = useState<Node[]>([])
  const [legacyText, setLegacyText] = useState('')
  const names = useMemo(() => [], [])

  function pathsToTree(paths: (string | string[])[], rules?: Array<{ path: string[]; files?: string[] }>): Node[] {
    const root: Record<string, Node> = {}
    function ensure(nodes: Record<string, Node>, segs: string[], files?: string[]) {
      if (!segs.length) return
      const [head, ...rest] = segs
      const key = head
      if (!nodes[key]) nodes[key] = { id: Math.random().toString(36).slice(2), name: head, files: [], children: [] }
      if (rest.length) {
        const childMap: Record<string, Node> = {}
        nodes[key].children.forEach(c => { childMap[c.name] = c })
        ensure(childMap, rest, files)
        nodes[key].children = Object.values(childMap)
      } else if (files && files.length) {
        nodes[key].files = Array.from(new Set([...(nodes[key].files || []), ...files]))
      }
    }
    for (const p of paths) {
      const segs = Array.isArray(p) ? p : String(p).split(/[\\/]+/).map(s => s.trim()).filter(Boolean)
      if (!segs.length) continue
      ensure(root, segs)
    }
    if (rules && rules.length) {
      for (const r of rules) {
        const segs = (r.path || []).filter(Boolean)
        ensure(root, segs, (r.files || []).filter(Boolean))
      }
    }
    return Object.values(root)
  }

  function treeToPaths(nodes: Node[]): string[][] {
    const out: string[][] = []
    function walk(n: Node, acc: string[]) {
      const next = [...acc, n.name]
      out.push(next)
      n.children.forEach(c => walk(c, next))
    }
    nodes.forEach(n => walk(n, []))
    return out
  }

  function treeToRules(nodes: Node[]): Array<{ path: string[]; files: string[] }> {
    const out: Array<{ path: string[]; files: string[] }> = []
    function walk(n: Node, acc: string[]) {
      const next = [...acc, n.name]
      if (n.files && n.files.length) out.push({ path: next, files: n.files.filter(Boolean) })
      n.children.forEach(c => walk(c, next))
    }
    nodes.forEach(n => walk(n, []))
    return out
  }

  useEffect(() => {
    ;(async () => {
      const c = await window.api?.getConfig?.()
      setCfg(c || {})
      setBaseDir(c?.dokumenteDir || '')
      const paths = (c?.folderTemplatesPaths && (personType === 'kunden' ? c.folderTemplatesPaths.kunden : c.folderTemplatesPaths.betreuer)) || []
      const rules = (c?.folderTemplatesRules && (personType === 'kunden' ? c.folderTemplatesRules.kunden : c.folderTemplatesRules.betreuer)) || []
      const legacy = (c?.folderTemplates && (personType === 'kunden' ? c.folderTemplates.kunden : c.folderTemplates.betreuer)) || []
      const merged: (string | string[])[] = Array.isArray(paths) && paths.length ? paths : (Array.isArray(legacy) ? legacy : [])
      setTree(pathsToTree(merged, rules))
      setLegacyText(Array.isArray(legacy) ? legacy.join('\n') : '')
      const l = await window.docgen?.getLists?.()
      if (l) setLists(l)
    })()
  }, [personType])

  async function saveTemplates() {
    const next = {
      ...(cfg || {}),
      folderTemplatesPaths: {
        kunden: personType === 'kunden' ? treeToPaths(tree) : ((cfg?.folderTemplatesPaths?.kunden) || []),
        betreuer: personType === 'betreuer' ? treeToPaths(tree) : ((cfg?.folderTemplatesPaths?.betreuer) || []),
      },
      folderTemplatesRules: {
        kunden: personType === 'kunden' ? treeToRules(tree) : ((cfg?.folderTemplatesRules?.kunden) || []),
        betreuer: personType === 'betreuer' ? treeToRules(tree) : ((cfg?.folderTemplatesRules?.betreuer) || []),
      },
      // Legacy Feld weiterhin befüllen für Abwärtskompatibilität (nur Top-Level)
      folderTemplates: {
        kunden: personType === 'kunden' ? tree.map(n => n.name) : ((cfg?.folderTemplates?.kunden) || []),
        betreuer: personType === 'betreuer' ? tree.map(n => n.name) : ((cfg?.folderTemplates?.betreuer) || []),
      },
    }
    const saved = await window.api?.setConfig?.(next)
    setCfg(saved || next)
  }

  async function createNow() {
    if (!baseDir) { alert('Bitte Dokumente-Ordner in Einstellungen setzen.'); return }
    const people = (personType === 'kunden' ? lists.kunden : lists.betreuer) || []
    // Namen bilden über Gruppen
    const keys = people.length ? Object.keys(people[0]) : []
    const tableId = personType
    const tableSettings = (cfg?.tableSettings && cfg.tableSettings[tableId]) || { gruppen: {} }
    const vorKey = keys.find(k => (tableSettings.gruppen[k] || []).includes('vorname'))
    const nachKey = keys.find(k => (tableSettings.gruppen[k] || []).includes('nachname'))
    const namesList = people.map((row: any) => `${String(nachKey ? row[nachKey] || '' : '').trim()} ${String(vorKey ? row[vorKey] || '' : '').trim()}`.trim()).filter(Boolean)
    const res = await window.api?.folders?.ensureStructure?.({ baseDir, personType, names: namesList, subfolders: treeToPaths(tree) })
    if (!res?.ok) alert(res?.message || 'Fehler'); else alert(`Erstellt: ${res.createdCount || 0} Personen-Ordner, ${res.createdSubCount || 0} Unterordner`)
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Ordner-Management ({personType === 'kunden' ? 'Kunden' : 'Betreuer'})</h3>
      <div style={{ fontSize: 13, color: '#334155' }}>Basis: {baseDir || '—'} / {personType === 'kunden' ? 'KundenDaten' : 'BetreuerDaten'}</div>
      <FolderTreeEditor tree={tree} onChange={setTree} personType={personType} />
      {!!legacyText && (
        <div style={{ fontSize: 12, color: '#64748b' }}>Hinweis: Es sind noch alte Templates (ein Ebenen) vorhanden. Beim Speichern werden diese in die neue Struktur übernommen.</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={saveTemplates} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>Speichern</button>
        <button onClick={createNow} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#dcfce7', color: '#166534', cursor: 'pointer' }}>Jetzt erstellen</button>
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Hinweis: Es werden nur fehlende Ordner erstellt; bestehende werden nicht verändert.</div>
    </div>
  )
}

function FolderTreeEditor({ tree, onChange, personType }: { tree: Array<{ id: string; name: string; files?: string[]; children: any[] }>; onChange: (t: any[]) => void; personType: 'kunden' | 'betreuer' }) {
  function updateNode(id: string, updater: (n: any) => any) {
    function rec(list: any[]): any[] {
      return list.map(n => n.id === id ? updater(n) : { ...n, children: rec(n.children || []) })
    }
    onChange(rec(tree))
  }
  function addRoot() {
    onChange([...(tree || []), { id: Math.random().toString(36).slice(2), name: 'Neuer Ordner', files: [], children: [] }])
  }
  function removeNode(id: string) {
    function rec(list: any[]): any[] { return list.filter(n => n.id !== id).map(n => ({ ...n, children: rec(n.children || []) })) }
    onChange(rec(tree))
  }
  function addChild(id: string) {
    updateNode(id, (n) => ({ ...n, children: [ ...(n.children || []), { id: Math.random().toString(36).slice(2), name: 'Unterordner', files: [], children: [] } ] }))
  }
  function renameNode(id: string, name: string) {
    updateNode(id, (n) => ({ ...n, name }))
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={addRoot} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Oberordner hinzufügen</button>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {tree.map(n => (
          <FolderNodeRow key={n.id} node={n} onRename={renameNode} onRemove={removeNode} onAddChild={addChild} onChangeFiles={(id, files) => updateNode(id, (no) => ({ ...no, files }))} personType={personType} />
        ))}
      </div>
    </div>
  )
}

function FolderNodeRow({ node, onRename, onRemove, onAddChild, onChangeFiles, personType }: { node: any; onRename: (id: string, name: string) => void; onRemove: (id: string) => void; onAddChild: (id: string) => void; onChangeFiles: (id: string, files: string[]) => void; personType: 'kunden' | 'betreuer' }) {
  const [val, setVal] = useState(node.name)
  const [open, setOpen] = useState(false)
  const [filesText, setFilesText] = useState((node.files || []).join('\n'))
  useEffect(() => { setVal(node.name) }, [node.name])
  useEffect(() => { setFilesText((node.files || []).join('\n')) }, [node.files])
  return (
    <div style={{ border: '1px solid #e6e8ef', borderRadius: 8, padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={val} onChange={e => setVal(e.currentTarget.value)} onBlur={() => onRename(node.id, val)} style={{ flex: 1, padding: 6, border: '1px solid #d1d5db', borderRadius: 6 }} />
        <button onClick={() => onAddChild(node.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Unterordner</button>
        <button onClick={() => setOpen(o => !o)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>Standard-Daten</button>
        <button onClick={() => onRemove(node.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Entfernen</button>
      </div>
      {open && (
        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Dateinamen mit Platzhaltern je Zeile. Unterstützt: {`{vorname}`}, {`{nachname}`}
            {personType === 'kunden' ? (
              <>; für Kunden: {`{kvname}`}, {`{kfname}`}, {`{nb1}`} (Nachname Betreuer 1), {`{nb2}`} (Nachname Betreuer 2)</>
            ) : (
              <>; für Betreuer: {`{bvname}`}, {`{bfname}`}, {`{nk1}`} (Nachname zugewiesener Kunde)</>
            )}.
          </div>
          <textarea rows={4} value={filesText} onChange={e => setFilesText(e.currentTarget.value)} onBlur={() => onChangeFiles(node.id, filesText.split(/\r?\n/).map(s => s.trim()).filter(Boolean))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, boxSizing: 'border-box', fontFamily: 'monospace' }} />
        </div>
      )}
      {!!(node.children || []).length && (
        <div style={{ marginTop: 8, marginLeft: 16, display: 'grid', gap: 6 }}>
          {(node.children || []).map((c: any) => (
            <FolderNodeRow key={c.id} node={c} onRename={onRename} onRemove={onRemove} onAddChild={onAddChild} onChangeFiles={onChangeFiles} personType={personType} />
          ))}
        </div>
      )}
    </div>
  )
}


