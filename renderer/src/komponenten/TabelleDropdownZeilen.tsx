import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SpaltenGruppe } from './useTableSettings'
import NeuerEintragDialog from './NeuerEintragDialog'
import BetreuerZuweisungDialog from './BetreuerZuweisungDialog'
import BetreuerWechselDialog from './BetreuerWechselDialog'
import SchemataVerwaltenDialog from './SchemataVerwaltenDialog'
import type { DateiSchema, SchemaContext } from './SchemataVerwaltenDialog'
import DatenVerwaltungTabs from './DatenVerwaltungTabs'
import { StandardOrdnerService } from '../logik/dateiVerwaltung/standardOrdnerService'
import ConfirmModal from './ConfirmModal'

type Props = {
  daten: Record<string, any>[]
  displayNames?: Record<string, string>
  wichtigeFelder?: string[]
  ausblenden?: string[]
  tableId?: 'kunden' | 'betreuer'
  onChanged?: () => void
  makeTitle?: (row: Record<string, any>, index: number) => string
  gruppen?: Record<string, SpaltenGruppe[]>
  vorhandeneVorwahlen?: string[]
  betreuerListe?: any[]
  kundenListe?: any[]
  kundenGruppen?: Record<string, SpaltenGruppe[]>
  openRowId?: string | null
  allPersons?: any[]
  verschiebeSchemata?: DateiSchema[]
  onSchemataChange?: (schemas: DateiSchema[]) => Promise<void> | void
  ordnerTemplates?: {
    kunden: Array<{ path: string[]; files: string[] }>
    betreuer: Array<{ path: string[]; files: string[] }>
  }
  dokumenteDir?: string
}

