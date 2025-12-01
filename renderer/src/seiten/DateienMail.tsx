import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import { useTableSettings } from '../komponenten/useTableSettings'
import { useDateienMailTemplates } from '../logik/dateiVerwaltung/useDateienMailTemplates'
import { useDateienMailVersand } from '../logik/dateiVerwaltung/useDateienMailVersand'
import { StandardOrdnerService } from '../logik/dateiVerwaltung/standardOrdnerService'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'
import type { EmailTemplate } from '../logik/dateiVerwaltung/typen'
import MessageModal from '../komponenten/MessageModal'

type TemplateSelection = {
  templateId: string
  selected: boolean
  kundenKeys: string[]
  betreuerKeys: string[]
}

export default function DateienMail() {
  const [kunden, setKunden] = useState<any[]>([])
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [selections, setSelections] = useState<Record<string, TemplateSelection>>({})
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Verwende zentrale Hooks
  const { templates, ladeTemplates } = useDateienMailTemplates()
  const { sendeAuswahl } = useDateienMailVersand()

  // Personenlisten laden
  useEffect(() => {
    const loadLists = async () => {
      const lists = await window.docgen?.getLists?.()
      if (lists?.kunden) setKunden(lists.kunden)
      if (lists?.betreuer) setBetreuer(lists.betreuer)
    }
    loadLists()
  }, [])

  // Templates laden
  useEffect(() => {
    ladeTemplates()
  }, [ladeTemplates])

  // Templates neu laden, wenn das Fenster wieder Fokus bekommt (z.B. nach Schließen des Dialog-Fensters)
  useEffect(() => {
    const handleFocus = () => {
      ladeTemplates()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [ladeTemplates])

  const kundenKeys = useMemo(() => (kunden.length ? Object.keys(kunden[0]) : []), [kunden])
  const betreuerKeys = useMemo(() => (betreuer.length ? Object.keys(betreuer[0]) : []), [betreuer])
  const { settings: kundenSettings } = useTableSettings('kunden', kundenKeys)
  const { settings: betreuerSettings } = useTableSettings('betreuer', betreuerKeys)

  const tableSettings = useMemo(() => ({
    kunden: kundenSettings,
    betreuer: betreuerSettings
  }), [kundenSettings, betreuerSettings])

  const sortedKunden = useMemo(() => {
    const knKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
    return [...kunden].sort((a, b) => {
      const na = String(knKey ? a[knKey] || '' : '').trim()
      const nb = String(knKey ? b[knKey] || '' : '').trim()
      return na.localeCompare(nb)
    })
  }, [kunden, kundenKeys, kundenSettings])

  const sortedBetreuer = useMemo(() => {
    const bnKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    return [...betreuer].sort((a, b) => {
      const na = String(bnKey ? a[bnKey] || '' : '').trim()
      const nb = String(bnKey ? b[bnKey] || '' : '').trim()
      return na.localeCompare(nb)
    })
  }, [betreuer, betreuerKeys, betreuerSettings])

  // Selections initialisieren/warten
  useEffect(() => {
    const init: Record<string, TemplateSelection> = {}
    templates.forEach(t => {
      init[t.id] = selections[t.id] || { templateId: t.id, selected: false, kundenKeys: [], betreuerKeys: [] }
    })
    // Entferne nicht mehr existierende Templates
    Object.keys(selections).forEach(id => {
      if (!templates.find(t => t.id === id)) delete init[id]
    })
    setSelections(init)
  }, [templates])

  async function sendAllSelected() {
    const selectedTemplateIds = Object.entries(selections).filter(([_, sel]) => sel.selected).map(([id]) => id)
    if (!selectedTemplateIds.length) {
      setMessageModal({ isOpen: true, message: 'Bitte mindestens eine Vorlage auswählen', type: 'info' })
      return
    }

    try {
      const ergebnis = await sendeAuswahl(
        templates,
        selections,
        kunden,
        betreuer,
        tableSettings
      )

      if (ergebnis.erfolg) {
        setMessageModal({ isOpen: true, message: ergebnis.message, type: 'success' })
        // Reset selections
        const reset: Record<string, TemplateSelection> = {}
        templates.forEach(t => {
          reset[t.id] = { templateId: t.id, selected: false, kundenKeys: [], betreuerKeys: [] }
        })
        setSelections(reset)
      } else {
        setMessageModal({ isOpen: true, message: `Fehler beim Versenden: ${ergebnis.message}`, type: 'error' })
      }
    } catch (error) {
      setMessageModal({ isOpen: true, message: `Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`, type: 'error' })
    }
  }

  return (
    <Layout>
      <div style={{ background: '#fff', border: '1px solid #e6e8ef', borderRadius: 10, padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, flex: 1 }}>Mail – Dateien Verwaltung</div>
          <button onClick={() => window.api?.openMailTemplatesDialog?.()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>Vorlagen bearbeiten</button>
        </div>

        {templates.length > 0 && (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              {templates.map(t => {
                const sel = selections[t.id] || { templateId: t.id, selected: false, kundenKeys: [], betreuerKeys: [] }
                // Prüfe ausgewählte Dateien
                const needsKundenFiles = t.selectedFiles.some(f => f.personType === 'kunden')
                const needsBetreuerFiles = t.selectedFiles.some(f => f.personType === 'betreuer')
                // Prüfe Platzhalter in E-Mail-Feldern und Dateinamen
                const textContent = `${t.to} ${t.subject} ${t.text}`.toLowerCase()
                const fileTemplatesContent = t.selectedFiles.map(f => f.fileTemplate).join(' ').toLowerCase()
                const allContent = `${textContent} ${fileTemplatesContent}`
                const hasKundenPlaceholders = /\{(?:vorname|nachname|kvname|kfname|nb1|nb2)\}/i.test(textContent)
                const hasBetreuerPlaceholders = /\{(?:vorname|nachname|bvname|bfname|nk1)\}/i.test(textContent)
                const hasBetreuerkunde = /\{betreuerkunde\}/i.test(allContent)
                // Kombiniere beide Prüfungen
                const needsKunden = needsKundenFiles || hasKundenPlaceholders || hasBetreuerkunde
                const needsBetreuer = needsBetreuerFiles || hasBetreuerPlaceholders || hasBetreuerkunde
                const kvKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('vorname'))
                const knKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
                const bvKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
                const bnKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
                return (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    selection={sel}
                    needsKunden={needsKunden}
                    needsBetreuer={needsBetreuer}
                    kunden={sortedKunden}
                    betreuer={sortedBetreuer}
                    kvKey={kvKey}
                    knKey={knKey}
                    bvKey={bvKey}
                    bnKey={bnKey}
                    kundenSettings={kundenSettings}
                    betreuerSettings={betreuerSettings}
                    onSelectionChange={(next) => setSelections(prev => ({ ...prev, [t.id]: next }))}
                  />
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid #e6e8ef', paddingTop: 12 }}>
              <button
                onClick={sendAllSelected}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #16a34a', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
              >
                Alle ausgewählten Emails versenden
              </button>
            </div>
          </>
        )}
        {templates.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
            Keine Vorlagen vorhanden. Bitte erstelle eine Vorlage über "Vorlagen bearbeiten".
          </div>
        )}
      </div>
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
    </Layout>
  )
}

function TemplateRow({ template, selection, needsKunden, needsBetreuer, kunden, betreuer, kvKey, knKey, bvKey, bnKey, kundenSettings, betreuerSettings, onSelectionChange }: {
  template: EmailTemplate
  selection: TemplateSelection
  needsKunden: boolean
  needsBetreuer: boolean
  kunden: any[]
  betreuer: any[]
  kvKey: string | undefined
  knKey: string | undefined
  bvKey: string | undefined
  bnKey: string | undefined
  kundenSettings: any
  betreuerSettings: any
  onSelectionChange: (sel: TemplateSelection) => void
}) {
  const [kundenSearch, setKundenSearch] = useState('')
  const [betreuerSearch, setBetreuerSearch] = useState('')
  const [kundenOpen, setKundenOpen] = useState(false)
  const [betreuerOpen, setBetreuerOpen] = useState(false)
  const [kundenFileStatus, setKundenFileStatus] = useState<Record<string, { allFound: boolean; details: Array<{ file: string; found: boolean }> }>>({})
  const [betreuerFileStatus, setBetreuerFileStatus] = useState<Record<string, { allFound: boolean; details: Array<{ file: string; found: boolean }> }>>({})

  // Anzeige-Namen für Kunden/Betreuer (wie in Startseite.tsx)
  const kundenLabels = useMemo(() => {
    return kunden.map(k => ({
      key: k.__key,
      label: `${String(knKey ? k[knKey] || '' : '').trim()} ${String(kvKey ? k[kvKey] || '' : '').trim()}`.trim()
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [kunden, knKey, kvKey])

  const betreuerLabels = useMemo(() => {
    return betreuer.map(b => ({
      key: b.__key,
      label: `${String(bnKey ? b[bnKey] || '' : '').trim()} ${String(bvKey ? b[bvKey] || '' : '').trim()}`.trim()
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [betreuer, bnKey, bvKey])

  const filteredKunden = useMemo(() => {
    const q = kundenSearch.trim().toLowerCase()
    if (!q) return kundenLabels
    return kundenLabels.filter(k => k.label.toLowerCase().includes(q))
  }, [kundenLabels, kundenSearch])

  const filteredBetreuer = useMemo(() => {
    const q = betreuerSearch.trim().toLowerCase()
    if (!q) return betreuerLabels
    return betreuerLabels.filter(b => b.label.toLowerCase().includes(q))
  }, [betreuerLabels, betreuerSearch])

  // Lokale Funktion: prüft Dateien für einen Kunden/Betreuer nur für DIESES Template
  const checkFilesForPerson = async (personType: 'kunden' | 'betreuer', person: any, betreuer?: any) => {
    const baseDir = await StandardTemplateService.ladeBasisOrdner()
    if (!baseDir) return { allFound: false, details: [] }

    const relevantFiles = template.selectedFiles.filter(f => f.personType === personType)
    if (relevantFiles.length === 0) return { allFound: true, details: [] }

    const settings = personType === 'kunden' ? kundenSettings : betreuerSettings

    const details: Array<{ file: string; found: boolean; folderPath: string }> = []
    const fileStatusMap = new Map<string, { found: boolean; folderPath: string }>()

    for (const selFile of relevantFiles) {
      // Prüfe, ob Template {betreuerkunde} enthält
      const hatBetreuerkunde = /\{betreuerkunde\}/i.test(selFile.fileTemplate)
      
      // Erweitere Kontext um Betreuer-Settings, wenn {betreuerkunde} verwendet wird
      const kontext = hatBetreuerkunde && personType === 'kunden' && betreuer
        ? { baseDir, personType, row: person, settings, betreuerSettings: betreuerSettings }
        : { baseDir, personType, row: person, settings }
      
      // Übergebe betreuerRow, wenn vorhanden (für {betreuerkunde} Platzhalter)
      const dateiErgebnis = await StandardOrdnerService.findeStandardDatei(kontext, selFile.folderPath, selFile.fileTemplate, betreuer)
      
      // Ersetze Platzhalter für expectedName (für Anzeige)
      const { ersetzePlatzhalter } = await import('../logik/dateiVerwaltung/platzhalter')
      const platzhalterKontext = {
        personType,
        row: person,
        settings,
        ...(betreuer ? { 
          betreuerRow: betreuer,
          betreuerSettings: personType === 'kunden' ? betreuerSettings : undefined
        } : {})
      }
      const expectedName = ersetzePlatzhalter(selFile.fileTemplate, platzhalterKontext)
      
      const found = !!(dateiErgebnis.exists && dateiErgebnis.path)
      const folderPathStr = selFile.folderPath.join(' / ')

      // Wenn Datei bereits geprüft wurde: nur aktualisieren wenn jetzt gefunden (OR-Logik)
      // Verwende expectedName als Key, nicht das Template
      const existing = fileStatusMap.get(expectedName)
      if (existing) {
        if (found) {
          fileStatusMap.set(expectedName, { found: true, folderPath: folderPathStr })
        }
        // Wenn nicht gefunden, behalte bestehenden Status (kann schon true sein)
      } else {
        fileStatusMap.set(expectedName, { found, folderPath: folderPathStr })
      }
    }

    // Konvertiere Map zu Array
    for (const [file, status] of fileStatusMap.entries()) {
      details.push({ file, ...status })
    }

    const allFound = details.every(d => d.found)
    return { allFound, details }
  }

  // Dateien prüfen, wenn sich die Auswahl in dieser Zeile ändert
  useEffect(() => {
    const run = async () => {
      const kStatus: typeof kundenFileStatus = {}
      const bStatus: typeof betreuerFileStatus = {}

      if (selection.kundenKeys.length) {
        for (const key of selection.kundenKeys) {
          const kunde = kunden.find(k => k.__key === key)
          if (kunde) {
            // Wenn {betreuerkunde} verwendet wird und ein Betreuer ausgewählt ist, übergebe diesen
            const selectedBetreuer = selection.betreuerKeys.length > 0 
              ? betreuer.find(b => b.__key === selection.betreuerKeys[0])
              : undefined
            kStatus[key] = await checkFilesForPerson('kunden', kunde, selectedBetreuer)
          }
        }
      }

      if (selection.betreuerKeys.length) {
        for (const key of selection.betreuerKeys) {
          const bet = betreuer.find(b => b.__key === key)
          if (bet) {
            bStatus[key] = await checkFilesForPerson('betreuer', bet)
          }
        }
      }

      setKundenFileStatus(kStatus)
      setBetreuerFileStatus(bStatus)
    }

    void run()
  }, [selection.kundenKeys, selection.betreuerKeys, template.selectedFiles, kunden, betreuer])

  // Single-Choice-Auswahl, intern weiterhin als Array (0 oder 1 Element)
  function toggleKunde(key: string) {
    const alreadySelected = selection.kundenKeys[0] === key
    const next = alreadySelected ? [] : [key]
    onSelectionChange({ ...selection, kundenKeys: next })
  }

  function toggleBetreuer(key: string) {
    const alreadySelected = selection.betreuerKeys[0] === key
    const next = alreadySelected ? [] : [key]
    onSelectionChange({ ...selection, betreuerKeys: next })
  }

  const kundenDisplay = selection.kundenKeys.length > 0 ? (() => {
    const kd = kunden.find(ku => ku.__key === selection.kundenKeys[0])
    if (!kd) return ''
    const vor = String(kvKey ? kd[kvKey] || '' : '').trim()
    const nach = String(knKey ? kd[knKey] || '' : '').trim()
    return `${nach} ${vor}`.trim()
  })() : ''

  const betreuerDisplay = selection.betreuerKeys.length > 0 ? (() => {
    const bd = betreuer.find(be => be.__key === selection.betreuerKeys[0])
    if (!bd) return ''
    const vor = String(bvKey ? bd[bvKey] || '' : '').trim()
    const nach = String(bnKey ? bd[bnKey] || '' : '').trim()
    return `${nach} ${vor}`.trim()
  })() : ''

  return (
    <div style={{ border: '1px solid #e6e8ef', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={selection.selected}
          onChange={(e) => onSelectionChange({ ...selection, selected: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        <div style={{ fontWeight: 600, flex: 1 }}>{template.name}</div>
        {needsKunden && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Kunden wählen..."
                value={kundenDisplay || kundenSearch}
                onChange={(e) => {
                  const v = e.currentTarget.value
                  setKundenSearch(v)
                  const found = kundenLabels.find(x => x.label === v)
                  if (found) {
                    toggleKunde(found.key)
                  } else {
                    if (selection.kundenKeys.length > 0) {
                      onSelectionChange({ ...selection, kundenKeys: [] })
                    }
                  }
                }}
                onFocus={() => setKundenOpen(true)}
                onBlur={() => setTimeout(() => setKundenOpen(false), 150)}
                style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
              />
            </div>
            {selection.kundenKeys.length > 0 && (() => {
              const allStatus = selection.kundenKeys.map(key => kundenFileStatus[key]).filter(Boolean)
              const allFound = allStatus.length > 0 && allStatus.every(s => s.allFound)
              const hasSome = allStatus.length > 0
              const tooltip = hasSome ? allStatus.map((status, idx) => {
                const kunde = kunden.find(k => k.__key === selection.kundenKeys[idx])
                const name = kunde ? `${String(knKey ? kunde[knKey] || '' : '').trim()} ${String(kvKey ? kunde[kvKey] || '' : '').trim()}`.trim() : ''
                const missing = status.details.filter(d => !d.found).map(d => d.file).join(', ')
                const files = status.details.map(d => d.file).join(', ')
                if (missing) {
                  return `${name}: Fehlt: ${missing}`
                }
                return `${name}: Alle Dateien vorhanden (${files})`
              }).join('\n') : ''

              return (
                <div style={{ position: 'relative' }} title={tooltip}>
                  {allFound ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#10b981" />
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#ef4444" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              )
            })()}
            {kundenOpen && (
              <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                {filteredKunden.length === 0 ? (
                  <div style={{ padding: '8px 10px', color: '#64748b', fontWeight: '600' }}>Keine Treffer</div>
                ) : (
                  filteredKunden.map((k, i) => {
                    const isSelected = selection.kundenKeys.includes(k.key)
                    return (
                      <div
                        key={k.key + String(i)}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          toggleKunde(k.key)
                          setKundenSearch(k.label)
                          setKundenOpen(false)
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          color: '#1f2937',
                          fontWeight: '600',
                          background: isSelected ? '#e0f2fe' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                          }
                        }}
                      >
                        {k.label}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
        {needsBetreuer && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Betreuer wählen..."
                value={betreuerDisplay || betreuerSearch}
                onChange={(e) => {
                  const v = e.currentTarget.value
                  setBetreuerSearch(v)
                  const found = betreuerLabels.find(x => x.label === v)
                  if (found) {
                    toggleBetreuer(found.key)
                  } else {
                    if (selection.betreuerKeys.length > 0) {
                      onSelectionChange({ ...selection, betreuerKeys: [] })
                    }
                  }
                }}
                onFocus={() => setBetreuerOpen(true)}
                onBlur={() => setTimeout(() => setBetreuerOpen(false), 150)}
                style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
              />
            </div>
            {selection.betreuerKeys.length > 0 && (() => {
              const allStatus = selection.betreuerKeys.map(key => betreuerFileStatus[key]).filter(Boolean)
              const allFound = allStatus.length > 0 && allStatus.every(s => s.allFound)
              const hasSome = allStatus.length > 0
              const tooltip = hasSome ? allStatus.map((status, idx) => {
                const bet = betreuer.find(b => b.__key === selection.betreuerKeys[idx])
                const name = bet ? `${String(bnKey ? bet[bnKey] || '' : '').trim()} ${String(bvKey ? bet[bvKey] || '' : '').trim()}`.trim() : ''
                const missing = status.details.filter(d => !d.found).map(d => d.file).join(', ')
                const files = status.details.map(d => d.file).join(', ')
                if (missing) {
                  return `${name}: Fehlt: ${missing}`
                }
                return `${name}: Alle Dateien vorhanden (${files})`
              }).join('\n') : ''

              return (
                <div style={{ position: 'relative' }} title={tooltip}>
                  {allFound ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#10b981" />
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#ef4444" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              )
            })()}
            {betreuerOpen && (
              <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                {filteredBetreuer.length === 0 ? (
                  <div style={{ padding: '8px 10px', color: '#64748b', fontWeight: '600' }}>Keine Treffer</div>
                ) : (
                  filteredBetreuer.map((b, i) => {
                    const isSelected = selection.betreuerKeys.includes(b.key)
                    return (
                      <div
                        key={b.key + String(i)}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          toggleBetreuer(b.key)
                          setBetreuerSearch(b.label)
                          setBetreuerOpen(false)
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          color: '#1f2937',
                          fontWeight: '600',
                          background: isSelected ? '#e0f2fe' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                          }
                        }}
                      >
                        {b.label}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}