import { useEffect, useState } from 'react'
import MessageModal from './MessageModal'
import ConfirmModal from './ConfirmModal'

type Props = {
  offen: boolean
  onClose: () => void
}

// Hilfsfunktion um Dateinamen aus Pfad zu extrahieren
function getFilenameFromPath(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

export default function VorlagenGruppenDialog({ offen, onClose }: Props) {
  const [gruppen, setGruppen] = useState<Record<string, string[]>>({})
  const [order, setOrder] = useState<string[]>([])
  const [alleVorlagen, setAlleVorlagen] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    if (offen) {
      loadData()
    }
  }, [offen])

  async function loadData() {
    try {
      setIsLoading(true)
      const [gruppenData, treeData] = await Promise.all([
        window.docgen?.getVorlagenGruppen?.(),
        window.docgen?.getVorlagenTree?.()
      ])

      // Sammle alle verfügbaren Vorlagen aus dem Dateisystem
      let availableTemplates: string[] = []
      if (treeData) {
        function collectTemplates(nodes: any[]) {
          for (const node of nodes) {
            if (node.type === 'file') {
              availableTemplates.push(node.relPath)
            } else if (node.children) {
              collectTemplates(node.children)
            }
          }
        }
        collectTemplates(treeData)
        availableTemplates.sort()
        setAlleVorlagen(availableTemplates)
      }

      if (gruppenData) {
        // Filtere Gruppen, um nur existierende Vorlagen zu behalten
        const filteredGroups: Record<string, string[]> = {}
        for (const [groupName, templates] of Object.entries(gruppenData.groups || {})) {
          filteredGroups[groupName] = templates.filter(template => availableTemplates.includes(template))
        }

        setGruppen(filteredGroups)
        setOrder(gruppenData.order || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createGroup() {
    const name = newGroupName.trim()
    if (!name) return

    try {
      await window.docgen?.createVorlagenGruppe?.(name)
      await loadData()
      setNewGroupName('')
      setShowNewGroupInput(false)
    } catch (error) {
      setMessageModal({ isOpen: true, message: 'Fehler beim Erstellen der Gruppe: ' + (error as Error).message, type: 'error' })
    }
  }


  async function deleteGroup(name: string) {
    setConfirmModal({
      isOpen: true,
      message: `Gruppe "${name}" wirklich löschen?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        try {
          await window.docgen?.deleteVorlagenGruppe?.(name)
          await loadData()
        } catch (error) {
          setMessageModal({ isOpen: true, message: 'Fehler beim Löschen der Gruppe: ' + (error as Error).message, type: 'error' })
        }
      }
    })
  }

  async function renameGroup(oldName: string, newName: string) {
    if (!newName || !newName.trim() || newName.trim() === oldName) return

    try {
      await window.docgen?.renameVorlagenGruppe?.(oldName, newName.trim())
      await loadData()
    } catch (error) {
      setMessageModal({ isOpen: true, message: 'Fehler beim Umbenennen der Gruppe: ' + (error as Error).message, type: 'error' })
    }
  }

  async function toggleTemplate(groupName: string, template: string) {
    const currentTemplates = gruppen[groupName] || []
    const newTemplates = currentTemplates.includes(template)
      ? currentTemplates.filter(t => t !== template)
      : [...currentTemplates, template]

    try {
      await window.docgen?.updateVorlagenGruppeTemplates?.(groupName, newTemplates)
      setGruppen(prev => ({ ...prev, [groupName]: newTemplates }))
    } catch (error) {
      setMessageModal({ isOpen: true, message: 'Fehler beim Aktualisieren der Gruppe: ' + (error as Error).message, type: 'error' })
    }
  }

  if (!offen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', zIndex: 1000 }}>
      <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #eee', flex: '0 0 auto' }}>
          <strong>Vorlagen-Gruppen verwalten</strong>
          <button onClick={onClose}>Schließen</button>
        </div>

        <div style={{ padding: 12, overflow: 'auto', flex: '1 1 auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>Lade...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ display: 'flex', gap: 8 }}>
                {showNewGroupInput ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Name der neuen Gruppe"
                        style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') createGroup()
                          if (e.key === 'Escape') {
                            setShowNewGroupInput(false)
                            setNewGroupName('')
                          }
                        }}
                        autoFocus
                      />
                      <button onClick={createGroup} style={{ padding: '8px 16px', background: '#005bd1', color: 'white', border: 'none', borderRadius: 6 }}>
                        Erstellen
                      </button>
                      <button onClick={() => {
                        setShowNewGroupInput(false)
                        setNewGroupName('')
                      }} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 6 }}>
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowNewGroupInput(true)} style={{ padding: '8px 16px', background: '#005bd1', color: 'white', border: 'none', borderRadius: 6 }}>
                      + Neue Gruppe
                    </button>
                  )}
                </div>
              </div>

              {(
                order.length > 0
                  ? [...order, ...Object.keys(gruppen).filter(k => !order.includes(k))]
                  : Object.keys(gruppen)
              ).map(groupName => {
                const templates = gruppen[groupName] || []
                const isExpanded = expandedGroups.has(groupName)

                return (
                  <div key={groupName} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, background: '#fafafa' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        color: '#1f2937',
                        fontWeight: '600',
                        WebkitFontSmoothing: 'subpixel-antialiased',
                        MozOsxFontSmoothing: 'auto',
                        textRendering: 'optimizeLegibility'
                      }}
                      onClick={() => {
                        setExpandedGroups(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(groupName)) {
                            newSet.delete(groupName)
                          } else {
                            newSet.add(groupName)
                          }
                          return newSet
                        })
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <span style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          display: 'inline-block',
                          width: 12,
                          textAlign: 'center'
                        }}>
                          ▶
                        </span>
                        {editingGroup === groupName ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, flex: 1 }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameGroup(groupName, editingName)
                                  setEditingGroup(null)
                                }
                                if (e.key === 'Escape') {
                                  setEditingGroup(null)
                                  setEditingName('')
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <button onClick={(e) => {
                              e.stopPropagation()
                              renameGroup(groupName, editingName)
                              setEditingGroup(null)
                            }} style={{ padding: '4px 8px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4 }}>
                              ✓
                            </button>
                            <button onClick={(e) => {
                              e.stopPropagation()
                              setEditingGroup(null)
                              setEditingName('')
                            }} style={{ padding: '4px 8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4 }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <h3 style={{ margin: 0, color: '#1f2937' }}>{groupName}</h3>
                        )}
                        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto', marginRight: 8 }}>
                          {templates.length} Vorlagen
                        </span>
                      </div>
                      {!editingGroup && (
                        <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => {
                            setEditingGroup(groupName)
                            setEditingName(groupName)
                          }} style={{ padding: '4px 8px', fontSize: 12 }}>Umbenennen</button>
                          <button onClick={() => deleteGroup(groupName)} style={{ padding: '4px 8px', fontSize: 12, background: '#dc3545', color: 'white', border: 'none', borderRadius: 4 }}>Löschen</button>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#ffffff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
                          {alleVorlagen.map(template => (
                            <label key={template} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              background: templates.includes(template) ? '#dbeafe' : '#ffffff',
                              cursor: 'pointer',
                              fontSize: 14
                            }}>
                              <input
                                type="checkbox"
                                checked={templates.includes(template)}
                                onChange={() => toggleTemplate(groupName, template)}
                              />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getFilenameFromPath(template)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', borderTop: '1px solid #eee', background: '#fff', flex: '0 0 auto' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7' }}>
            Schließen
          </button>
        </div>
      </div>
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
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
