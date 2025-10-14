import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import LoadingDialog from '../komponenten/LoadingDialog'

export default function Rechnungen() {
  const [files, setFiles] = useState<Array<{ name: string; absPath: string }>>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [selected, setSelected] = useState<Record<string, { mode: 'monat' | 'ind'; von?: string; bis?: string }>>({})
  const [selectedVorlagen, setSelectedVorlagen] = useState<string[]>([])
  const [monat, setMonat] = useState<number>(new Date().getMonth()+1)
  const [jahr, setJahr] = useState<number>(new Date().getFullYear())
  const [currentRechnungsnummer, setCurrentRechnungsnummer] = useState<number>(1)
  const [modus, setModus] = useState<'docx'|'pdf'>('pdf')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [editVorlagen, setEditVorlagen] = useState(false)
  const [vorlagenDisplayNames, setVorlagenDisplayNames] = useState<Record<string,string>>({})
  const [sendMail, setSendMail] = useState<boolean>(false)
  const [mailSubject, setMailSubject] = useState<string>('Ihre Rechnung')
  const [mailText, setMailText] = useState<string>('Guten Tag,\n\nim Anhang finden Sie die Rechnung.\n\nMit freundlichen Grüßen')
  const [empfaenger, setEmpfaenger] = useState<Record<string,string>>({})
  const [emailTemplates, setEmailTemplates] = useState<Record<string, { subject: string; text: string; name: string }>>({})
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showTemplateDialog, setShowTemplateDialog] = useState<boolean>(false)
  const [newTemplateName, setNewTemplateName] = useState<string>('')


  const verrechnungsZeitraum = useMemo(() => {
    const daysInMonth = new Date(jahr, monat, 0).getDate()
    const mm = String(monat).padStart(2,'0')
    const start = `01.${mm}.${jahr}`
    const end = `${String(daysInMonth).padStart(2,'0')}.${mm}.${jahr}`
    return `${start}-${end}`
  }, [monat, jahr])

  useEffect(() => {
    ;(async () => {
      const templates = await window.docgen?.listInvoiceTemplates?.()
      if (Array.isArray(templates)) setFiles(templates)
      const lists = await window.docgen?.getLists?.(); if (lists?.kunden) setKunden(lists.kunden)
      
      // Lade aktuelle Rechnungsnummer aus der Konfiguration
      const config = await window.api?.getConfig?.()
      if (config?.currentRechnungsnummer) {
        setCurrentRechnungsnummer(config.currentRechnungsnummer)
      }
      if (config?.invoiceTemplateDisplayNames && typeof config.invoiceTemplateDisplayNames === 'object') {
        setVorlagenDisplayNames(config.invoiceTemplateDisplayNames as Record<string,string>)
      }
      if (typeof config?.mailSubjectTemplate === 'string') setMailSubject(config.mailSubjectTemplate)
      if (typeof config?.mailTextTemplate === 'string') setMailText(config.mailTextTemplate)
      if (config?.emailTemplates && typeof config.emailTemplates === 'object') {
        setEmailTemplates(config.emailTemplates as Record<string, { subject: string; text: string; name: string }>)
      }
      
      // Auto-Fill E-Mail-Adressen aus Rechnungsmail-Spalte
      if (lists?.kunden && Array.isArray(lists.kunden)) {
        try {
          const kundenSettingsGruppen = config?.tableSettings?.['kunden']?.gruppen || {}
          const initialEmpfaenger: Record<string, string> = {}
          
          lists.kunden.forEach((kunde: any) => {
            if (kunde.__key) {
              // Suche nach Spalte, die als 'rechnungsmail' markiert ist
              const keys = Object.keys(kunde)
              const mailKey = keys.find(col => 
                Array.isArray(kundenSettingsGruppen[col]) && 
                kundenSettingsGruppen[col].includes('rechnungsmail')
              )
              if (mailKey && kunde[mailKey]) {
                initialEmpfaenger[kunde.__key] = String(kunde[mailKey])
              }
            }
          })
          
          setEmpfaenger(initialEmpfaenger)
        } catch (e) {
          console.warn('Fehler beim Auto-Fill der E-Mail-Adressen:', e)
        }
      }
    })()
  }, [])

  function toLastFirst(name: string) {
    const n = String(name||'').trim()
    if (!n) return ''
    const parts = n.split(/\s+/)
    if (parts.length === 1) return n
    const last = parts.pop() as string
    const first = parts.join(' ')
    return `${last} ${first}`.trim()
  }

  const saveTemplate = async () => {
    if (!newTemplateName.trim()) return
    const templateId = `template_${Date.now()}`
    const newTemplate = {
      subject: mailSubject,
      text: mailText,
      name: newTemplateName.trim()
    }
    const updatedTemplates = { ...emailTemplates, [templateId]: newTemplate }
    setEmailTemplates(updatedTemplates)
    setSelectedTemplate(templateId)
    setNewTemplateName('')
    setShowTemplateDialog(false)
    
    // Speichere in Config
    const config = await window.api?.getConfig?.()
    const nextConfig = { ...(config || {}), emailTemplates: updatedTemplates }
    await window.api?.setConfig?.(nextConfig)
  }

  const loadTemplate = (templateId: string) => {
    const template = emailTemplates[templateId]
    if (template) {
      setMailSubject(template.subject)
      setMailText(template.text)
      setSelectedTemplate(templateId)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    const updatedTemplates = { ...emailTemplates }
    delete updatedTemplates[templateId]
    setEmailTemplates(updatedTemplates)
    if (selectedTemplate === templateId) {
      setSelectedTemplate('')
    }
    
    // Speichere in Config
    const config = await window.api?.getConfig?.()
    const nextConfig = { ...(config || {}), emailTemplates: updatedTemplates }
    await window.api?.setConfig?.(nextConfig)
  }
  const sortedKunden = useMemo(() => {
    const list = [...kunden]
    return list.sort((a,b)=> {
      const an = String(a.__display||'').trim()
      const bn = String(b.__display||'').trim()
      const al = an.split(/\s+/).slice(-1)[0].toLowerCase()
      const bl = bn.split(/\s+/).slice(-1)[0].toLowerCase()
      if (al === bl) return an.localeCompare(bn)
      return al.localeCompare(bl)
    })
  }, [kunden])
  const selectedKeys = useMemo(()=> Object.entries(selected).filter(([_,v])=> v!=null).map(([k])=>k), [selected])

  async function handleGenerate() {
    if (selectedKeys.length === 0) return alert('Bitte Kunden auswählen')
    if (selectedVorlagen.length === 0) return alert('Bitte mindestens eine Vorlage auswählen')
    const dir = await window.api?.chooseDirectory?.('Zielordner wählen'); if (!dir) return
    
    // Loading State starten
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingMessage(modus === 'pdf' ? 'PDFs werden erstellt...' : 'Rechnungen werden generiert...')
    
    let progressInterval: number | null = null
    
    try {
      const individualRanges: any = {}
      Object.entries(selected).forEach(([key, v]) => { if (v.mode==='ind' && v.von && v.bis) individualRanges[key] = { von: v.von, bis: v.bis } })
      
      // Filtere nur die ausgewählten Vorlagen
      const selectedVorlagenAbs = files.filter(f => selectedVorlagen.includes(f.absPath)).map(f => f.absPath)
      
      // Simuliere Progress für bessere UX
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev // Bei 90% stoppen, bis tatsächlich fertig
          return prev + Math.random() * 10
        })
      }, 500)
      
      // Speichere die manuell eingegebene Rechnungsnummer
      await window.api?.setConfig?.({ currentRechnungsnummer })
      
      const res = await window.docgen?.generateInvoices?.({
        selectedKundenKeys: selectedKeys,
        selectedVorlagenAbs,
        targetDir: dir,
        month: monat,
        year: jahr,
        individualRanges,
        alsPdf: sendMail ? true : (modus === 'pdf'),
      })
      
      if (progressInterval) clearInterval(progressInterval)
      setLoadingProgress(100)
      
      if (res?.ok) {
        if ('currentRechnungsnummer' in res) {
          setCurrentRechnungsnummer(res.currentRechnungsnummer)
        }
        // Optionaler Mailversand
        if (sendMail) {
          try {
            const byKey = (res as any)?.byKey || {}
            const personalize = (tpl: string, kundeKey: string) => {
              if (!tpl) return ''
              const kunde = kunden.find(x => x.__key === kundeKey) || {}
              
              // Standard-Platzhalter
              let result = tpl
                .replace(/\{\{\s*vorname\s*\}\}/gi, String(kunde.kvname || ''))
                .replace(/\{\{\s*nachname\s*\}\}/gi, String(kunde.kfname || ''))
                .replace(/\{\{\s*monat\s*\}\}/gi, String(monat).padStart(2,'0'))
                .replace(/\{\{\s*jahr\s*\}\}/gi, String(jahr))
              
              // Dynamische Platzhalter aus allen Kunden-Spalten
              Object.keys(kunde).forEach(key => {
                if (!key.startsWith('__') && key !== '__key' && key !== '__display') {
                  const value = String(kunde[key] || '')
                  result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value)
                }
              })
              
              return result
            }
            const cfg = await window.api?.getConfig?.()
            const kundenSettingsGruppen = cfg?.tableSettings?.['kunden']?.gruppen || {}
            const batch = selectedKeys.map(k => {
              const to = empfaenger[k] || ''
              // Auto-Fill aus Tabellen-Einstellungen (Rechnungsmail), falls leer
              let autoTo = to
              if (!autoTo) {
                try {
                  const keys = Object.keys((kunden.find(x=> x.__key===k) || {}))
                  // Suche nach Spalte, die in kunden-TabellenSettings als rechnungsmail markiert ist
                  const mailKey = keys.find(col => Array.isArray(kundenSettingsGruppen[col]) && kundenSettingsGruppen[col].includes('rechnungsmail'))
                  if (mailKey) autoTo = String((kunden.find(x=> x.__key===k) || {})[mailKey] || '')
                } catch {}
              }
              const attachments = Array.isArray(byKey[k]) ? byKey[k].map((p: string) => ({ path: p })) : []
              const subj = personalize(mailSubject, k)
              const body = personalize(mailText, k)
              return { to: autoTo, subject: subj, text: body, attachments }
            }).filter(item => item.to && item.attachments && item.attachments.length)
            if (batch.length === 0) {
              setIsLoading(false)
              alert('Rechnungen erstellt, aber keine gültigen Empfänger/Anhänge zum Mailversand gefunden.')
            } else {
              setLoadingMessage('E-Mails werden gesendet...')
              const mailRes = await (window as any).api?.mail?.sendBatch?.(batch)
              setIsLoading(false)
              if (mailRes?.ok) {
                alert('Rechnungen erstellt und E-Mails versendet.')
              } else {
                alert('Rechnungen erstellt, aber Mailversand fehlgeschlagen.')
              }
            }
          } catch (e) {
            setIsLoading(false)
            alert('Rechnungen erstellt, Fehler beim Mailversand: ' + String(e))
          }
        } else {
          setLoadingMessage('Fertig!')
          setTimeout(() => {
            setIsLoading(false)
            const rechnungsnummer = 'currentRechnungsnummer' in res ? res.currentRechnungsnummer : 'unbekannt'
            alert(`Rechnungen erstellt. Neue Rechnungsnummer: ${rechnungsnummer}`)
          }, 500)
        }
      } else {
        setIsLoading(false)
        alert('Fehler beim Generieren der Rechnungen')
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      setIsLoading(false)
      console.error('Generation error:', error)
      alert('Fehler beim Generieren der Rechnungen: ' + (error as Error).message)
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Rechnungen</h2>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Rechnungsnummer</label>
            <input type="number" value={currentRechnungsnummer} onChange={e => setCurrentRechnungsnummer(Number(e.currentTarget.value))} min={1} style={{ width: 90, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
          </div>
          <div style={{ background: '#0f172a', color: '#fff', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Nächste: {currentRechnungsnummer}</div>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 16
      }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontWeight: 700 }}>Rechnungsvorlagen</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editVorlagen && (
                  <>
                    <button onClick={async ()=> {
                      const cfg = await window.api?.getConfig?.()
                      const next = { ...(cfg||{}), invoiceTemplateDisplayNames: vorlagenDisplayNames }
                      await window.api?.setConfig?.(next)
                      setEditVorlagen(false)
                    }} style={{ padding: '6px 10px', border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', borderRadius: 8, cursor: 'pointer' }}>Speichern</button>
                    <button onClick={async ()=> {
                      const cfg = await window.api?.getConfig?.();
                      setVorlagenDisplayNames((cfg?.invoiceTemplateDisplayNames||{}) as Record<string,string>)
                      setEditVorlagen(false)
                    }} style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Abbrechen</button>
                  </>
                )}
                <button title={editVorlagen ? 'Namen bearbeiten beenden' : 'Vorlagen-Namen bearbeiten'} onClick={()=> setEditVorlagen(v=>!v)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16 }}>✎</span>
                </button>
              </div>
            </div>
            {files.length === 0 ? (
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: 8, 
                padding: 20, 
                textAlign: 'center', 
                color: '#666',
                background: '#f9f9f9'
              }}>
                Keine Rechnungsvorlagen gefunden.
                <br />
                <small>Bitte konfigurieren Sie den Rechnungsvorlagen-Ordner in den Einstellungen.</small>
              </div>
            ) : (
              <div style={{ 
                border: '1px solid #eee', 
                borderRadius: 8, 
                padding: 8, 
                maxHeight: 300, 
                overflow: 'auto',
                background: '#fff'
              }}>
                {files.map(f => {
                  const disp = vorlagenDisplayNames[f.absPath] ?? f.name
                  return (
                    <div key={f.absPath} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                      {!editVorlagen && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedVorlagen.includes(f.absPath)}
                            onChange={(e) => {
                              const checked = e.currentTarget.checked
                              setSelectedVorlagen(prev => 
                                checked 
                                  ? [...prev, f.absPath]
                                  : prev.filter(x => x !== f.absPath)
                              )
                            }}
                          />
                          <span>{disp}</span>
                        </label>
                      )}
                      {editVorlagen && (
                        <input
                          style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
                          value={disp}
                          onChange={e=> {
                            const val = e.currentTarget ? e.currentTarget.value : ''
                            setVorlagenDisplayNames(prev => ({ ...prev, [f.absPath]: val }))
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Monat</label>
              <input 
                type="number" 
                value={monat} 
                onChange={e => setMonat(Number(e.currentTarget.value))} 
                min={1} 
                max={12} 
                style={{ 
                  width: 80, 
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 8
                }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Jahr</label>
              <input 
                type="number" 
                value={jahr} 
                onChange={e => setJahr(Number(e.currentTarget.value))} 
                min={2000} 
                max={2100} 
                style={{ 
                  width: 100, 
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 8
                }} 
              />
            </div>
            <div style={{ marginTop: 18, color: '#555', fontSize: 12 }}>
              Verrechnungszeitraum: <strong>{verrechnungsZeitraum}</strong>
            </div>
          </div>
          
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Ausgabeformat</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="modus" 
                  checked={modus==='docx'} 
                  onChange={()=> setModus('docx')} 
                /> 
                DOCX
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="modus" 
                  checked={modus==='pdf'} 
                  onChange={()=> setModus('pdf')} 
                /> 
                PDF
              </label>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>E-Mail Versand</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={sendMail} onChange={e=> setSendMail(e.currentTarget.checked)} />
              Per E-Mail versenden (als PDF)
            </label>
            {sendMail && (
              <div style={{ display: 'grid', gap: 8 }}>
                {/* Template-Auswahl */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: '14px', fontWeight: 600 }}>E-Mail-Vorlage:</label>
                    <select 
                      value={selectedTemplate} 
                      onChange={e => loadTemplate(e.currentTarget.value)}
                      style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
                    >
                      <option value="">Neue Nachricht</option>
                      {Object.entries(emailTemplates).map(([id, template]) => (
                        <option key={id} value={id}>{template.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setShowTemplateDialog(true)}
                      style={{ padding: '4px 8px', border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                    >
                      Speichern
                    </button>
                    {selectedTemplate && (
                      <button 
                        onClick={() => deleteTemplate(selectedTemplate)}
                        style={{ padding: '4px 8px', border: '1px solid #dc2626', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Betreff</label>
                  <input value={mailSubject} onChange={e=> {
                    const v = e && e.currentTarget ? (e.currentTarget.value ?? '') : ((e as any)?.target?.value ?? '')
                    setMailSubject(v)
                    window.api?.setConfig?.({ mailSubjectTemplate: v })
                  }} style={{ width: '95%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Nachricht</label>
                  <textarea value={mailText} onChange={e=> {
                    const v = e && e.currentTarget ? (e.currentTarget.value ?? '') : ((e as any)?.target?.value ?? '')
                    setMailText(v)
                    window.api?.setConfig?.({ mailTextTemplate: v })
                  }} rows={4} style={{ width: '95%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Empfänger pro Kunde unten eingeben.</div>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontWeight: 700 }}>Kundenauswahl</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={()=> setSelected(Object.fromEntries(sortedKunden.map(k=> [k.__key, { mode: 'monat' as const }])))} style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Alle auswählen</button>
                <button onClick={()=> setSelected({})} style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Alle abwählen</button>
              </div>
            </div>
            <div style={{ 
              display: 'grid', 
              gap: 8, 
              border: '1px solid #eee', 
              borderRadius: 8, 
              padding: 8, 
              maxHeight: sendMail ? 800 : 432, 
              overflow: 'auto',
              background: '#fff',
              transition: 'max-height 0.5s ease'
            }}>
            {sortedKunden.map(k => {
              const sel = selected[k.__key] || { mode: 'monat' as const }
              return (
                <div key={k.__key} style={{ 
                  border: '1px solid #eaeaea', 
                  borderRadius: 8, 
                  padding: 12,
                  background: selected[k.__key] ? '#f7faff' : '#fff'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!selected[k.__key]}
                      onChange={() => setSelected(prev => {
                        const exists = !!prev[k.__key]
                        const copy = { ...prev }
                        if (exists) {
                          delete copy[k.__key]
                        } else {
                          copy[k.__key] = { mode: 'monat' }
                        }
                        return copy
                      })}
                    />
                    <span style={{ fontWeight: selected[k.__key] ? 'bold' : 'normal' }}>
                      {toLastFirst(k.__display)}
                    </span>
                  </label>
                  {selected[k.__key] && (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      alignItems: 'center', 
                      gap: 12, 
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #eee'
                    }}>
                      {sendMail && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <label style={{ fontSize: '12px' }}>Empfänger:</label>
                          <input 
                            value={empfaenger[k.__key] || ''}
                            onChange={e=> {
                              const v = e && e.currentTarget ? (e.currentTarget.value ?? '') : ((e as any)?.target?.value ?? '')
                              setEmpfaenger(prev => ({ ...prev, [k.__key]: v }))
                            }}
                            placeholder="kunde@example.com"
                            style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 8, minWidth: 220 }}
                          />
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name={`mode-${k.__key}`} 
                          checked={sel?.mode==='monat'} 
                          onChange={()=> setSelected(p=> ({ ...p, [k.__key]: { mode: 'monat' } }))} 
                        /> 
                        Ganzer Monat
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name={`mode-${k.__key}`} 
                          checked={sel?.mode==='ind'} 
                          onChange={()=> {
                            // Berechne den aktuellen Verrechnungsmonat
                            const daysInMonth = new Date(jahr, monat, 0).getDate()
                            const mm = String(monat).padStart(2,'0')
                            const von = `01.${mm}.${jahr}`
                            const bis = `${String(daysInMonth).padStart(2,'0')}.${mm}.${jahr}`
                            setSelected(p=> ({ ...p, [k.__key]: { mode: 'ind', von, bis } }))
                          }} 
                        /> 
                        Individuell
                      </label>
                      {sel && sel.mode==='ind' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label style={{ fontSize: '12px' }}>Von:</label>
                            <input 
                              type="date" 
                              value={sel.von ? sel.von.split('.').reverse().join('-') : ''}
                              onChange={e=> {
                                const dateValue = e.currentTarget.value
                                const formattedDate = dateValue ? dateValue.split('-').reverse().join('.') : ''
                                setSelected(p=> ({ ...p, [k.__key]: { ...sel, von: formattedDate } }))
                              }}
                              style={{ 
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                fontSize: '12px'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label style={{ fontSize: '12px' }}>Bis:</label>
                            <input 
                              type="date" 
                              value={sel.bis ? sel.bis.split('.').reverse().join('-') : ''}
                              onChange={e=> {
                                const dateValue = e.currentTarget.value
                                const formattedDate = dateValue ? dateValue.split('-').reverse().join('.') : ''
                                setSelected(p=> ({ ...p, [k.__key]: { ...sel, bis: formattedDate } }))
                              }}
                              style={{ 
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                fontSize: '12px'
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      </div>
      
      <div style={{ position: 'sticky', bottom: 0, background: 'transparent', paddingTop: 12, marginTop: 12, textAlign: 'center' }}>
        <button 
          onClick={handleGenerate}
          disabled={isLoading}
          style={{
            background: isLoading ? '#6c757d' : '#005bd1',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 999,
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Wird generiert...' : `Rechnungen als ${modus.toUpperCase()} generieren`}
        </button>
      </div>
      
      <LoadingDialog
        isOpen={isLoading}
        title={modus === 'pdf' ? 'PDF-Erstellung' : 'Rechnungsgenerierung'}
        message={loadingMessage}
        progress={loadingProgress}
        showProgress={true}
      />

      {/* Template-Speichern Dialog */}
      {showTemplateDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, minWidth: 400, maxWidth: 500 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>E-Mail-Vorlage speichern</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Vorlagenname:</label>
              <input
                type="text"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.currentTarget.value)}
                placeholder="z.B. Standard-Rechnung, Zahlungserinnerung..."
                style={{ width: '95%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowTemplateDialog(false)
                  setNewTemplateName('')
                }}
                style={{ padding: '8px 16px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                onClick={saveTemplate}
                disabled={!newTemplateName.trim()}
                style={{ 
                  padding: '8px 16px', 
                  border: 'none', 
                  background: newTemplateName.trim() ? '#005bd1' : '#ccc', 
                  color: '#fff', 
                  borderRadius: 8, 
                  cursor: newTemplateName.trim() ? 'pointer' : 'not-allowed' 
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}


