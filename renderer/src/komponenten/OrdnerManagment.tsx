import { useEffect, useMemo, useState } from 'react'
import { useTableSettings } from './useTableSettings'

type Props = {
  personType: 'kunden' | 'betreuer'
  daten: any[]
  dokumenteDir: string
}

export default function OrdnerManagment({ personType, daten, dokumenteDir }: Props) {
  const keys = useMemo(() => (daten.length ? Object.keys(daten[0]) : []), [daten])
  const { settings } = useTableSettings(personType, keys)
  const [visible, setVisible] = useState(false)
  const [subfoldersText, setSubfoldersText] = useState('Verträge\nRechnungen')
  const [resultMsg, setResultMsg] = useState('')

  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    const vorKey = keys.find(k => (settings.gruppen[k] || []).includes('vorname'))
    const nachKey = keys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    const list = daten.map(row => {
      const vor = String(vorKey ? row[vorKey] || '' : '').trim()
      const nach = String(nachKey ? row[nachKey] || '' : '').trim()
      return `${vor} ${nach}`.trim()
    }).filter(Boolean)
    setNames(list)
  }, [daten, keys, settings])

  async function handleCreate() {
    setResultMsg('')
    const subs = subfoldersText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (!dokumenteDir) { setResultMsg('Bitte Dokumente-Ordner in den Einstellungen wählen.'); return }
    if (!names.length) { setResultMsg('Keine Namen gefunden (prüfe Gruppen-Zuordnung für Vorname/Nachname).'); return }
    try {
      const res = await window.api?.folders?.ensureStructure?.({
        baseDir: dokumenteDir,
        personType,
        names,
        subfolders: subs,
      })
      if (res?.ok) {
        setResultMsg(`Erstellt: ${res.createdCount || 0} Personen-Ordner, ${res.createdSubCount || 0} Unterordner`)
      } else {
        setResultMsg(res?.message || 'Fehler beim Erstellen')
      }
    } catch (e) {
      setResultMsg(String(e))
    }
  }

  return (
    <div>
      <button onClick={() => setVisible(v => !v)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>
        Ordner-Management
      </button>
      {visible && (
        <div style={{ marginTop: 12, background: '#fff', border: '1px solid #e6e8ef', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Automatisches Erstellen von Ordnerstrukturen</div>
          <div style={{ fontSize: 13, color: '#334155' }}>Zielbasis: {dokumenteDir || '—'} ({personType === 'kunden' ? 'KundenDaten' : 'BetreuerDaten'})</div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Unterordner (je Zeile einer)</label>
            <textarea rows={4} value={subfoldersText} onChange={e => setSubfoldersText(e.currentTarget.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Es werden nur fehlende Ordner erstellt. Bereits vorhandene bleiben unverändert.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#dcfce7', color: '#166534', cursor: 'pointer' }}>Erstellen</button>
            <button onClick={() => setVisible(false)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Schließen</button>
          </div>
          {resultMsg && <div style={{ marginTop: 4, color: '#334155' }}>{resultMsg}</div>}
        </div>
      )}
    </div>
  )
}





