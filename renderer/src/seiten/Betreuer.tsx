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

  const sorted = useMemo(() => [...betreuer].sort((a,b)=> (a.__display||'').localeCompare(b.__display||'')), [betreuer])
  const keys = useMemo(()=> sorted.length ? Object.keys(sorted[0]) : [], [sorted])
  const { settings, knownKeys, setDisplayName, toggleGruppe, isInGruppe } = useTableSettings('betreuer', keys)
  const wichtigeFelder = useMemo(()=> knownKeys.filter(k=> isInGruppe(k,'wichtig')), [knownKeys, isInGruppe])
  const displayNames = settings.displayNames
  const [dialogOffen, setDialogOffen] = useState(false)
  const [neuOffen, setNeuOffen] = useState(false)

  return (
    <Layout>
      <CountBadge count={sorted.length} title="Gesamtanzahl Betreuer" />
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
          const full = `${vor} ${nach}`.trim()
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


