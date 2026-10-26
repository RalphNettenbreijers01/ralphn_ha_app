import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './store/AppContext';
import { fetchRemote, loadData } from './lib/storage';
import { startHaTheme } from './lib/haTheme';
import './index.css';

async function start() {
  // Met backend (Home Assistant): server is de bron van waarheid, zodat alle apparaten dezelfde data zien.
  // Zonder backend (dev): alleen LocalStorage.
  const remoteData = await fetchRemote();
  const remote = remoteData !== undefined;
  const initial = (remoteData === 'unchanged' ? null : remoteData) ?? loadData(); // eerste keer: bestaande lokale data migreert naar de server

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
