import { useEffect, useMemo, useState } from 'react'

type Props = {
  offen: boolean
  onClose: () => void
  keys: string[]
  displayNames?: Record<string,string>
  titel?: string
  onSpeichern: (row: Record<string, any>) => Promise<boolean | void> | void
}

export default function NeuerEintragDialog({ offen, onClose, keys, displayNames = {}, titel = 'Neuer Eintrag', onSpeichern }: Props) {
  const felder = useMemo(()=> keys.filter(k=> !k.startsWith('__')), [keys])
  const [werte, setWerte] = useState<Record<string, any>>({})

  useEffect(() => { if (offen) setWerte({}) }, [offen])

  if (!offen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 800, maxWidth: '96vw', maxHeight: '92vh', background: '#fff', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #eee' }}>
          <strong>{titel}</strong>
          <button onClick={onClose}>Schließen</button>
        </div>
        <div style={{ padding: 12, overflow: 'auto', flex: '1 1 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 10, alignItems: 'center' }}>
            {felder.map(k => (
              <>
                <div key={`${k}-label`} style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayNames[k] || k}</div>
                <input key={`${k}-input`} value={werte[k] ?? ''} onChange={(e)=> setWerte(prev => ({ ...prev, [k]: e.currentTarget.value }))} />
              </>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #eee' }}>
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7' }}>Abbrechen</button>
            <button onClick={async ()=> { await onSpeichern(werte); onClose(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: '#005bd1', color: '#fff' }}>Speichern</button>
          </div>
        </div>
      </div>
    </div>
  )
}


