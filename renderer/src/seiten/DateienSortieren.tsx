import { useState } from 'react'
import Layout from '../seite-shared/Layout'
import { useDateiSortierung } from '../logik/dateiVerwaltung/useDateiSortierung'
import OrdnerListe from '../komponenten/OrdnerListe'
import DateiListe from '../komponenten/DateiListe'
import ConfirmModal from '../komponenten/ConfirmModal'
import MessageModal from '../komponenten/MessageModal'
import LoadingDialog from '../komponenten/LoadingDialog'

export default function DateienSortieren() {
  const {
    quellPfad,
    ordner,
    isLoading,
    error,
    baseDir,
    waehleQuellPfad,
    ladeOrdner,
    toggleOrdner,
    toggleDateiAuswahl,
    importiereDateien,
    oeffneOrdnerImExplorer
  } = useDateiSortierung()

  // Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    message: string
    ordnerIndex: number
    konfliktAnzahl: number
  }>({ isOpen: false, message: '', ordnerIndex: -1, konfliktAnzahl: 0 })

  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean
    message: string
  }>({ isOpen: false, message: '' })

  const [loadingDialog, setLoadingDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    progress: number
  }>({ isOpen: false, title: '', message: '', progress: 0 })

  // Import starten
  const handleImportiere = async (ordnerIndex: number) => {
    const ordnerItem = ordner[ordnerIndex]
    if (!ordnerItem) return

    // Nur ausgewählte und zugeordnete Dateien
    const zuImportieren = ordnerItem.zuordnungen.filter(z => 
      z.istZugeordnet && ordnerItem.ausgewaehlteDateien.has(z.dateiPfad)
    )
    const konflikte = zuImportieren.filter(z => z.konflikt)

    // Wenn Konflikte vorhanden, Warnung anzeigen
    if (konflikte.length > 0) {
      const konfliktListe = konflikte
        .map(k => `• "${k.dateiName}" wird zu "${k.neuerDateiName}"`)
        .join('\n')

      setConfirmModal({
        isOpen: true,
        message: `${konflikte.length} Datei(en) existieren bereits im Zielordner und werden umbenannt:\n\n${konfliktListe}\n\nMöchten Sie fortfahren?`,
        ordnerIndex,
        konfliktAnzahl: konflikte.length
      })
      return
    }

    // Direkt importieren wenn keine Konflikte
    await fuehreImportAus(ordnerIndex, zuImportieren.length)
  }

  // Import durchführen
  const fuehreImportAus = async (ordnerIndex: number, anzahl: number) => {
    setLoadingDialog({
      isOpen: true,
      title: 'Dateien werden importiert',
      message: 'Starte Import...',
      progress: 0
    })

    try {
      const result = await importiereDateien(ordnerIndex, (current, total, datei) => {
        setLoadingDialog(prev => ({
          ...prev,
          message: `${current}/${total}: ${datei}`,
          progress: Math.round((current / total) * 100)
        }))
      })

      setLoadingDialog({ isOpen: false, title: '', message: '', progress: 0 })

      // Ergebnis anzeigen
      let nachricht = `Import abgeschlossen:\n\n`
      nachricht += `✅ ${result.erfolgreich} Datei(en) erfolgreich importiert\n`
      if (result.umbenannt > 0) {
        nachricht += `⚠️ ${result.umbenannt} Datei(en) wurden umbenannt\n`
      }
      if (result.fehlgeschlagen > 0) {
        nachricht += `❌ ${result.fehlgeschlagen} Datei(en) fehlgeschlagen\n`
      }

      // Details bei Fehlern
      const fehler = result.details.filter(d => !d.ok)
      if (fehler.length > 0) {
        nachricht += '\nFehler:\n'
        fehler.forEach(f => {
          nachricht += `• ${f.dateiName}: ${f.message}\n`
        })
      }

      setMessageModal({ isOpen: true, message: nachricht })
    } catch (err) {
      setLoadingDialog({ isOpen: false, title: '', message: '', progress: 0 })
      setMessageModal({
        isOpen: true,
        message: `Fehler beim Import: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      })
    }
  }

  // Bestätigung für Import mit Konflikten
  const handleConfirmImport = async () => {
    const { ordnerIndex } = confirmModal
    setConfirmModal({ isOpen: false, message: '', ordnerIndex: -1, konfliktAnzahl: 0 })

    const ordnerItem = ordner[ordnerIndex]
    if (!ordnerItem) return

    const zuImportieren = ordnerItem.zuordnungen.filter(z => 
      z.istZugeordnet && ordnerItem.ausgewaehlteDateien.has(z.dateiPfad)
    )
    await fuehreImportAus(ordnerIndex, zuImportieren.length)
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>
              Dateien Sortieren
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14 }}>
              Importiere unterschriebene Dokumente automatisch in Kunden- und Betreuer-Ordner
            </p>
          </div>

          <button
            onClick={ladeOrdner}
            disabled={!quellPfad || isLoading}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: quellPfad && !isLoading ? 'pointer' : 'not-allowed',
              opacity: quellPfad && !isLoading ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            🔄 Aktualisieren
          </button>
        </div>

        {/* Quellpfad Konfiguration */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 6
              }}>
                Quellordner (Drive-Ordner mit unterschriebenen Dokumenten)
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <input
                  type="text"
                  value={quellPfad}
                  readOnly
                  placeholder="Kein Ordner ausgewählt"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    color: '#1f2937',
                    background: '#f9fafb'
                  }}
                />
                <button
                  onClick={waehleQuellPfad}
                  style={{
                    background: '#0b4de0',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Ordner wählen
                </button>
              </div>
            </div>
          </div>

          {/* Basis-Ordner Info */}
          {baseDir && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#f0fdf4',
              borderRadius: 6,
              fontSize: 12,
              color: '#166534'
            }}>
              <strong>Zielordner:</strong> {baseDir}
            </div>
          )}

          {!baseDir && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#fef2f2',
              borderRadius: 6,
              fontSize: 12,
              color: '#991b1b'
            }}>
              ⚠️ Bitte konfigurieren Sie zuerst den Dokumente-Ordner in den Einstellungen
            </div>
          )}
        </div>

        {/* Fehler-Anzeige */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            color: '#991b1b',
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: '#64748b'
          }}>
            Lade Ordner...
          </div>
        )}

        {/* Ordner-Liste */}
        {!isLoading && quellPfad && (
          <div>
            <h2 style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: 12
            }}>
              Ordner im Quellpfad
            </h2>

            <OrdnerListe
              ordner={ordner}
              onToggle={toggleOrdner}
              onOeffneImExplorer={oeffneOrdnerImExplorer}
              onImportiere={handleImportiere}
            />

            {/* Expandierte Ordner mit Dateilisten */}
            {ordner.map((o, index) => (
              o.isExpanded && !o.isLoading && (
                <div
                  key={`files-${o.path}`}
                  style={{
                    marginTop: -8,
                    marginBottom: 8,
                    background: '#ffffff',
                    borderRadius: '0 0 10px 10px',
                    border: '1px solid #e5e7eb',
                    borderTop: 'none'
                  }}
                >
                  <DateiListe
                    zuordnungen={o.zuordnungen}
                    isLoading={o.isLoading}
                    ausgewaehlteDateien={o.ausgewaehlteDateien}
                    onToggleAuswahl={(dateiPfad) => toggleDateiAuswahl(index, dateiPfad)}
                  />
                </div>
              )
            ))}
          </div>
        )}

        {/* Keine Quellpfad Info */}
        {!quellPfad && !isLoading && (
          <div style={{
            textAlign: 'center',
            padding: 60,
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: 18 }}>
              Kein Quellordner ausgewählt
            </h3>
            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: 14 }}>
              Wählen Sie den Ordner aus, in dem sich die unterschriebenen Dokumente befinden
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={handleConfirmImport}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', ordnerIndex: -1, konfliktAnzahl: 0 })}
        confirmText="Fortfahren"
        cancelText="Abbrechen"
        type="warning"
      />

      <MessageModal
        isOpen={messageModal.isOpen}
        message={messageModal.message}
        onClose={() => setMessageModal({ isOpen: false, message: '' })}
      />

      <LoadingDialog
        isOpen={loadingDialog.isOpen}
        title={loadingDialog.title}
        message={loadingDialog.message}
        progress={loadingDialog.progress}
        showProgress={true}
      />
    </Layout>
  )
}

