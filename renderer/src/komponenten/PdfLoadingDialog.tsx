// import React from 'react' // Not needed in current implementation

interface PdfLoadingDialogProps {
  isOpen: boolean
  progress: number
  currentFile: string
  totalFiles: number
  onCancel?: () => void
}

export default function PdfLoadingDialog({ 
  isOpen, 
  progress, 
  currentFile, 
  totalFiles, 
  onCancel 
}: PdfLoadingDialogProps) {
  if (!isOpen) return null

  const percentage = Math.round(progress)
  const currentIndex = Math.round((progress / 100) * totalFiles)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        minWidth: '400px',
        maxWidth: '600px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#333'
        }}>
          PDFs werden erstellt...
        </div>
        
        <div style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '24px'
        }}>
          {currentFile && (
            <div style={{ marginBottom: '8px' }}>
              Aktuelle Datei: <strong>{currentFile}</strong>
            </div>
          )}
          <div>
            {currentIndex} von {totalFiles} Dateien verarbeitet
          </div>
        </div>

        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
            background: 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)'
          }} />
        </div>

        <div style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '24px'
        }}>
          {percentage}% abgeschlossen
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#d32f2f'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f44336'
            }}
          >
            Abbrechen
          </button>
        )}

        <div style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#999',
          fontStyle: 'italic'
        }}>
          Bitte warten Sie, während die PDFs erstellt werden...
        </div>
      </div>
    </div>
  )
}
