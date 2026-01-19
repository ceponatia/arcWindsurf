# App-Wide Command Palette Design

> **Created**: January 18, 2026
> **Status**: Design Phase
> **Inspiration**: VS Code, Raycast, Spotlight, Linear

---

## Vision

Transform the application into a **true studio experience** with a powerful command palette that provides instant access to any feature, setting, or action. Like VS Code's `Cmd+Shift+P`, but tailored for creative RPG workflows.

The command palette is not feature-specific—it's the **central nervous system** of the application, enabling rapid navigation, contextual actions, and power-user efficiency across all modules.

---

## Core Capabilities

### 1. Universal Navigation

Jump to any location in the app instantly:

- `> Characters` → Character list
- `> Character: Elara` → Open specific character
- `> Sessions` → Session list
- `> Settings > API Keys` → Nested navigation
- `> Studio: Personality` → Jump to specific studio section

### 2. Contextual Actions

Actions that adapt based on current context:

- In Character Studio: `> Save`, `> Preview in Game`, `> Export JSON`
- In Session: `> Add NPC`, `> Advance Time`, `> Generate Event`
- Anywhere: `> New Character`, `> Quick Settings`, `> Toggle Dark Mode`

### 3. Search Everything

Unified search across all data:

- Characters by name, race, traits
- Sessions by title, participants
- Locations by name, type
- Settings by keyword

### 4. Quick Actions / Shortcuts

Frequently used operations:

- `> Toggle Sidebar`
- `> Switch Theme`
- `> Copy Current URL`
- `> Open Recent...`

---

## Architecture

### Command Registry

```typescript
interface Command {
  id: string;
  title: string;
  keywords: string[]; // For fuzzy matching
  category: CommandCategory;

  // Availability
  when?: CommandContext; // Condition for visibility
  disabled?: boolean;

  // Execution
  action: CommandAction;

  // Display
  icon?: string;
  shortcut?: KeyboardShortcut;
  description?: string;
}

type CommandCategory =
  | 'navigation'
  | 'action'
  | 'search'
  | 'settings'
  | 'create'
  | 'recent'
  | 'help';

type CommandAction =
  | { type: 'navigate'; path: string }
  | { type: 'callback'; fn: () => void | Promise<void> }
  | { type: 'submenu'; commands: Command[] }
  | { type: 'search'; searchType: SearchType }
  | { type: 'input'; prompt: string; onSubmit: (value: string) => void };

interface CommandContext {
  // Current route/feature
  route?: string | RegExp;
  feature?: string;

  // Entity context
  hasActiveCharacter?: boolean;
  hasActiveSession?: boolean;

  // User state
  isAuthenticated?: boolean;
  hasPermission?: string[];
}
```

### Command Provider Pattern

Each feature registers its own commands:

```typescript
interface CommandProvider {
  id: string;
  getCommands(): Command[];
  getContextualCommands?(context: AppContext): Command[];
}

// Example: Character Studio provider
const characterStudioCommands: CommandProvider = {
  id: 'character-studio',

  getCommands: () => [
    {
      id: 'studio.save',
      title: 'Save Character',
      keywords: ['save', 'commit', 'persist'],
      category: 'action',
      shortcut: { key: 's', modifiers: ['cmd'] },
      when: { feature: 'character-studio' },
      action: { type: 'callback', fn: () => saveCharacter() },
    },
    {
      id: 'studio.preview',
      title: 'Preview in Conversation',
      keywords: ['preview', 'chat', 'test'],
      category: 'action',
      when: { feature: 'character-studio', hasActiveCharacter: true },
      action: { type: 'callback', fn: () => openPreview() },
    },
    {
      id: 'studio.export-json',
      title: 'Export as JSON',
      keywords: ['export', 'json', 'download'],
      category: 'action',
      when: { feature: 'character-studio' },
      action: { type: 'callback', fn: () => exportCharacterJSON() },
    },
  ],

  getContextualCommands: (ctx) => {
    const commands: Command[] = [];

    if (ctx.characterProfile?.name) {
      commands.push({
        id: 'studio.rename',
        title: `Rename "${ctx.characterProfile.name}"`,
        category: 'action',
        action: {
          type: 'input',
          prompt: 'New name:',
          onSubmit: (name) => renameCharacter(name),
        },
      });
    }

    return commands;
  },
};
```

