import type { QuellOrdner } from '../logik/dateiVerwaltung/useDateiSortierung'
import DateiListe from './DateiListe'

type Props = {
  ordner: QuellOrdner[]
  onToggle: (index: number) => void
  onOeffneImExplorer: (pfad: string) => void
  onImportiere: (index: number) => void
  onToggleDateiAuswahl: (ordnerIndex: number, dateiPfad: string) => void
}

/**
 * Komponente zur Anzeige der Ordner im Quellpfad
 */
export default function OrdnerListe({ ordner, onToggle, onOeffneImExplorer, onImportiere, onToggleDateiAuswahl }: Props) {
  if (ordner.length === 0) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 14
      }}>
        Keine Ordner gefunden
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ordner.map((o, index) => {
        const zugeordneteAnzahl = o.zuordnungen.filter(z => z.istZugeordnet).length
        const konfliktAnzahl = o.zuordnungen.filter(z => z.konflikt).length
        const ausgewaehlteAnzahl = o.zuordnungen.filter(z => 
          z.istZugeordnet && o.ausgewaehlteDateien.has(z.dateiPfad)
        ).length

        return (
          <div
            key={o.path}
            style={{
              background: '#ffffff',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            {/* Ordner-Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                cursor: 'pointer',
                background: o.isExpanded ? '#f8fafc' : 'transparent',
                borderBottom: o.isExpanded ? '1px solid #e5e7eb' : 'none'
              }}
              onClick={() => onToggle(index)}
            >
              {/* Expand Icon */}
              <span style={{
                fontSize: 12,
                color: '#64748b',
                transform: o.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}>
                ▶
              </span>

              {/* Ordner Icon */}
              <span style={{ fontSize: 18 }}>📁</span>

              {/* Ordner Name */}
              <span style={{
                flex: 1,
                fontWeight: 600,
                color: '#1f2937',
                fontSize: 14
              }}>
                {o.name}
              </span>

              {/* Datei-Anzahl Badge */}
              <span style={{
                background: '#e5e7eb',
                color: '#374151',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500
              }}>
                {o.fileCount} {o.fileCount === 1 ? 'Datei' : 'Dateien'}
              </span>

              {/* Zugeordnet Badge (nur wenn expandiert und Dateien geladen) */}
              {o.isExpanded && o.zuordnungen.length > 0 && (
                <span style={{
                  background: zugeordneteAnzahl > 0 ? '#dcfce7' : '#fef2f2',
                  color: zugeordneteAnzahl > 0 ? '#166534' : '#991b1b',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {zugeordneteAnzahl} zugeordnet
                </span>
              )}

              {/* Konflikt Badge */}
              {o.isExpanded && konfliktAnzahl > 0 && (
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {konfliktAnzahl} Konflikt{konfliktAnzahl > 1 ? 'e' : ''}
                </span>
              )}

              {/* Öffnen im Explorer Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOeffneImExplorer(o.path)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Im Explorer öffnen"
              >
                <span style={{ fontSize: 16 }}>📂</span>
              </button>

              {/* Import Button */}
              {o.isExpanded && ausgewaehlteAnzahl > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onImportiere(index)
                  }}
                  style={{
                    background: '#0b4de0',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>↓</span>
                  Importieren ({ausgewaehlteAnzahl})
                </button>
              )}
            </div>

            {/* Loading Indicator */}
            {o.isExpanded && o.isLoading && (
              <div style={{
                padding: 16,
                textAlign: 'center',
                color: '#64748b',
                fontSize: 13
              }}>
                Lade Dateien...
              </div>
            )}

            {/* Dateiliste (nur wenn expandiert und nicht loading) */}
            {o.isExpanded && !o.isLoading && o.zuordnungen.length > 0 && (
              <div style={{
                borderTop: '1px solid #e5e7eb'
              }}>
                <DateiListe
                  zuordnungen={o.zuordnungen}
                  isLoading={false}
                  ausgewaehlteDateien={o.ausgewaehlteDateien}
                  onToggleAuswahl={(dateiPfad) => onToggleDateiAuswahl(index, dateiPfad)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

