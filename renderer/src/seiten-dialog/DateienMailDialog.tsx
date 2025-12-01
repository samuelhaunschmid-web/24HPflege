import { useEffect, useState } from 'react'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'
import type { EmailTemplate } from '../logik/dateiVerwaltung/typen'
import ConfirmModal from '../komponenten/ConfirmModal'

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
      setTemplates(geladeneTemplates)
    })()
  }, [])

  function resetDraft() {
    setDraft({ id: '', name: '', to: '', subject: '', text: '', selectedFiles: [] })
  }

  async function saveDraft() {
    const t = { ...draft, id: draft.id || Math.random().toString(36).slice(2) }
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
                <button onClick={() => { setDraft(t); setTab('neu') }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', marginRight: 4 }}>Öffnen</button>
                <button onClick={() => removeTemplate(t.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Löschen</button>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>An: {t.to}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Betreff: {t.subject}</div>
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

function FileSelector({ cfg, selectedFiles, onFilesChange }: { cfg: any; selectedFiles: Array<{ personType: 'kunden' | 'betreuer'; folderPath: string[]; fileTemplate: string }>; onFilesChange: (files: Array<{ personType: 'kunden' | 'betreuer'; folderPath: string[]; fileTemplate: string }>) => void }) {
  const kundenRules = (cfg?.folderTemplatesRules?.kunden || []) as Array<{ path: string[]; files: string[] }>
  const betreuerRules = (cfg?.folderTemplatesRules?.betreuer || []) as Array<{ path: string[]; files: string[] }>

  function toggleFile(personType: 'kunden' | 'betreuer', folderPath: string[], fileTemplate: string) {
    const exists = selectedFiles.some(f => 
      f.personType === personType && 
      f.folderPath.join('/') === folderPath.join('/') && 
      f.fileTemplate === fileTemplate
    )
    if (exists) {
      onFilesChange(selectedFiles.filter(f => !(
        f.personType === personType && 
        f.folderPath.join('/') === folderPath.join('/') && 
        f.fileTemplate === fileTemplate
      )))
    } else {
      onFilesChange([...selectedFiles, { personType, folderPath, fileTemplate }])
    }
  }

  function isSelected(personType: 'kunden' | 'betreuer', folderPath: string[], fileTemplate: string) {
    return selectedFiles.some(f => 
      f.personType === personType && 
      f.folderPath.join('/') === folderPath.join('/') && 
      f.fileTemplate === fileTemplate
    )
  }

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Anzuhängende Standard-Dateien</div>
      <div style={{ display: 'grid', gap: 12 }}>
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