### Global Command Registry

```typescript
class CommandRegistry {
  private providers: Map<string, CommandProvider> = new Map();
  private staticCommands: Command[] = [];

  registerProvider(provider: CommandProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
  }

  getAllCommands(context: AppContext): Command[] {
    const commands: Command[] = [...this.staticCommands];

    for (const provider of this.providers.values()) {
      commands.push(...provider.getCommands());

      if (provider.getContextualCommands) {
        commands.push(...provider.getContextualCommands(context));
      }
    }

    return commands.filter(cmd => this.isVisible(cmd, context));
  }

  private isVisible(cmd: Command, context: AppContext): boolean {
    if (!cmd.when) return true;
    return evaluateContext(cmd.when, context);
  }

  search(query: string, context: AppContext): ScoredCommand[] {
    const commands = this.getAllCommands(context);
    return fuzzySearch(commands, query);
  }
}
```

---

## Search Implementation

### Fuzzy Matching

```typescript
interface ScoredCommand {
  command: Command;
  score: number;
  matches: MatchRange[]; // For highlighting
}

interface MatchRange {
  start: number;
  end: number;
  field: 'title' | 'keywords' | 'description';
}

function fuzzySearch(commands: Command[], query: string): ScoredCommand[] {
  if (!query.trim()) {
    // Return recent/suggested commands when empty
    return getRecentCommands().map(cmd => ({
      command: cmd,
      score: 1,
      matches: [],
    }));
  }

  const results: ScoredCommand[] = [];
  const normalizedQuery = query.toLowerCase();

  for (const command of commands) {
    const titleScore = calculateFuzzyScore(command.title, normalizedQuery);
    const keywordScores = command.keywords.map(k =>
      calculateFuzzyScore(k, normalizedQuery)
    );
    const descScore = command.description
      ? calculateFuzzyScore(command.description, normalizedQuery) * 0.5
      : 0;

    const bestScore = Math.max(titleScore, ...keywordScores, descScore);

    if (bestScore > 0.3) { // Threshold
      results.push({
        command,
        score: bestScore,
        matches: extractMatches(command, normalizedQuery),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
```

### Search Modes

Support multiple search modes via prefixes:

| Prefix | Mode | Example |
| ------ | ---- | ------- |
| (none) | Commands | `save character` |
| `>` | Commands (explicit) | `> export json` |
| `@` | Characters | `@Elara` |
| `#` | Sessions | `#Dragon Quest` |
| `/` | Locations | `/Tavern` |
| `?` | Help/Docs | `?keyboard shortcuts` |
| `:` | Go to line/section | `:personality` |

```typescript
function parseQuery(input: string): ParsedQuery {
  const prefixMap: Record<string, SearchMode> = {
    '>': 'commands',
    '@': 'characters',
    '#': 'sessions',
    '/': 'locations',
    '?': 'help',
    ':': 'goto',
  };

  const firstChar = input.charAt(0);
  const mode = prefixMap[firstChar] ?? 'commands';
  const query = prefixMap[firstChar] ? input.slice(1).trim() : input.trim();

  return { mode, query };
}
```

---

## UI Design

### Palette Component

```text
┌─────────────────────────────────────────────────────────────────┐
│  🔍  Search commands, characters, sessions...          ⌘K      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RECENT                                                          │
│  ├─ ⏱️  Character: Elara the Wanderer                           │
│  ├─ 📁  Session: Dragon's Lair                                  │
│  └─ ⚙️  Settings: API Configuration                             │
│                                                                  │
│  SUGGESTIONS                                                     │
│  ├─ ✨  New Character                              ⌘N           │
│  ├─ 📝  New Session                                ⌘⇧N          │
│  └─ 🔧  Quick Settings                             ⌘,           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### With Search Query

```text
┌─────────────────────────────────────────────────────────────────┐
│  🔍  export                                            ⌘K       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACTIONS                                                         │
│  ├─ 📤  Export Character as JSON           character-studio     │
│  ├─ 📤  Export Session History             session              │
│  ├─ 📤  Export All Data                    settings             │
│  └─ 📤  Export Character as YAML           character-studio     │
│                                                                  │
│  No more results for "export"                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Character Search (`@`)

