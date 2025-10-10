import { useMemo, useState } from 'react'

type Props = {
  daten: any[]
  ausblenden?: string[]
  makeTitle?: (row: any, index: number) => string
  rechtsAktionen?: (row: any) => React.ReactNode
}

export default function ArchivDropdownZeilen({ daten, ausblenden = ['__display','__key'], makeTitle, rechtsAktionen }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const hasData = Array.isArray(daten) && daten.length > 0
  const firstKeys = useMemo(()=> hasData ? Object.keys(daten[0]) : [], [hasData, daten])
  const sichtbareKeys = useMemo(()=> firstKeys.filter(k => !ausblenden.includes(k)), [firstKeys, ausblenden])

  if (!hasData) return null

  return (
    <div>
      {daten.map((row, i) => {
        const title = makeTitle ? makeTitle(row, i) : (row.__display || row.__key || `Eintrag ${i+1}`)
        const isOpen = openId === row.__key
        return (
          <div key={row.__key || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <button onClick={()=> setOpenId(isOpen ? null : (row.__key || String(i)))} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ fontWeight: 600 }}>{title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {typeof rechtsAktionen === 'function' ? rechtsAktionen(row) : null}
                <span style={{ color: '#64748b' }}>{isOpen ? '▾' : '▸'}</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: '0 14px 12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 8 }}>
                  {sichtbareKeys.map(key => {
                    let text = String(row[key] ?? '')
                    // Datum formatieren (inkl. Ende)
                    if (/ende/i.test(key) || /datum/i.test(key)) {
                      const digits = text.replace(/\D+/g,'')
                      if (digits.length === 8) text = `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4,8)}`
                    }
                    return (
                      <>
                        <div style={{ color: '#64748b' }}>{key}</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
                      </>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


