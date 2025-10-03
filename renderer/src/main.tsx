import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Startseite from './seiten/Startseite'
import Betreuer from './seiten/Betreuer'
import Kunden from './seiten/Kunden'
import Rechnungen from './seiten/Rechnungen'
import Einstellungen from './seiten/Einstellungen'

const router = createBrowserRouter([
  { path: '/', element: <Startseite /> },
  { path: '/betreuer', element: <Betreuer /> },
  { path: '/kunden', element: <Kunden /> },
  { path: '/rechnungen', element: <Rechnungen /> },
  { path: '/einstellungen', element: <Einstellungen /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
