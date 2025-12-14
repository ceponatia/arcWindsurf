import type { getDbOverview, getDbPathInfo } from '@minimal-rpg/db/node';
import type { ChatRole } from '../types.js';

export interface DbMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
  idx: number;
  /** Speaker metadata for assistant messages */
  speaker?: {
    id: string;
    name: string;
    profilePic?: string;
  };
}

export interface DbNpcMessage {
  idx: number;
  speaker: 'player' | 'npc' | 'narrator';
  content: string;
  createdAt: string;
}

export interface StateChangeLogEntry {
  id: string;
  sessionId: string;
  turnIdx: number | null;
  patchCount: number;
  modifiedPaths: string[];
  agentTypes: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  turnIdx: number;
  ownerUserId: string | null;
  playerInput: string;
  context?: Record<string, unknown> | null;
  debug?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DbSession {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
  messages: DbMessage[];
}

export type DbSessionSummary = Pick<
  DbSession,
  | 'id'
  | 'characterTemplateId'
  | 'characterInstanceId'
  | 'settingTemplateId'
  | 'settingInstanceId'
  | 'createdAt'
>;

// Admin DB types (aliases to external return shapes)
export type AdminDbOverview = Awaited<ReturnType<typeof getDbOverview>>;
export type AdminDbPathInfo = Awaited<ReturnType<typeof getDbPathInfo>>;

// DB rows returned from @minimal-rpg/db prisma-like helpers
export interface ProfileRow {
  id: string;
  profileJson: string;
}
export type CharacterProfileRow = ProfileRow;
export type SettingProfileRow = ProfileRow;
export type PersonaProfileRow = ProfileRow;

// Deprecated aliases
export type CharacterTemplateRow = CharacterProfileRow;
export type SettingTemplateRow = SettingProfileRow;

export interface CharacterInstanceRow {
  id: string;
  sessionId: string;
  templateId: string;
  templateSnapshot: string;
  profileJson: string;
  overridesJson?: string;
  role: string;
  label?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface SettingInstanceRow {
  id: string;
  sessionId: string;
  templateId: string;
  templateSnapshot: string;
  profileJson: string;
  overridesJson?: string;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  idx: number;
  role: ChatRole;
  content: string;
  createdAt?: string | Date | null;
}

// Item definition row (library/template)
export interface ItemDefinitionRow {
  id: string;
  category: string;
  // JSONB columns are auto-parsed by node-postgres
  definitionJson: unknown;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// Item instance row (per-session copy)
export interface ItemInstanceRow {
  id: string;
  sessionId: string;
  definitionId: string;
  // JSONB columns are auto-parsed by node-postgres
  definitionSnapshot: unknown;
  ownerType: string;
  ownerId: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// Persona row (user-level player character)
export interface PersonaRow {
  id: string;
  userId: string;
  profileJson: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// Session persona row (per-session persona attachment)
export interface SessionPersonaRow {
  sessionId: string;
  personaId: string;
  profileJson: string;
  overridesJson?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// NPC hygiene state row
export interface NpcHygieneStateRow {
  id: string;
  sessionId: string;
  npcId: string;
  bodyPart: string;
  points: number;
  level: number;
  lastUpdatedAt?: Date | null;
  createdAt?: Date | null;
}

// Schedule template row
export interface ScheduleTemplateRow {
  id: string;
  name: string;
  description: string | null;
  templateData: unknown;
  requiredPlaceholders: string[];
  isSystem: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

// NPC schedule row (resolved schedule for a specific NPC in a session)
export interface NpcScheduleRow {
  id: string;
  sessionId: string;
  npcId: string;
  templateId: string | null;
  scheduleData: unknown;
  placeholderMappings: unknown;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ProfileTable<T extends ProfileRow> {
  findMany(): Promise<T[]>;
  findUnique(args: { where: { id: string } }): Promise<T | null>;
  create(args: { data: { id: string; profileJson: string } }): Promise<T>;
  update(args: { where: { id: string }; data: { profileJson: string } }): Promise<T>;
  delete(args: { where: { id: string } }): Promise<void>;
}

// Deprecated alias
export type TemplateTable<T extends ProfileRow> = ProfileTable<T>;

export interface CharacterInstanceTable {
  findUnique(args: {
    where: { id?: string; sessionId?: string; role?: string };
  }): Promise<CharacterInstanceRow | null>;
  findMany(args?: {
    where?: { sessionId?: string; role?: string };
    orderBy?: { createdAt?: 'asc' | 'desc' };
  }): Promise<CharacterInstanceRow[]>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      templateId: string;
      templateSnapshot: string;
      profileJson: string;
      overridesJson?: string;
      role?: string;
      label?: string | null;
    };
  }): Promise<CharacterInstanceRow>;
  update(args: {
    where: { id: string };
    data: { profileJson?: string; overridesJson?: string; role?: string; label?: string | null };
  }): Promise<CharacterInstanceRow>;
  delete(args: { where: { id: string } }): Promise<void>;
}

export interface SettingInstanceTable {
  findUnique(args: {
    where: { id?: string; sessionId?: string };
  }): Promise<SettingInstanceRow | null>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      templateId: string;
      templateSnapshot: string;
      profileJson: string;
      overridesJson?: string;
    };
  }): Promise<SettingInstanceRow>;
  update(args: {
    where: { id: string };
    data: { profileJson?: string; overridesJson?: string };
  }): Promise<SettingInstanceRow>;
  delete(args: { where: { id: string } }): Promise<void>;
}

export interface ItemDefinitionTable {
  findMany(args?: {
    where?: { category?: string };
    orderBy?: { createdAt?: 'asc' | 'desc' };
  }): Promise<ItemDefinitionRow[]>;
  findUnique(args: { where: { id: string } }): Promise<ItemDefinitionRow | null>;
  create(args: {
    data: { id: string; category: string; definitionJson: string };
  }): Promise<ItemDefinitionRow>;
  update(args: {
    where: { id: string };
    data: { category?: string; definitionJson?: string };
  }): Promise<ItemDefinitionRow>;
  delete(args: { where: { id: string } }): Promise<void>;
}

export interface ItemInstanceTable {
  findMany(args?: {
    where?: { sessionId?: string; ownerType?: string; ownerId?: string; definitionId?: string };
    orderBy?: { createdAt?: 'asc' | 'desc' };
  }): Promise<ItemInstanceRow[]>;
  findUnique(args: { where: { id: string } }): Promise<ItemInstanceRow | null>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      definitionId: string;
      definitionSnapshot: string;
      ownerType: string;
      ownerId: string;
    };
  }): Promise<ItemInstanceRow>;
  update(args: {
    where: { id: string };
    data: { ownerType?: string; ownerId?: string };
  }): Promise<ItemInstanceRow>;
  delete(args: { where: { id: string } }): Promise<void>;
}