```text
┌─────────────────────────────────────────────────────────────────┐
│  🔍  @elf                                              ⌘K       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CHARACTERS                                                      │
│  ├─ 🧝  Elara the Wanderer        Elf • Female • Ranger         │
│  ├─ 🧝  Theron Nightwhisper       Elf • Male • Mage             │
│  └─ 🧝  Sylvara Moonshadow        Half-Elf • Female • Bard      │
│                                                                  │
│  ACTIONS                                                         │
│  ├─ ✨  Create new Elf character                                │
│  └─ 📋  Browse all Elf characters                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Submenu / Drill-Down

```text
┌─────────────────────────────────────────────────────────────────┐
│  🔍  Settings >                                        ⌘K       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SETTINGS                                              ← Back   │
│  ├─ 🔑  API Keys                    Configure LLM providers     │
│  ├─ 🎨  Appearance                  Theme, fonts, colors        │
│  ├─ ⌨️  Keyboard Shortcuts          Customize key bindings      │
│  ├─ 🧠  AI Behavior                 Model selection, temp       │
│  ├─ 💾  Data & Storage              Export, import, backup      │
│  └─ 🔔  Notifications               Alerts and sounds           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Interaction

### Global Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Cmd+P` / `Ctrl+P` | Quick open (files/entities) |
| `Cmd+Shift+P` / `Ctrl+Shift+P` | Command palette (explicit) |
| `Escape` | Close palette / Go back |

### Within Palette

| Key | Action |
| --- | ------ |
| `↑` / `↓` | Navigate results |
| `Enter` | Execute selected command |
| `Tab` | Drill into submenu |
| `Backspace` (empty) | Go back from submenu |
| `Cmd+Enter` | Execute in new tab/panel |

### Quick Filters

| Key | Effect |
| --- | ------ |
| `>` | Filter to commands only |
| `@` | Filter to characters |
| `#` | Filter to sessions |
| `/` | Filter to locations |

---

## State Management

### Zustand Store

```typescript
interface CommandPaletteState {
  // Visibility
  isOpen: boolean;

  // Search
  query: string;
  mode: SearchMode;
  results: ScoredCommand[];

  // Selection
  selectedIndex: number;

  // History
  recentCommands: string[]; // Command IDs
  recentSearches: string[];

  // Navigation stack (for submenus)
  breadcrumbs: { title: string; commands: Command[] }[];

  // Actions
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  executeSelected: () => void;
  pushSubmenu: (title: string, commands: Command[]) => void;
  popSubmenu: () => void;
}

const useCommandPalette = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  query: '',
  mode: 'commands',
  results: [],
  selectedIndex: 0,
  recentCommands: [],
  recentSearches: [],
  breadcrumbs: [],

  open: () => {
    set({ isOpen: true, query: '', selectedIndex: 0 });
    // Focus input
  },

  close: () => {
    set({ isOpen: false, breadcrumbs: [] });
  },

  setQuery: (query) => {
    const { mode, query: searchQuery } = parseQuery(query);
    const results = commandRegistry.search(searchQuery, getAppContext());
    set({ query, mode, results, selectedIndex: 0 });
  },

  executeSelected: () => {
    const { results, selectedIndex, recentCommands } = get();
    const selected = results[selectedIndex];

    if (selected) {
      executeCommand(selected.command);

      // Track in recents
      set({
        recentCommands: [
          selected.command.id,
          ...recentCommands.filter(id => id !== selected.command.id),
        ].slice(0, 10),
      });
    }
  },

  // ... other actions
}));
```

### Persistence

