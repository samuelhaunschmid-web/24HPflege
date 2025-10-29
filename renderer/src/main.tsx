import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Startseite from './seiten/Startseite'
import Betreuer from './seiten/Betreuer'
import Kunden from './seiten/Kunden'
import Rechnungen from './seiten/Rechnungen'
import { Navigate } from 'react-router-dom'
import RechnungenAutomatisch from './seiten/RechnungenAutomatisch'
import Einstellungen from './seiten/Einstellungen'
import ArchivierteKunden from './seiten/ArchivierteKunden'
import ArchivierteBetreuer from './seiten/ArchivierteBetreuer'

const router = createHashRouter([
  { path: '/', element: <Startseite /> },
  { path: '/betreuer', element: <Betreuer /> },
  { path: '/kunden', element: <Kunden /> },
  { path: '/rechnungen', element: <Navigate to="/rechnungen/manuell" replace /> },
  { path: '/rechnungen/manuell', element: <Rechnungen /> },
  { path: '/rechnungen/automatisch', element: <RechnungenAutomatisch /> },
  { path: '/einstellungen', element: <Einstellungen /> },
  { path: '/archiv/kunden', element: <ArchivierteKunden /> },
  { path: '/archiv/betreuer', element: <ArchivierteBetreuer /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
