import { useEffect, useState } from 'react'
import Layout from '../seite-shared/Layout'

export default function Einstellungen() {
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<number | null>(null)
  const [cfg, setCfg] = useState<any>({})
  const [mailMsg, setMailMsg] = useState<string>('')
  const [testTo, setTestTo] = useState<string>('')
  const [libreOfficeStatus, setLibreOfficeStatus] = useState<string>('Prüfe...')
  const [libreOfficeInstalling, setLibreOfficeInstalling] = useState<boolean>(false)
  const [brewAvailable, setBrewAvailable] = useState<boolean | null>(null)
  const [chocoAvailable, setChocoAvailable] = useState<boolean | null>(null)
  const [platform, setPlatform] = useState<string>('')
  const [installDetails, setInstallDetails] = useState<{ brewPath?: string | null; message?: string; uninstall?: { code?: number; stdout?: string; stderr?: string }; install?: { code?: number; stdout?: string; stderr?: string } } | null>(null)
  const [mailLogs, setMailLogs] = useState<any[]>([])
  const [mailLogsOpen, setMailLogsOpen] = useState<boolean>(false)

  const formatLogTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`
  }

  useEffect(() => {
    window.api?.onUpdateAvailable?.(() => setStatus('Update gefunden – Download startet...'))
    window.api?.onUpdateProgress?.((p: any) => {
      const percent = typeof p?.percent === 'number' ? Math.round(p.percent) : null
      setProgress(percent)
    })
    window.api?.onUpdateDownloaded?.(() => setStatus('Update geladen – Neustart zum Installieren.'))
    window.api?.onUpdateError?.((err) => setStatus('Fehler beim Update: ' + (err as any)))
    ;(async () => {
      const pf = await window.api?.getPlatform?.()
      if (pf) setPlatform(pf)
      const c = await window.api?.getConfig?.()
      if (c) setCfg(c)
      if (c?.fromAddress) setTestTo(c.fromAddress)
      
      // LibreOffice Status prüfen
      const isInstalled = await window.api?.checkLibreOffice?.()
      setLibreOfficeStatus(isInstalled ? 'Installiert ✅' : 'Nicht installiert ❌')

      // Paketmanager prüfen
      if (pf === 'darwin') {
        const hasBrew = await window.api?.checkHomebrew?.()
        setBrewAvailable(!!hasBrew)
      } else if (pf === 'win32') {
        const hasChoco = await window.api?.checkChocolatey?.()
        setChocoAvailable(!!hasChoco)
      }
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
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>E-Mail</label>
            <div style={{ display: 'grid', gap: 10 }}>
              
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '14px' }}>Absender-Name</label>
                <input
                  style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                  value={cfg?.fromName || ''}
                  onChange={async (e)=> {
                    const next = await window.api?.setConfig?.({ fromName: e.currentTarget.value })
                    setCfg(next || {})
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '14px' }}>Absender-Adresse</label>
                <input
                  style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                  value={cfg?.fromAddress || ''}
                  readOnly={!!cfg?.googleOAuthTokens}
                  title={cfg?.googleOAuthTokens ? 'Mit Google verbunden – Absender-Adresse wird vom Konto verwendet' : undefined}
                  onChange={async (e)=> {
                    if (cfg?.googleOAuthTokens) return
                    const next = await window.api?.setConfig?.({ fromAddress: e.currentTarget.value })
                    setCfg(next || {})
                  }}
                />
              </div>
              {!cfg?.googleOAuthTokens && (
                <>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: '14px' }}>Google Client ID</label>
                    <input
                      style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                      value={cfg?.googleClientId || ''}
                      onChange={async (e)=> {
                        const next = await window.api?.setConfig?.({ googleClientId: e.currentTarget.value })
                        setCfg(next || {})
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: '14px' }}>Google Client Secret</label>
                    <input
                      style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                      value={cfg?.googleClientSecret || ''}
                      onChange={async (e)=> {
                        const next = await window.api?.setConfig?.({ googleClientSecret: e.currentTarget.value })
                        setCfg(next || {})
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: '14px' }}>Google Refresh Token</label>
                    <input
                      style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                      value={cfg?.googleRefreshToken || ''}
                      onChange={async (e)=> {
                        const refresh = e.currentTarget.value
                        const next = await window.api?.setConfig?.({ 
                          googleRefreshToken: refresh,
                          googleOAuthTokens: refresh ? { refresh_token: refresh } : null
                        })
                        setCfg(next || {})
                      }}
                    />
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Tipp: Über den Google OAuth Playground kann ein Refresh Token erstellt werden.
                    </div>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {!cfg?.googleOAuthTokens && (
                  <button onClick={async ()=> {
                    setMailMsg('Verbinde mit Google...')
                    const res = await (window as any).api?.mail?.googleStartAuth?.()
                    setMailMsg(res?.ok ? 'OAuth Playground geöffnet. Bitte Token übertragen.' : ('Fehler: ' + (res?.message || '')))
                    if (res?.ok) {
                      const next = await window.api?.getConfig?.(); setCfg(next||{})
                    }
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>Mit Google verbinden</button>
                )}
                {!!cfg?.googleOAuthTokens && (
                  <button onClick={async ()=> {
                    const res = await (window as any).api?.mail?.googleDisconnect?.()
                    setMailMsg(res?.ok ? 'Verbindung getrennt' : 'Trennen fehlgeschlagen')
                    const next = await window.api?.getConfig?.(); setCfg(next||{})
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Google trennen</button>
                )}
                <span style={{ color: '#334155' }}>{mailMsg}</span>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '14px' }}>Testversand an</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                    value={testTo}
                    onChange={(e)=> setTestTo(e.currentTarget.value)}
                    placeholder="empfaenger@example.com"
                  />
                  <button onClick={async ()=> {
                    setMailMsg('Sende Testmail...')
                    const res = await (window as any).api?.mail?.send?.({
                      to: testTo,
                      subject: 'Test – 24HPflege',
                      text: 'Dies ist eine Test-E-Mail aus der App.',
                      fromName: cfg?.fromName || '',
                      fromAddress: cfg?.fromAddress || ''
                    })
                    setMailMsg(res?.ok ? 'Testmail gesendet ✅' : ('Fehler: ' + (res?.message || 'Unbekannt')))
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Senden</button>
                </div>
              </div>
              {!cfg?.googleOAuthTokens && (
                <>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: '14px' }}>Token aus OAuth Playground einfügen (JSON)</label>
                    <textarea
                      placeholder='{"access_token":"...","refresh_token":"...","expiry_date":1234567890}'
                      rows={3}
                      onBlur={async (e)=> {
                        const val = e.currentTarget.value
                        if (!val) return
                        try {
                          const tokens = JSON.parse(val)
                          const r = await (window as any).api?.mail?.googleStoreTokens?.(tokens)
                          if (r?.ok) {
                            setMailMsg('Token gespeichert ✅')
                            const next = await window.api?.getConfig?.(); setCfg(next||{})
                          } else {
                            setMailMsg('Token speichern fehlgeschlagen')
                          }
                        } catch (err) {
                          setMailMsg('Ungültiges Token-JSON')
                        }
                      }}
                      style={{ width: '95%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    Hinweis: Für Google Workspace ist die Verbindung via OAuth empfohlen. SPF/DKIM/DMARC verbessern die Zustellbarkeit.
                  </div>
                </>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <label style={{ fontWeight: 700 }}>E-Mail Verlauf</label>
                  <button onClick={async ()=> {
                    const logs = await (window as any).api?.mail?.logs?.()
                    setMailLogs(Array.isArray(logs) ? logs : [])
                    setMailLogsOpen(v => !v)
                  }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>{mailLogsOpen ? 'Ausblenden' : 'Anzeigen'}</button>
                  <button onClick={async ()=> {
                    const logs = await (window as any).api?.mail?.logs?.()
                    setMailLogs(Array.isArray(logs) ? logs : [])
                  }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Aktualisieren</button>
                  {/* Entfernt: "Alle löschen" Button */}
                </div>
                {mailLogsOpen && (
                  <>
                    {!!mailLogs.length && (
                      <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, maxHeight: 220, overflow: 'auto', background: '#f8fafc' }}>
                        {mailLogs.map((l, idx)=> (
                          <div key={idx} style={{ fontSize: 12, color: l?.ok ? '#065f46' : '#7f1d1d', borderBottom: '1px dashed #e5e7eb', padding: '6px 0', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 8 }}>
                            <div>
                              <div><strong title={l?.time || ''}>{formatLogTime(l?.time)}</strong> {l?.ok ? 'OK' : 'FEHLER'}</div>
                              {l?.to && <div>an: {l.to}</div>}
                              {l?.subject && <div>betreff: {l.subject}</div>}
                              {l?.error && <div>fehlermeldung: {l.error}</div>}
                              {l?.id && <div>messageId: {l.id}</div>}
                            </div>
                            <div>
                              <button onClick={async ()=> {
                                if (!l?.time) return
                                const r = await (window as any).api?.mail?.deleteLog?.(l.time)
                                if (r?.ok) setMailLogs(prev => prev.filter(x => x?.time !== l.time))
                              }} style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #ef4444', background: '#fff', color: '#b91c1c', cursor: 'pointer' }}>Löschen</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!mailLogs.length && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Noch keine Einträge</div>
                    )}
                  </>
                )}
              </div>
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
                disabled={libreOfficeInstalling || libreOfficeStatus.includes('Installiert') || (platform === 'darwin' && brewAvailable === false)}
                onClick={async () => {
                  setInstallDetails(null)
                  setLibreOfficeInstalling(true)
                  setLibreOfficeStatus('Installiere...')
                  try {
                    const res = await window.api?.installLibreOffice?.()
                    if (res && res.ok) {
                      setLibreOfficeStatus('Installiert ✅')
                    } else {
                      setLibreOfficeStatus('Installation fehlgeschlagen ❌')
                      setInstallDetails(res || null)
                    }
                  } catch (error) {
                    setLibreOfficeStatus('Fehler: ' + (error as any))
                  } finally {
                    setLibreOfficeInstalling(false)
                  }
                }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                {libreOfficeInstalling ? 'Installiere...' : (platform === 'darwin' && brewAvailable === false ? 'Homebrew erforderlich' : 'LibreOffice installieren')}
              </button>
            </div>
            {platform === 'darwin' && brewAvailable === false && (
              <div style={{ marginTop: 8, color: '#7f1d1d' }}>
                Homebrew nicht gefunden. Du kannst Homebrew automatisch installieren oder folge <a href={'https://brew.sh'} target={'_blank'} rel={'noreferrer'}>brew.sh</a>.
                <div style={{ marginTop: 8 }}>
                  <button onClick={async ()=>{
                    try {
                      setLibreOfficeStatus('Installiere Homebrew...')
                      const r = await window.api?.installHomebrew?.()
                      if (r && r.ok) {
                        setLibreOfficeStatus('Homebrew installiert. Prüfe erneut...')
                        const hasBrew = await window.api?.checkHomebrew?.()
                        setBrewAvailable(!!hasBrew)
                        setLibreOfficeStatus('Nicht installiert ❌')
                      } else {
                        setLibreOfficeStatus('Homebrew-Installation fehlgeschlagen ❌')
                        setInstallDetails(r as any)
                      }
                    } catch (e) {
                      setLibreOfficeStatus('Fehler: ' + String(e))
                    }
                  }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Homebrew installieren</button>
                </div>
              </div>
            )}
            {platform === 'darwin' && brewAvailable && libreOfficeStatus.includes('fehlgeschlagen') && (
              <div style={{ marginTop: 8, color: '#7f1d1d' }}>
                Installation fehlgeschlagen. Prüfe Homebrew (<code>{installDetails?.brewPath || 'brew'}</code>) und beachte Ausgabe unten.
              </div>
            )}
            {platform === 'win32' && chocoAvailable === false && (
              <div style={{ marginTop: 8, color: '#7f1d1d' }}>
                Chocolatey nicht gefunden. Beim Klick auf “LibreOffice installieren” wird Chocolatey automatisch versucht zu installieren (Adminrechte erforderlich).
              </div>
            )}
            {installDetails && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  <div><strong>Brew:</strong> {installDetails.brewPath || '-'}</div>
                  {installDetails.message && <div><strong>Meldung:</strong> {installDetails.message}</div>}
                  {installDetails.uninstall && (
                    <div style={{ marginTop: 6 }}>
                      <strong>Uninstall:</strong>
                      <div>code: {installDetails.uninstall.code ?? '-'}</div>
                      {installDetails.uninstall.stdout && <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc', maxHeight: 120, overflow: 'auto' }}>{installDetails.uninstall.stdout}</div>}
                      {installDetails.uninstall.stderr && <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc', maxHeight: 120, overflow: 'auto', marginTop: 4 }}>{installDetails.uninstall.stderr}</div>}
                    </div>
                  )}
                  {installDetails.install && (
                    <div style={{ marginTop: 6 }}>
                      <strong>Install:</strong>
                      <div>code: {installDetails.install.code ?? '-'}</div>
                      {installDetails.install.stdout && <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc', maxHeight: 120, overflow: 'auto' }}>{installDetails.install.stdout}</div>}
                      {installDetails.install.stderr && <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc', maxHeight: 120, overflow: 'auto', marginTop: 4 }}>{installDetails.install.stderr}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}


