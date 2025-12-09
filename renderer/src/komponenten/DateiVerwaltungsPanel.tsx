import type { OrdnerStrukturMitFehlenden, OrdnerTemplateRegel } from '../logik/dateiVerwaltung/typen'
import { ersetzePlatzhalter } from '../logik/dateiVerwaltung/platzhalter'

/**
 * Hilfsfunktion: Erstellt Erwartungen für {betreuerkunde} Platzhalter
 * Gibt für jeden vorhandenen Betreuer (1 oder 2) eine erwartete Datei zurück
 */
function erstelleBetreuerkundeErwartungen(
  fileTemplate: string,
  personType: 'kunden' | 'betreuer',
  row: any,
  settings: any
): string[] {
  if (personType !== 'kunden') return []
  
  const erwartungen: string[] = []

  // Extrahiere Betreuer 1 und 2
  const b1Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer1'))
  const b2Key = Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('betreuer2'))

  const b1Full = b1Key ? String(row?.[b1Key] || '').trim() : ''
  const b2Full = b2Key ? String(row?.[b2Key] || '').trim() : ''

  const getNachname = (full: string) => {
    const parts = full.split(/\s+/).filter(Boolean)
    return parts.length > 0 ? parts[parts.length - 1] : ''
  }

  const nb1 = getNachname(b1Full)
  const nb2 = getNachname(b2Full)

  // Erstelle Erwartung für Betreuer 1, falls vorhanden
  if (nb1) {
    const tempBetreuerRow = { [Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) || '']: nb1 }
    const platzhalterKontext = { personType, row, settings, betreuerRow: tempBetreuerRow }
    const erwartung = ersetzePlatzhalter(fileTemplate, platzhalterKontext)
    erwartungen.push(erwartung)
  }

  // Erstelle Erwartung für Betreuer 2, falls vorhanden
  if (nb2) {
    const tempBetreuerRow = { [Object.keys(settings.gruppen).find(k => (settings.gruppen[k] || []).includes('nachname')) || '']: nb2 }
    const platzhalterKontext = { personType, row, settings, betreuerRow: tempBetreuerRow }
    const erwartung = ersetzePlatzhalter(fileTemplate, platzhalterKontext)
    erwartungen.push(erwartung)
  }

  return erwartungen
}

type DateiVerwaltungsPanelProps = {
  personDisplayName: string
  ordnerStruktur: OrdnerStrukturMitFehlenden | null
  fehlendeDateienAnzahl: number
  isLoading?: boolean
  templateRegeln: OrdnerTemplateRegel[]
  personType: 'kunden' | 'betreuer'
  row: any
  tableSettings: any
  onOrdnerKlick?: (ordnerPfad: string[]) => void
  onHauptOrdnerKlick?: () => void
  onDateiKlick?: (dateiPfad: string, dateiName: string) => void
}

/**
 * Zentrales Panel zur Anzeige der Ordnerstruktur und Standarddateien einer Person
 */
