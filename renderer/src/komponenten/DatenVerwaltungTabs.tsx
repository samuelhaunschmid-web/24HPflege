import { useTableSettings } from './useTableSettings'
import { useStandardOrdner } from '../logik/dateiVerwaltung/useStandardOrdner'
import { StandardTemplateService } from '../logik/dateiVerwaltung/standardTemplateService'
import DateiVerwaltungsPanel from './DateiVerwaltungsPanel'
import { useEffect, useState } from 'react'
import type { OrdnerTemplateRegel } from '../logik/dateiVerwaltung/typen'
import MessageModal from './MessageModal'

type Props = {
  personType: 'kunden' | 'betreuer'
  row: any
  allKeys: string[]
}

export default function DatenVerwaltungTabs({ personType, row, allKeys }: Props) {
  const { settings } = useTableSettings(personType, allKeys)
  const [templateRegeln, setTemplateRegeln] = useState<OrdnerTemplateRegel[]>([])
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Verwende den zentralen Hook für Ordner-Verwaltung
  const {
    ordnerStruktur,
    personDisplayName,
    fehlendeDateienAnzahl,
    isLoading,
    error,
    basisOrdnerVorhanden
  } = useStandardOrdner(personType, row, settings)

  // Lade Template-Regeln für die Standarddateien-Prüfung
  useEffect(() => {
    StandardTemplateService.ladeOrdnerTemplates(personType).then(setTemplateRegeln)
  }, [personType])

  function openFolderDialog() {
    void window.api?.openFolderDialog?.(personType)
  }

  // Handler zum Öffnen eines spezifischen Ordners im Explorer
  async function handleOrdnerKlick(ordnerPfad: string[]) {
    if (!ordnerStruktur?.exists || !ordnerStruktur.dir) return
    
    // Konstruiere den vollständigen Pfad zum Ordner
    let vollstaendigerOrdnerPfad = ordnerStruktur.dir
    
    // Füge Unterordner hinzu, falls vorhanden
    if (ordnerPfad.length > 0) {
      const normalisierterPfad = ordnerPfad.join('\\')
      vollstaendigerOrdnerPfad = `${ordnerStruktur.dir}\\${normalisierterPfad}`
    }
    
    // Ordner im Explorer öffnen
    try {
      const result = await window.api?.openFile?.(vollstaendigerOrdnerPfad)
      if (result && !result.ok) {
        setMessageModal({ isOpen: true, message: `Ordner konnte nicht geöffnet werden: ${result.message || 'Unbekannter Fehler'}`, type: 'error' })
      }
    } catch (err) {
      setMessageModal({ isOpen: true, message: `Fehler beim Öffnen des Ordners: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, type: 'error' })
    }
  }

  async function handleDateiKlick(dateiPfad: string) {
    // dateiPfad ist hier der relative Pfad (z.B. "DatenKunde/Test.pdf")
    // Wir brauchen den vollständigen Pfad
    if (!ordnerStruktur?.exists || !ordnerStruktur.dir) {
      console.error('Ordnerstruktur fehlt oder Ordner existiert nicht')
      return
    }
    
    // Normalisiere den Pfad für Windows (ersetze / mit \)
    const normalisierterRelativerPfad = dateiPfad.replace(/\//g, '\\')
    const vollstaendigerPfad = `${ordnerStruktur.dir}\\${normalisierterRelativerPfad}`
    
    // Datei öffnen - verwende shell.openPath über IPC
    try {
      const result = await window.api?.openFile?.(vollstaendigerPfad)
      if (result && !result.ok) {
        setMessageModal({ isOpen: true, message: `Datei konnte nicht geöffnet werden: ${result.message || 'Unbekannter Fehler'}`, type: 'error' })
      }
    } catch (err) {
      setMessageModal({ isOpen: true, message: `Fehler beim Öffnen der Datei: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, type: 'error' })
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {!basisOrdnerVorhanden && (
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Dokumente-Ordner nicht gesetzt
        </div>
      )}

      {basisOrdnerVorhanden && (
        <>
          <DateiVerwaltungsPanel
            personDisplayName={personDisplayName}
            ordnerStruktur={ordnerStruktur}
            fehlendeDateienAnzahl={fehlendeDateienAnzahl}
            isLoading={isLoading}
            templateRegeln={templateRegeln}
            personType={personType}
            row={row}
            tableSettings={settings}
            onOrdnerKlick={handleOrdnerKlick}
            onDateiKlick={handleDateiKlick}
            onHauptOrdnerKlick={openFolderDialog}
          />
        </>
      )}

      {error && (
        <div style={{ fontSize: 13, color: '#ef4444' }}>
          Fehler: {error}
        </div>
      )}
      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setMessageModal({ isOpen: false, message: '', type: 'info' })}
      />
    </div>
  )
}
