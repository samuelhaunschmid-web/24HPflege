import { useState } from 'react'
import MessageModal from './MessageModal'

export default function EinstellungenExportImport() {
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  const handleExport = async () => {
    try {
      const res = await (window as any).api?.exportSettings?.()
      if (res?.ok) {
        const data = JSON.stringify(res.payload, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        a.download = `24HPflege-Einstellungen-${d}-${m}-${y}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setMessageModal({ isOpen: true, message: 'Einstellungen erfolgreich exportiert', type: 'success' })
      } else {
        setMessageModal({ isOpen: true, message: 'Export fehlgeschlagen', type: 'error' })
      }
    } catch (e) {
      setMessageModal({ isOpen: true, message: 'Export-Fehler: ' + String(e), type: 'error' })
    }
  }

  const handleImport = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = async () => {
        const file = input.files && input.files[0]
        if (!file) return
        const text = await file.text()
        try {
          const json = JSON.parse(text)
          const res = await (window as any).api?.importSettings?.(json)
          if (res?.ok) {
            setMessageModal({ isOpen: true, message: 'Einstellungen importiert. Bitte App neu starten.', type: 'success' })
          } else {
            setMessageModal({ isOpen: true, message: 'Import fehlgeschlagen: ' + (res?.message || ''), type: 'error' })
          }
        } catch (err) {
          setMessageModal({ isOpen: true, message: 'Ungültige JSON-Datei', type: 'error' })
        }
      }
      input.click()
    } catch (e) {
      setMessageModal({ isOpen: true, message: 'Import-Fehler: ' + String(e), type: 'error' })
    }
  }

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Einstellungen sichern</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={handleExport}
            style={{ 
              padding: '6px 12px', 
              borderRadius: 8, 
              border: '1px solid #d1d5db', 
              background: '#ffffff', 
              color: '#1f2937', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: '600', 
              fontFamily: 'inherit' 
            }}
          >
            Exportieren
          </button>

          <button 
            onClick={handleImport}
            style={{ 
              padding: '6px 12px', 
              borderRadius: 8, 
              border: '1px solid #d1d5db', 
              background: '#ffffff', 
              color: '#1f2937', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: '600', 
              fontFamily: 'inherit' 
            }}
          >
            Importieren
          </button>
        </div>
      </div>
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
    </>
  )
}

