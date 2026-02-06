/**
 * Session Workspace feature - unified session configuration interface
 */

export { SessionWorkspace } from './SessionWorkspace.js';
export { CompactBuilder } from './CompactBuilder.js';
export {
  useWorkspaceStore,
  useSettingState,
  useNpcsState,
  usePlayerState,
  useTagsState,
  useValidation,
  useCurrentStep,
  useWorkspaceMode,
  useIsDirty,
  useSaveStatus,
} from './store.js';
export type {
  WorkspaceStep,
  SettingWorkspaceState,
  NpcSessionConfig,
  NpcRole,
  SessionNpcTier,
  PlayerSessionConfig,
  TagSelection,
  RelationshipConfig,
  StepValidationState,
  WorkspaceValidationSummary,
  WorkspaceState,
  WorkspaceActions,
  WorkspaceStore,
} from './store.js';
export * from './steps/index.js';
