/**
 * Domain-scoped types for turns route.
 */
import type { LoadedTurnState } from '../../sessions/state-loader.js';
import type {
  TurnStateContext,
  SessionTag,
  TurnTagContext,
  ToolHistoryContext,
} from '@minimal-rpg/governor';
import type { PersonaProfile } from '@minimal-rpg/schemas';
import type { Speaker } from '../../types.js';

/**
 * Turn request body structure.
 */
export interface TurnRequestBody {
  input: string;
  npcId?: string;
}

/**
 * Validated turn request.
 */
export interface ValidatedTurnRequest {
  input: string;
  targetNpcId: string | null;
}

/**
 * Complete turn context for governor.
 */
export interface TurnContext {
  sessionId: string;
  playerInput: string;
  baseline: TurnStateContext;
  overrides: Partial<TurnStateContext>;
  sessionTags: SessionTag[];
  turnTagContext?: TurnTagContext;
  persona?: PersonaProfile;
  toolHistory?: ToolHistoryContext;
}

/**
 * Session state snapshot after loading.
 */
export interface SessionSnapshot {
  sessionId: string;
  loadedState: LoadedTurnState;
  messages: { role: string; content: string; createdAt: string; idx: number }[];
  sessionTags: SessionTag[];
  turnTagContext?: TurnTagContext;
  persona?: PersonaProfile;
  speaker?: Speaker;
}

/**
 * Turn persistence data.
 */
export interface TurnPersistenceData {
  sessionId: string;
  playerInput: string;
  turnIdx: number;
  loadedState: LoadedTurnState;
  sessionTags: SessionTag[];
  persona?: PersonaProfile;
  baseline: TurnStateContext;
  overrides: Partial<TurnStateContext>;
}
