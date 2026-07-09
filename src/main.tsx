import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AggiornamentoPwa } from './ui/AggiornamentoPwa.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AggiornamentoPwa />
    <App />
  </StrictMode>,
)
