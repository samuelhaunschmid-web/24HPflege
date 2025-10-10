import { useEffect, useMemo, useState } from 'react'
import type { SpaltenGruppe } from './useTableSettings'

type Props = {
  offen: boolean
  onClose: () => void
  keys: string[]
  displayNames: Record<string, string>
  isInGruppe: (col: string, g: SpaltenGruppe) => boolean
  setDisplayName: (col: string, name: string) => void
  toggleGruppe: (col: string, g: SpaltenGruppe) => void
  onSave?: (payload: { displayNames: Record<string,string>; gruppen: Record<string, SpaltenGruppe[]> }) => void
}

export default function TabellenEinstellungenDialog({ offen, onClose, keys, displayNames, isInGruppe, setDisplayName, toggleGruppe, onSave }: Props) {
  const [tab, setTab] = useState<'zuordnung'|'name'>('zuordnung')
  const [draftNames, setDraftNames] = useState<Record<string,string>>({})
  const [draftGruppen, setDraftGruppen] = useState<Record<string, SpaltenGruppe[]>>({})

  const sichtbareKeys = useMemo(()=> keys.filter(k=> !k.startsWith('__')), [keys])

  // sync open state -> prepare draft
  useEffect(() => {
    if (offen) {
      setDraftNames(displayNames || {})
      const g: Record<string, SpaltenGruppe[]> = {}
      sichtbareKeys.forEach(k => {
        const list: SpaltenGruppe[] = []
        if (isInGruppe(k,'vorname')) list.push('vorname')
        if (isInGruppe(k,'nachname')) list.push('nachname')
        if (isInGruppe(k,'svnr')) list.push('svnr')
        if (isInGruppe(k,'telefon')) list.push('telefon')
        if (isInGruppe(k,'geburtsdatum')) list.push('geburtsdatum')
        if (isInGruppe(k,'anfang')) list.push('anfang')
        if (isInGruppe(k,'ende')) list.push('ende')
        if (isInGruppe(k,'vorlage')) list.push('vorlage')
        if (isInGruppe(k,'wichtig')) list.push('wichtig')
        if (isInGruppe(k,'datum')) list.push('datum')
        if (isInGruppe(k,'betreuer1')) list.push('betreuer1')
        if (isInGruppe(k,'betreuer1_anfang')) list.push('betreuer1_anfang')
        if (isInGruppe(k,'betreuer2')) list.push('betreuer2')
        if (isInGruppe(k,'betreuer2_anfang')) list.push('betreuer2_anfang')
        if (list.length) g[k] = list
      })
      setDraftGruppen(g)
    }
  }, [offen, displayNames, sichtbareKeys, isInGruppe])

  function draftToggle(col: string, g: SpaltenGruppe) {
    setDraftGruppen(prev => {
      const prevList = prev[col] || []
      const exists = prevList.includes(g)
      const next = exists ? prevList.filter(x=>x!==g) : [...prevList, g]
      return { ...prev, [col]: next }
    })
  }

  if (!offen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', zIndex: 1000 }}>
      <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #eee', flex: '0 0 auto' }}>
          <strong>Tabellen-Einstellungen</strong>
          <button onClick={onClose}>Schließen</button>
        </div>
        <div style={{ padding: 12, overflow: 'auto', flex: '1 1 auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={()=>setTab('zuordnung')} style={{ padding: '6px 10px', background: tab==='zuordnung' ? '#005bd1' : '#f2f2f2', color: tab==='zuordnung' ? '#fff':'#333', border: 0, borderRadius: 6 }}>Zuordnung</button>
            <button onClick={()=>setTab('name')} style={{ padding: '6px 10px', background: tab==='name' ? '#005bd1' : '#f2f2f2', color: tab==='name' ? '#fff':'#333', border: 0, borderRadius: 6 }}>Name</button>
          </div>

          {tab==='zuordnung' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: 12, color: '#666' }}>
                <div>Bitte Spalten den Rollen zuordnen. Aktive Zuordnungen sind farbig markiert.</div>
              </div>
              {sichtbareKeys.map(k => {
              const chips: Array<{ key: SpaltenGruppe; label: string; color: string }> = [
                  { key: 'vorname', label: 'Vorname', color: '#1d4ed8' },
                  { key: 'nachname', label: 'Nachname', color: '#1d4ed8' },
                  { key: 'svnr', label: 'SVNR', color: '#0f766e' },
                  { key: 'telefon', label: 'Telefon', color: '#0f766e' },
                  { key: 'geburtsdatum', label: 'Geburtsdatum', color: '#b45309' },
                  { key: 'anfang', label: 'Anfang', color: '#b45309' },
                  { key: 'ende', label: 'Ende', color: '#b45309' },
                  { key: 'vorlage', label: 'Vorlage', color: '#2563eb' },
                  { key: 'betreuer1', label: 'Betreuer 1', color: '#6b7280' },
                  { key: 'betreuer1_anfang', label: 'Betreuer 1 Anfang', color: '#6b7280' },
                  { key: 'betreuer2', label: 'Betreuer 2', color: '#6b7280' },
                  { key: 'betreuer2_anfang', label: 'Betreuer 2 Anfang', color: '#6b7280' },
                  { key: 'wichtig', label: 'Wichtig', color: '#9333ea' },
                  { key: 'datum', label: 'Datum', color: '#b45309' },
                ]
                const name = displayNames[k] || k
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #eee', borderRadius: 8, padding: '6px 8px', background: '#fafafa' }}>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
                      {chips.map(c => {
                        const active = (draftGruppen[k] || []).includes(c.key)
                        return (
                          <button key={c.key} onClick={()=> {
                            if (c.key==='geburtsdatum') {
                              const updated: Record<string, SpaltenGruppe[]> = {}
                              // remove geburtsdatum everywhere
                              sichtbareKeys.forEach(col => {
                                const arr = (draftGruppen[col]||[]).filter(g=> g!=='geburtsdatum')
                                if (arr.length) updated[col] = arr
                              })
                              // toggle on current
                              const list = updated[k] || []
                              updated[k] = active ? list : [...list, 'geburtsdatum']
                              setDraftGruppen(updated)
                              return
                            }
                            if (c.key==='anfang') {
                              const updated: Record<string, SpaltenGruppe[]> = {}
                              sichtbareKeys.forEach(col => {
                                const arr = (draftGruppen[col]||[]).filter(g=> g!=='anfang')
                                if (arr.length) updated[col] = arr
                              })
                              const list = updated[k] || []
                              updated[k] = active ? list : [...list, 'anfang']
                              setDraftGruppen(updated)
                              return
                            }
                            if (c.key==='ende') {
                              const updated: Record<string, SpaltenGruppe[]> = {}
                              sichtbareKeys.forEach(col => {
                                const arr = (draftGruppen[col]||[]).filter(g=> g!=='ende')
                                if (arr.length) updated[col] = arr
                              })
                              const list = updated[k] || []
                              updated[k] = active ? list : [...list, 'ende']
                              setDraftGruppen(updated)
                              return
                            }
                            draftToggle(k, c.key)
                          }} style={{
                            padding: '2px 6px',
                            fontSize: 12,
                            lineHeight: '18px',
                            borderRadius: 999,
                            border: active ? '0' : '1px solid #ddd',
                            background: active ? c.color : '#fff',
                            color: active ? '#fff' : '#333',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}>{c.label}</button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab==='name' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sichtbareKeys.map(k => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayNames[k] || k}</div>
                    <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</div>
                  </div>
                  <input
                    style={{ width: '100%' }}
                    value={draftNames[k] || ''}
                    placeholder={`Anzeigename für ${k}`}
                    onChange={e=> {
                      const val = (e && e.currentTarget && typeof e.currentTarget.value === 'string') ? e.currentTarget.value : ''
                      setDraftNames(prev => ({ ...prev, [k]: val }))
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #eee', background: '#fff', flex: '0 0 auto' }}>
          <div style={{ fontSize: 12, color: '#666' }}>Einstellungen werden nur in der App gespeichert.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7' }}>Abbrechen</button>
            <button onClick={() => {
              // commit draft
              sichtbareKeys.forEach(k => {
                if (draftNames[k] !== undefined) setDisplayName(k, draftNames[k])
                const list = draftGruppen[k] || []
                ;(['vorname','nachname','svnr','telefon','geburtsdatum','anfang','ende','vorlage','betreuer1','betreuer1_anfang','betreuer2','betreuer2_anfang','wichtig','datum'] as SpaltenGruppe[]).forEach(g => {
                  const has = list.includes(g)
                  const is = isInGruppe(k, g)
                  if (has !== is) toggleGruppe(k, g)
                })
              })
              onSave?.({ displayNames: draftNames, gruppen: draftGruppen })
              onClose()
            }} style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: '#005bd1', color: '#fff' }}>Speichern</button>
          </div>
        </div>
      </div>
    </div>
  )
}


