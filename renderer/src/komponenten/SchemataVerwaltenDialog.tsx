import { useEffect, useMemo, useState } from 'react'

export type SchemaContext = 'kunde' | 'alterBetreuer' | 'neuerBetreuer'

export type DateiSchema = {
  id: string
  name: string
  actions: Array<{
    sourceContext: SchemaContext
    fromPath: string[]
    fileName: string[]
    targetContext: SchemaContext
    toPath: string[]
  }>
}

type SchemaDialogProps = {
  offen: boolean
  onClose: () => void
  onSave: (schemas: DateiSchema[]) => Promise<void> | void
  initialSchemas: DateiSchema[]
  ordnerTemplates: {
    kunden: Array<{ path: string[]; files: string[] }>
    betreuer: Array<{ path: string[]; files: string[] }>
  }
}

function formatPath(path: string[]): string {
  return path.length ? path.join(' / ') : '(Wurzel)'
}

export default function SchemataVerwaltenDialog({ offen, onClose, onSave, initialSchemas, ordnerTemplates }: SchemaDialogProps) {
  const [schemas, setSchemas] = useState<DateiSchema[]>([])
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (offen) {
      setSchemas(initialSchemas && initialSchemas.length ? initialSchemas : [])
      setSelectedSchemaId(initialSchemas && initialSchemas[0] ? initialSchemas[0].id : null)
    }
  }, [offen, initialSchemas])

  const selectedSchema = useMemo(() => schemas.find(s => s.id === selectedSchemaId) || null, [schemas, selectedSchemaId])

  function addSchema() {
    const id = Math.random().toString(36).slice(2)
    const next: DateiSchema = { id, name: 'Neues Schema', actions: [] }
    setSchemas(prev => [...prev, next])
    setSelectedSchemaId(id)
  }

  function removeSchema(id: string) {
    setSchemas(prev => prev.filter(s => s.id !== id))
    if (selectedSchemaId === id) {
      const next = schemas.filter(s => s.id !== id)
      setSelectedSchemaId(next[0]?.id || null)
    }
  }

  function updateSchemaName(id: string, name: string) {
    setSchemas(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  function addAction(sourceContext: SchemaContext, targetContext: SchemaContext) {
    if (!selectedSchema) return
    const newAction = {
      sourceContext,
      fromPath: [],
      fileName: [],
      targetContext,
      toPath: []
    }
    setSchemas(prev => prev.map(s => s.id === selectedSchema.id ? { ...s, actions: [...s.actions, newAction] } : s))
  }

  function updateAction(index: number, action: Partial<DateiSchema['actions'][number]>) {
    if (!selectedSchema) return
    setSchemas(prev => prev.map(s => {
      if (s.id !== selectedSchema.id) return s
      const actions = [...s.actions]
      actions[index] = { ...actions[index], ...action }
      return { ...s, actions }
    }))
  }

  function removeAction(index: number) {
    if (!selectedSchema) return
    setSchemas(prev => prev.map(s => {
      if (s.id !== selectedSchema.id) return s
      const actions = s.actions.filter((_, i) => i !== index)
      return { ...s, actions }
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(schemas)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!offen) return null

  const contextList: Array<{ value: SchemaContext; label: string; personType: 'kunden' | 'betreuer' }> = [
    { value: 'kunde', label: 'Kunde', personType: 'kunden' },
    { value: 'alterBetreuer', label: 'Alter Betreuer', personType: 'betreuer' },
    { value: 'neuerBetreuer', label: 'Neuer Betreuer', personType: 'betreuer' },
  ]

  const getTemplatesForContext = (ctx: SchemaContext) => {
    const personType = ctx === 'kunde' ? 'kunden' : 'betreuer'
    return ordnerTemplates[personType] || []
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div style={{ width: 960, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 12, padding: 20, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Datei-Schemata verwalten</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Schemata</strong>
              <button onClick={addSchema} style={{ border: '1px solid #d1d5db', borderRadius: 8, background: '#1d4ed8', color: '#fff', fontWeight: 600, padding: '4px 10px', cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {schemas.map(schema => (
                <div key={schema.id} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                  <div
                    onClick={() => setSelectedSchemaId(schema.id)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: selectedSchemaId === schema.id ? '#e0f2fe' : '#fff',
                      border: selectedSchemaId === schema.id ? '1px solid #38bdf8' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      fontWeight: selectedSchemaId === schema.id ? 600 : 500,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {schema.name}
                  </div>
                  <button onClick={() => removeSchema(schema.id)} style={{ border: '1px solid #fecdd3', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}>🗑</button>
                </div>
              ))}
              {!schemas.length && (
                <div style={{ fontSize: 12, color: '#64748b' }}>Noch keine Schemata vorhanden.</div>
              )}
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, minHeight: 360 }}>
            {selectedSchema ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>Name des Schemas</label>
                  <input
                    value={selectedSchema.name}
                    onChange={e => updateSchemaName(selectedSchema.id, e.currentTarget.value)}
                    style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #cbd5f5' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button onClick={() => addAction('kunde', 'kunde')} style={{ borderRadius: 8, border: '1px solid #38bdf8', background: '#1d4ed8', color: '#fff', fontWeight: 600, padding: '6px 16px', cursor: 'pointer' }}>Aktion hinzufügen</button>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {selectedSchema.actions.map((action, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'grid', gap: 8, background: '#fdfdfd' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>
                          Aktion {idx + 1}
                        </strong>
                        <button onClick={() => removeAction(idx)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>Entfernen</button>
                      </div>

                      <label style={{ display: 'grid', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#475569' }}>Quelle (Person & Ordner)</span>
                        <select
                          value={action.sourceContext}
                          onChange={e => updateAction(idx, { sourceContext: e.currentTarget.value as SchemaContext, fromPath: [], fileName: [] })}
                          style={{ padding: 6, borderRadius: 8, border: '1px solid #cbd5f5' }}
                        >
                          {contextList.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <select
                          value={action.fromPath.join('>')}
                          onChange={e => {
                            const val = e.currentTarget.value
                            const target = getTemplatesForContext(action.sourceContext).find(opt => opt.path.join('>') === val)
                            updateAction(idx, { fromPath: target ? target.path : [], fileName: [] })
                          }}
                          style={{ padding: 6, borderRadius: 8, border: '1px solid #cbd5f5' }}
                        >
                          <option value="">-- Ordner wählen --</option>
                          {getTemplatesForContext(action.sourceContext).map(opt => (
                            <option key={opt.path.join('>')} value={opt.path.join('>')}>
                              {formatPath(opt.path)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#475569' }}>Dateien auswählen</span>
                        <div style={{ border: '1px solid #cbd5f5', borderRadius: 8, padding: 8, maxHeight: 150, overflowY: 'auto', background: !action.fromPath.length ? '#f1f5f9' : '#fff' }}>
                          {!action.fromPath.length ? (
                            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>Bitte zuerst einen Ordner wählen</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {getTemplatesForContext(action.sourceContext).find(opt => opt.path.join('>') === action.fromPath.join('>'))?.files.map(f => {
                                const isSelected = action.fileName.includes(f)
                                return (
                                  <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={e => {
                                        const currentFiles = action.fileName || []
                                        if (e.currentTarget.checked) {
                                          updateAction(idx, { fileName: [...currentFiles, f] })
                                        } else {
                                          updateAction(idx, { fileName: currentFiles.filter(n => n !== f) })
                                        }
                                      }}
                                      style={{ cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 13, color: '#334155' }}>{f}</span>
                                  </label>
                                )
                              })}
                              {!getTemplatesForContext(action.sourceContext).find(opt => opt.path.join('>') === action.fromPath.join('>'))?.files.length && (
                                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>Keine Dateien in diesem Ordner</div>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                      <label style={{ display: 'grid', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#475569' }}>Ziel (Person & Ordner)</span>
                        <select
                          value={action.targetContext}
                          onChange={e => updateAction(idx, { targetContext: e.currentTarget.value as SchemaContext, toPath: [] })}
                          style={{ padding: 6, borderRadius: 8, border: '1px solid #cbd5f5' }}
                        >
                          {contextList.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <select
                          value={action.toPath.join('>')}
                          onChange={e => {
                            const val = e.currentTarget.value
                            const target = getTemplatesForContext(action.targetContext).find(opt => opt.path.join('>') === val)
                            updateAction(idx, { toPath: target ? target.path : [] })
                          }}
                          style={{ padding: 6, borderRadius: 8, border: '1px solid #cbd5f5' }}
                        >
                          <option value="">-- Ziel wählen --</option>
                          {getTemplatesForContext(action.targetContext).map(opt => (
                            <option key={opt.path.join('>')} value={opt.path.join('>')}>
                              {formatPath(opt.path)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                  {!selectedSchema.actions.length && (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Noch keine Aktionen hinzugefügt.</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#64748b' }}>Wähle links ein Schema aus oder erstelle ein neues.</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#1f2937', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Speichert…' : 'Speichern'}</button>
        </div>
      </div>
    </div>
  )
}

