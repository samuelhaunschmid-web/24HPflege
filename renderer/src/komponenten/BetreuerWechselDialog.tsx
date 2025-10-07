import React, { useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    if (isOpen) {
      setPosition((verfuegbarePositionen && verfuegbarePositionen[0]) || 1)
      setNeuerBetreuer(null)
      setWechselDatum('')
    }
  }, [isOpen, verfuegbarePositionen])

  const sortedBetreuer = useMemo(() => {
    return [...(betreuerListe || [])].sort((a,b)=> (String(a.__display||'').localeCompare(String(b.__display||''))))
  }, [betreuerListe])

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
            <select value={neuerBetreuer ? (neuerBetreuer.__key || neuerBetreuer.__display) : ''} onChange={e=> {
              const val = e.currentTarget.value
              const found = sortedBetreuer.find(b => (b.__key && String(b.__key)===val) || (b.__display && String(b.__display)===val))
              setNeuerBetreuer(found || null)
            }}>
              <option value="">– wählen –</option>
              {sortedBetreuer.map(b => (
                <option key={b.__key || b.__display} value={b.__key || b.__display}>{b.__display || ''}</option>
              ))}
            </select>
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


