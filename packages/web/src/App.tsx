import React from 'react';
import { AppShell } from './layouts/AppShell.js';
import { RequireSignIn } from './shared/auth/RequireSignIn.js';

export const App: React.FC = () => {
  return (
    <RequireSignIn>
      <AppShell />
    </RequireSignIn>
  );
};
