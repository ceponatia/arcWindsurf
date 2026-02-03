import type { SessionUsageInfo } from '@minimal-rpg/schemas';

export interface CharactersPanelCharacterSummary {
  id: string;
  name: string;
  summary: string;
  tags?: string[] | null;
}

export interface CharactersPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  characters?: CharactersPanelCharacterSummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDeleteRequest?: (id: string) => void;
}

export interface SessionsPanelSessionSummary {
  id: string;
  playerCharacterId?: string | null;
  settingId?: string | null;
  characterTemplateId?: string; // Legacy
  characterInstanceId?: string | null; // Legacy
  settingTemplateId?: string; // Legacy
  settingInstanceId?: string | null; // Legacy
  characterName?: string | null;
  settingName?: string | null;
  createdAt: string | Date;
}

export interface SessionsPanelProps {
  sessions: SessionsPanelSessionSummary[];
  loading?: boolean;
  error?: string | null;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onRetry?: () => void;
  onDelete?: (id: string) => void;
}

export interface EntityUsagePanelProps {
  /** The entity type being displayed */
  entityType: 'character' | 'setting' | 'persona' | 'location';
  /** Sessions using this entity */
  sessions: SessionUsageInfo[];
  /** Total count of sessions */
  totalCount: number;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when a session is clicked */
  onSessionClick?: (sessionId: string) => void;
  /** Maximum sessions to display before "show more" */
  maxDisplay?: number;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback to toggle collapse state */
  onToggleCollapse?: () => void;
}

export interface PersonasPanelPersonaSummary {
  id: string;
  name: string;
  summary: string;
}

export interface PersonasPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  personas?: PersonasPanelPersonaSummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDeleteRequest?: (id: string) => void;
}
