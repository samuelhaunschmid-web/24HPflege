import { NavLink, Outlet } from 'react-router-dom'

type Props = {
  children?: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f6f7fb' }}>
      <nav style={{ 
        width: 260, 
        borderRight: '1px solid #e6e8ef', 
        padding: 16, 
        background: '#ffffff', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12
      }}>
        <div style={{ padding: '8px 8px 12px 8px' }}>
          <h3 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>24h Pflege</h3>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {[
            { to: '/', label: 'Startseite' },
            { to: '/betreuer', label: 'Betreuer' },
            { to: '/kunden', label: 'Kunden' },
            { to: '/rechnungen', label: 'Rechnungen' },
            { to: '/einstellungen', label: 'Einstellungen' },
          ].map((item) => (
            <li key={item.to}>
              <NavLink 
                to={item.to}
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
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 'auto', color: '#94a3b8', fontSize: 12, padding: 8 }}>
          © {new Date().getFullYear()} 24h Pflege
        </div>
      </nav>
      <main style={{ flex: 1, padding: 16 }}>
        {children ?? <Outlet />}
      </main>
    </div>
  )
}


