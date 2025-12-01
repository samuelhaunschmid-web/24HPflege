import { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen'
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Speichere das aktuell fokussierte Element
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // Setze Fokus auf den Cancel-Button nach kurzer Verzögerung
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      // Stelle den Fokus wieder her, wenn die Modal geschlossen wird
      if (previousActiveElement.current) {
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
          onCancel()
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
            onCancel()
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
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
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
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
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