```typescript
// Persist recent commands and searches to localStorage
const STORAGE_KEY = 'command-palette-history';

function loadHistory(): CommandPaletteHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { recentCommands: [], recentSearches: [] };
  } catch {
    return { recentCommands: [], recentSearches: [] };
  }
}

function saveHistory(history: CommandPaletteHistory): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
```

---

## Integration Points

### Feature Registration

Each feature module registers its commands on mount:

```typescript
// In CharacterStudio.tsx
useEffect(() => {
  const provider = createCharacterStudioCommandProvider();
  commandRegistry.registerProvider(provider);

  return () => {
    commandRegistry.unregisterProvider(provider.id);
  };
}, []);
```

### Context Awareness

Commands receive current app context:

```typescript
function getAppContext(): AppContext {
  return {
    route: window.location.pathname,
    feature: detectCurrentFeature(),
    activeCharacter: characterStudioStore.getState().characterId,
    activeSession: sessionStore.getState().sessionId,
    user: authStore.getState().user,
  };
}
```

### Event System

Commands can emit events for cross-feature communication:

```typescript
const commandBus = new EventEmitter();

// In command execution
commandBus.emit('command:executed', { commandId: 'studio.save' });

// In analytics
commandBus.on('command:executed', ({ commandId }) => {
  trackEvent('command_used', { command: commandId });
});
```

---

## Built-in Commands

### Global Commands

```typescript
const globalCommands: Command[] = [
  // Navigation
  { id: 'nav.home', title: 'Go to Home', category: 'navigation', action: { type: 'navigate', path: '/' } },
  { id: 'nav.characters', title: 'Go to Characters', category: 'navigation', action: { type: 'navigate', path: '/characters' } },
  { id: 'nav.sessions', title: 'Go to Sessions', category: 'navigation', action: { type: 'navigate', path: '/sessions' } },
  { id: 'nav.settings', title: 'Open Settings', category: 'navigation', action: { type: 'navigate', path: '/settings' } },

  // Create
  { id: 'create.character', title: 'New Character', category: 'create', shortcut: { key: 'n', modifiers: ['cmd'] }, action: { type: 'navigate', path: '/characters/new' } },
  { id: 'create.session', title: 'New Session', category: 'create', shortcut: { key: 'n', modifiers: ['cmd', 'shift'] }, action: { type: 'navigate', path: '/sessions/new' } },

  // Settings
  { id: 'settings.theme', title: 'Toggle Theme', category: 'settings', action: { type: 'callback', fn: () => toggleTheme() } },
  { id: 'settings.api', title: 'Configure API Keys', category: 'settings', action: { type: 'navigate', path: '/settings/api' } },

  // Help
  { id: 'help.shortcuts', title: 'Show Keyboard Shortcuts', category: 'help', shortcut: { key: '/', modifiers: ['cmd'] }, action: { type: 'callback', fn: () => showShortcutsModal() } },
  { id: 'help.docs', title: 'Open Documentation', category: 'help', action: { type: 'callback', fn: () => window.open('/docs') } },
];
```

### Character Studio Commands

```typescript
const studioCommands: Command[] = [
  { id: 'studio.save', title: 'Save Character', when: { feature: 'character-studio' } },
  { id: 'studio.discard', title: 'Discard Changes', when: { feature: 'character-studio' } },
  { id: 'studio.preview', title: 'Preview Conversation', when: { feature: 'character-studio' } },
  { id: 'studio.export.json', title: 'Export as JSON', when: { feature: 'character-studio' } },
  { id: 'studio.export.yaml', title: 'Export as YAML', when: { feature: 'character-studio' } },
  { id: 'studio.import', title: 'Import Character', when: { feature: 'character-studio' } },

  // Section navigation
  { id: 'studio.goto.identity', title: 'Go to Identity Section', when: { feature: 'character-studio' } },
  { id: 'studio.goto.personality', title: 'Go to Personality Section', when: { feature: 'character-studio' } },
  { id: 'studio.goto.appearance', title: 'Go to Appearance Section', when: { feature: 'character-studio' } },
  { id: 'studio.goto.body', title: 'Go to Body Section', when: { feature: 'character-studio' } },

  // AI actions
  { id: 'studio.ai.generate-backstory', title: 'Generate Backstory', when: { feature: 'character-studio' } },
  { id: 'studio.ai.suggest-traits', title: 'Suggest Personality Traits', when: { feature: 'character-studio' } },
  { id: 'studio.ai.generate-sensory', title: 'Generate Sensory Profile', when: { feature: 'character-studio' } },
];
```

