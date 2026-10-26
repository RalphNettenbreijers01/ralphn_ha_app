import React from 'react';
import ReactDOM from 'react-dom/client';
import { mergeData } from '../merge.js';
import App from './App';
import { AppProvider } from './store/AppContext';
import { fetchRemote, loadData, loadLocal } from './lib/storage';
import type { AppData } from './types';
import { startHaTheme } from './lib/haTheme';
import './index.css';

async function start() {
  // Met backend (Home Assistant): de server is de bron van waarheid, zodat alle apparaten dezelfde data zien.
  // Zonder backend (dev): alleen LocalStorage. Tijdelijk geen verbinding: lokaal verder werken en later synchroniseren.
  const r = await fetchRemote();
  const remote = r !== undefined;
  const local = loadLocal();

  let initial: AppData;
  if (r && r !== 'unchanged' && r !== 'offline') {
    // Wijzigingen die offline zijn gemaakt en nog niet verstuurd zijn, blijven behouden: samenvoegen per record
    initial = local ? { ...(mergeData(r, local) as AppData), rev: r.rev } : r;
  } else {
    initial = local ?? loadData(); // server leeg (eerste keer: lokale data migreert) of offline
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProvider initial={initial} remote={remote}>
        <App />
      </AppProvider>
    </React.StrictMode>,
  );
}

startHaTheme();
start();

// Service worker: de app start ook als de verbinding wegvalt (alleen in de productiebuild)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* geen service worker: de app werkt gewoon online */
    });
  });
}
