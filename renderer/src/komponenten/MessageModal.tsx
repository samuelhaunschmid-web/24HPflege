import { useEffect, useRef } from 'react'

interface MessageModalProps {
  isOpen: boolean
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export default function MessageModal({ isOpen, message, onClose }: MessageModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Speichere das aktuell fokussierte Element
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // Setze Fokus auf den Button nach kurzer Verzögerung
      const timer = setTimeout(() => {
        buttonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      // Stelle den Fokus wieder her, wenn die Modal geschlossen wird
      if (previousActiveElement.current) {
        // Warte kurz, damit die Modal vollständig entfernt ist
        const timer = setTimeout(() => {
          previousActiveElement.current?.focus()
          previousActiveElement.current = null
        }, 50)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 24,
          minWidth: 300,
          maxWidth: 500,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          outline: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose()
          }
        }}
        tabIndex={-1}
      >
        <div style={{ marginBottom: 16 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: '#1f2937',
              fontWeight: 400,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {message}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            ref={buttonRef}
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

