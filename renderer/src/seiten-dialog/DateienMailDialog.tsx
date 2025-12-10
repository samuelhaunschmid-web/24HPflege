import { useEffect, useState } from 'react'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'
import type { EmailTemplate } from '../logik/dateiVerwaltung/typen'
import ConfirmModal from '../komponenten/ConfirmModal'

function normalizeSelectedFiles(files: any): Array<{ personType: 'kunden' | 'betreuer'; folderPath: string[]; fileTemplate: string }> {
  if (!Array.isArray(files)) return []
  return files.map((f) => {
    const rawPath = f?.folderPath
    const folderPath = Array.isArray(rawPath)
      ? rawPath.filter(Boolean)
      : (typeof rawPath === 'string'
        ? rawPath.split(/[\\/]+/).map((s: string) => s.trim()).filter(Boolean)
        : [])

    const personType: 'kunden' | 'betreuer' =
      f?.personType === 'betreuer' ? 'betreuer' : 'kunden'

    return {
      personType,
      folderPath,
      fileTemplate: String(f?.fileTemplate || '').trim(),
    }
  })
}

export default function DateienMailDialog() {
  const [cfg, setCfg] = useState<any>({})
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [tab, setTab] = useState<'neu' | 'bearbeiten'>('neu')
  const [draft, setDraft] = useState<EmailTemplate>({ id: '', name: '', to: '', subject: '', text: '', selectedFiles: [] })
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; templateId?: string }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    ;(async () => {
      const c = await window.api?.getConfig?.()
      setCfg(c || {})
      const geladeneTemplates = await StandardTemplateService.ladeEmailTemplates()
      const normalized = geladeneTemplates.map(t => ({ ...t, selectedFiles: normalizeSelectedFiles(t.selectedFiles) }))
      setTemplates(normalized)
    })()
  }, [])

  function resetDraft() {
    setDraft({ id: '', name: '', to: '', subject: '', text: '', selectedFiles: [] })
  }

  async function saveDraft() {
    const t = { ...draft, selectedFiles: normalizeSelectedFiles(draft.selectedFiles), id: draft.id || Math.random().toString(36).slice(2) }
    const next = [...templates.filter(x => x.id !== t.id), t]
    setTemplates(next)
    // Verwende StandardTemplateService für konsistentes Speichern
    await StandardTemplateService.speichereEmailTemplates(next)
    // Aktualisiere auch cfg für FileSelector
    const c = await window.api?.getConfig?.()
    setCfg(c || {})
    setTab('bearbeiten')
    resetDraft()
  }

  async function removeTemplate(id: string) {
    setConfirmModal({
      isOpen: true,
      message: 'Vorlage löschen?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        const next = templates.filter(t => t.id !== id)
        setTemplates(next)
        // Verwende StandardTemplateService für konsistentes Speichern
        await StandardTemplateService.speichereEmailTemplates(next)
        // Aktualisiere auch cfg für FileSelector
        const c = await window.api?.getConfig?.()
        setCfg(c || {})
      },
      templateId: id
    })
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setTab('neu')} style={{ padding: '6px 12px', borderRadius: 8, border: tab==='neu' ? '1px solid #0ea5e9' : '1px solid #d1d5db', background: tab==='neu' ? '#e0f2fe' : '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Neue Vorlage</button>
        <button onClick={() => setTab('bearbeiten')} style={{ padding: '6px 12px', borderRadius: 8, border: tab==='bearbeiten' ? '1px solid #0ea5e9' : '1px solid #d1d5db', background: tab==='bearbeiten' ? '#e0f2fe' : '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Vorlagen bearbeiten</button>
      </div>

      {tab === 'neu' && (
        <div style={{ border: '1px solid #e6e8ef', borderRadius: 8, padding: 12, display: 'grid', gap: 10 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Name</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>An (Emailadresse, Platzhalter möglich)</label>
            <input value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Betreff (Platzhalter möglich)</label>
            <input value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Textnachricht (Platzhalter möglich)</label>
            <textarea value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} rows={5} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
          </div>
          <FileSelector cfg={cfg} selectedFiles={draft.selectedFiles} onFilesChange={(files) => setDraft({ ...draft, selectedFiles: files })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveDraft} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#dcfce7', color: '#166534', cursor: 'pointer' }}>Speichern</button>
            <button onClick={resetDraft} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937', cursor: 'pointer' }}>Zurücksetzen</button>
          </div>
        </div>
      )}

      {tab === 'bearbeiten' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {templates.map(t => (
            <div key={t.id} style={{ border: '1px solid #e6e8ef', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, flex: 1 }}>{t.name}</div>
                <button onClick={() => { setDraft({ ...t, selectedFiles: normalizeSelectedFiles(t.selectedFiles) }); setTab('neu') }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', marginRight: 4 }}>Öffnen</button>
                <button onClick={() => removeTemplate(t.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Löschen</button>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>An: {t.to}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Betreff: {t.subject}</div>
              <VorlagenAnhaengeAnzeige template={t} cfg={cfg} />
            </div>
          ))}
          {templates.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>Keine Vorlagen gespeichert</div>}
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
        type="danger"
        confirmText="Löschen"
        cancelText="Abbrechen"
      />
    </div>
  )
}

function VorlagenAnhaengeAnzeige({ template, cfg }: { template: EmailTemplate; cfg: any }) {
  const selected = normalizeSelectedFiles(template.selectedFiles)
  const kundenRules = (cfg?.folderTemplatesRules?.kunden || []) as Array<{ path: string[]; files: string[] }>
  const betreuerRules = (cfg?.folderTemplatesRules?.betreuer || []) as Array<{ path: string[]; files: string[] }>

  const isStillAvailable = (personType: 'kunden' | 'betreuer', folderPath: string[], fileTemplate: string) => {
    const rules = personType === 'kunden' ? kundenRules : betreuerRules
    return rules.some(r => r.path.join('/') === folderPath.join('/') && (r.files || []).includes(fileTemplate))
  }

  if (selected.length === 0) {
    return <div style={{ fontSize: 12, color: '#64748b' }}>Keine Anhänge gespeichert</div>
  }

  return (
    <div style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 8, display: 'grid', gap: 6 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>Anhänge (gespeichert)</div>
      {selected.map((f, idx) => {
        const available = isStillAvailable(f.personType, f.folderPath, f.fileTemplate)
        return (
          <div key={`${f.personType}-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 6, borderRadius: 6, background: available ? '#f8fafc' : '#fff7ed', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{f.fileTemplate || '(leer)'}</span>
              <span style={{ fontSize: 11, color: '#475569', padding: '2px 6px', borderRadius: 4, background: '#e2e8f0' }}>{f.personType === 'kunden' ? 'Kunde' : 'Betreuer'}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{f.folderPath.join(' / ') || '(kein Ordner)'}</div>
            {!available && <div style={{ fontSize: 11, color: '#b45309' }}>Nicht mehr in den aktuellen Standard-Dateien vorhanden</div>}
          </div>
        )
      })}
    </div>
  )
}

function FileSelector({ cfg, selectedFiles, onFilesChange }: { cfg: any; selectedFiles: Array<{ personType: 'kunden' | 'betreuer'; folderPath: string[]; fileTemplate: string }>; onFilesChange: (files: Array<{ personType: 'kunden' | 'betreuer'; folderPath: string[]; fileTemplate: string }>) => void }) {
  const kundenRules = (cfg?.folderTemplatesRules?.kunden || []) as Array<{ path: string[]; files: string[] }>
  const betreuerRules = (cfg?.folderTemplatesRules?.betreuer || []) as Array<{ path: string[]; files: string[] }>
  const safeSelected = Array.isArray(selectedFiles) ? selectedFiles : []

  function removeSelected(index: number) {
    onFilesChange(safeSelected.filter((_, i) => i !== index))
  }

  function toggleFile(personType: 'kunden' | 'betreuer', folderPath: string[], fileTemplate: string) {
    const exists = safeSelected.some(f => 
      f.personType === personType && 
      f.folderPath.join('/') === folderPath.join('/') && 
      f.fileTemplate === fileTemplate
    )
    if (exists) {
      onFilesChange(safeSelected.filter(f => !(
        f.personType === personType && 
        f.folderPath.join('/') === folderPath.join('/') && 
        f.fileTemplate === fileTemplate
      )))
    } else {
      onFilesChange([...safeSelected, { personType, folderPath, fileTemplate }])
    }
  }

  function isSelected(personType: 'kunden' | 'betreuer', folderPath: string[], fileTemplate: string) {
    return safeSelected.some(f => 
      f.personType === personType && 
      f.folderPath.join('/') === folderPath.join('/') && 
      f.fileTemplate === fileTemplate
    )
  }

  function isStillAvailable(personType: 'kunden' | 'betreuer', folderPath: string[], fileTemplate: string) {
    const rules = personType === 'kunden' ? kundenRules : betreuerRules
    return rules.some(r => r.path.join('/') === folderPath.join('/') && (r.files || []).includes(fileTemplate))
  }

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Anzuhängende Standard-Dateien</div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ border: '1px solid #e6e8ef', borderRadius: 8, padding: 8, display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 600 }}>Aktuell ausgewählt</div>
          {safeSelected.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>Keine Dateien ausgewählt</div>}
          {safeSelected.map((f, idx) => {
            const available = isStillAvailable(f.personType, f.folderPath, f.fileTemplate)
            return (
              <div key={`${f.personType}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, border: '1px solid #e2e8f0', borderRadius: 6, background: available ? '#f8fafc' : '#fff7ed' }}>
                <div style={{ fontSize: 12, color: '#334155', flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{f.fileTemplate}</div>
                  <div style={{ color: '#64748b' }}>{f.personType === 'kunden' ? 'Kunde' : 'Betreuer'} · {f.folderPath.join(' / ')}</div>
                  {!available && <div style={{ color: '#b45309' }}>Nicht mehr in den aktuellen Standard-Dateien vorhanden</div>}
                </div>
                <button onClick={() => removeSelected(idx)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>
                  Entfernen
                </button>
              </div>
            )
          })}
          {safeSelected.length > 0 && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Hinweis: Diese Liste zeigt alle gespeicherten Anhänge der Vorlage – auch wenn sie nicht mehr in den Standard-Dateien existieren.
            </div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Kunden-Dateien</div>
          <div style={{ display: 'grid', gap: 6, border: '1px solid #e6e8ef', borderRadius: 8, padding: 8, maxHeight: 240, overflowY: 'auto' }}>
            {kundenRules.map((r, idx) => (
              <div key={`k-${idx}`} style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Ordner: {r.path.join(' / ')}</div>
                {(r.files || []).map((f, fIdx) => (
                  <label key={`k-${idx}-f-${fIdx}`} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isSelected('kunden', r.path, f)}
                      onChange={() => toggleFile('kunden', r.path, f)}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontSize: 12 }}>{f}</span>
                  </label>
                ))}
              </div>
            ))}
            {kundenRules.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>Keine Standard-Dateien für Kunden definiert</div>}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Betreuer-Dateien</div>
          <div style={{ display: 'grid', gap: 6, border: '1px solid #e6e8ef', borderRadius: 8, padding: 8, maxHeight: 240, overflowY: 'auto' }}>
            {betreuerRules.map((r, idx) => (
              <div key={`b-${idx}`} style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Ordner: {r.path.join(' / ')}</div>
                {(r.files || []).map((f, fIdx) => (
                  <label key={`b-${idx}-f-${fIdx}`} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isSelected('betreuer', r.path, f)}
                      onChange={() => toggleFile('betreuer', r.path, f)}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontSize: 12 }}>{f}</span>
                  </label>
                ))}
              </div>
            ))}
            {betreuerRules.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>Keine Standard-Dateien für Betreuer definiert</div>}
          </div>
        </div>
      </div>
    </div>
  )
}


