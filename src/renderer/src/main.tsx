import './app.css'
import '@fontsource/anek-tamil/400.css'
import '@fontsource/anek-tamil/600.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
