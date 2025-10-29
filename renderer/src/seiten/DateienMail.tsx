import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import { useTableSettings } from '../komponenten/useTableSettings'

type EmailTemplate = {
  id: string
  name: string
  to: string
  subject: string
  text: string
  selectedFiles: Array<{ personType: 'kunden' | 'betreuer'; folderPath: string[]; fileTemplate: string }>
}

type TemplateSelection = {
  templateId: string
  selected: boolean
  kundenKeys: string[]
  betreuerKeys: string[]
}

export default function DateienMail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [cfg, setCfg] = useState<any>({}) // Wird für folderTemplatesRules benötigt
  const [baseDir, setBaseDir] = useState('')
  const [kunden, setKunden] = useState<any[]>([])
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [selections, setSelections] = useState<Record<string, TemplateSelection>>({})

  useEffect(() => {
    ;(async () => {
      const cfgVal = await window.api?.getConfig?.()
      setCfg(cfgVal || {})
      setBaseDir(cfgVal?.dokumenteDir || '')
      const lists = await window.docgen?.getLists?.()
      if (lists?.kunden) setKunden(lists.kunden)
      if (lists?.betreuer) setBetreuer(lists.betreuer)
      const stored = cfgVal?.dateienMailTemplates || []
      const tpls = Array.isArray(stored) ? stored : []
      setTemplates(tpls)
      // Initialisiere selections
      const init: Record<string, TemplateSelection> = {}
      tpls.forEach(t => {
        init[t.id] = { templateId: t.id, selected: false, kundenKeys: [], betreuerKeys: [] }
      })
      setSelections(init)
    })()
  }, [])

  // Template-Liste aktualisieren (wenn Dialog Vorlagen speichert)
  useEffect(() => {
    const interval = setInterval(async () => {
      const cfgVal = await window.api?.getConfig?.()
      const stored = cfgVal?.dateienMailTemplates || []
      const current = Array.isArray(stored) ? stored : []
      if (JSON.stringify(current.map(t => t.id)) !== JSON.stringify(templates.map(t => t.id))) {
        setTemplates(current)
        const next: Record<string, TemplateSelection> = { ...selections }
        current.forEach(t => {
          if (!next[t.id]) next[t.id] = { templateId: t.id, selected: false, kundenKeys: [], betreuerKeys: [] }
        })
        Object.keys(next).forEach(id => {
          if (!current.find(t => t.id === id)) delete next[id]
        })
        setSelections(next)
        setCfg(cfgVal || {})
      }
    }, 500)
    return () => clearInterval(interval)
  }, [templates, selections])

  const kundenKeys = useMemo(() => (kunden.length ? Object.keys(kunden[0]) : []), [kunden])
  const betreuerKeys = useMemo(() => (betreuer.length ? Object.keys(betreuer[0]) : []), [betreuer])
  const { settings: kundenSettings } = useTableSettings('kunden', kundenKeys)
  const { settings: betreuerSettings } = useTableSettings('betreuer', betreuerKeys)

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

  function replacePlaceholders(text: string, row: any, personType: 'kunden' | 'betreuer'): string {
    const keys = personType === 'kunden' ? kundenKeys : betreuerKeys
    const settings = personType === 'kunden' ? kundenSettings : betreuerSettings
    const vorKey = keys.find(k => (settings.gruppen[k] || []).includes('vorname'))
    const nachKey = keys.find(k => (settings.gruppen[k] || []).includes('nachname'))
    const b1Key = personType === 'kunden' ? keys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer1')) : null
    const b2Key = personType === 'kunden' ? keys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer2')) : null
    const vor = String(vorKey ? row[vorKey] || '' : '').trim()
    const nach = String(nachKey ? row[nachKey] || '' : '').trim()
    const b1Full = b1Key ? String(row[b1Key] || '').trim() : ''
    const b2Full = b2Key ? String(row[b2Key] || '').trim() : ''
    const getNachname = (full: string) => {
      const parts = full.split(/\s+/).filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : ''
    }
    const nb1 = personType === 'kunden' ? getNachname(b1Full) : ''
    const nb2 = personType === 'kunden' ? getNachname(b2Full) : ''
    let nk1 = ''
    if (personType === 'betreuer' && kunden.length && kundenKeys.length) {
      const kundenB1Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer1'))
      const kundenB2Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer2'))
      const kundenNachKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
      const betreuerFull = `${vor} ${nach}`.trim()
      for (const kunde of kunden) {
        const b1Val = kundenB1Key ? String(kunde[kundenB1Key] || '').trim() : ''
        const b2Val = kundenB2Key ? String(kunde[kundenB2Key] || '').trim() : ''
        if (b1Val === betreuerFull || b2Val === betreuerFull) {
          nk1 = kundenNachKey ? String(kunde[kundenNachKey] || '').trim() : ''
          break
        }
      }
    }
    return String(text || '')
      .replace(/\{vorname\}/gi, vor)
      .replace(/\{nachname\}/gi, nach)
      .replace(/\{kvname\}/gi, vor)
      .replace(/\{kfname\}/gi, nach)
      .replace(/\{bvname\}/gi, vor)
      .replace(/\{bfname\}/gi, nach)
      .replace(/\{nb1\}/gi, nb1)
      .replace(/\{nb2\}/gi, nb2)
      .replace(/\{nk1\}/gi, nk1)
  }

  async function sendAllSelected() {
    if (!baseDir) return alert('Dokumente-Ordner nicht gesetzt')
    const selectedTemplateIds = Object.entries(selections).filter(([_, sel]) => sel.selected).map(([id]) => id)
    if (!selectedTemplateIds.length) return alert('Bitte mindestens eine Vorlage auswählen')

    const allBatch: Array<{ to: string; subject: string; text: string; attachments: Array<{ path: string; filename?: string }> }> = []

    for (const templateId of selectedTemplateIds) {
      const tpl = templates.find(t => t.id === templateId)
      if (!tpl) continue
      const sel = selections[templateId]
      if (!sel) continue

      // Prüfe ausgewählte Dateien
      const needsKundenFiles = tpl.selectedFiles.some(f => f.personType === 'kunden')
      const needsBetreuerFiles = tpl.selectedFiles.some(f => f.personType === 'betreuer')
      // Prüfe Platzhalter in E-Mail-Feldern
      const textContent = `${tpl.to} ${tpl.subject} ${tpl.text}`.toLowerCase()
      const hasKundenPlaceholders = /\{(?:vorname|nachname|kvname|kfname|nb1|nb2)\}/i.test(textContent)
      const hasBetreuerPlaceholders = /\{(?:vorname|nachname|bvname|bfname|nk1)\}/i.test(textContent)
      // Kombiniere beide Prüfungen
      const needsKunden = needsKundenFiles || hasKundenPlaceholders
      const needsBetreuer = needsBetreuerFiles || hasBetreuerPlaceholders

      // Für Kombinationen: Wenn beide Typen benötigt werden, müssen Kunden UND Betreuer ausgewählt sein
      if (needsKunden && needsBetreuer) {
        // Kombinierter Versand: Für jede Kunden-Betreuer-Kombination eine E-Mail
        const selectedKunden = kunden.filter(k => sel.kundenKeys.includes(k.__key))
        const selectedBetreuer = betreuer.filter(b => sel.betreuerKeys.includes(b.__key))
        if (selectedKunden.length && selectedBetreuer.length) {
          for (const kunde of selectedKunden) {
            // Für jeden ausgewählten Betreuer eine E-Mail mit diesem Betreuer-Platzhaltern und Kunden-Daten
            for (const bet of selectedBetreuer) {
              const kvKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('vorname'))
              const knKey = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname'))
              const kvor = String(kvKey ? kunde[kvKey] || '' : '').trim()
              const knach = String(knKey ? kunde[knKey] || '' : '').trim()
              const ksafeName = `${kvor} ${knach}`.trim().replace(/[\\/:*?"<>|]/g, '-')
              
              const bvKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
              const bnKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
              const bvor = String(bvKey ? bet[bvKey] || '' : '').trim()
              const bnach = String(bnKey ? bet[bnKey] || '' : '').trim()
              
              // Platzhalter für kombinierte E-Mail (sowohl Kunden- als auch Betreuer-Daten)
              function replaceAllPlaceholders(text: string): string {
                let result = text
                // Kunden-Platzhalter
                result = result.replace(/\{vorname\}/gi, hasKundenPlaceholders ? kvor : bvor)
                result = result.replace(/\{nachname\}/gi, hasKundenPlaceholders ? knach : bnach)
                result = result.replace(/\{kvname\}/gi, kvor)
                result = result.replace(/\{kfname\}/gi, knach)
                result = result.replace(/\{bvname\}/gi, bvor)
                result = result.replace(/\{bfname\}/gi, bnach)
                // Betreuer-Platzhalter für Kunden
                const b1Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer1'))
                const b2Key = kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('betreuer2'))
                const getNachname = (full: string) => {
                  const parts = full.split(/\s+/).filter(Boolean)
                  return parts.length > 0 ? parts[parts.length - 1] : ''
                }
                const b1Full = b1Key ? String(kunde[b1Key] || '').trim() : ''
                const b2Full = b2Key ? String(kunde[b2Key] || '').trim() : ''
                result = result.replace(/\{nb1\}/gi, getNachname(b1Full))
                result = result.replace(/\{nb2\}/gi, getNachname(b2Full))
                // Kunde-Platzhalter für Betreuer
                result = result.replace(/\{nk1\}/gi, knach)
                return result
              }
              
              const attachments: Array<{ path: string; filename?: string }> = []
              // Nur Kunden-Dateien anhängen (Betreuer-Dateien werden in separater E-Mail behandelt, wenn nötig)
              for (const selFile of tpl.selectedFiles) {
                if (selFile.personType !== 'kunden') continue
                const expectedName = replaceAllPlaceholders(selFile.fileTemplate)
                const fileRes = await window.api?.folders?.getFilePath?.({ baseDir, personType: 'kunden', personName: ksafeName, folderPath: selFile.folderPath, fileName: expectedName })
                if (fileRes?.exists && fileRes.path) attachments.push({ path: fileRes.path, filename: expectedName })
              }
              
              allBatch.push({
                to: replaceAllPlaceholders(tpl.to),
                subject: replaceAllPlaceholders(tpl.subject),
                text: replaceAllPlaceholders(tpl.text),
                attachments,
              })
            }
          }
        }
      } else {
        // Normale Versendung: Kunden oder Betreuer separat
        async function collect(personType: 'kunden' | 'betreuer', personList: any[], selectedKeys: string[], template: EmailTemplate) {
          const selectedPeople = personList.filter(p => selectedKeys.includes(p.__key))
          for (const person of selectedPeople) {
            const vKey = personType === 'kunden' ? kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('vorname')) : betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
            const nKey = personType === 'kunden' ? kundenKeys.find(k => (kundenSettings.gruppen[k] || []).includes('nachname')) : betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
            const vor = String(vKey ? person[vKey] || '' : '').trim()
            const nach = String(nKey ? person[nKey] || '' : '').trim()
            const personName = `${vor} ${nach}`.trim()
            const safeName = personName.replace(/[\\/:*?"<>|]/g, '-')
            const attachments: Array<{ path: string; filename?: string }> = []
            for (const selFile of template.selectedFiles) {
              if (selFile.personType !== personType) continue
              const expectedName = replacePlaceholders(selFile.fileTemplate, person, personType)
              const fileRes = await window.api?.folders?.getFilePath?.({ baseDir, personType, personName: safeName, folderPath: selFile.folderPath, fileName: expectedName })
              if (fileRes?.exists && fileRes.path) attachments.push({ path: fileRes.path, filename: expectedName })
            }
            // Versende auch wenn keine Anhänge (wenn Platzhalter im Text verwendet werden)
            allBatch.push({
              to: replacePlaceholders(template.to, person, personType),
              subject: replacePlaceholders(template.subject, person, personType),
              text: replacePlaceholders(template.text, person, personType),
              attachments,
            })
          }
        }

        if (needsKunden && sel.kundenKeys.length) await collect('kunden', kunden, sel.kundenKeys, tpl)
        if (needsBetreuer && sel.betreuerKeys.length) await collect('betreuer', betreuer, sel.betreuerKeys, tpl)
      }
    }

    if (!allBatch.length) return alert('Keine E-Mails zum Versenden gefunden')

    const res = await window.api?.mail?.sendBatch?.(allBatch)
    if (res?.ok) {
      alert(`Emails erfolgreich an ${allBatch.length} Empfänger versendet`)
      // Reset selections
      const reset: Record<string, TemplateSelection> = {}
      templates.forEach(t => {
        reset[t.id] = { templateId: t.id, selected: false, kundenKeys: [], betreuerKeys: [] }
      })
      setSelections(reset)
    } else {
      alert('Fehler beim Versenden: ' + (res?.message || 'Unbekannt'))
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
                // Prüfe Platzhalter in E-Mail-Feldern
                const textContent = `${t.to} ${t.subject} ${t.text}`.toLowerCase()
                const hasKundenPlaceholders = /\{(?:vorname|nachname|kvname|kfname|nb1|nb2)\}/i.test(textContent)
                const hasBetreuerPlaceholders = /\{(?:vorname|nachname|bvname|bfname|nk1)\}/i.test(textContent)
                // Kombiniere beide Prüfungen
                const needsKunden = needsKundenFiles || hasKundenPlaceholders
                const needsBetreuer = needsBetreuerFiles || hasBetreuerPlaceholders
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
    </Layout>
  )
}

function TemplateRow({ template, selection, needsKunden, needsBetreuer, kunden, betreuer, kvKey, knKey, bvKey, bnKey, onSelectionChange }: {
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
  onSelectionChange: (sel: TemplateSelection) => void
}) {
  const [kundenSearch, setKundenSearch] = useState('')
  const [betreuerSearch, setBetreuerSearch] = useState('')
  const [kundenOpen, setKundenOpen] = useState(false)
  const [betreuerOpen, setBetreuerOpen] = useState(false)

  const filteredKunden = useMemo(() => {
    if (!kundenSearch.trim()) return kunden
    const q = kundenSearch.toLowerCase()
    return kunden.filter(k => {
      const vor = String(kvKey ? k[kvKey] || '' : '').trim().toLowerCase()
      const nach = String(knKey ? k[knKey] || '' : '').trim().toLowerCase()
      return `${nach} ${vor}`.includes(q) || vor.includes(q) || nach.includes(q)
    })
  }, [kunden, kundenSearch, kvKey, knKey])

  const filteredBetreuer = useMemo(() => {
    if (!betreuerSearch.trim()) return betreuer
    const q = betreuerSearch.toLowerCase()
    return betreuer.filter(b => {
      const vor = String(bvKey ? b[bvKey] || '' : '').trim().toLowerCase()
      const nach = String(bnKey ? b[bnKey] || '' : '').trim().toLowerCase()
      return `${nach} ${vor}`.includes(q) || vor.includes(q) || nach.includes(q)
    })
  }, [betreuer, betreuerSearch, bvKey, bnKey])

  function toggleKunde(key: string) {
    const next = selection.kundenKeys.includes(key)
      ? selection.kundenKeys.filter(k => k !== key)
      : [...selection.kundenKeys, key]
    onSelectionChange({ ...selection, kundenKeys: next })
  }

  function toggleBetreuer(key: string) {
    const next = selection.betreuerKeys.includes(key)
      ? selection.betreuerKeys.filter(k => k !== key)
      : [...selection.betreuerKeys, key]
    onSelectionChange({ ...selection, betreuerKeys: next })
  }

  const kundenDisplay = selection.kundenKeys.map(k => {
    const kd = kunden.find(ku => ku.__key === k)
    if (!kd) return ''
    const vor = String(kvKey ? kd[kvKey] || '' : '').trim()
    const nach = String(knKey ? kd[knKey] || '' : '').trim()
    return `${nach} ${vor}`.trim()
  }).filter(Boolean).join(', ')

  const betreuerDisplay = selection.betreuerKeys.map(k => {
    const bd = betreuer.find(be => be.__key === k)
    if (!bd) return ''
    const vor = String(bvKey ? bd[bvKey] || '' : '').trim()
    const nach = String(bnKey ? bd[bnKey] || '' : '').trim()
    return `${nach} ${vor}`.trim()
  }).filter(Boolean).join(', ')

  return (
    <div style={{ border: '1px solid #e6e8ef', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="checkbox"
          checked={selection.selected}
          onChange={(e) => onSelectionChange({ ...selection, selected: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        <div style={{ fontWeight: 600, flex: 1 }}>{template.name}</div>
        {needsKunden && (
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Kunden wählen..."
              value={kundenDisplay || kundenSearch}
              onChange={(e) => {
                setKundenSearch(e.target.value)
                setKundenOpen(true)
              }}
              onFocus={() => setKundenOpen(true)}
              onClick={() => setKundenOpen(true)}
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
            />
            {kundenOpen && (
              <>
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'grid', gap: 2, padding: 4 }}>
                    {filteredKunden.map(k => {
                      const vor = String(kvKey ? k[kvKey] || '' : '').trim()
                      const nach = String(knKey ? k[knKey] || '' : '').trim()
                      const display = `${nach} ${vor}`.trim()
                      const checked = selection.kundenKeys.includes(k.__key)
                      return (
                        <label key={k.__key} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', borderRadius: 4, background: checked ? '#e0f2fe' : 'transparent' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleKunde(k.__key)} style={{ marginRight: 8, cursor: 'pointer' }} />
                          <span style={{ fontSize: 12 }}>{display}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={() => setKundenOpen(false)} />
              </>
            )}
          </div>
        )}
        {needsBetreuer && (
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Betreuer wählen..."
              value={betreuerDisplay || betreuerSearch}
              onChange={(e) => {
                setBetreuerSearch(e.target.value)
                setBetreuerOpen(true)
              }}
              onFocus={() => setBetreuerOpen(true)}
              onClick={() => setBetreuerOpen(true)}
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
            />
            {betreuerOpen && (
              <>
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'grid', gap: 2, padding: 4 }}>
                    {filteredBetreuer.map(b => {
                      const vor = String(bvKey ? b[bvKey] || '' : '').trim()
                      const nach = String(bnKey ? b[bnKey] || '' : '').trim()
                      const display = `${nach} ${vor}`.trim()
                      const checked = selection.betreuerKeys.includes(b.__key)
                      return (
                        <label key={b.__key} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', borderRadius: 4, background: checked ? '#e0f2fe' : 'transparent' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleBetreuer(b.__key)} style={{ marginRight: 8, cursor: 'pointer' }} />
                          <span style={{ fontSize: 12 }}>{display}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={() => setBetreuerOpen(false)} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
