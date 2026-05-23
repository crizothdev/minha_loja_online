import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (err) {
  document.getElementById('root')!.innerHTML = `
    <div style="max-width:500px;margin:80px auto;padding:24px;font-family:sans-serif;text-align:center">
      <h2 style="color:#dc2626">Erro ao iniciar o app</h2>
      <p style="color:#64748b;word-break:break-all">${err instanceof Error ? err.message : String(err)}</p>
    </div>`
}
