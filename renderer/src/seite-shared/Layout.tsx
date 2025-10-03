import { Link, Outlet } from 'react-router-dom'

type Props = {
  children?: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{ width: 240, borderRight: '1px solid #ddd', padding: 16 }}>
        <h3>24h Pflege</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          <li><Link to="/">Startseite</Link></li>
          <li><Link to="/betreuer">Betreuer</Link></li>
          <li><Link to="/kunden">Kunden</Link></li>
          <li><Link to="/rechnungen">Rechnungen</Link></li>
          <li><Link to="/einstellungen">Einstellungen</Link></li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 16 }}>
        {children ?? <Outlet />}
      </main>
    </div>
  )
}