export default function TabelleDropdownZeilen({
  daten,
  displayNames = {},
  wichtigeFelder = [],
  ausblenden = ['__display','__key'],
  tableId,
  onChanged,
  makeTitle,
  gruppen = {},
  vorhandeneVorwahlen = [],
  betreuerListe = [],
  kundenListe = [],
  kundenGruppen = {},
  openRowId = null,
  allPersons = [],
  verschiebeSchemata = [],
  onSchemataChange,
  ordnerTemplates = { kunden: [], betreuer: [] },
  dokumenteDir = '',
}: Props) {
  const navigate = useNavigate()
  const [offenIndex, setOffenIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'stammdaten' | 'dateiverwaltung'>('stammdaten')
  const [bearbeitenOffen, setBearbeitenOffen] = useState(false)
  const [bearbeitenRow, setBearbeitenRow] = useState<Record<string, any> | null>(null)
  const [betreuerDialogOffen, setBetreuerDialogOffen] = useState(false)
  const [betreuerDialogRow, setBetreuerDialogRow] = useState<Record<string, any> | null>(null)
  const [betreuerDialogNummer, setBetreuerDialogNummer] = useState<1 | 2>(1)
  const [wechselDialogOffen, setWechselDialogOffen] = useState(false)
  const [wechselDialogRow, setWechselDialogRow] = useState<Record<string, any> | null>(null)
  const [schemaDialogOffen, setSchemaDialogOffen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; deleteKey?: string }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })
  const keys = useMemo(() => {
    if (!daten || daten.length === 0) return []
    return Object.keys(daten[0]).filter(k => !ausblenden.includes(k) && !k.startsWith('__'))
  }, [daten, ausblenden])

  const kundeVorKey = useMemo(() => keys.find(k => (gruppen?.[k] || []).includes('vorname')), [keys, gruppen])
  const kundeNachKey = useMemo(() => keys.find(k => (gruppen?.[k] || []).includes('nachname')), [keys, gruppen])
  const kundeBetreuer1Key = useMemo(() => keys.find(k => (gruppen?.[k] || []).includes('betreuer1')), [keys, gruppen])
  const kundeBetreuer2Key = useMemo(() => keys.find(k => (gruppen?.[k] || []).includes('betreuer2')), [keys, gruppen])
  const kundeNachnameKey = useMemo(() => keys.find(k => (gruppen?.[k] || []).includes('nachname')), [keys, gruppen])

  const hasData = !!(daten && daten.length > 0)

  // Öffne das Dropdown für die übergebene Row-ID
  useEffect(() => {
    if (openRowId && daten.length > 0) {
      const rowIndex = daten.findIndex(row => row.__key === openRowId)
      if (rowIndex !== -1) {
        setOffenIndex(rowIndex)
        // Scrolle zum geöffneten Dropdown nach einem kurzen Delay
        setTimeout(() => {
          const element = document.getElementById(`dropdown-${openRowId}`)
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          }
        }, 100)
      }
    }
  }, [openRowId, daten])

  // Scroll automatisch zum aktuell geöffneten Eintrag, wenn durch Klick geöffnet
  useEffect(() => {
    if (offenIndex == null || !daten || daten.length === 0) return
    const row = daten[offenIndex]
    const id = row && row.__key ? `dropdown-${row.__key}` : null
    if (!id) return
    // Leicht verzögert, um sicherzustellen, dass der Inhalt gerendert ist
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      }
    }, 50)
    return () => clearTimeout(t)
  }, [offenIndex, daten])

  function isFieldEmptyForRow(row: Record<string, any>, key: string): boolean {
    const value = row[key]
    if ((gruppen[key]||[]).includes('svnr')) {
      const digits = String(value ?? '').replace(/\D+/g,'')
      return digits.length !== 10
    }
    return value == null || value === ''
  }

  function isBetreuerFieldEmpty(row: Record<string, any>, betreuerNummer: 1 | 2): boolean {
    const betreuerKey = getBetreuerFieldKey(betreuerNummer)
    return !betreuerKey || isFieldEmptyForRow(row, betreuerKey)
  }

  function getBetreuerFieldKey(betreuerNummer: 1 | 2): string | undefined {
    // Verwende die Zuordnungen aus den TabellenEinstellungen
    const betreuerGruppe = `betreuer${betreuerNummer}` as SpaltenGruppe
    const fromSettings = keys.find(k => (gruppen[k] || []).includes(betreuerGruppe))
    if (fromSettings) return fromSettings

    // Fallback: Heuristik über Spaltennamen, falls Gruppen (noch) nicht gesetzt sind
    const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const candidates = keys.filter(k => !k.startsWith('__'))

    // Bevorzugt genaue Varianten wie "betreuer1", erlaubt aber auch "betreuer_1", "Betreuer 1" usw.
    const exact = candidates.find(k => normalized(k) === `betreuer${betreuerNummer}`)
    if (exact) return exact

    // Lockeres Matching: irgendein "betreuer" mit der passenden Nummer drin
    const loose = candidates.find(k => /betreuer/i.test(k) && new RegExp(`${betreuerNummer}(?!\d)`).test(k))
    if (loose) return loose

    return undefined
  }

  function getAnfangsFieldKey(betreuerNummer: 1 | 2): string | undefined {
    // Verwende die Zuordnungen aus den TabellenEinstellungen
    const anfangsGruppe = `betreuer${betreuerNummer}_anfang` as SpaltenGruppe
    const fromSettings = keys.find(k => (gruppen[k] || []).includes(anfangsGruppe))
    if (fromSettings) return fromSettings

    // Fallback: Heuristik über Spaltennamen
    const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const candidates = keys.filter(k => !k.startsWith('__'))

    // Häufige Begriffe: anfang, beginn, start
    const nameHasStart = (k: string) => /(anfang|beginn|start)/i.test(k)

    const exact = candidates.find(k => nameHasStart(k) && normalized(k).includes(`betreuer${betreuerNummer}`))
    if (exact) return exact

    const loose = candidates.find(k => nameHasStart(k) && new RegExp(`${betreuerNummer}(?!\d)`).test(k))
    if (loose) return loose

    return undefined
  }

  function getAltbetreuerFieldKey(): string | undefined {
    // 1) Konfiguration bevorzugen
    const cfgKey = keys.find(k => (gruppen[k] || []).includes('altbetreuer'))
    if (cfgKey) return cfgKey
    // 2) Heuristik als Fallback
    const k = keys.find(k => /alt\s*betreuer/i.test(k) || /^altbetreuer$/i.test(k))
    return k
  }


  function handleBetreuerClick(betreuerName: string) {
    // Navigiere zur Betreuer-Seite mit dem Betreuer-Namen als URL-Parameter
    navigate(`/betreuer?open=${encodeURIComponent(betreuerName)}`)
  }

  function handleKundeClick(kundeName: string) {
    // Navigiere zur Kunden-Seite mit dem Kunden-Namen als URL-Parameter
    navigate(`/kunden?open=${encodeURIComponent(kundeName)}`)
  }

  function getZugeordneteKunden(betreuerName: string) {
    if (!kundenListe || kundenListe.length === 0) return []
    
    const zugeordneteKunden: Array<{ kunde: any, position: 1 | 2 }> = []
    
    // Verwende die Kunden-Gruppen-Konfiguration
    const kundenKeys = kundenListe.length > 0 ? Object.keys(kundenListe[0]) : []
    const betreuer1Key = kundenKeys.find(k => (kundenGruppen[k] || []).includes('betreuer1'))
    const betreuer2Key = kundenKeys.find(k => (kundenGruppen[k] || []).includes('betreuer2'))
    
    kundenListe.forEach(kunde => {
      // Prüfe Betreuer 1
      if (betreuer1Key) {
        const betreuer1Name = String(kunde[betreuer1Key] || '').trim()
        if (betreuer1Name && betreuer1Name === betreuerName) {
          zugeordneteKunden.push({ kunde, position: 1 })
        }
      }
      
      // Prüfe Betreuer 2
      if (betreuer2Key) {
        const betreuer2Name = String(kunde[betreuer2Key] || '').trim()
        if (betreuer2Name && betreuer2Name === betreuerName) {
          zugeordneteKunden.push({ kunde, position: 2 })
        }
      }
    })
    
    return zugeordneteKunden
  }

  function getKundenNameParts(row: any) {
    const vor = String(kundeVorKey ? row?.[kundeVorKey] || '' : '').trim()
    const nach = String(kundeNachKey ? row?.[kundeNachKey] || '' : '').trim()
    const full = `${vor} ${nach}`.trim() || String(row?.__display || '')
    return { vor, nach, full }
  }

  function getBetreuerNameParts(row: any) {
    if (!row) return { vor: '', nach: '', full: '' }
    const rowKeys = Object.keys(row || {})
    const findKey = (regex: RegExp) => rowKeys.find(k => regex.test(k))
    const vorKey = findKey(/vor(?:\.|name)?/i)
    const nachKey = findKey(/nach|fam\.?\s?nam/i)
    let vor = String(vorKey ? row?.[vorKey] || '' : '').trim()
    let nach = String(nachKey ? row?.[nachKey] || '' : '').trim()
    let full = `${vor} ${nach}`.trim()
    if (!full) {
      full = String(row?.__display || row?.name || '').trim()
      if (full && (!vor || !nach)) {
        const parts = full.split(/\s+/).filter(Boolean)
        if (parts.length) {
          nach = parts.pop() || ''
          vor = parts.join(' ')
        }
      }
    }
    return { vor, nach, full }
  }

  function findBetreuerRowByName(name: string) {
    if (!name) return null
    const target = name.trim().toLowerCase()
    return (betreuerListe || []).find(b => {
      const parts = getBetreuerNameParts(b)
      if (parts.full.toLowerCase() === target) return true
      const display = String(b.__display || '').trim().toLowerCase()
      return display === target
    }) || null
  }

  function findKundenNachnameForBetreuer(betreuerName: string) {
    if (!betreuerName) return ''
    const list = allPersons && allPersons.length ? allPersons : daten
    const bet1Key = kundeBetreuer1Key
    const bet2Key = kundeBetreuer2Key
    const nachKey = kundeNachnameKey
    if (!bet1Key && !bet2Key) return ''
    for (const row of list || []) {
      const b1 = bet1Key ? String(row[bet1Key] || '').trim() : ''
      const b2 = bet2Key ? String(row[bet2Key] || '').trim() : ''
      if (b1 && b1.trim().toLowerCase() === betreuerName.trim().toLowerCase()) {
        return String(nachKey ? row[nachKey] || '' : '').trim()
      }
      if (b2 && b2.trim().toLowerCase() === betreuerName.trim().toLowerCase()) {
        return String(nachKey ? row[nachKey] || '' : '').trim()
      }
    }
    return ''
  }

  function replaceKundenPlaceholders(tpl: string, row: any, position?: 1 | 2) {
    const text = String(tpl || '')
    if (!text) return ''
    const { vor, nach } = getKundenNameParts(row || {})
    const getNachname = (full: string) => {
      const parts = String(full || '').split(/\s+/).filter(Boolean)
      return parts.length ? parts[parts.length - 1] : ''
    }
    const nb1 = getNachname(kundeBetreuer1Key ? row?.[kundeBetreuer1Key] : '')
    const nb2 = getNachname(kundeBetreuer2Key ? row?.[kundeBetreuer2Key] : '')
    
    // {betreuerkunde}: Verwende Nachname des ausgetauschten Betreuers basierend auf position
    let betreuerkunde = ''
    if (position === 1) {
      betreuerkunde = nb1
    } else if (position === 2) {
      betreuerkunde = nb2
    } else {
      // Fallback: Verwende Betreuer 1, falls vorhanden, sonst Betreuer 2
      betreuerkunde = nb1 || nb2
    }
    
    return text
      .replace(/\{vorname\}/gi, vor)
      .replace(/\{nachname\}/gi, nach)
      .replace(/\{kvname\}/gi, vor)
      .replace(/\{kfname\}/gi, nach)
      .replace(/\{nb1\}/gi, nb1)
      .replace(/\{nb2\}/gi, nb2)
      .replace(/\{betreuerkunde\}/gi, betreuerkunde)
      .replace(/\{dateityp\}/gi, '') // {dateityp} wird zu leerem String (für Wildcard-Suche)
  }

  function replaceBetreuerPlaceholders(tpl: string, row: any) {
    const text = String(tpl || '')
    if (!text) return ''
    const names = getBetreuerNameParts(row)
    const nk1 = findKundenNachnameForBetreuer(names.full)
    return text
      .replace(/\{vorname\}/gi, names.vor)
      .replace(/\{nachname\}/gi, names.nach)
      .replace(/\{bvname\}/gi, names.vor)
      .replace(/\{bfname\}/gi, names.nach)
      .replace(/\{nk1\}/gi, nk1)
      .replace(/\{dateityp\}/gi, '') // {dateityp} wird zu leerem String (für Wildcard-Suche)
  }

  type SchemaContextInfo = {
    kundeRow?: any
    alterBetreuerRow?: any
    neuerBetreuerRow?: any
    alterBetreuerName?: string
    neuerBetreuerName?: string
    position?: 1 | 2 // Position des ausgetauschten Betreuers (1 oder 2) für {betreuerkunde}
  }