export interface PrismaClientLike {
  characterProfile: ProfileTable<CharacterProfileRow>;
  settingProfile: ProfileTable<SettingProfileRow>;
  message: {
    update(args: {
      where: { sessionId: string; idx: number };
      data: { content: string };
    }): Promise<MessageRow | null>;
    findFirst(args: {
      where: { sessionId: string; idx?: number };
      orderBy?: { idx?: 'asc' | 'desc' };
    }): Promise<MessageRow | null>;
    deleteMany(args?: { where?: { sessionId?: string; idx?: number } }): Promise<void>;
  };
  characterTemplate: TemplateTable<CharacterTemplateRow>;
  settingTemplate: TemplateTable<SettingTemplateRow>;
  characterInstance: CharacterInstanceTable;
  settingInstance: SettingInstanceTable;
  itemDefinition: ItemDefinitionTable;
  itemInstance: ItemInstanceTable;
  persona: {
    findMany(args?: { where?: { userId?: string } }): Promise<PersonaRow[]>;
    findUnique(args: { where: { id: string } }): Promise<PersonaRow | null>;
    create(args: {
      data: { id: string; userId: string; profileJson: string };
    }): Promise<PersonaRow>;
    update(args: {
      where: { id: string };
      data: { profileJson?: string; updatedAt?: string };
    }): Promise<PersonaRow | null>;
    delete(args: { where: { id: string } }): Promise<void>;
  };
  sessionPersona: {
    findUnique(args: { where: { sessionId: string } }): Promise<SessionPersonaRow | null>;
    create(args: {
      data: { sessionId: string; personaId: string; profileJson: string; overridesJson?: string };
    }): Promise<SessionPersonaRow>;
    update(args: {
      where: { sessionId: string };
      data: { profileJson?: string; overridesJson?: string; updatedAt?: string };
    }): Promise<SessionPersonaRow | null>;
    delete(args: { where: { sessionId: string } }): Promise<void>;
  };
  npcHygieneState: {
    findMany(args?: {
      where?: { sessionId?: string; npcId?: string; bodyPart?: string };
    }): Promise<NpcHygieneStateRow[]>;
    findUnique(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
    }): Promise<NpcHygieneStateRow | null>;
    upsert(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
      create: {
        sessionId: string;
        npcId: string;
        bodyPart: string;
        points: number;
        level: number;
        lastUpdatedAt?: Date;
      };
      update: { points?: number; level?: number; lastUpdatedAt?: Date };
    }): Promise<NpcHygieneStateRow>;
    update(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
      data: { points?: number; level?: number; lastUpdatedAt?: Date };
    }): Promise<NpcHygieneStateRow>;
    delete(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
    }): Promise<void>;
    deleteMany(args?: { where?: { sessionId?: string; npcId?: string } }): Promise<void>;
  };
  scheduleTemplate: {
    findMany(args?: { where?: { isSystem?: boolean } }): Promise<ScheduleTemplateRow[]>;
    findUnique(args: { where: { id: string } }): Promise<ScheduleTemplateRow | null>;
    create(args: {
      data: {
        name: string;
        description?: string;
        templateData: unknown;
        requiredPlaceholders: string[];
        isSystem?: boolean;
      };
    }): Promise<ScheduleTemplateRow>;
    update(args: {
      where: { id: string };
      data: {
        name?: string;
        description?: string;
        templateData?: unknown;
        requiredPlaceholders?: string[];
      };
    }): Promise<ScheduleTemplateRow>;
    delete(args: { where: { id: string } }): Promise<void>;
  };
  npcSchedule: {
    findMany(args?: {
      where?: { sessionId?: string; npcId?: string };
    }): Promise<NpcScheduleRow[]>;
    findUnique(args: {
      where: { sessionId_npcId: { sessionId: string; npcId: string } };
    }): Promise<NpcScheduleRow | null>;
    upsert(args: {
      where: { sessionId_npcId: { sessionId: string; npcId: string } };
      create: {
        sessionId: string;
        npcId: string;
        templateId?: string;
        scheduleData: unknown;
        placeholderMappings?: unknown;
      };
      update: {
        templateId?: string;
        scheduleData?: unknown;
        placeholderMappings?: unknown;
      };
    }): Promise<NpcScheduleRow>;
    delete(args: {
      where: { sessionId_npcId: { sessionId: string; npcId: string } };
    }): Promise<void>;
    deleteMany(args?: { where?: { sessionId?: string } }): Promise<void>;
  };
}

