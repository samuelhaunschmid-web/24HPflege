import { useEffect, useMemo, useState } from 'react'
import { useTableSettings } from './useTableSettings'
import { StandardOrdnerService } from '../logik/dateiVerwaltung/standardOrdnerService'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'

type Props = {
  personType: 'kunden' | 'betreuer'
  daten: any[]
}

export default function OrdnerManagment({ personType, daten }: Props) {
  const keys = useMemo(() => (daten.length ? Object.keys(daten[0]) : []), [daten])
  const { settings } = useTableSettings(personType, keys)
  const [visible, setVisible] = useState(false)
  const [subfoldersText, setSubfoldersText] = useState('Verträge\nRechnungen')
  const [resultMsg, setResultMsg] = useState('')
  const [dokumenteDir, setDokumenteDir] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Basis-Ordner laden
  useEffect(() => {
    StandardTemplateService.ladeBasisOrdner().then(setDokumenteDir)
  }, [])

  // Namen vorbereiten
  const names = useMemo(() => {
    return daten.map(row => {
      const { anzeigeName } = StandardOrdnerService.ermittlePersonNamen(row, personType, settings)
      return anzeigeName
    }).filter(Boolean)
  }, [daten, personType, settings])

  async function handleCreate() {
    setResultMsg('')
    setIsLoading(true)

    try {
      const subs = subfoldersText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      if (!dokumenteDir) {
        setResultMsg('Bitte Dokumente-Ordner in den Einstellungen wählen.')
        return
      }
      if (!names.length) {
        setResultMsg('Keine Namen gefunden (prüfe Gruppen-Zuordnung für Vorname/Nachname).')
        return
      }

      const res = await StandardOrdnerService.erstelleStandardStruktur(
        dokumenteDir,
        personType,
        daten,
        settings,
        subs
      )

      if (res.ok) {
        setResultMsg(`Erstellt: ${res.createdCount || 0} Personen-Ordner, ${res.createdSubCount || 0} Unterordner`)
      } else {
        setResultMsg(res.message || 'Fehler beim Erstellen')
      }
    } catch (e) {
      setResultMsg(String(e))
    } finally {
      setIsLoading(false)
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
            <button
              onClick={handleCreate}
              disabled={isLoading || !dokumenteDir}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #16a34a',
                background: isLoading || !dokumenteDir ? '#f3f4f6' : '#dcfce7',
                color: isLoading || !dokumenteDir ? '#6b7280' : '#166534',
                cursor: isLoading || !dokumenteDir ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Erstelle...' : 'Erstellen'}
            </button>
            <button onClick={() => setVisible(false)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Schließen</button>
          </div>
          {resultMsg && <div style={{ marginTop: 4, color: '#334155' }}>{resultMsg}</div>}
        </div>
      )}
    </div>
  )
}









