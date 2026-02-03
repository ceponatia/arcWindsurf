export type EntityUsageType = 'character' | 'setting' | 'persona' | 'location';

export interface SessionUsageInfo {
  sessionId: string;
  createdAt: string;
  role?: string;
}

export interface EntityUsageSummary {
  entityId: string;
  entityType: EntityUsageType;
  sessions: SessionUsageInfo[];
  totalCount: number;
}
