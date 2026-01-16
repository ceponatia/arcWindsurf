import React, { useState } from 'react';
import { AppFooter } from './AppFooter.js';
import { Sidebar } from './Sidebar.js';
import { ShellHeader } from './ShellHeader.js';
import { MobileDrawer } from './MobileDrawer.js';
import type { AppControllerValue } from '../types.js';
import { useAuth } from '../shared/hooks/useAuth.js';

interface ResponsiveShellProps {
  controller: AppControllerValue;
  children: React.ReactNode;
}

/**
 * ResponsiveShell provides a single layout tree that adapts to mobile/desktop.
 * It ensures the main content (children) is rendered exactly once in the tree,
 * preventing remounts when the viewport is resized.
 */
export const ResponsiveShell: React.FC<ResponsiveShellProps> = ({ controller, children }) => {
  const [navOpen, setNavOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { viewMode } = controller;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans flex flex-col">
      <ShellHeader
        onMenuClick={() => setNavOpen(true)}
        onLogoClick={() => controller.navigateToHome()}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar controller={controller} isAdmin={isAdmin} />

        {/* Main Content Area - Position and Instance are stable */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div
            id="app-main-view"
            className={`flex-1 ${
              ['chat', 'character-studio'].includes(viewMode)
                ? 'overflow-hidden'
                : 'overflow-y-auto custom-scrollbar p-4 md:p-6'
            }`}
          >
            {children}
          </div>
          <AppFooter />
        </main>
      </div>

      <MobileDrawer isOpen={navOpen} onClose={() => setNavOpen(false)} controller={controller} />
    </div>
  );
};
