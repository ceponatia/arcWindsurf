import React, { useState, useEffect } from 'react';
import { DocNavigation } from './components/DocNavigation.js';
import { DocPage } from './components/DocPage.js';

export const DocsViewer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('index');

  useEffect(() => {
    // Parse the current hash to get the doc path
    const hash = window.location.hash;
    const match = hash.match(/#\/docs\/?(.*)$/);
    const path = match?.[1] || 'index';
    setCurrentPath(path);

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash;
      const newMatch = newHash.match(/#\/docs\/?(.*)$/);
      const newPath = newMatch?.[1] || 'index';
      setCurrentPath(newPath);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (path: string) => {
    window.location.hash = `#/docs/${path}`;
  };

  return (
    <div className="flex h-full bg-slate-950">
      <DocNavigation currentPath={currentPath} onNavigate={handleNavigate} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <DocPage path={currentPath} />
        </div>
      </div>
    </div>
  );
};
