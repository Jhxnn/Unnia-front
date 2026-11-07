import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/bricolage-grotesque/wdth.css'
import '@fontsource-variable/instrument-sans/index.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import './styles/tokens.css'
import './styles/base.css'

import App from './App.tsx'
import { restoreSession } from './lib/api/client'

// Se há um token de renovação guardado, tenta voltar à sessão antes de o usuário interagir.
void restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
