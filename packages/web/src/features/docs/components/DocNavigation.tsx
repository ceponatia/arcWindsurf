import React, { useState, useEffect } from 'react';

export interface DocNavigationProps {
  /** Current doc path */
  currentPath: string;
  /** Callback when a doc link is clicked */
  onNavigate: (path: string) => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  title: string;
  path: string;
}

// Navigation structure - can be moved to a separate config file later
const NAV_STRUCTURE: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Welcome', path: 'index' },
      { title: 'Self-Hosting', path: 'self-hosting' },
      { title: 'Quick Start', path: 'quick-start' },
    ],
  },
  {
    title: 'Character Builder',
    items: [
      { title: 'Overview', path: 'character-builder' },
      { title: 'Basic Fields', path: 'character-builder/basic-fields' },
      { title: 'Personality', path: 'character-builder/personality' },
      { title: 'Appearance', path: 'character-builder/appearance' },
      { title: 'Body Sensory', path: 'character-builder/body-sensory' },
      { title: 'Details', path: 'character-builder/details' },
      { title: 'Tags', path: 'character-builder/traits-tags' },
    ],
  },
  {
    title: 'Setting Builder',
    items: [
      { title: 'Overview', path: 'setting-builder' },
      { title: 'Locations', path: 'setting-builder/locations' },
    ],
  },
  {
    title: 'Sessions',
    items: [
      { title: 'Creating Sessions', path: 'sessions' },
      { title: 'Chat Interface', path: 'sessions/chat' },
    ],
  },
];

/**
 * Sidebar navigation for documentation.
 */
export const DocNavigation: React.FC<DocNavigationProps> = ({ currentPath, onNavigate }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Getting Started'])
  );

  // Auto-expand section containing current page
  useEffect(() => {
    NAV_STRUCTURE.forEach((section) => {
      const hasCurrentItem = section.items.some((item) => item.path === currentPath);
      if (hasCurrentItem) {
        setExpandedSections((prev) => new Set(prev).add(section.title));
      }
    });
  }, [currentPath]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <nav className="w-64 border-r border-slate-700 bg-slate-900/40 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Documentation</h2>

        <div className="space-y-4">
          {NAV_STRUCTURE.map((section) => {
            const isExpanded = expandedSections.has(section.title);

            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
                >
                  <span>{section.title}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>

                {isExpanded && (
                  <ul className="mt-2 ml-2 space-y-1">
                    {section.items.map((item) => {
                      const isActive = item.path === currentPath;

                      return (
                        <li key={item.path}>
                          <button
                            type="button"
                            onClick={() => onNavigate(item.path)}
                            className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-500/20 text-blue-300 font-medium'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                          >
                            {item.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
