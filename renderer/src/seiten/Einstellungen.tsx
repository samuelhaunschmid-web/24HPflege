import { useEffect, useState } from 'react'
import Layout from '../seite-shared/Layout'

export default function Einstellungen() {
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<number | null>(null)
  const [cfg, setCfg] = useState<any>({})
  const [libreOfficeStatus, setLibreOfficeStatus] = useState<string>('Prüfe...')
  const [libreOfficeInstalling, setLibreOfficeInstalling] = useState<boolean>(false)

  useEffect(() => {
    window.api?.onUpdateAvailable?.(() => setStatus('Update gefunden – Download startet...'))
    window.api?.onUpdateProgress?.((p: any) => {
      const percent = typeof p?.percent === 'number' ? Math.round(p.percent) : null
      setProgress(percent)
    })
    window.api?.onUpdateDownloaded?.(() => setStatus('Update geladen – Neustart zum Installieren.'))
    window.api?.onUpdateError?.((err) => setStatus('Fehler beim Update: ' + (err as any)))
    ;(async () => {
      const c = await window.api?.getConfig?.()
      if (c) setCfg(c)
      
      // LibreOffice Status prüfen
      const isInstalled = await window.api?.checkLibreOffice?.()
      setLibreOfficeStatus(isInstalled ? 'Installiert ✅' : 'Nicht installiert ❌')
    })()
  }, [])

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Einstellungen</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Updates</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => window.api?.checkForUpdates?.()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Nach Updates suchen</button>
              <button onClick={() => window.api?.quitAndInstall?.()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Jetzt installieren</button>
            </div>
            {status && <div style={{ marginTop: 8, color: '#334155' }}>{status}</div>}
            {progress != null && <div style={{ marginTop: 4 }}>Download: {progress}%</div>}
          </div>

          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>LibreOffice für PDF-Export</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ flex: 1 }}>Status: {libreOfficeStatus}</span>
              <button 
                disabled={libreOfficeInstalling || libreOfficeStatus.includes('Installiert')}
                onClick={async () => {
                  setLibreOfficeInstalling(true)
                  setLibreOfficeStatus('Installiere...')
                  try {
                    const success = await window.api?.installLibreOffice?.()
                    if (success) {
                      setLibreOfficeStatus('Installiert ✅')
                    } else {
                      setLibreOfficeStatus('Installation fehlgeschlagen ❌')
                    }
                  } catch (error) {
                    setLibreOfficeStatus('Fehler: ' + (error as any))
                  } finally {
                    setLibreOfficeInstalling(false)
                  }
                }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                {libreOfficeInstalling ? 'Installiere...' : 'LibreOffice installieren'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Ordner</label>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Daten-Ordner</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} value={cfg?.datenDir || ''} readOnly />
                  <button onClick={async () => {
                    const dir = await window.api?.chooseDirectory?.('Daten-Ordner wählen')
                    if (!dir) return
                    const next = await window.api?.setConfig?.({ datenDir: dir })
                    setCfg(next || {})
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Ordner wählen</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Alte-Ordner</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} value={cfg?.altDatenDir || ''} readOnly />
                  <button onClick={async () => {
                    const dir = await window.api?.chooseDirectory?.('Alte-Ordner wählen')
                    if (!dir) return
                    const next = await window.api?.setConfig?.({ altDatenDir: dir })
                    setCfg(next || {})
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Ordner wählen</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>Vorlagen-Ordner</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} value={cfg?.vorlagenDir || ''} readOnly />
                  <button onClick={async () => {
                    const dir = await window.api?.chooseDirectory?.('Vorlagen-Ordner wählen')
                    if (!dir) return
                    const next = await window.api?.setConfig?.({ vorlagenDir: dir })
                    setCfg(next || {})
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Ordner wählen</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>RechnungsVorlage-Ordner</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }} value={cfg?.rechnungsvorlageDir || ''} readOnly />
                  <button onClick={async () => {
                    const dir = await window.api?.chooseDirectory?.('RechnungsVorlage-Ordner wählen')
                    if (!dir) return
                    const next = await window.api?.setConfig?.({ rechnungsvorlageDir: dir })
                    setCfg(next || {})
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Ordner wählen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}


