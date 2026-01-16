import React from 'react';
import { NavItems } from './NavItems.js';
import { DocumentIcon } from './ShellComponents.js';
import type { AppControllerValue } from '../types.js';

interface SidebarProps {
  controller: AppControllerValue;
  isAdmin: boolean;
}

/**
 * Desktop sidebar navigation component.
 */
export const Sidebar: React.FC<SidebarProps> = ({ controller, isAdmin }) => {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => controller.navigateToHome()}
          className="text-lg font-semibold text-slate-100 hover:text-violet-400 transition-colors"
        >
          ArcAgentic
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavItems controller={controller} />
      </nav>
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => (window.location.hash = '#/docs')}
          className="flex items-center gap-2 w-full text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <DocumentIcon className="w-4 h-4" />
          <span>Documentation</span>
        </button>
        {isAdmin && (
          <>
            <a
              href="#/dbview"
              className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              DB View
            </a>
            <a
              href="#/toolingfailures"
              className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Tooling Failures
            </a>
          </>
        )}
      </div>
    </aside>
  );
};
