import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

type Props = {
  children?: React.ReactNode
}

export default function Layout({ children }: Props) {
  const [archivOpen, setArchivOpen] = useState(() => {
    try {
      const raw = localStorage.getItem('sidebar:archivOpen')
      return raw === '1'
    } catch {
      return false
    }
  })
  const [rechnungenOpen, setRechnungenOpen] = useState(() => {
    try {
      const raw = localStorage.getItem('sidebar:rechnungenOpen')
      return raw === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try { localStorage.setItem('sidebar:archivOpen', archivOpen ? '1' : '0') } catch {}
  }, [archivOpen])
  useEffect(() => {
    try { localStorage.setItem('sidebar:rechnungenOpen', rechnungenOpen ? '1' : '0') } catch {}
  }, [rechnungenOpen])
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <nav style={{ 
        width: 260, 
        borderRight: '1px solid #e6e8ef', 
        padding: 16, 
        background: '#ffffff', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12,
        height: '100vh',
        overflow: 'hidden',
        flex: '0 0 260px',
        paddingBottom: 10,
        boxSizing: 'border-box'
      }}>
        <div style={{ padding: '8px 8px 12px 8px' }}>
          <h3 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>24h Pflege</h3>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          <li>
            <NavLink 
              to={'/'}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#0b4de0' : '#334155',
                fontWeight: 600,
                background: isActive ? '#eef4ff' : 'transparent',
                border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
              })}
            >
              Dokumentengenerator
            </NavLink>
          </li>
          <li>
            <NavLink 
              to={'/kunden'}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#0b4de0' : '#334155',
                fontWeight: 600,
                background: isActive ? '#eef4ff' : 'transparent',
                border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
              })}
            >
              Kunden
            </NavLink>
          </li>
          <li>
            <NavLink 
              to={'/betreuer'}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#0b4de0' : '#334155',
                fontWeight: 600,
                background: isActive ? '#eef4ff' : 'transparent',
                border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
              })}
            >
              Betreuer
            </NavLink>
          </li>
          <li>
            <button onClick={()=> { const next = !archivOpen; setArchivOpen(next); try { localStorage.setItem('sidebar:archivOpen', next ? '1' : '0') } catch {} }} style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid transparent',
              background: 'transparent',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              Archiv
            </button>
            {archivOpen && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 8px', display: 'grid', gap: 4 }}>
                <li>
                  <NavLink 
                    to={'/archiv/kunden'}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '8px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: isActive ? '#0b4de0' : '#334155',
                      fontWeight: 600,
                      background: isActive ? '#eef4ff' : 'transparent',
                      border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
                    })}
                  >
                    Kunden
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to={'/archiv/betreuer'}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '8px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: isActive ? '#0b4de0' : '#334155',
                      fontWeight: 600,
                      background: isActive ? '#eef4ff' : 'transparent',
                      border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
                    })}
                  >
                    Betreuer
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
          <li>
            <NavLink 
              to={'/mail'}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#0b4de0' : '#334155',
                fontWeight: 600,
                background: isActive ? '#eef4ff' : 'transparent',
                border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
              })}
            >
              Mail
            </NavLink>
          </li>
          <li>
            <button onClick={()=> { const next = !rechnungenOpen; setRechnungenOpen(next); try { localStorage.setItem('sidebar:rechnungenOpen', next ? '1' : '0') } catch {} }} style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid transparent',
              background: 'transparent',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              Rechnungen
            </button>
            {rechnungenOpen && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 8px', display: 'grid', gap: 4 }}>
                <li>
                  <NavLink 
                    to={'/rechnungen/manuell'}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '8px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: isActive ? '#0b4de0' : '#334155',
                      fontWeight: 600,
                      background: isActive ? '#eef4ff' : 'transparent',
                      border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
                    })}
                  >
                    Manuell
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to={'/rechnungen/automatisch'}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '8px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: isActive ? '#0b4de0' : '#334155',
                      fontWeight: 600,
                      background: isActive ? '#eef4ff' : 'transparent',
                      border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
                    })}
                  >
                    Automatisch
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        </ul>
        <div style={{ marginTop: 'auto' }}>
          <NavLink 
            to={'/einstellungen'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              color: isActive ? '#0b4de0' : '#334155',
              fontWeight: 600,
              background: isActive ? '#eef4ff' : 'transparent',
              border: isActive ? '1px solid #dbe6ff' : '1px solid transparent'
            })}
          >
            Einstellungen
          </NavLink>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12, padding: 8 }}>
          © {new Date().getFullYear()} Samuel Haunschmid
        </div>
      </nav>
      <main style={{ flex: 1, padding: 16, paddingBottom: 10, boxSizing: 'border-box', overflowY: 'auto', height: '100vh', background: '#f6f7fb' }}>
        {children ?? <Outlet />}
      </main>
    </div>
  )
}


