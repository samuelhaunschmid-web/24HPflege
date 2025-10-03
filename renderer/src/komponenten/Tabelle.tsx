type TabelleProps = {
  daten: Record<string, any>[]
  ausblenden?: string[]
  maxSpalten?: number
  displayNames?: Record<string, string>
  wichtigeFelder?: string[]
}

export default function Tabelle({ daten, ausblenden = ['__display'], maxSpalten, displayNames = {}, wichtigeFelder = [] }: TabelleProps) {
  if (!daten || daten.length === 0) return <div>Keine Daten vorhanden.</div>
  const alleKeys = Object.keys(daten[0]).filter(k => !ausblenden.includes(k))
  const keys = typeof maxSpalten === 'number' ? alleKeys.slice(0, maxSpalten) : alleKeys
  return (
    <div style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: 8 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fafafa' }}>{displayNames[k] || k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daten.map((row, i) => (
            <tr key={i}>
              {keys.map(k => {
                const value = row[k]
                const showEmpty = wichtigeFelder.includes(k)
                const text = value == null || value === '' ? (showEmpty ? '' : null) : String(value)
                if (text === null) return null
                return <td key={k} style={{ padding: '6px 8px', borderBottom: '1px solid #f3f3f3', whiteSpace: 'nowrap' }}>{text}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