export default function DateiVerwaltungsPanel({
  personDisplayName,
  ordnerStruktur,
  fehlendeDateienAnzahl,
  isLoading = false,
  templateRegeln,
  personType,
  row,
  tableSettings,
  onOrdnerKlick,
  onHauptOrdnerKlick,
  onDateiKlick
}: DateiVerwaltungsPanelProps) {
  if (isLoading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
        Lade Ordnerstruktur...
      </div>
    )
  }

  if (!ordnerStruktur) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
        Keine Ordner-Daten gefunden für {personDisplayName}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6e8ef',
        borderRadius: 8,
        padding: 12,
        display: 'grid',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontWeight: 600, color: '#1f2937' }}>
            {personDisplayName} {ordnerStruktur.exists ? '' : '(Ordner fehlt)'}
          </div>
          {fehlendeDateienAnzahl > 0 && (
            <span style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 12,
              border: '1px solid #fecaca'
            }}>
              {fehlendeDateienAnzahl}
            </span>
          )}
          {onHauptOrdnerKlick && (
            <button
              title="Ordner-Management"
              onClick={onHauptOrdnerKlick}
              style={{
                border: '1px solid #d1d5db',
                background: '#fff',
                borderRadius: 8,
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#1f2937'
              }}
            >
              ⚙︎
            </button>
          )}
        </div>

        {!!ordnerStruktur.subfolders?.length && (
          <div style={{ display: 'grid', gap: 6 }}>
            {ordnerStruktur.subfolders.map(sf => (
              <OrdnerZeile
                key={sf.name}
                ordnerName={sf.name}
                dateien={sf.files || []}
                fehlendeDateien={ordnerStruktur.fehlendeDateien?.filter(f =>
                  f.folderPath === sf.name || f.folderPath.startsWith(`${sf.name} / `)
                ) || []}
                templateRegeln={templateRegeln}
                personType={personType}
                row={row}
                tableSettings={tableSettings}
                onOrdnerKlick={onOrdnerKlick ? (pfad) => onOrdnerKlick([sf.name, ...pfad]) : undefined}
                onDateiKlick={onDateiKlick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type OrdnerZeileProps = {
  ordnerName: string
  dateien: string[]
  fehlendeDateien: Array<{ file: string; folderPath: string }>
  templateRegeln: OrdnerTemplateRegel[]
  personType: 'kunden' | 'betreuer'
  row: any
  tableSettings: any
  onOrdnerKlick?: (unterPfad: string[]) => void
  onDateiKlick?: (dateiPfad: string, dateiName: string) => void
}

function OrdnerZeile({
  ordnerName,
  dateien,
  fehlendeDateien,
  templateRegeln,
  personType,
  row,
  tableSettings,
  onOrdnerKlick,
  onDateiKlick
}: OrdnerZeileProps) {
  const fehlendeImOrdner = fehlendeDateien.filter(f => f.folderPath === ordnerName)
  
  // Erstelle Set mit allen Standarddateien-Namen für diesen Ordner
  const standardDateienNamen = new Set<string>()
  const standardDateienBasisNamen = new Set<string>() // Für {dateityp} Platzhalter
  for (const regel of templateRegeln) {
    const folderName = regel.path[regel.path.length - 1]
    if (folderName === ordnerName) {
      for (const fileTemplate of regel.files) {
        // Prüfe, ob Template {betreuerkunde} enthält
        if (/\{betreuerkunde\}/i.test(fileTemplate) && personType === 'kunden') {
          // Erstelle Erwartungen für jeden vorhandenen Betreuer
          const betreuerErwartungen = erstelleBetreuerkundeErwartungen(fileTemplate, personType, row, tableSettings)
          betreuerErwartungen.forEach(erwartung => standardDateienNamen.add(erwartung))
        } else if (/\{dateityp\}/i.test(fileTemplate)) {
          // Für {dateityp}: Speichere Basisnamen (ohne Erweiterung)
          const expectedName = ersetzePlatzhalter(fileTemplate, {
            personType,
            row,
            settings: tableSettings
          })
          const baseName = expectedName.replace(/^\.+|\.+$/g, '').trim().replace(/\.[^.]+$/, '')
          if (baseName) {
            standardDateienBasisNamen.add(baseName)
          }
        } else {
          const expectedName = ersetzePlatzhalter(fileTemplate, {
            personType,
            row,
            settings: tableSettings
          })
          standardDateienNamen.add(expectedName)
        }
      }
    }
  }
  
  // Prüfe ob eine Datei eine Standarddatei ist
  const istStandardDatei = (dateiName: string) => {
    // Normale Prüfung
    if (standardDateienNamen.has(dateiName)) return true
    // Prüfe für {dateityp}: Basisname ohne Erweiterung
    const fileBaseName = dateiName.replace(/\.[^.]+$/, '')
    return standardDateienBasisNamen.has(fileBaseName)
  }

  return (
    <div style={{
      border: '1px dashed #e5e7eb',
      borderRadius: 6,
      padding: 8,
      position: 'relative'
    }}>
      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1 }}>{ordnerName}</span>
        {fehlendeImOrdner.length > 0 && (
          <span style={{
            marginLeft: 8,
            padding: '1px 6px',
            borderRadius: 999,
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: 11,
            border: '1px solid #fecaca'
          }}>
            {fehlendeImOrdner.length}
          </span>
        )}
        {onOrdnerKlick && (
          <button
            title="Ordner öffnen"
            onClick={() => onOrdnerKlick([])}
            style={{
              marginLeft: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: 11,
              color: '#1f2937'
            }}
          >
            📁
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 2, marginTop: 6 }}>
        {dateien.map((fn, idx) => {
          const isFehlend = fehlendeImOrdner.some(f => f.file === fn)
          const isStandard = istStandardDatei(fn)
          // Grau wenn nicht Standarddatei, rot wenn fehlend, dunkleres Grün wenn Standarddatei vorhanden
          const farbe = isFehlend ? '#991b1b' : (isStandard ? '#047857' : '#64748b')
          return (
            <div
              key={`${ordnerName}-${fn}-${idx}`}
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span
                onClick={onDateiKlick ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDateiKlick(`${ordnerName}/${fn}`, fn)
                } : undefined}
                style={{
                  color: farbe,
                  cursor: onDateiKlick ? 'pointer' : 'default'
                }}
              >
                {fn}
              </span>
              {onDateiKlick && (
                <span style={{ fontSize: 10, opacity: 0.7 }}>👁</span>
              )}
            </div>
          )
        })}

        {fehlendeImOrdner.map((f, idx) => (
          <div
            key={`fehlend-${ordnerName}-${f.file}-${idx}`}
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: '#991b1b',
              fontStyle: 'italic'
            }}
          >
            {f.file} (fehlt)
          </div>
        ))}

        {(!dateien.length && !fehlendeImOrdner.length) && (
          <div style={{ fontSize: 12, color: '#64748b' }}>–</div>
        )}
      </div>
    </div>
  )
}
