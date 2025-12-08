import React from 'react';

/**
 * Site-wide footer with important links and copyright notice.
 */
export const AppFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-slate-800 bg-slate-900/80 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Links */}
        <nav className="flex flex-wrap items-center gap-4">
          <a href="#/docs" className="hover:text-slate-200 transition-colors">
            Documentation
          </a>
          <a href="mailto:support@snarebox.com" className="hover:text-slate-200 transition-colors">
            Contact Us
          </a>
          <a
            href="https://github.com/snarebox/minimal-rpg"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-200 transition-colors"
          >
            GitHub
          </a>
        </nav>

        {/* Copyright */}
        <p className="text-slate-500">© {currentYear} Snarebox, LLC. All rights reserved.</p>
      </div>
    </footer>
  );
};
