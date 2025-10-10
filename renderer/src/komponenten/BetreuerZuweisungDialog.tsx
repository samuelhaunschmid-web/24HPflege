import React, { useEffect, useState } from 'react'

interface BetreuerZuweisungDialogProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (betreuer: any, anfangsdatum: string) => Promise<boolean>
  betreuerListe: any[]
  betreuerNummer: 1 | 2
  kundeName: string
}

export default function BetreuerZuweisungDialog({
  isOpen,
  onClose,
  onAssign,
  betreuerListe,
  betreuerNummer,
  kundeName
}: BetreuerZuweisungDialogProps) {
  const [selectedBetreuer, setSelectedBetreuer] = useState<any | null>(null)
  const [anfangsdatum, setAnfangsdatum] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBetreuer(null)
      setAnfangsdatum('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBetreuer || !anfangsdatum) return

    setIsLoading(true)
    try {
      const success = await onAssign(selectedBetreuer, anfangsdatum)
      if (success) {
        onClose()
      }
    } catch (error) {
      console.error('Fehler beim Zuweisen des Betreuers:', error)
      alert('Fehler beim Zuweisen des Betreuers')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    // Konvertiert DD.MM.YYYY zu YYYY-MM-DD für input[type="date"]
    const parts = dateStr.split('.')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
    return dateStr
  }

  const parseDate = (dateStr: string) => {
    // Konvertiert YYYY-MM-DD zu DD.MM.YYYY
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`
    }
    return dateStr
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827'
        }}>
          Betreuer {betreuerNummer} zuweisen
        </h3>
        
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Kunde: <strong>{kundeName}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Betreuer auswählen
            </label>
            <select
              value={selectedBetreuer?.__key || ''}
              onChange={(e) => {
                const betreuer = betreuerListe.find(b => b.__key === e.target.value)
                setSelectedBetreuer(betreuer || null)
              }}
              style={{
                width: '100%',
                maxWidth: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
              required
            >
              <option value="">Betreuer wählen...</option>
              {betreuerListe.map((betreuer) => (
                <option key={betreuer.__key} value={betreuer.__key}>
                  {betreuer.__display || `${betreuer.vorname || ''} ${betreuer.nachname || ''}`.trim()}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Anfangsdatum
            </label>
            <input
              type="date"
              value={anfangsdatum ? formatDate(anfangsdatum) : ''}
              onChange={(e) => setAnfangsdatum(parseDate(e.target.value))}
              style={{
                width: '100%',
                maxWidth: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedBetreuer || !anfangsdatum}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: (!selectedBetreuer || !anfangsdatum) ? 0.5 : 1
              }}
            >
              {isLoading ? 'Wird zugewiesen...' : 'Zuweisen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
