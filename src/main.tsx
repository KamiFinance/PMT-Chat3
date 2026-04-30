
// Force reload if cached version is older than 1777526890
(function() {
  const BUILD_TS = 1777526890;
  const stored = parseInt(localStorage.getItem('pmt_build_ts') || '0');
  if (stored < BUILD_TS - 60) {  // allow 60s grace
    localStorage.setItem('pmt_build_ts', String(BUILD_TS));
    // Clear service worker caches
    if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  }
})();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
