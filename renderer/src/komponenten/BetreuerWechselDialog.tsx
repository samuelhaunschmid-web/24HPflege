import { useEffect, useMemo, useState } from 'react'
import { useTableSettings } from './useTableSettings'

type BetreuerWechselDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (payload: { position: 1 | 2; neuerBetreuer: any; wechselDatum: string }) => Promise<boolean>
  kundenName: string
  verfuegbarePositionen: Array<1 | 2>
  betreuerListe: any[]
  currentBetreuerNamen?: { 1?: string; 2?: string }
}

export default function BetreuerWechselDialog({ isOpen, onClose, onConfirm, kundenName, verfuegbarePositionen, betreuerListe, currentBetreuerNamen }: BetreuerWechselDialogProps) {
  const [position, setPosition] = useState<1 | 2>(1)
  const [neuerBetreuer, setNeuerBetreuer] = useState<any | null>(null)
  const [wechselDatum, setWechselDatum] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [betreuerSearch, setBetreuerSearch] = useState('')
  const [betreuerOpen, setBetreuerOpen] = useState(false)

  const betreuerKeys = useMemo(() => (betreuerListe.length ? Object.keys(betreuerListe[0]) : []), [betreuerListe])
  const { settings: betreuerSettings } = useTableSettings('betreuer', betreuerKeys)

  useEffect(() => {
    if (isOpen) {
      setPosition((verfuegbarePositionen && verfuegbarePositionen[0]) || 1)
      setNeuerBetreuer(null)
      setWechselDatum('')
      setBetreuerSearch('')
      setBetreuerOpen(false)
    }
  }, [isOpen, verfuegbarePositionen])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && betreuerOpen) {
        setBetreuerOpen(false)
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (betreuerOpen) {
        const target = e.target as HTMLElement
        const container = document.querySelector('[data-betreuer-combobox]') as HTMLElement
        if (container && !container.contains(target)) {
          setBetreuerOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [betreuerOpen])

  const sortedBetreuer = useMemo(() => {
    const bnKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    return [...(betreuerListe || [])].sort((a, b) => {
      if (!bnKey) return String(a.__display || '').localeCompare(String(b.__display || ''))
      const nachA = String(a[bnKey] || '').trim()
      const nachB = String(b[bnKey] || '').trim()
      return nachA.localeCompare(nachB)
    })
  }, [betreuerListe, betreuerKeys, betreuerSettings])

  const filteredBetreuer = useMemo(() => {
    if (!betreuerSearch.trim()) return sortedBetreuer
    const q = betreuerSearch.toLowerCase()
    const bvKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
    const bnKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    return sortedBetreuer.filter(b => {
      const vor = String(bvKey ? b[bvKey] || '' : '').trim().toLowerCase()
      const nach = String(bnKey ? b[bnKey] || '' : '').trim().toLowerCase()
      return `${nach} ${vor}`.includes(q) || vor.includes(q) || nach.includes(q) || String(b.__display || '').toLowerCase().includes(q)
    })
  }, [sortedBetreuer, betreuerSearch, betreuerKeys, betreuerSettings])

  function getBetreuerDisplay(b: any): string {
    const bvKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('vorname'))
    const bnKey = betreuerKeys.find(k => (betreuerSettings.gruppen[k] || []).includes('nachname'))
    const vor = String(bvKey ? b[bvKey] || '' : '').trim()
    const nach = String(bnKey ? b[bnKey] || '' : '').trim()
    return `${nach} ${vor}`.trim() || b.__display || ''
  }

  const formatDateToInput = (dateStr: string) => {
    const parts = String(dateStr || '').split('.')
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
    return dateStr
  }
  const parseDateFromInput = (dateStr: string) => {
    const parts = String(dateStr || '').split('-')
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
    return dateStr
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div style={{ width: 520, background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 10px 35px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>Betreuerwechsel – {kundenName}</strong>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 8 }}>
            <span>Zu wechselnde Position</span>
            <select value={position} onChange={e=> setPosition(Number(e.currentTarget.value) === 2 ? 2 : 1)}>
              {verfuegbarePositionen.map(p => {
                const name = (currentBetreuerNamen && currentBetreuerNamen[p]) ? String(currentBetreuerNamen[p]) : ''
                const label = name ? `Betreuer ${p} – ${name}` : `Betreuer ${p}`
                return (
                  <option key={p} value={p}>{label}</option>
                )
              })}
            </select>
          </label>
          <label style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 8 }}>
            <span>Neuer Betreuer</span>
            <div style={{ position: 'relative', zIndex: 1 }} data-betreuer-combobox>
              <input
                type="text"
                placeholder="Betreuer wählen..."
                value={neuerBetreuer ? getBetreuerDisplay(neuerBetreuer) : betreuerSearch}
                onChange={(e) => {
                  setBetreuerSearch(e.target.value)
                  setBetreuerOpen(true)
                  if (!e.target.value.trim()) setNeuerBetreuer(null)
                }}
                onFocus={() => setBetreuerOpen(true)}
                onClick={() => setBetreuerOpen(true)}
                onBlur={(e) => {
                  // Delay closing to allow click on dropdown item
                  setTimeout(() => {
                    if (!e.currentTarget.contains(document.activeElement)) {
                      setBetreuerOpen(false)
                    }
                }, 200)
                }}
                style={{ width: '95%', padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
              />
              {betreuerOpen && (
                <div 
                  style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 2000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  onMouseDown={(e) => {
                    // Prevent blur from closing dropdown
                    e.preventDefault()
                  }}
                >
                  <div style={{ display: 'grid', gap: 2, padding: 4 }}>
                    {filteredBetreuer.map(b => {
                      const display = getBetreuerDisplay(b)
                      const isSelected = neuerBetreuer && (neuerBetreuer.__key === b.__key || neuerBetreuer.__display === b.__display)
                      return (
                        <div
                          key={b.__key || b.__display}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setNeuerBetreuer(b)
                            setBetreuerSearch('')
                            setBetreuerOpen(false)
                          }}
                          style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', borderRadius: 4, background: isSelected ? '#e0f2fe' : 'transparent' }}
                        >
                          <span style={{ fontSize: 12 }}>{display}</span>
                        </div>
                      )
                    })}
                    {filteredBetreuer.length === 0 && (
                      <div style={{ padding: '8px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>Keine Betreuer gefunden</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </label>
          <label style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 8 }}>
            <span>Wechseldatum</span>
            <input type="date" value={formatDateToInput(wechselDatum)} onChange={e=> setWechselDatum(parseDateFromInput(e.currentTarget.value))} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#f7f7f7' }}>Abbrechen</button>
          <button disabled={!neuerBetreuer || !wechselDatum || isLoading} onClick={async ()=>{
            if (!neuerBetreuer || !wechselDatum) return
            setIsLoading(true)
            try {
              const ok = await onConfirm({ position, neuerBetreuer, wechselDatum })
              if (ok) onClose()
            } finally { setIsLoading(false) }
          }} style={{ padding: '6px 12px', border: 0, borderRadius: 6, background: '#005bd1', color: '#fff', fontWeight: 600 }}>{isLoading ? 'Speichern…' : 'Wechsel durchführen'}</button>
        </div>
      </div>
    </div>
  )
}


