import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App.js';
import { STRICT_MODE } from './config.js';
import { DbView } from './features/db-view/index.js';
import { ToolingFailuresView } from './features/tooling-failures-view/index.js';

const rootEl = document.getElementById('root')!;

type RootView = 'app' | 'dbview' | 'toolingfailures';

function normalizeHashToPath(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return '/';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/$/, '');
  return trimmed.length === 0 ? '/' : trimmed;
}

function getRootView(): RootView {
  if (typeof window === 'undefined') return 'app';

  const hashPath = normalizeHashToPath(window.location.hash);
  if (hashPath === '/dbview') return 'dbview';
  if (hashPath === '/toolingfailures') return 'toolingfailures';

  // Back-compat: allow direct path loads in local/dev environments.
  const path = window.location.pathname.replace(/\/$/, '');
  if (path.endsWith('/dbview')) return 'dbview';
  if (path.endsWith('/toolingfailures')) return 'toolingfailures';

  return 'app';
}

const RootApp: React.FC = () => {
  const [, forceRerender] = React.useState<number>(0);

  React.useEffect(() => {
    // This app uses hash-based routing. Supabase magic-link redirects land on a
    // clean URL without a hash (so it matches allowlisted redirect URLs).
    // Normalize to '#/' on load for consistent routing.
    const view = getRootView();
    const h = window.location.hash;
    if (view === 'app' && (!h || h === '#')) {
      window.location.hash = '#/';
    }

    const onLocationChange = (): void => {
      forceRerender((n) => n + 1);
    };

    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  const view = getRootView();
  if (view === 'dbview') return <DbView />;
  if (view === 'toolingfailures') return <ToolingFailuresView />;
  return <App />;
};

const app = <RootApp />;
createRoot(rootEl).render(STRICT_MODE ? <React.StrictMode>{app}</React.StrictMode> : app);