### Session Commands

```typescript
const sessionCommands: Command[] = [
  { id: 'session.save', title: 'Save Session', when: { feature: 'session' } },
  { id: 'session.add-npc', title: 'Add NPC to Scene', when: { feature: 'session' } },
  { id: 'session.advance-time', title: 'Advance Time...', when: { feature: 'session' } },
  { id: 'session.generate-event', title: 'Generate Random Event', when: { feature: 'session' } },
  { id: 'session.switch-location', title: 'Switch Location...', when: { feature: 'session' } },
  { id: 'session.export-log', title: 'Export Session Log', when: { feature: 'session' } },
];
```

---

## Component Structure

```text
src/
├── features/
│   └── command-palette/
│       ├── index.ts
│       ├── CommandPalette.tsx        # Main UI component
│       ├── CommandList.tsx           # Result list
│       ├── CommandItem.tsx           # Individual result
│       ├── SearchInput.tsx           # Input with mode indicator
│       ├── Breadcrumbs.tsx           # Submenu navigation
│       ├── store.ts                  # Zustand store
│       ├── registry.ts               # Command registry
│       ├── types.ts                  # TypeScript types
│       ├── search.ts                 # Fuzzy search logic
│       ├── keyboard.ts               # Keyboard handler
│       └── providers/
│           ├── global.ts             # Global commands
│           ├── character-studio.ts   # Studio commands
│           └── session.ts            # Session commands
```

---

## Accessibility

### ARIA Attributes

```tsx
<div
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-owns="command-results"
>
  <input
    role="searchbox"
    aria-autocomplete="list"
    aria-controls="command-results"
    aria-activedescendant={`command-${selectedIndex}`}
  />

  <ul role="listbox" id="command-results">
    {results.map((result, i) => (
      <li
        key={result.command.id}
        id={`command-${i}`}
        role="option"
        aria-selected={i === selectedIndex}
      >
        {result.command.title}
      </li>
    ))}
  </ul>
</div>
```

### Screen Reader Announcements

```typescript
function announceResults(count: number): void {
  const message = count === 0
    ? 'No results found'
    : `${count} result${count === 1 ? '' : 's'} found`;

  // Use aria-live region
  announcer.announce(message);
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

- Command registry and provider pattern
- Basic palette UI with fuzzy search
- Global keyboard shortcut (`Cmd+K`)
- Navigation commands

### Phase 2: Feature Integration

- Character Studio command provider
- Session command provider
- Context-aware filtering
- Recent commands tracking

### Phase 3: Advanced Search

- Prefix modes (`@`, `#`, `/`)
- Submenu drill-down
- Entity search (characters, sessions)
- Search result highlighting

### Phase 4: Polish

- Animations and transitions
- Accessibility audit
- Keyboard shortcut customization
- Command analytics

---

## Future Enhancements

### Command Chaining

```text
> @Elara > export json
> #DragonQuest > add @Theron
```

### Natural Language Commands

```text
> create an elf ranger named Sylvara
> start a new session in the tavern with Elara
```

### Custom User Commands

Allow users to create macros:

```typescript
interface UserMacro {
  id: string;
  name: string;
  trigger: string; // Custom keyword
  commands: string[]; // Command IDs to execute in sequence
}
```

### Plugin Commands

Third-party plugins can register commands:

```typescript
// Plugin API
window.minimalRPG.registerCommands([
  {
    id: 'plugin.my-command',
    title: 'My Custom Command',
    action: { type: 'callback', fn: () => myPluginAction() },
  },
]);
```

---

_The command palette transforms the application from a collection of features into a unified, efficient workspace. It's the foundation for power-user productivity._
