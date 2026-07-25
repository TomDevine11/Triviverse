import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LangProvider from './i18n/LangProvider'

// Self-heal after a deploy: if a lazily-imported route chunk fails to load
// (its hashed file was replaced by a newer build while this tab was open),
// reload once to fetch the current build instead of leaving a broken screen.
// Throttled via sessionStorage so a genuinely missing chunk can't loop.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    const last = Number(sessionStorage.getItem('chunkReloadAt') || 0)
    if (Date.now() - last < 10000) return
    sessionStorage.setItem('chunkReloadAt', String(Date.now()))
    event.preventDefault()
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <App />
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
)
