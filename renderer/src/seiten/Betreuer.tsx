import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../seite-shared/Layout'
import CountBadge from '../komponenten/CountBadge'
import TabelleDropdownZeilen from '../komponenten/TabelleDropdownZeilen'
import { useTableSettings } from '../komponenten/useTableSettings'
import TabellenEinstellungenDialog from '../komponenten/TabellenEinstellungenDialog'
import NeuerEintragDialog from '../komponenten/NeuerEintragDialog'

export default function Betreuer() {
  const [searchParams] = useSearchParams()
  const [betreuer, setBetreuer] = useState<any[]>([])
  const [kunden, setKunden] = useState<any[]>([])
  const [openBetreuerId, setOpenBetreuerId] = useState<string | null>(null)
  
  // Kunden-Gruppen-Konfiguration laden
  const kundenKeys = useMemo(()=> kunden.length ? Object.keys(kunden[0]) : [], [kunden])
  const { settings: kundenSettings } = useTableSettings('kunden', kundenKeys)

  useEffect(() => {
    ;(async () => {
      const lists = await window.docgen?.getLists?.()
      if (lists?.betreuer) setBetreuer(lists.betreuer)
      if (lists?.kunden) setKunden(lists.kunden)
    })()
  }, [])

  // Öffne das Dropdown für den Betreuer aus der URL
  useEffect(() => {
    const openName = searchParams.get('open')
    if (openName && betreuer.length > 0) {
      // Suche nach Betreuer mit dem entsprechenden Namen (__display)
      const foundBetreuer = betreuer.find(b => b.__display === openName)
      if (foundBetreuer) {
        setOpenBetreuerId(foundBetreuer.__key)
        // Entferne den URL-Parameter nach dem Öffnen
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('open')
        window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
      }
    }
  }, [searchParams, betreuer])

  const sorted = useMemo(() => {
    const list = [...betreuer]
    const keys = list.length ? Object.keys(list[0]) : []
    const vorCol = keys.find(k=> /vorname|vor\.?/i.test(k) || /Vor\.Nam/i.test(k))
    const nachCol = keys.find(k=> /nachname|familien|fam\.?\s?nam/i.test(k))
    return list.sort((a,b)=> {
      const av = vorCol ? String(a[vorCol]||'') : ''
      const an = nachCol ? String(a[nachCol]||'') : ''
      const bv = vorCol ? String(b[vorCol]||'') : ''
      const bn = nachCol ? String(b[nachCol]||'') : ''
      const aKey = (an || av || a.__display || '').toLowerCase() + ' ' + av.toLowerCase()
      const bKey = (bn || bv || b.__display || '').toLowerCase() + ' ' + bv.toLowerCase()
      return aKey.localeCompare(bKey)
    })
  }, [betreuer])
  const keys = useMemo(()=> sorted.length ? Object.keys(sorted[0]) : [], [sorted])
  const { settings, knownKeys, setDisplayName, toggleGruppe, isInGruppe } = useTableSettings('betreuer', keys)
  const wichtigeFelder = useMemo(()=> knownKeys.filter(k=> isInGruppe(k,'wichtig')), [knownKeys, isInGruppe])
  const displayNames = settings.displayNames
  const [dialogOffen, setDialogOffen] = useState(false)
  const [neuOffen, setNeuOffen] = useState(false)
  const [suche, setSuche] = useState('')

  const gefiltert = useMemo(() => {
    const term = suche.trim().toLowerCase()
    if (!term) return sorted
    const vorCol = knownKeys.find(k=> isInGruppe(k,'vorname'))
    const nachCol = knownKeys.find(k=> isInGruppe(k,'nachname'))
    return sorted.filter(r => {
      const vor = vorCol ? String(r[vorCol]||'') : ''
      const nach = nachCol ? String(r[nachCol]||'') : ''
      const a = `${nach} ${vor}`.trim().toLowerCase()
      const b = `${vor} ${nach}`.trim().toLowerCase()
      const disp = String(r.__display||'').toLowerCase()
      return a.includes(term) || b.includes(term) || disp.includes(term)
    })
  }, [sorted, suche, knownKeys, isInGruppe])

  return (
    <Layout>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Betreuer</h2>
        <CountBadge count={sorted.length} title="Gesamtanzahl Betreuer" />
      </div>

      <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input 
          value={suche}
          onChange={(e)=> setSuche(e.currentTarget.value)}
          placeholder="Suchen…"
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 10 }}
        />
        <button 
          title="Neu"
          onClick={()=> setNeuOffen(true)}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', lineHeight: 0 }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>+</span>
        </button>
        <button 
          title="Einstellungen"
          onClick={()=> setDialogOffen(true)}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', lineHeight: 0 }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>⚙︎</span>
        </button>
      </div>
      <TabelleDropdownZeilen
        daten={gefiltert}
        displayNames={displayNames}
        wichtigeFelder={wichtigeFelder}
        tableId="betreuer"
        gruppen={settings.gruppen}
        openRowId={openBetreuerId}
        kundenListe={kunden}
        kundenGruppen={kundenSettings.gruppen}
        vorhandeneVorwahlen={useMemo(()=> sorted.map(r=> {
          const telKey = knownKeys.find(k=> isInGruppe(k,'telefon'))
          if (!telKey) return ''
          const val = String(r[telKey]||'')
          const m = val.match(/^(\+?[\d]+)/)
          return m ? m[1] : ''
        }).filter(Boolean), [sorted, knownKeys, isInGruppe])}
        makeTitle={(row)=> {
          const vorCol = knownKeys.find(k=> isInGruppe(k,'vorname'))
          const nachCol = knownKeys.find(k=> isInGruppe(k,'nachname'))
          const vor = vorCol ? String(row[vorCol]||'') : ''
          const nach = nachCol ? String(row[nachCol]||'') : ''
          const full = `${nach} ${vor}`.trim()
          return full || row.__display || ''
        }}
        onChanged={async () => {
          const lists = await window.docgen?.getLists?.(); 
          if (lists?.betreuer) setBetreuer(lists.betreuer)
          if (lists?.kunden) setKunden(lists.kunden)
        }}
      />
      <TabellenEinstellungenDialog
        offen={dialogOffen}
        onClose={()=> setDialogOffen(false)}
        keys={knownKeys}
        displayNames={settings.displayNames}
        isInGruppe={isInGruppe}
        setDisplayName={setDisplayName}
        toggleGruppe={toggleGruppe}
      />
      <NeuerEintragDialog
        offen={neuOffen}
        onClose={()=> setNeuOffen(false)}
        keys={knownKeys}
        displayNames={displayNames}
        gruppen={settings.gruppen}
        betreuerListe={betreuer}
        vorhandeneVorwahlen={useMemo(()=> sorted.map(r=> {
          const telKey = knownKeys.find(k=> isInGruppe(k,'telefon'))
          if (!telKey) return ''
          const val = String(r[telKey]||'')
          const m = val.match(/^(\+?[\d]+)/)
          return m ? m[1] : ''
        }).filter(Boolean), [sorted, knownKeys, isInGruppe])}
        vorlagenWerte={useMemo(()=>{
          const res: Record<string,string[]> = {}
          knownKeys.forEach(k=>{
            if (isInGruppe(k,'vorlage')) {
              const vals = Array.from(new Set(sorted.map(r => String(r[k]||'')).filter(Boolean)))
              res[k] = vals
            }
          })
          return res
        }, [sorted, knownKeys, isInGruppe])}
        titel="Neuer Betreuer"
        onSpeichern={async (row)=>{
          await window.db?.betreuerAdd?.(row)
          const lists = await window.docgen?.getLists?.(); if (lists?.betreuer) setBetreuer(lists.betreuer)
          return true
        }}
      />
    </Layout>
  )
}


