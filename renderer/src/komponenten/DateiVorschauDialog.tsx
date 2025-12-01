import { useEffect, useState } from 'react'

type DateiVorschauDialogProps = {
  offen: boolean
  dateiPfad: string
  dateiName: string
  onClose: () => void
}

/**
 * Dialog zur Vorschau von Dateien (PDF inline, andere extern öffnen)
 */
export default function DateiVorschauDialog({
  offen,
  dateiPfad,
  dateiName,
  onClose
}: DateiVorschauDialogProps) {
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  useEffect(() => {
    if (offen && dateiPfad) {
      // Prüfe Dateityp
      const isPdfFile = dateiName.toLowerCase().endsWith('.pdf')
      setLadeFehler(null)

      // Für Nicht-PDFs direkt extern öffnen
      if (!isPdfFile) {
        window.api?.openFile?.(dateiPfad).catch((_err: unknown) => {
          setLadeFehler('Datei konnte nicht geöffnet werden')
        })
        // Schließe Dialog nach kurzer Verzögerung
        setTimeout(onClose, 500)
      }
    }
  }, [offen, dateiPfad, dateiName, onClose])

  if (!offen) return null

  const isPdfFile = dateiName.toLowerCase().endsWith('.pdf')

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        width: '90vw',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ fontWeight: 600, color: '#1f2937' }}>
            {dateiName}
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 20,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              borderRadius: 4
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {ladeFehler ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#ef4444',
              fontSize: 16
            }}>
              {ladeFehler}
            </div>
          ) : isPdfFile ? (
            <iframe
              src={dateiPfad}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title={`Vorschau: ${dateiName}`}
              onError={() => setLadeFehler('PDF konnte nicht geladen werden')}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
              fontSize: 16
            }}>
              Datei wird in externer Anwendung geöffnet...
            </div>
          )}
        </div>

        {/* Footer für Nicht-PDFs */}
        {!isPdfFile && !ladeFehler && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14
          }}>
            Die Datei wird in der zugehörigen Standardanwendung geöffnet.
          </div>
        )}
      </div>
    </div>
  )
}
