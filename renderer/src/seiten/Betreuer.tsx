import { useEffect, useMemo, useState } from 'react'
import Layout from '../seite-shared/Layout'
import TabelleDropdownZeilen from '../komponenten/TabelleDropdownZeilen'
import { useTableSettings } from '../komponenten/useTableSettings'
import TabellenEinstellungenDialog from '../komponenten/TabellenEinstellungenDialog'
import NeuerEintragDialog from '../komponenten/NeuerEintragDialog'

export default function Betreuer() {
  const [betreuer, setBetreuer] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const lists = await window.docgen?.getLists?.()
      if (lists?.betreuer) setBetreuer(lists.betreuer)
    })()
  }, [])

  const sorted = useMemo(() => [...betreuer].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [betreuer])
  const keys = useMemo(()=> sorted.length ? Object.keys(sorted[0]) : [], [sorted])
  const { settings, knownKeys, setDisplayName, toggleGruppe, isInGruppe } = useTableSettings('betreuer', keys)
  const wichtigeFelder = useMemo(()=> knownKeys.filter(k=> isInGruppe(k,'wichtig')), [knownKeys, isInGruppe])
  const displayNames = settings.displayNames
  const [dialogOffen, setDialogOffen] = useState(false)
  const [neuOffen, setNeuOffen] = useState(false)

  return (
    <Layout>
      <h2>Betreuer</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={()=> setNeuOffen(true)}>Neu</button>
        <button onClick={()=> setDialogOffen(true)}>Einstellungen</button>
      </div>
      <TabelleDropdownZeilen
        daten={sorted}
        displayNames={displayNames}
        wichtigeFelder={wichtigeFelder}
        tableId="betreuer"
        gruppen={settings.gruppen}
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
          const full = `${vor} ${nach}`.trim()
          return full || row.__display || ''
        }}
        onChanged={async () => {
          const lists = await window.docgen?.getLists?.(); if (lists?.betreuer) setBetreuer(lists.betreuer)
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


