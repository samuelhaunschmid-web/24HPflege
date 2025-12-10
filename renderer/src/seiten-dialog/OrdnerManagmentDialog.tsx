import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrdnerTemplates } from '../logik/dateiVerwaltung/useOrdnerTemplates'
import { StandardOrdnerService } from '../logik/dateiVerwaltung/standardOrdnerService'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'
import { useTableSettings } from '../komponenten/useTableSettings'
import type { OrdnerTemplateBaum } from '../logik/dateiVerwaltung/typen'
import MessageModal from '../komponenten/MessageModal'

export default function OrdnerManagmentDialog() {
  const [sp] = useSearchParams()
  const personType = (sp.get('personType') === 'betreuer' ? 'betreuer' : 'kunden') as 'kunden' | 'betreuer'
  const [baseDir, setBaseDir] = useState('')
  const [lists, setLists] = useState<{ kunden: any[]; betreuer: any[] }>({ kunden: [], betreuer: [] })
  const [legacyText, setLegacyText] = useState('')
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Verwende den zentralen Hook für Ordner-Templates
  const {
    baum,
    isLoading,
    error,
    speichereTemplates,
    aktualisiereBaum
  } = useOrdnerTemplates(personType)

  // Table-Settings für Personen-Namen-Erstellung
  const keys = lists[personType]?.length ? Object.keys(lists[personType][0]) : []
  const { settings: tableSettings } = useTableSettings(personType, keys)

  // Basis-Ordner laden
  useEffect(() => {
    StandardTemplateService.ladeBasisOrdner().then(setBaseDir)
  }, [])

  // Personenlisten laden
  useEffect(() => {
    const loadLists = async () => {
      const l = await window.docgen?.getLists?.()
      if (l) setLists(l)
    }
    loadLists()
  }, [personType])

  // Legacy-Text ermitteln (für Hinweis)
  useEffect(() => {
    const loadLegacyInfo = async () => {
      const cfg = await window.api?.getConfig?.()
      const legacy = cfg?.folderTemplates?.[personType] || []
      setLegacyText(Array.isArray(legacy) ? legacy.join('\n') : '')
    }
    loadLegacyInfo()
  }, [personType])

  async function saveTemplates() {
    const erfolg = await speichereTemplates(baum)
    if (!erfolg) {
      setMessageModal({ isOpen: true, message: 'Fehler beim Speichern der Templates', type: 'error' })
    }
  }

  async function createNow() {
    if (!baseDir) {
      setMessageModal({ isOpen: true, message: 'Bitte Dokumente-Ordner in Einstellungen setzen.', type: 'info' })
      return
    }

    const people = lists[personType] || []
    const namesList = people.map((row: any) => {
      const { anzeigeName } = StandardOrdnerService.ermittlePersonNamen(row, personType, tableSettings)
      return anzeigeName
    }).filter(Boolean)

    if (!namesList.length) {
      setMessageModal({ isOpen: true, message: 'Keine gültigen Personennamen gefunden', type: 'info' })
      return
    }

    const templatePfade = StandardTemplateService.baumZuPfade(baum)
    const res = await StandardOrdnerService.erstelleStandardStruktur(
      baseDir,
      personType,
      people,
      tableSettings,
      templatePfade
    )

    if (!res.ok) {
      setMessageModal({ isOpen: true, message: res.message || 'Fehler beim Erstellen der Ordnerstruktur', type: 'error' })
    } else {
      setMessageModal({ isOpen: true, message: `Erstellt: ${res.createdCount || 0} Personen-Ordner, ${res.createdSubCount || 0} Unterordner`, type: 'success' })
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Ordner-Management ({personType === 'kunden' ? 'Kunden' : 'Betreuer'})</h3>
      <div style={{ fontSize: 13, color: '#334155' }}>
        Basis: {baseDir || '—'} / {personType === 'kunden' ? 'KundenDaten' : 'BetreuerDaten'}
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#ef4444' }}>
          Fehler: {error}
        </div>
      )}

      <FolderTreeEditor tree={baum} onChange={aktualisiereBaum} personType={personType} />

      {!!legacyText && (
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Hinweis: Es sind noch alte Templates (ein Ebenen) vorhanden. Beim Speichern werden diese in die neue Struktur übernommen.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={saveTemplates}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #0ea5e9',
            background: isLoading ? '#f3f4f6' : '#e0f2fe',
            color: isLoading ? '#6b7280' : '#0369a1',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Speichere...' : 'Speichern'}
        </button>
        <button
          onClick={createNow}
          disabled={!baseDir}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #16a34a',
            background: !baseDir ? '#f3f4f6' : '#dcfce7',
            color: !baseDir ? '#6b7280' : '#166534',
            cursor: !baseDir ? 'not-allowed' : 'pointer'
          }}
        >
          Jetzt erstellen
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Hinweis: Es werden nur fehlende Ordner erstellt; bestehende werden nicht verändert.
      </div>
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
    </div>
  )
}