export interface SessionsClientLike {
  createSession(
    id: string,
    characterTemplateId: string,
    settingTemplateId: string
  ): Promise<DbSession>;
  getSession(id: string): Promise<DbSession | undefined>;
  listSessions(): Promise<DbSessionSummary[]>;
  deleteSession(id: string): Promise<void>;
  appendMessage(
    sessionId: string,
    role: ChatRole,
    content: string,
    speaker?: { id: string; name: string; profilePic?: string }
  ): Promise<void>;
  appendNpcMessage(
    sessionId: string,
    npcId: string,
    speaker: 'player' | 'npc' | 'narrator',
    content: string
  ): Promise<void>;
  getNpcMessages(
    sessionId: string,
    npcId: string,
    options?: { limit?: number }
  ): Promise<DbNpcMessage[]>;
  appendStateChangeLog(params: {
    sessionId: string;
    turnIdx?: number | null;
    patchCount: number;
    modifiedPaths: string[];
    agentTypes: string[];
    metadata?: Record<string, unknown>;
  }): Promise<StateChangeLogEntry>;
  appendSessionHistoryEntry(params: {
    sessionId: string;
    turnIdx: number;
    playerInput: string;
    ownerUserId?: string | null;
    context?: Record<string, unknown> | null;
    debug?: Record<string, unknown> | null;
  }): Promise<SessionHistoryEntry>;
  getSessionHistory(
    sessionId: string,
    options?: { limit?: number }
  ): Promise<SessionHistoryEntry[]>;
}
