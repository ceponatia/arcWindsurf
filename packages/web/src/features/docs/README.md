# Documentation System

In-app MDX-based documentation with contextual help components.

## Features

- **MDX Documentation** - Write docs with markdown + embedded React components
- **Contextual Help** - `HelpIcon` and `HelpPopover` components for inline assistance
- **Navigation** - Hierarchical sidebar navigation with collapsible sections
- **Auto-linking** - Links to specific doc pages work seamlessly with hash routing
- **Syntax Highlighting** - Code blocks with syntax highlighting via rehype-highlight
- **Heading IDs** - Headings get stable IDs for deep linking (no auto-clickable links by default)

## Architecture

### Files Structure

```tree
packages/web/src/
  docs/                         # MDX documentation files
    index.mdx                   # Landing page
    quick-start.mdx
    character-builder.mdx
    setting-builder.mdx
    sessions.mdx
  features/docs/
    DocsViewer.tsx              # Main docs viewer component
    components/
      DocPage.tsx               # Dynamically loads MDX files
      DocNavigation.tsx         # Sidebar navigation
```

### Help Components (in @minimal-rpg/ui)

- `HelpIcon` - Small icon with tooltip, optional link to docs
- `HelpPopover` - Larger popover with rich content

## Usage

### Adding New Documentation

1. Create a new `.mdx` file in `packages/web/src/docs/`
2. Add the page to the navigation structure in `DocNavigation.tsx`
3. Link to it using `#/docs/your-page-name`

Example MDX file:

```mdx
# My New Doc Page

This is a documentation page with **markdown** formatting.

## Section

- Bullet points
- More points

[Link to another doc](#/docs/other-page)
```

### Using Help Components

In any React component:

```tsx
import { HelpIcon, HelpPopover } from '@minimal-rpg/ui';

// Quick tooltip
<label>
  Character Name
  <HelpIcon
    tooltip="A unique identifier for your character"
    docLink="docs/character-builder#name"
  />
</label>

// Richer popover
<HelpPopover
  title="About Traits"
  docLink="docs/character-builder/traits-tags"
>
  <p>Traits define personality and behavior patterns.</p>
  <ul>
    <li>Choose 3-5 core traits</li>
    <li>Be specific and concrete</li>
  </ul>
</HelpPopover>
```

### Navigation Structure

Edit `packages/web/src/features/docs/components/DocNavigation.tsx`:

```ts
const NAV_STRUCTURE: NavSection[] = [
  {
    title: 'Section Name',
    items: [{ title: 'Page Title', path: 'file-name' }],
  },
];
```

## MDX Processing

Vite is configured with:

- `@mdx-js/rollup` - MDX compilation
- `remark-gfm` - GitHub-flavored markdown (tables, strikethrough, etc.)
- `remark-frontmatter` - YAML frontmatter support
- `rehype-highlight` - Code syntax highlighting
- `rehype-slug` - Auto-generate heading IDs (for manual deep links)

## Styling

Documentation uses Tailwind's prose classes with custom dark theme overrides in `src/styles/app.css`. The `.prose` styles are specifically tuned for:

- Dark slate background
- Readable text contrast
- Syntax-highlighted code blocks
- Proper spacing and hierarchy

## Routing

Docs are accessible via:

- `#/docs` - Landing page (index.mdx)
- `#/docs/quick-start` - Loads quick-start.mdx
- `#/docs/character-builder` - Loads character-builder.mdx
- And so on...

Hash changes are handled by `useEffect` in `DocsViewer` which updates the current path and re-renders the appropriate MDX component.

## Future Enhancements

Potential improvements:

- Search functionality
- Table of contents (extract headings from current page)
- Breadcrumbs
- "Edit on GitHub" links
- Version selection
- PDF export