function FolderTreeEditor({ tree, onChange, personType }: { tree: OrdnerTemplateBaum[]; onChange: (t: OrdnerTemplateBaum[]) => void; personType: 'kunden' | 'betreuer' }) {
  function updateNode(id: string, updater: (n: OrdnerTemplateBaum) => OrdnerTemplateBaum) {
    function rec(list: OrdnerTemplateBaum[]): OrdnerTemplateBaum[] {
      return list.map(n => n.id === id ? updater(n) : { ...n, children: rec(n.children || []) })
    }
    onChange(rec(tree))
  }
  function addRoot() {
    const neuerOrdner: OrdnerTemplateBaum = {
      id: Math.random().toString(36).slice(2),
      name: 'Neuer Ordner',
      files: [],
      children: []
    }
    onChange([...(tree || []), neuerOrdner])
  }
  function removeNode(id: string) {
    function rec(list: OrdnerTemplateBaum[]): OrdnerTemplateBaum[] {
      return list.filter(n => n.id !== id).map(n => ({ ...n, children: rec(n.children || []) }))
    }
    onChange(rec(tree))
  }
  function addChild(id: string) {
    const neuerUnterordner: OrdnerTemplateBaum = {
      id: Math.random().toString(36).slice(2),
      name: 'Unterordner',
      files: [],
      children: []
    }
    updateNode(id, (n) => ({ ...n, children: [ ...(n.children || []), neuerUnterordner ] }))
  }
  function renameNode(id: string, name: string) {
    updateNode(id, (n) => ({ ...n, name }))
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={addRoot} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Ordner hinzufügen</button>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {tree.map(n => (
          <FolderNodeRow key={n.id} node={n} onRename={renameNode} onRemove={removeNode} onAddChild={addChild} onChangeFiles={(id, files) => updateNode(id, (no) => ({ ...no, files }))} personType={personType} />
        ))}
      </div>
    </div>
  )
}

function FolderNodeRow({ node, onRename, onRemove, onAddChild, onChangeFiles, personType }: {
  node: OrdnerTemplateBaum;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onAddChild: (id: string) => void;
  onChangeFiles: (id: string, files: string[]) => void;
  personType: 'kunden' | 'betreuer'
}) {
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
              <>; für Kunden: {`{kvname}`}, {`{kfname}`}, {`{nb1}`} (Nachname Betreuer 1), {`{nb2}`} (Nachname Betreuer 2), {`{betreuerkunde}`} (Nachname des ausgewählten Betreuers, intelligent), {`{svnr}`} (SV-Nummer des ausgewählten Betreuers), {`{dateityp}`} (beliebige Dateierweiterung, z.B. Bild.{`{dateityp}`} findet Bild.jpg, Bild.png, etc.)</>
            ) : (
              <>; für Betreuer: {`{bvname}`}, {`{bfname}`}, {`{nk1}`} (Nachname zugewiesener Kunde), {`{svnr}`} (SV-Nummer des Betreuers), {`{betreuerkunde}`} (eigener Nachname), {`{dateityp}`} (beliebige Dateierweiterung, z.B. Bild.{`{dateityp}`} findet Bild.jpg, Bild.png, etc.)</>
            )}.
          </div>
          <textarea rows={4} value={filesText} onChange={e => setFilesText(e.currentTarget.value)} onBlur={() => onChangeFiles(node.id, filesText.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, boxSizing: 'border-box', fontFamily: 'monospace' }} />
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


