import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App.js';
import { STRICT_MODE } from './config.js';
import { DbView } from './features/db-view/index.js';
import { ToolingFailuresView } from './features/tooling-failures-view/index.js';

const rootEl = document.getElementById('root')!;
const isDbView =
  typeof window !== 'undefined' && window.location.pathname.replace(/\/$/, '') === '/dbview';
const isToolingFailuresView =
  typeof window !== 'undefined' &&
  window.location.pathname.replace(/\/$/, '') === '/toolingfailures';

const app = isDbView ? <DbView /> : isToolingFailuresView ? <ToolingFailuresView /> : <App />;
createRoot(rootEl).render(STRICT_MODE ? <React.StrictMode>{app}</React.StrictMode> : app);