type ResolvedContext = {
  personType: 'kunden' | 'betreuer'
  folderNames: string[]
  row: any
}

  function resolveContext(ctx: SchemaContext, info: SchemaContextInfo): ResolvedContext | null {
    if (ctx === 'kunde' && info.kundeRow) {
      const parts = getKundenNameParts(info.kundeRow)
      const combos = [
        `${parts.nach} ${parts.vor}`.trim(),
        `${parts.vor} ${parts.nach}`.trim(),
        parts.full,
      ].filter(Boolean)
      return { personType: 'kunden', folderNames: Array.from(new Set(combos)), row: info.kundeRow }
    }
    if (ctx === 'alterBetreuer') {
      const row = info.alterBetreuerRow || findBetreuerRowByName(info.alterBetreuerName || '') || { __display: info.alterBetreuerName || '' }
      if (!row.__display && !info.alterBetreuerName) return null
      const parts = getBetreuerNameParts(row)
      if (!parts.full) return null
      const combos = [
        `${parts.nach} ${parts.vor}`.trim(),
        `${parts.vor} ${parts.nach}`.trim(),
        parts.full,
      ].filter(Boolean)
      return { personType: 'betreuer', folderNames: Array.from(new Set(combos)), row }
    }
    if (ctx === 'neuerBetreuer') {
      const row = info.neuerBetreuerRow || { __display: info.neuerBetreuerName || '' }
      const parts = getBetreuerNameParts(row)
      if (!parts.full) return null
      const combos = [
        `${parts.nach} ${parts.vor}`.trim(),
        `${parts.vor} ${parts.nach}`.trim(),
        parts.full,
      ].filter(Boolean)
      return { personType: 'betreuer', folderNames: Array.from(new Set(combos)), row }
    }
    return null
  }

  function replacePlaceholdersForContext(ctx: SchemaContext, tpl: string, row: any, position?: 1 | 2) {
    if (ctx === 'kunde') return replaceKundenPlaceholders(tpl, row, position)
    return replaceBetreuerPlaceholders(tpl, row)
  }

  async function handleSchemaMoves(schemaId: string | null | undefined, info: SchemaContextInfo) {
    if (!schemaId || !dokumenteDir) return
    const schema = (verschiebeSchemata || []).find(s => s.id === schemaId)
    if (!schema || !schema.actions?.length) return
    const position = info.position // Position des ausgetauschten Betreuers (1 oder 2)
    
    // Lade Table-Settings für Platzhalter-Ersetzung
    const kundenSettings = await (async () => {
      const cfg = await window.api?.getConfig?.()
      return cfg?.tableSettings?.kunden || { gruppen: {} }
    })()
    const betreuerSettings = await (async () => {
      const cfg = await window.api?.getConfig?.()
      return cfg?.tableSettings?.betreuer || { gruppen: {} }
    })()
    
    for (const action of schema.actions) {
      const source = resolveContext(action.sourceContext, info)
      const target = resolveContext(action.targetContext, info)
      if (!source || !target) continue
      
      const fromPath = (action.fromPath || []).map(seg => replacePlaceholdersForContext(action.sourceContext, seg, source.row, position)).filter(Boolean)
      const toPath = (action.toPath || []).map(seg => replacePlaceholdersForContext(action.targetContext, seg, target.row, position)).filter(Boolean)
      
      // Für jede Datei im Schema
      for (const fileTemplate of action.fileName || []) {
        // Prüfe, ob Template {dateityp} oder {betreuerkunde} enthält
        const hatDateityp = /\{dateityp\}/i.test(fileTemplate)
        const hatBetreuerkunde = /\{betreuerkunde\}/i.test(fileTemplate)
        
        let actualFileName = fileTemplate
        let sourceBetreuerRow: any | undefined
        
        // Bestimme sourceBetreuerRow für {betreuerkunde}
        if (hatBetreuerkunde && action.sourceContext === 'kunde' && position) {
          if (position === 1 && info.alterBetreuerRow) {
            sourceBetreuerRow = info.alterBetreuerRow
          } else if (position === 2 && info.alterBetreuerRow) {
            sourceBetreuerRow = info.alterBetreuerRow
          }
        }
        
        // Wenn {dateityp} verwendet wird, muss die Datei zuerst gefunden werden
        if (hatDateityp) {
          const sourceSettings = source.personType === 'kunden' ? kundenSettings : betreuerSettings
          const sourceKontext = {
            baseDir: dokumenteDir,
            personType: source.personType,
            row: source.row,
            settings: sourceSettings
          }
          
          const gefundeneDatei = await StandardOrdnerService.findeStandardDatei(
            sourceKontext,
            fromPath,
            fileTemplate,
            sourceBetreuerRow
          )
          
          if (!gefundeneDatei.exists || !gefundeneDatei.path) {
            console.warn(`Datei mit {dateityp} nicht gefunden: ${fileTemplate}`)
            continue
          }
          
          // Extrahiere den tatsächlichen Dateinamen aus dem Pfad
          actualFileName = gefundeneDatei.path.split(/[/\\]/).pop() || fileTemplate
        } else {
          // Normale Platzhalter-Ersetzung
          actualFileName = replacePlaceholdersForContext(action.sourceContext, fileTemplate, source.row, position)
        }
        
        const sanitizedFileName = actualFileName.replace(/[\\/:*?"<>|]/g, '-').trim()
        if (!sanitizedFileName) continue
        
        const moveFn = window.api?.folders?.moveFile
        if (!moveFn) continue
        
        let moved = false
        let lastError: any = null
        for (const fromPersonName of source.folderNames) {
          const payload = {
            baseDir: dokumenteDir,
            fromPersonType: source.personType,
            fromPersonName,
            fromPath,
            fileName: sanitizedFileName, // Verwende den tatsächlich gefundenen Dateinamen
            toPersonType: target.personType,
            toPersonName: target.folderNames[0] || target.folderNames[target.folderNames.length - 1],
            toPath,
          }
          try {
            const res = await moveFn(payload)
            if (res?.ok) { moved = true; break }
            lastError = { payload, res }
          } catch (error) {
            lastError = { payload, error }
          }
        }
        if (!moved && lastError) {
          console.warn('Datei konnte nicht verschoben werden', lastError.payload || {}, lastError.res || lastError.error)
        }
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {!hasData && (
        <div>Keine Daten vorhanden.</div>
      )}
      {hasData && daten.map((row, i) => {
        const title = (makeTitle ? makeTitle(row, i) : null) || row.__display || `${i+1}. Eintrag`
        const istOffen = offenIndex === i
        const leereWichtigeAnzahl = keys.filter(k => wichtigeFelder.includes(k) && isFieldEmptyForRow(row, k)).length
        return (
          <div 
            key={i} 
            id={`dropdown-${row.__key}`}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: '100%' }}
          >
            <div style={{ width: '100%', padding: '10px 12px', background: '#f7f9fc', position: 'relative' }}>
              <div onClick={() => setOffenIndex(istOffen ? null : i)} style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none', paddingRight: 56, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1f2937', WebkitFontSmoothing: 'subpixel-antialiased', MozOsxFontSmoothing: 'auto', textRendering: 'optimizeLegibility' }}>{title}</div>
              
              {/* Betreuer-Anzeige in der Mitte für Kunden (auch wenn offen) */}
              {tableId === 'kunden' && (
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: '50%', 
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#1f2937'
                }}>
                  {(() => {
                    const betreuer1Key = getBetreuerFieldKey(1)
                    const betreuer2Key = getBetreuerFieldKey(2)
                    const betreuer1 = betreuer1Key ? String(row[betreuer1Key] || '') : ''
                    const betreuer2 = betreuer2Key ? String(row[betreuer2Key] || '') : ''
                    
                    if (!betreuer1 && !betreuer2) return null
                    
                    return (
                      <>
                        {betreuer1 && (
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '2px 6px',
                              background: '#e3f2fd',
                              borderRadius: '4px',
                              border: '1px solid #bbdefb',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBetreuerClick(betreuer1)
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#bbdefb'
                              e.currentTarget.style.transform = 'scale(1.02)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e3f2fd'
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                            title="Klicken um Betreuer zu öffnen"
                          >
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: '#3b82f6' 
                            }} />
                            <span style={{ 
                              color: '#1976d2',
                              fontWeight: '500'
                            }}>{betreuer1}</span>
                          </div>
                        )}
                        {betreuer2 && (
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '2px 6px',
                              background: '#e8f5e8',
                              borderRadius: '4px',
                              border: '1px solid #c8e6c9',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBetreuerClick(betreuer2)
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#c8e6c9'
                              e.currentTarget.style.transform = 'scale(1.02)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e8f5e8'
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                            title="Klicken um Betreuer zu öffnen"
                          >
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: '#10b981' 
                            }} />
                            <span style={{ 
                              color: '#2e7d32',
                              fontWeight: '500'
                            }}>{betreuer2}</span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Kunden-Anzeige in der Mitte für Betreuer (auch wenn offen) */}
              {tableId === 'betreuer' && (() => {
                const betreuerName = row.__display || ''
                const zugeordneteKunden = getZugeordneteKunden(betreuerName)
                
                if (zugeordneteKunden.length === 0) return null
                
                return (
                  <div style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    top: '50%', 
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {zugeordneteKunden.map(({ kunde, position }, index) => (
                      <div 
                        key={index}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 6px',
                          background: position === 1 ? '#e8f5e8' : '#fff3e0',
                          borderRadius: '4px',
                          border: position === 1 ? '1px solid #c8e6c9' : '1px solid #ffcc02',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleKundeClick(kunde.__display || '')
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = position === 1 ? '#c8e6c9' : '#ffcc02'
                          e.currentTarget.style.transform = 'scale(1.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = position === 1 ? '#e8f5e8' : '#fff3e0'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: position === 1 ? '#4caf50' : '#ff9800'
                        }} />
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{kunde.__display || ''}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>({position})</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
              <div style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {!istOffen && leereWichtigeAnzahl > 0 && (
                  <div title="Leere wichtige Felder" style={{ background: '#b00020', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{leereWichtigeAnzahl}</div>
                )}
                {!istOffen && tableId === 'kunden' && (
                  <>
                    {isBetreuerFieldEmpty(row, 1) && (
                      <button 
                        title="Betreuer 1 zuweisen" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setBetreuerDialogRow(row); 
                          setBetreuerDialogNummer(1); 
                          setBetreuerDialogOffen(true); 
                        }} 
                        style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          <path d="M16 8h2v2h-2zM18 6h-2v2h2z" fill="#1d4ed8"/>
                        </svg>
                      </button>
                    )}
                    {isBetreuerFieldEmpty(row, 2) && (
                      <button 
                        title="Betreuer 2 zuweisen" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setBetreuerDialogRow(row); 
                          setBetreuerDialogNummer(2); 
                          setBetreuerDialogOffen(true); 
                        }} 
                        style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          <path d="M16 8h2v2h-2zM18 6h-2v2h2z" fill="#059669"/>
                        </svg>
                      </button>
                    )}
                  </>
                )}
                {istOffen && (
                    <>
                      {tableId === 'kunden' && (
                        <button title="Betreuerwechsel" onClick={(e) => { e.stopPropagation(); setWechselDialogRow(row); setWechselDialogOffen(true) }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0b6ef7" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 .7-.15 1.36-.42 1.95l1.48 1.48C18.67 15.47 19 14.28 19 13c0-3.87-3.13-7-7-7zm-5 6c0-.7.15-1.36.42-1.95L5.94 8.57C5.33 9.53 5 10.72 5 12c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5z"/>
                          </svg>
                        </button>
                      )}
                      <button title="Bearbeiten" onClick={(e) => { e.stopPropagation(); setBearbeitenRow(row); setBearbeitenOffen(true) }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#333" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                      <button title="Löschen" onClick={(e) => {
                        e.stopPropagation()
                        if (!tableId) return
                        setConfirmModal({
                          isOpen: true,
                          message: 'Diesen Eintrag wirklich löschen?',
                          onConfirm: async () => {
                            setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
                            const __key = row.__key
                            // Falls eine Ende-Zuordnung existiert, setze Datum vor dem Archivieren
                            const endeKey = keys.find(k => (gruppen[k] || []).includes('ende'))
                            if (endeKey) {
                              const d = new Date()
                              const dd = String(d.getDate()).padStart(2,'0')
                              const mm = String(d.getMonth()+1).padStart(2,'0')
                              const yyyy = String(d.getFullYear())
                              const heute = `${dd}.${mm}.${yyyy}`
                              const updates: any = { [endeKey]: heute }
                              if (tableId === 'kunden') await window.db?.kundenUpdate?.({ __key, updates })
                              if (tableId === 'betreuer') await window.db?.betreuerUpdate?.({ __key, updates })
                            }
                            if (tableId === 'kunden') await window.db?.kundenDelete?.(__key)
                            if (tableId === 'betreuer') await window.db?.betreuerDelete?.(__key)
                            onChanged?.()
                          },
                          deleteKey: row.__key
                        })
                      }} style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#b00020" xmlns="http://www.w3.org/2000/svg"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z"/></svg>
                      </button>
                    </>
                )}
              </div>
            </div>
            {istOffen && (
              <div style={{ background: '#fff' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e6e8ef' }}>
                  <button
                    onClick={() => setActiveTab('stammdaten')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: activeTab === 'stammdaten' ? '#f3f4f6' : 'transparent',
                      borderBottom: activeTab === 'stammdaten' ? '2px solid #3b82f6' : 'none',
                      cursor: 'pointer',
                      fontWeight: activeTab === 'stammdaten' ? '600' : 'normal',
                      color: activeTab === 'stammdaten' ? '#1f2937' : '#6b7280'
                    }}
                  >
                    Stammdaten
                  </button>
                  <button
                    onClick={() => setActiveTab('dateiverwaltung')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: activeTab === 'dateiverwaltung' ? '#f3f4f6' : 'transparent',
                      borderBottom: activeTab === 'dateiverwaltung' ? '2px solid #3b82f6' : 'none',
                      cursor: 'pointer',
                      fontWeight: activeTab === 'dateiverwaltung' ? '600' : 'normal',
                      color: activeTab === 'dateiverwaltung' ? '#1f2937' : '#6b7280'
                    }}
                  >
                    Dateiverwaltung
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'stammdaten' && (
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: 8, overflow: 'hidden' }}>
                      {(() => {
                        const items = keys.map(k => {
                          const value = row[k]
                          const isEmpty = isFieldEmptyForRow(row, k)
                          const showEmpty = wichtigeFelder.includes(k)
                          const show = !isEmpty || showEmpty
                          const highlightEmpty = showEmpty && isEmpty
                          const highlightFilled = showEmpty && !isEmpty
                          return { k, value, isEmpty, showEmpty, show, highlightEmpty, highlightFilled }
                        }).filter(x => x.show)
                        // Wichtig & leer zuerst, dann wichtig & gefüllt
                        items.sort((a,b)=> {
                          if (a.highlightEmpty && !b.highlightEmpty) return -1
                          if (!a.highlightEmpty && b.highlightEmpty) return 1
                          if (a.highlightFilled && !b.highlightFilled) return -1
                          if (!a.highlightFilled && b.highlightFilled) return 1
                          return 0
                        })
                        return items.flatMap(({k, value, highlightEmpty, highlightFilled, isEmpty}) => {
                          const labelStyle = {
                            padding: '8px 10px',
                            borderRight: '1px solid #eee',
                            borderBottom: '1px solid #eee',
                            background: highlightEmpty ? '#fee2e2' : highlightFilled ? '#dcfce7' : '#fafafa',
                            color: highlightEmpty ? '#dc2626' : highlightFilled ? '#16a34a' : '#1f2937',
                            fontWeight: (highlightEmpty || highlightFilled) ? '600' : 'normal',
                            WebkitFontSmoothing: 'subpixel-antialiased',
                            MozOsxFontSmoothing: 'auto',
                            textRendering: 'optimizeLegibility'
                          } as React.CSSProperties
                          const valueStyle = {
                            padding: '6px 8px',
                            borderBottom: '1px solid #eee',
                            whiteSpace: 'pre-wrap',
                            background: highlightEmpty ? '#fee2e2' : highlightFilled ? '#dcfce7' : '#fff',
                            color: highlightEmpty ? '#dc2626' : highlightFilled ? '#16a34a' : '#1f2937',
                            fontWeight: highlightFilled ? '500' : 'normal',
                            WebkitFontSmoothing: 'subpixel-antialiased',
                            MozOsxFontSmoothing: 'auto',
                            textRendering: 'optimizeLegibility'
                          } as React.CSSProperties
                          let text = isEmpty ? '' : String(value)
                          // format display for datum / anfang / ende
                          if (((gruppen[k]||[]).includes('datum') || (gruppen[k]||[]).includes('anfang') || (gruppen[k]||[]).includes('ende')) && text) {
                            const digits = text.replace(/\D+/g,'')
                            if (digits.length === 8) text = `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4,8)}`
                          }
                          // Altbetreuer: mehrere mit ; getrennte Einträge untereinander darstellen
                          if (/^alt\s*betreuer$/i.test(k) || /altbetreuer/i.test(k)) {
                            if (text.includes(';')) {
                              text = text.split(';').map(s => s.trim()).filter(Boolean).join('\n')
                            }
                          }
                          // Für Betreuer-Felder klickbare Chips auch im ausgeklappten Zustand anzeigen
                          const isBetreuer1 = (gruppen[k]||[]).includes('betreuer1') || /^betreuer\s*1$/i.test(k)
                          const isBetreuer2 = (gruppen[k]||[]).includes('betreuer2') || /^betreuer\s*2$/i.test(k)
                          const label = displayNames[k] || k
                          const valueEl = (isBetreuer1 || isBetreuer2) && text ? (
                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                              <div
                                onClick={(e)=> { e.stopPropagation(); handleBetreuerClick(text) }}
                                title="Klicken um Betreuer zu öffnen"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  border: '1px solid #c8e6c9',
                                  background: isBetreuer1 ? '#e3f2fd' : '#e8f5e8',
                                  color: isBetreuer1 ? '#1976d2' : '#2e7d32',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isBetreuer1 ? '#3b82f6' : '#10b981' }} />
                                <span style={{ fontWeight: 500 }}>{text}</span>
                              </div>
                            </div>
                          ) : text
                          return [
                            <div key={`${i}-${k}-label`} style={labelStyle}>{label}</div>,
                            <div key={`${i}-${k}-value`} style={valueStyle}>{valueEl}</div>
                          ]
                        })
                      })()}
                    </div>
                  </div>
                )}

                {activeTab === 'dateiverwaltung' && (
                  <div style={{ padding: '10px 12px' }}>
                    <DatenVerwaltungTabs
                      personType={tableId === 'kunden' ? 'kunden' : 'betreuer'}
                      row={row}
                      allKeys={keys}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <NeuerEintragDialog
        offen={bearbeitenOffen}
        onClose={()=> { setBearbeitenOffen(false); setBearbeitenRow(null) }}
        keys={keys}
        displayNames={displayNames}
        titel="Eintrag bearbeiten"
        initialValues={bearbeitenRow || undefined}
        gruppen={gruppen}
        vorhandeneVorwahlen={vorhandeneVorwahlen}
        vorlagenWerte={useMemo(()=>{
          const res: Record<string,string[]> = {}
          keys.forEach(k=>{
            if ((gruppen[k]||[]).includes('vorlage')) {
              const vals = Array.from(new Set(daten.map(r => String(r[k]||'')).filter(Boolean)))
              res[k] = vals
            }
          })
          return res
        }, [daten, keys, gruppen])}
        onSpeichern={async (werte)=>{
          if (!tableId || !bearbeitenRow) return
          const __key = bearbeitenRow.__key
          const updates: any = {}
          keys.forEach(k => { if (!k.startsWith('__') && werte[k] !== undefined && werte[k] !== bearbeitenRow[k]) updates[k] = werte[k] })
          if (Object.keys(updates).length === 0) return
          if (tableId === 'kunden') await window.db?.kundenUpdate?.({ __key, updates })
          if (tableId === 'betreuer') await window.db?.betreuerUpdate?.({ __key, updates })
          onChanged?.()
          return true
        }}
      />
      
      <BetreuerZuweisungDialog
        isOpen={betreuerDialogOffen}
        onClose={() => {
          setBetreuerDialogOffen(false)
          setBetreuerDialogRow(null)
        }}
        onAssign={async (betreuer, anfangsdatum) => {
          if (!betreuerDialogRow || !tableId) return false
          
          const __key = betreuerDialogRow.__key
          const betreuerKey = getBetreuerFieldKey(betreuerDialogNummer)
          const anfangsKey = getAnfangsFieldKey(betreuerDialogNummer)
          
          if (!betreuerKey || !anfangsKey) {
            console.error('Betreuer- oder Anfangs-Feld nicht gefunden!')
            return false
          }
          
          // Verwende den vollständigen Namen aus __display (derselbe wie im Dropdown)
          const betreuerName = betreuer.__display || 'Unbekannter Betreuer'
          
          const updates: any = {}
          updates[betreuerKey] = betreuerName
          updates[anfangsKey] = anfangsdatum
          
          if (tableId === 'kunden') {
            await window.db?.kundenUpdate?.({ __key, updates })
          }
          
          onChanged?.()
          return true
        }}
        betreuerListe={betreuerListe}
        betreuerNummer={betreuerDialogNummer}
        kundeName={betreuerDialogRow ? (makeTitle ? makeTitle(betreuerDialogRow, 0) : betreuerDialogRow.__display || 'Unbekannt') : ''}
      />

      {/* Betreuerwechsel-Dialog nur für Kunden */}
      {tableId === 'kunden' && (
        <BetreuerWechselDialog
          isOpen={wechselDialogOffen}
          onClose={() => { setWechselDialogOffen(false); setWechselDialogRow(null) }}
          kundenName={wechselDialogRow ? (makeTitle ? makeTitle(wechselDialogRow, 0) : wechselDialogRow.__display || 'Unbekannt') : ''}
          verfuegbarePositionen={(() => {
            const pos: Array<1|2> = []
            if (getBetreuerFieldKey(1)) pos.push(1)
            if (getBetreuerFieldKey(2)) pos.push(2)
            return pos.length ? pos : [1,2]
          })()}
          betreuerListe={betreuerListe}
          currentBetreuerNamen={{
            1: (() => { const k = getBetreuerFieldKey(1); return k && wechselDialogRow ? String(wechselDialogRow[k] || '') : '' })(),
            2: (() => { const k = getBetreuerFieldKey(2); return k && wechselDialogRow ? String(wechselDialogRow[k] || '') : '' })(),
          }}
          onConfirm={async ({ position, neuerBetreuer, wechselDatum, schemaId }) => {
            if (!wechselDialogRow) return false
            const __key = wechselDialogRow.__key
            const betreuerKey = getBetreuerFieldKey(position)
            const anfangsKey = getAnfangsFieldKey(position)
            const altKey = getAltbetreuerFieldKey() || 'Altbetreuer'
            if (!betreuerKey || !anfangsKey) {
              console.error('Betreuer-/Anfangs-Felder nicht gefunden')
              return false
            }
            const updates: any = {}
            const alterBetreuerName = String(wechselDialogRow[betreuerKey] || '').trim()
            const anfangsDatumAlt = String(wechselDialogRow[anfangsKey] || '').trim()
            if (alterBetreuerName) {
              const altSegment = anfangsDatumAlt ? `${alterBetreuerName} (${anfangsDatumAlt}-${wechselDatum})` : `${alterBetreuerName} (${wechselDatum})`
              const bisherAlt = String(wechselDialogRow[altKey] || '').trim()
              updates[altKey] = bisherAlt ? `${bisherAlt}; ${altSegment}` : altSegment
            }
            const neuerName = neuerBetreuer.__display || ''
            updates[betreuerKey] = neuerName
            updates[anfangsKey] = wechselDatum
            await window.db?.kundenUpdate?.({ __key, updates })
            if (schemaId) {
              await handleSchemaMoves(schemaId, {
                kundeRow: wechselDialogRow,
                alterBetreuerRow: findBetreuerRowByName(alterBetreuerName),
                alterBetreuerName,
                neuerBetreuerRow: neuerBetreuer,
                neuerBetreuerName: neuerName,
                position, // Position des ausgetauschten Betreuers (1 oder 2)
              })
            }
            onChanged?.()
            return true
          }}
          verschiebeSchemata={verschiebeSchemata}
          onManageSchemata={() => setSchemaDialogOffen(true)}
        />
      )}
      {schemaDialogOffen && (
        <SchemataVerwaltenDialog
          offen={schemaDialogOffen}
          onClose={() => setSchemaDialogOffen(false)}
          initialSchemas={verschiebeSchemata}
          onSave={async (schemas) => {
            await onSchemataChange?.(schemas)
          }}
          ordnerTemplates={ordnerTemplates}
        />
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
        type="danger"
        confirmText="Löschen"
        cancelText="Abbrechen"
      />
    </div>
  )
}


