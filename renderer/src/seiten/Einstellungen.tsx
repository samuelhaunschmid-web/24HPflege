import { useEffect, useState } from 'react'
import Layout from '../seite-shared/Layout'

export default function Einstellungen() {
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<number | null>(null)
  const [cfg, setCfg] = useState<any>({})

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
    })()
  }, [])

  return (
    <Layout>
      <h2>Einstellungen</h2>
      <div style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
        <button onClick={() => window.api?.checkForUpdates?.()}>Nach Updates suchen</button>
        {status && <div>{status}</div>}
        {progress != null && <div>Download: {progress}%</div>}
        <button onClick={() => window.api?.quitAndInstall?.()}>Jetzt installieren</button>
        <hr />
        <div>
          <label>Daten-Ordner:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={cfg?.datenDir || ''} readOnly />
            <button onClick={async () => {
              const dir = await window.api?.chooseDirectory?.('Daten-Ordner wählen')
              if (!dir) return
              const next = await window.api?.setConfig?.({ datenDir: dir })
              setCfg(next || {})
            }}>Ordner wählen</button>
          </div>
        </div>
        <div>
          <label>Alte-Ordner:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={cfg?.altDatenDir || ''} readOnly />
            <button onClick={async () => {
              const dir = await window.api?.chooseDirectory?.('Alte-Ordner wählen')
              if (!dir) return
              const next = await window.api?.setConfig?.({ altDatenDir: dir })
              setCfg(next || {})
            }}>Ordner wählen</button>
          </div>
        </div>
        <div>
          <label>Vorlagen-Ordner:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={cfg?.vorlagenDir || ''} readOnly />
            <button onClick={async () => {
              const dir = await window.api?.chooseDirectory?.('Vorlagen-Ordner wählen')
              if (!dir) return
              const next = await window.api?.setConfig?.({ vorlagenDir: dir })
              setCfg(next || {})
            }}>Ordner wählen</button>
          </div>
        </div>
        <div>
          <label>RechnungsVorlage-Ordner:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={cfg?.rechnungsvorlageDir || ''} readOnly />
            <button onClick={async () => {
              const dir = await window.api?.chooseDirectory?.('RechnungsVorlage-Ordner wählen')
              if (!dir) return
              const next = await window.api?.setConfig?.({ rechnungsvorlageDir: dir })
              setCfg(next || {})
            }}>Ordner wählen</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}


