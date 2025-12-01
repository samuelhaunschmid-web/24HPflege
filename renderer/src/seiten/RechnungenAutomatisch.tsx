import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../seite-shared/Layout'
import LoadingDialog from '../komponenten/LoadingDialog'
import MessageModal from '../komponenten/MessageModal'

type Kunde = Record<string, any> & { __key: string; __display: string }

type Pref = {
  vorlageAbs?: string
  emailTemplateId?: string
  mode?: 'monat' | 'ind'
  von?: string
  bis?: string
  email?: string
}

export default function RechnungenAutomatisch() 
{
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [vorlagen, setVorlagen] = useState<Array<{ name: string; absPath: string }>>([])
  const [vorlagenDisplayNames, setVorlagenDisplayNames] = useState<Record<string, string>>({})
  const normalizePath = (p: string) => String(p || '').replace(/\\/g, '/').toLowerCase()
  const vorlagenDisplayByAbsNorm = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(vorlagenDisplayNames || {}).forEach(([k, v]) => {
      map[normalizePath(k)] = v
    })
    return map
  }, [vorlagenDisplayNames])
  const vorlagenDisplayByBase = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(vorlagenDisplayNames || {}).forEach(([k, v]) => {
      const parts = String(k || '').split(/\\|\//)
      const base = (parts.pop() || k)
      map[base] = v
    })
    return map
  }, [vorlagenDisplayNames])
  const [emailTemplates, setEmailTemplates] = useState<Record<string, { subject: string; text: string; name: string }>>({})
  const [prefs, setPrefs] = useState<Record<string, Pref>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [monat, setMonat] = useState<number>(new Date().getMonth()+1)
  const [jahr, setJahr] = useState<number>(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [protokollAktiv, setProtokollAktiv] = useState(false)

  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const lists = await window.docgen?.getLists?.()
      if (lists?.kunden) setKunden(lists.kunden)
      const v = await window.docgen?.listInvoiceTemplates?.()
      if (Array.isArray(v)) setVorlagen(v)
      const cfg = await window.api?.getConfig?.()
      if (cfg?.emailTemplates) setEmailTemplates(cfg.emailTemplates)
      if (cfg?.invoiceTemplateDisplayNames && typeof cfg.invoiceTemplateDisplayNames === 'object') setVorlagenDisplayNames(cfg.invoiceTemplateDisplayNames)
      if (cfg?.autoInvoicePrefs && typeof cfg.autoInvoicePrefs === 'object') {
        const normalized: Record<string, Pref> = {}
        Object.entries(cfg.autoInvoicePrefs as Record<string, Pref>).forEach(([k, v]) => {
          const email = typeof v.email === 'string' && v.email.trim() === '' ? undefined : v.email
          normalized[k] = { ...v, email }
        })
        setPrefs(normalized)
      }
    })()
  }, [])

  // Aktualisiere Anzeigenamen, wenn sich Vorlagenliste ändert oder Fenster den Fokus bekommt
  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await window.api?.getConfig?.()
        if (cfg?.invoiceTemplateDisplayNames && typeof cfg.invoiceTemplateDisplayNames === 'object') {
          setVorlagenDisplayNames(cfg.invoiceTemplateDisplayNames)
        }
      } catch {}
    })()
  }, [vorlagen.length])
  useEffect(() => {
    const onFocus = async () => {
      try {
        const cfg = await window.api?.getConfig?.()
        if (cfg?.invoiceTemplateDisplayNames && typeof cfg.invoiceTemplateDisplayNames === 'object') {
          setVorlagenDisplayNames(cfg.invoiceTemplateDisplayNames)
        }
      } catch {}
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Persistiere Präferenzen mit kleinem Debounce
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const cfg = await window.api?.getConfig?.()
      const next = { ...(cfg || {}), autoInvoicePrefs: prefs }
      await window.api?.setConfig?.(next)
    }, 400)
  }, [prefs])

  // Tabellen-Gruppen aus Einstellungen laden (als State, damit Re-Render erfolgt)
  const [gruppen, setGruppen] = useState<Record<string, string[]>>({})
  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await window.api?.getConfig?.()
        setGruppen(cfg?.tableSettings?.['kunden']?.gruppen || {})
      } catch {}
    })()
  }, [])

  function resolveColByGroup(row: Kunde, groupName: string): string {
    const keys = Object.keys(row)
    const col = keys.find(k => Array.isArray(gruppen[k]) && gruppen[k].includes(groupName))
    return col || ''
  }

  function getName(row: Kunde): string {
    const vorCol = resolveColByGroup(row, 'vorname')
    const nachCol = resolveColByGroup(row, 'nachname')
    const vor = vorCol ? String(row[vorCol] || '') : String(row.kvname || '')
    const nach = nachCol ? String(row[nachCol] || '') : String(row.kfname || '')
    const name = `${nach} ${vor}`.trim()
    return name
  }

  function getEmail(row: Kunde): string {
    const mailCol = resolveColByGroup(row, 'rechnungsmail')
    const fallback = ''
    return mailCol ? String(row[mailCol] || '') : fallback
  }

  const sortedKunden = useMemo(() => {
    const list = [...kunden]
    return list.sort((a,b) => getName(a).toLowerCase().localeCompare(getName(b).toLowerCase()))
  }, [kunden])

  const allSelectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const verrechnungsZeitraum = useMemo(() => {
    const daysInMonth = new Date(jahr, monat, 0).getDate()
    const mm = String(monat).padStart(2,'0')
    const start = `01.${mm}.${jahr}`
    const end = `${String(daysInMonth).padStart(2,'0')}.${mm}.${jahr}`
    return `${start}-${end}`
  }, [monat, jahr])

  function updatePref(key: string, partial: Partial<Pref>) {
    setPrefs(prev => ({ ...prev, [key]: { ...prev[key], ...partial } }))
  }

  function personalize(tpl: string, kundeKey: string) {
    if (!tpl) return ''
    const kunde = kunden.find(x => x.__key === kundeKey) || {}
    let result = tpl
      .replace(/\{\{\s*vorname\s*\}\}/gi, String((kunde as any).kvname || ''))
      .replace(/\{\{\s*nachname\s*\}\}/gi, String((kunde as any).kfname || ''))
      .replace(/\{\{\s*monat\s*\}\}/gi, String(monat).padStart(2,'0'))
      .replace(/\{\{\s*jahr\s*\}\}/gi, String(jahr))
    Object.keys(kunde).forEach(k => {
      if (!k.startsWith('__')) {
        const val = String((kunde as any)[k] || '')
        result = result.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}}`, 'gi'), val)
      }
    })
    return result
  }

  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  async function handleSendEmails() {
    const selectedKeys = Object.entries(selected).filter(([_,v]) => !!v).map(([k]) => k)
    if (selectedKeys.length === 0) {
      setMessageModal({ isOpen: true, message: 'Bitte Kunden auswählen', type: 'info' })
      return
    }
    const dir = await window.api?.chooseDirectory?.('Zielordner für Rechnungen wählen')
    if (!dir) return

    setIsLoading(true)
    setLoadingMessage('Rechnungen werden erstellt...')
    setLoadingProgress(0)
    let progressInterval: number | null = null
    try {
      progressInterval = window.setInterval(() => {
        setLoadingProgress(prev => prev >= 90 ? prev : prev + Math.random()*10)
      }, 500)

      const batches: Array<{ to: string; subject: string; text: string; attachments: Array<{ path: string }> }> = []
      const protokollEintraege: Array<{ rechnungsnummer: number; nachname: string; vorname: string; name: string; gesamtsumme: string; datum: string; batchIndex?: number }> = []
      const batchIndexToEintraege: Record<number, Array<{ rechnungsnummer: number; nachname: string; vorname: string; name: string; gesamtsumme: string; datum: string }>> = {}

      // Für jeden Kunden einzeln erzeugen, damit Vorlage/Zeitraum individuell sind
      for (const key of selectedKeys) {
        const p = prefs[key] || {}
        const vorlageAbs = p.vorlageAbs
        if (!vorlageAbs) continue

        const individualRanges: any = {}
        if (p.mode === 'ind' && p.von && p.bis) individualRanges[key] = { von: p.von, bis: p.bis }

        const res = await window.docgen?.generateInvoices?.({
          selectedKundenKeys: [key],
          selectedVorlagenAbs: [vorlageAbs],
          targetDir: dir,
          month: monat,
          year: jahr,
          individualRanges,
          alsPdf: true,
        })
        if (res?.ok) {
          const byKey = (res as any).byKey || {}
          const files = Array.isArray(byKey[key]) ? byKey[key] : []
          
          // Sammle Rechnungsdaten für Protokoll, falls aktiviert
          const kunde = kunden.find(k => k.__key === key)
          const kundeName = kunde ? getName(kunde) : ''
          const vorCol = kunde ? resolveColByGroup(kunde, 'vorname') : ''
          const nachCol = kunde ? resolveColByGroup(kunde, 'nachname') : ''
          const kundeVor = kunde && vorCol ? String(kunde[vorCol] || '').trim() : ''
          const kundeNach = kunde && nachCol ? String(kunde[nachCol] || '').trim() : ''
          
          let invoiceDataForKey: Array<{ rechnungsnummer: number; nachname: string; vorname: string; name: string; gesamtsumme: string; datum: string }> = []
          if (protokollAktiv && res.invoiceData && res.invoiceData[key]) {
            // Erweitere invoiceData um Vorname und vollständigen Namen
            invoiceDataForKey = res.invoiceData[key].map((entry: any) => ({
              ...entry,
              vorname: kundeVor,
              nachname: entry.nachname || kundeNach, // Falls Backend bereits nachname liefert, verwende das, sonst aus Kunde
              name: kundeName
            }))
            protokollEintraege.push(...invoiceDataForKey)
          }
          
          if (files.length) {
            const template = p.emailTemplateId ? emailTemplates[p.emailTemplateId] : null
            const subject = template ? personalize(template.subject || '', key) : 'Ihre Rechnung'
            const text = template ? personalize(template.text || '', key) : 'Guten Tag,\n\nim Anhang finden Sie die Rechnung.\n\nMit freundlichen Grüßen'

            // Empfänger: Pref.email > rechnungsmail aus Tabelle
            let to = (p.email || '').trim()
            if (!to) to = getEmail(kunden.find(k => k.__key === key) as any)

            if (to) {
              const batchIndex = batches.length
              batches.push({ to, subject, text, attachments: files.map((p: string) => ({ path: p })) })
              // Verknüpfe Batch-Index mit Rechnungsdaten für Fehler-Tracking
              if (protokollAktiv && invoiceDataForKey.length > 0) {
                batchIndexToEintraege[batchIndex] = invoiceDataForKey
              }
            }
          }
        }
      }

      if (progressInterval) window.clearInterval(progressInterval)
      setLoadingProgress(100)
      
      // Protokoll erstellen VOR dem E-Mail-Versand, falls aktiviert
      let protokollFilePath: string | null = null
      if (protokollAktiv && protokollEintraege.length > 0) {
        try {
          const heute = new Date()
          const dateStr = `${String(heute.getDate()).padStart(2, '0')}.${String(heute.getMonth() + 1).padStart(2, '0')}.${heute.getFullYear()}`
          const defaultName = `Rechnungsprotokoll_${dateStr.replace(/\./g, '_')}.txt`
          protokollFilePath = await window.api?.saveFile?.('Rechnungsprotokoll speichern', defaultName) || null
          
          if (protokollFilePath) {
            // Erstelle Textinhalt: Rechnungsnummer, Nachname, Vorname, Gesamtsumme, Datum
            const header = 'Rechnungsnummer\tNachname\tVorname\tGesamtsumme\tDatum\tStatus\n'
            const lines = protokollEintraege.map(e => 
              `${e.rechnungsnummer}\t${e.nachname}\t${e.vorname || ''}\t${e.gesamtsumme}\t${e.datum}\t`
            ).join('\n')
            const content = header + lines
            
            await window.api?.writeTextFile?.(protokollFilePath, content)
          }
        } catch (protokollError) {
          console.error('Fehler beim Erstellen des Protokolls:', protokollError)
        }
      }

      if (batches.length === 0) {
        setIsLoading(false)
        // Protokoll wurde bereits erstellt (falls aktiviert)
        setMessageModal({ isOpen: true, message: 'Keine Anhänge oder Empfänger gefunden.', type: 'info' })
        return
      }

      setLoadingMessage('E-Mails werden gesendet...')
      const mailRes = await (window as any).api?.mail?.sendBatch?.(batches)
      
      // Protokoll aktualisieren bei Versandfehlern
      if (protokollAktiv && protokollFilePath) {
        try {
          const failedIndices = new Set<number>()
          
          // Prüfe results Array von sendBatch, um fehlgeschlagene E-Mails zu identifizieren
          if (mailRes && typeof mailRes === 'object' && 'results' in mailRes && Array.isArray(mailRes.results)) {
            mailRes.results.forEach((result: any, idx: number) => {
              if (!result || !result.ok) {
                failedIndices.add(idx)
              }
            })
          } else if (!mailRes?.ok) {
            // Wenn kompletter Fehlschlag oder kein results Array, markiere alle als fehlgeschlagen
            Object.keys(batchIndexToEintraege).forEach(k => failedIndices.add(Number(k)))
          }
          
          // Aktualisiere Einträge mit VERSANDFEHLER für fehlgeschlagene Batches
          const updatedEintraege = protokollEintraege.map(e => {
            // Finde zu welchem Batch-Index dieser Eintrag gehört
            let belongsToFailedBatch = false
            for (const [batchIdxStr, eintraege] of Object.entries(batchIndexToEintraege)) {
              const batchIdx = Number(batchIdxStr)
              if (failedIndices.has(batchIdx) && eintraege.some(et => et.rechnungsnummer === e.rechnungsnummer)) {
                belongsToFailedBatch = true
                break
              }
            }
            return {
              ...e,
              status: belongsToFailedBatch ? 'VERSANDFEHLER' : ''
            }
          })
          
          // Schreibe aktualisiertes Protokoll
          const header = 'Rechnungsnummer\tNachname\tVorname\tGesamtsumme\tDatum\tStatus\n'
          const lines = updatedEintraege.map(e => 
            `${e.rechnungsnummer}\t${e.nachname}\t${e.vorname || ''}\t${e.gesamtsumme}\t${e.datum}\t${e.status || ''}`
          ).join('\n')
          const content = header + lines
          
          await window.api?.writeTextFile?.(protokollFilePath, content)
        } catch (protokollError) {
          console.error('Fehler beim Aktualisieren des Protokolls:', protokollError)
        }
      }
      
      setIsLoading(false)
      if (mailRes?.ok) {
        setMessageModal({ isOpen: true, message: 'Rechnungen erstellt und E-Mails versendet.', type: 'success' })
      } else {
        setMessageModal({ isOpen: true, message: 'Rechnungen erstellt, aber Mailversand fehlgeschlagen.', type: 'error' })
      }
    } catch (e) {
      if (progressInterval) window.clearInterval(progressInterval)
      setIsLoading(false)
      setMessageModal({ isOpen: true, message: 'Fehler: ' + String((e as Error)?.message || e), type: 'error' })
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10 }}>
        {/* Linke Seite: Nur Auswahl-Buttons ganz links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => {
            const all = Object.fromEntries(sortedKunden.map(k => [k.__key, true]))
            setSelected(all)
          }} style={{ padding: '6px 10px', border: '1px solid #ddd',color: '#1f2937', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Alle auswählen</button>
          <button onClick={() => setSelected({})} style={{ padding: '6px 10px', border: '1px solid #ddd',color: '#1f2937', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Alle abwählen</button>
        </div>

        {/* Mittig: Monat/Jahr und kleiner Zeitraum-Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Monat</label>
            <input type="number" value={monat} onChange={e => setMonat(Number(e.currentTarget.value))} min={1} max={12} style={{ 
              width: 80, 
              padding: '8px 12px', 
              border: '1px solid #d1d5db', 
              borderRadius: 8, 
              fontSize: 14,
              fontFamily: 'inherit',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              boxSizing: 'border-box'
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Jahr</label>
            <input type="number" value={jahr} onChange={e => setJahr(Number(e.currentTarget.value))} min={2000} max={2100} style={{ 
              width: 100, 
              padding: '8px 12px', 
              border: '1px solid #d1d5db', 
              borderRadius: 8, 
              fontSize: 14,
              fontFamily: 'inherit',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              boxSizing: 'border-box'
            }} />
          </div>
          <div style={{ background: '#0f172a', color: '#fff', padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>Zeitraum: {verrechnungsZeitraum}</div>
        </div>

        {/* Rechts: Toggle und Versand-Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: protokollAktiv ? '#e0f2fe' : '#fff' }}>
            <input 
              type="checkbox" 
              checked={protokollAktiv} 
              onChange={(e) => setProtokollAktiv(e.currentTarget.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: protokollAktiv ? '#0369a1' : '#64748b' }}>Rechnungsprotokoll</span>
          </label>
          <button onClick={handleSendEmails} style={{ padding: '8px 14px', border: 'none', background: '#005bd1', color: '#fff', borderRadius: 999, cursor: 'pointer', fontWeight: 700 }}>
            E-Mails versenden ({allSelectedCount})
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Für jeden Kunden eine Vorlage, Nachricht und Zeitraum festlegen. Änderungen werden automatisch gespeichert.</div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1.6fr 1.6fr 1.6fr 1.4fr 1.8fr', gap: 0, background: '#f8fafc', padding: '8px 10px', fontWeight: 700, fontSize: 13, color: '#1f2937', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}>
            <div></div>
            <div>Name</div>
            <div>E-Mail</div>
            <div>Rechnungsvorlage</div>
            <div>Nachricht</div>
            <div>Zeitraum</div>
          </div>
          <div style={{ maxHeight: 700, overflow: 'auto' }}>
            {sortedKunden.map(k => {
              const p = prefs[k.__key] || {}
              const name = getName(k)
              const email = (typeof p.email === 'string' && p.email.trim() !== '' ? p.email : getEmail(k)) || ''
              const mode = p.mode || 'monat'
              const vonIso = p.von ? p.von.split('.').reverse().join('-') : ''
              const bisIso = p.bis ? p.bis.split('.').reverse().join('-') : ''
              return (
                <div key={k.__key} style={{ display: 'grid', gridTemplateColumns: '32px 1.6fr 1.6fr 1.6fr 1.4fr 1.8fr', alignItems: 'center', gap: 0, padding: '10px 10px', borderTop: '1px solid #eee', background: selected[k.__key] ? '#f7faff' : '#fff' }}>
                  <div>
                    <input type="checkbox" checked={!!selected[k.__key]} onChange={(e)=> {
                      const target = (e?.currentTarget as HTMLInputElement | null) || (e?.target as HTMLInputElement | null)
                      const isChecked = !!(target && target.checked)
                      setSelected(prev => ({ ...prev, [k.__key]: isChecked }))
                    }} />
                  </div>
                  <div style={{ fontWeight: selected[k.__key] ? 600 : 400, color: '#1f2937', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}>{name}</div>
                  <div>
                    <input value={email} onChange={e=> {
                      const val = e.currentTarget.value
                      updatePref(k.__key, { email: val.trim() === '' ? undefined : val })
                    }} placeholder="kunde@example.com" style={{ 
                      width: '85%', 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 8,
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      boxSizing: 'border-box'
                    }} />
                  </div>
                  <div>
                    <select value={p.vorlageAbs || ''} onChange={e=> updatePref(k.__key, { vorlageAbs: e.currentTarget.value })} style={{ 
                      width: '95%', 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 8,
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      boxSizing: 'border-box',
                      fontWeight: '600',
                      WebkitFontSmoothing: 'subpixel-antialiased',
                      MozOsxFontSmoothing: 'auto',
                      textRendering: 'optimizeLegibility'
                    }}>
                      <option value="">Vorlage wählen...</option>
                      {vorlagen.map(v => {
                        const disp = (vorlagenDisplayNames[v.absPath] 
                          ?? vorlagenDisplayByAbsNorm[normalizePath(v.absPath)] 
                          ?? vorlagenDisplayByBase[v.name] 
                          ?? v.name)
                        return (
                          <option key={v.absPath} value={v.absPath}>{disp}</option>
                        )
                      })}
                    </select>
                  </div>
                  <div>
                    <select value={p.emailTemplateId || ''} onChange={e=> updatePref(k.__key, { emailTemplateId: e.currentTarget.value })} style={{ 
                      width: '95%', 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 8,
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      boxSizing: 'border-box',
                      fontWeight: '600',
                      WebkitFontSmoothing: 'subpixel-antialiased',
                      MozOsxFontSmoothing: 'auto',
                      textRendering: 'optimizeLegibility'
                    }}>
                      <option value="">Vorlage wählen...</option>
                      {Object.entries(emailTemplates).map(([id, t]) => (
                        <option key={id} value={id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" name={`mode-${k.__key}`} checked={mode==='monat'} onChange={()=> updatePref(k.__key, { mode: 'monat', von: undefined, bis: undefined })} /> Ganzer Monat
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" name={`mode-${k.__key}`} checked={mode==='ind'} onChange={()=> {
                        const days = new Date(jahr, monat, 0).getDate()
                        const mm = String(monat).padStart(2,'0')
                        const von = `01.${mm}.${jahr}`
                        const bis = `${String(days).padStart(2,'0')}.${mm}.${jahr}`
                        updatePref(k.__key, { mode: 'ind', von, bis })
                      }} /> Individuell
                    </label>
                    {mode==='ind' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12 }}>Von:</span>
                          <input type="date" value={vonIso} onChange={e=> {
                            const v = e.currentTarget.value
                            const ddmmyyyy = v ? v.split('-').reverse().join('.') : ''
                            updatePref(k.__key, { von: ddmmyyyy })
                          }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12 }}>Bis:</span>
                          <input type="date" value={bisIso} onChange={e=> {
                            const v = e.currentTarget.value
                            const ddmmyyyy = v ? v.split('-').reverse().join('.') : ''
                            updatePref(k.__key, { bis: ddmmyyyy })
                          }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <LoadingDialog isOpen={isLoading} title={'Automatischer Versand'} message={loadingMessage} progress={loadingProgress} showProgress={true} />
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
    </Layout>
  )
}
