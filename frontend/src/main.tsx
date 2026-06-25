import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Error overlay non distruttivo: aggiunge un overlay senza distruggere il DOM React
function showErrorOverlay(title: string, detail: string) {
  // Evita overlay duplicati
  if (document.getElementById('error-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.cssText = 'background:#dc2626;color:white;padding:2rem;font-family:monospace;white-space:pre-wrap;z-index:9999;position:fixed;top:0;left:0;right:0;bottom:0;overflow:auto;';
  overlay.innerHTML = `<h2>${title}</h2><p>${detail}</p>`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Chiudi';
  closeBtn.style.cssText = 'margin-top:1rem;padding:0.5rem 1rem;background:white;color:#dc2626;border:none;border-radius:4px;cursor:pointer;font-weight:bold;';
  closeBtn.onclick = () => overlay.remove();
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);
}

window.addEventListener('error', (e) => {
  showErrorOverlay('🚨 FATAL ERROR', e.error?.stack || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  showErrorOverlay('🚨 UNHANDLED PROMISE REJECTION', e.reason?.stack || e.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
