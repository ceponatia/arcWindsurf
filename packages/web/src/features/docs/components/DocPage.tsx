import React, { useState, useEffect } from 'react';

export interface DocPageProps {
  /** The path of the current doc (e.g., "character-builder") */
  path: string;
}

interface DocModule {
  default: React.ComponentType;
  frontmatter?: {
    title?: string;
    description?: string;
  };
}

// Use Vite's glob import to discover all MDX files at build time
// This enables dynamic imports for nested directories
const mdxModules = import.meta.glob('../../../docs/**/*.mdx') as Record<
  string,
  () => Promise<DocModule>
>;

/**
 * Dynamically loads and renders MDX documentation files.
 */
export const DocPage: React.FC<DocPageProps> = ({ path }) => {
  const [docModule, setDocModule] = useState<DocModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Normalize path: remove leading/trailing slashes, default to index
    const normalizedPath = path.replace(/^\/|\/$/g, '') || 'index';

    // Build the module key to match the glob pattern
    const moduleKey = `../../../docs/${normalizedPath}.mdx`;
    const loader = mdxModules[moduleKey];

    if (!loader) {
      console.error('Doc not found:', moduleKey, 'Available:', Object.keys(mdxModules));
      setError(`Documentation page "${normalizedPath}" not found.`);
      setLoading(false);
      return;
    }

    loader()
      .then((module) => {
        setDocModule(module);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load doc:', err);
        setError(`Documentation page "${normalizedPath}" not found.`);
        setLoading(false);
      });
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading documentation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-400 mb-2">{error}</div>
          <a href="#/docs" className="text-blue-400 hover:text-blue-300">
            ← Back to documentation home
          </a>
        </div>
      </div>
    );
  }

  if (!docModule) {
    return null;
  }

  const Content = docModule.default;

  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <Content />
    </div>
  );
};
