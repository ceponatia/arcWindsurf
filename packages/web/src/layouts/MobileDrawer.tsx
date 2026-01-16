import React from 'react';
import { NavItems } from './NavItems.js';
import { NavButton, DocumentIcon } from './ShellComponents.js';
import type { AppControllerValue } from '../types.js';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  controller: AppControllerValue;
}

/**
 * Overlay drawer for mobile navigation.
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, controller }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <nav className="relative w-64 bg-slate-900 h-full p-4 flex flex-col shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-semibold text-slate-100">Menu</span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-100"
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          <NavItems controller={controller} onItemClick={onClose} />
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <NavButton
            icon={<DocumentIcon className="w-5 h-5" />}
            label="Documentation"
            active={window.location.hash.includes('/docs')}
            onClick={() => {
              window.location.hash = '#/docs';
              onClose();
            }}
          />
        </div>
      </nav>
    </div>
  );
};
