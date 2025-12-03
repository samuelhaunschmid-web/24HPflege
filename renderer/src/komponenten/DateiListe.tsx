import type { DateiZuordnung } from '../logik/dateiVerwaltung/dateiSortierService'

type Props = {
  zuordnungen: DateiZuordnung[]
  isLoading: boolean
  ausgewaehlteDateien: Set<string>
  onToggleAuswahl: (dateiPfad: string) => void
}

/**
 * Komponente zur Anzeige der Dateien in einem Ordner mit Zuordnungsstatus
 */
export default function DateiListe({ zuordnungen, isLoading, ausgewaehlteDateien, onToggleAuswahl }: Props) {
  if (isLoading) {
    return (
      <div style={{
        padding: 16,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13
      }}>
        Analysiere Dateien...
      </div>
    )
  }

  if (zuordnungen.length === 0) {
    return (
      <div style={{
        padding: 16,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13
      }}>
        Keine Dateien in diesem Ordner
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '8px 16px 16px 16px'
    }}>
      {zuordnungen.map((z, index) => {
        const istAusgewaehlt = ausgewaehlteDateien.has(z.dateiPfad)
        const kannAusgewaehltWerden = z.istZugeordnet

        return (
          <div
            key={`${z.dateiPfad}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              background: z.istZugeordnet ? '#f0fdf4' : '#fef2f2',
              borderRadius: 8,
              border: z.konflikt ? '1px solid #fbbf24' : '1px solid transparent',
              opacity: kannAusgewaehltWerden && !istAusgewaehlt ? 0.6 : 1
            }}
          >
            {/* Checkbox (nur für zugeordnete Dateien) */}
            {kannAusgewaehltWerden ? (
              <input
                type="checkbox"
                checked={istAusgewaehlt}
                onChange={() => onToggleAuswahl(z.dateiPfad)}
                style={{
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  accentColor: '#0b4de0'
                }}
              />
            ) : (
              <span style={{ fontSize: 14 }}>
                {z.istZugeordnet ? (z.konflikt ? '⚠️' : '✅') : '❌'}
              </span>
            )}

            {/* Dateiname */}
            <span style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 500,
              color: '#1f2937',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {z.dateiName}
            </span>

            {/* Zuordnungs-Info */}
            {z.istZugeordnet ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {/* Person Type Icon */}
                <span style={{ fontSize: 12 }}>
                  {z.personType === 'kunden' ? '👤' : '🧑‍⚕️'}
                </span>

                {/* Person Name */}
                <span style={{
                  fontSize: 12,
                  color: '#166534',
                  fontWeight: 500
                }}>
                  {z.personName}
                </span>

                {/* Zielordner */}
                {z.zielOrdner.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    color: '#64748b',
                    background: '#f1f5f9',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    → {z.zielOrdner.join(' / ')}
                  </span>
                )}

                {/* Konflikt-Warnung */}
                {z.konflikt && z.neuerDateiName && (
                  <span style={{
                    fontSize: 11,
                    color: '#92400e',
                    background: '#fef3c7',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    wird zu: {z.neuerDateiName}
                  </span>
                )}
              </div>
            ) : (
              <span style={{
                fontSize: 12,
                color: '#991b1b',
                fontWeight: 500
              }}>
                Nicht zugeordnet
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

