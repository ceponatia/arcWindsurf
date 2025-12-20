import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App.js';
import { STRICT_MODE } from './config.js';
import { DbView } from './features/db-view/index.js';
import { ToolingFailuresView } from './features/tooling-failures-view/index.js';

const rootEl = document.getElementById('root')!;

// This app uses hash-based routing. Supabase magic-link redirects land on a
// clean URL without a hash (so it matches allowlisted redirect URLs).
// Normalize to '#/' on load for consistent routing.
if (typeof window !== 'undefined') {
  const h = window.location.hash;
  if (!h || h === '#') {
    window.location.hash = '#/';
  }
}

const isDbView =
  typeof window !== 'undefined' && window.location.pathname.replace(/\/$/, '') === '/dbview';
const isToolingFailuresView =
  typeof window !== 'undefined' &&
  window.location.pathname.replace(/\/$/, '') === '/toolingfailures';

const app = isDbView ? <DbView /> : isToolingFailuresView ? <ToolingFailuresView /> : <App />;
createRoot(rootEl).render(STRICT_MODE ? <React.StrictMode>{app}</React.StrictMode> : app);
