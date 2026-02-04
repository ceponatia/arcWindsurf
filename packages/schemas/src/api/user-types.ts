export type UserRole = 'user' | 'admin';

export type WorkspaceMode = 'wizard' | 'compact';

export interface UserPreferences {
  workspaceMode?: WorkspaceMode;
  [key: string]: unknown;
}
