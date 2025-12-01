type DateiAktionenMenueProps = {
  dateiPfad: string
  dateiName: string
  ordnerPfad?: string[]
  onImExplorerOeffnen?: (pfad: string) => void
  onInMailUebernehmen?: (pfad: string, name: string) => void
  onVerschiebenNach?: (pfad: string, name: string) => void
  onImViewerOeffnen?: (pfad: string, name: string) => void
}

/**
 * Aktionsmenü für Dateien und Ordner
 */
export default function DateiAktionenMenue({
  dateiPfad,
  dateiName,
  ordnerPfad,
  onImExplorerOeffnen,
  onInMailUebernehmen,
  onVerschiebenNach,
  onImViewerOeffnen
}: DateiAktionenMenueProps) {
  const aktionen = [
    {
      label: 'Im Explorer öffnen',
      icon: '📁',
      handler: onImExplorerOeffnen,
      disabled: !onImExplorerOeffnen
    },
    {
      label: 'In E-Mail übernehmen',
      icon: '✉️',
      handler: onInMailUebernehmen,
      disabled: !onInMailUebernehmen
    },
    {
      label: 'Verschieben nach...',
      icon: '➡️',
      handler: onVerschiebenNach,
      disabled: !onVerschiebenNach
    },
    {
      label: 'Im Viewer öffnen',
      icon: '👁',
      handler: onImViewerOeffnen,
      disabled: !onImViewerOeffnen
    }
  ].filter(a => !a.disabled)

  if (!aktionen.length) {
    return null
  }

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: 8,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 1000,
      minWidth: 180,
      padding: '4px 0'
    }}>
      {aktionen.map((aktion, idx) => (
        <button
          key={idx}
          onClick={() => {
            if (aktion.handler === onImExplorerOeffnen) {
              onImExplorerOeffnen!(ordnerPfad ? ordnerPfad.join('/') : dateiPfad)
            } else if (aktion.handler === onInMailUebernehmen) {
              onInMailUebernehmen!(dateiPfad, dateiName)
            } else if (aktion.handler === onVerschiebenNach) {
              onVerschiebenNach!(dateiPfad, dateiName)
            } else if (aktion.handler === onImViewerOeffnen) {
              onImViewerOeffnen!(dateiPfad, dateiName)
            }
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#1f2937',
            borderRadius: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span>{aktion.icon}</span>
          <span>{aktion.label}</span>
        </button>
      ))}
    </div>
  )
}
