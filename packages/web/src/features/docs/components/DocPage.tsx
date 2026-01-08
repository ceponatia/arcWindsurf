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
    const normalizedPathForKey = normalizedPath.replace(/[^a-zA-Z0-9\-_/]/g, '');
    const moduleKey = `../../../docs/${normalizedPathForKey}.mdx`;

    // Validate the module key is safe and exists as own property
    if (!Object.hasOwn(mdxModules, moduleKey)) {
      console.error('Doc not found:', moduleKey, 'Available:', Object.keys(mdxModules));
      setError(`Documentation page "${normalizedPathForKey}" not found.`);
      setLoading(false);
      return;
    }

    // Get the loader safely using Object.hasOwn validated key
    const loader = mdxModules[moduleKey];

    // Additional safety check: ensure loader is a function
    if (typeof loader !== 'function') {
      console.error('Invalid loader for:', moduleKey);
      setError(`Documentation page "${normalizedPathForKey}" not found.`);
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
        setError(`Documentation page "${normalizedPathForKey}" not found.`);
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
