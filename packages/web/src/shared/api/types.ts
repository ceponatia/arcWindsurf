export interface CreateFullSessionRequest {
  settingId: string;
  personaId?: string;
  startLocationId?: string;
  startTime?: {
    year?: number;
    month?: number;
    day?: number;
    hour: number;
    minute: number;
  };
  secondsPerTurn?: number;
  npcs: {
    characterId: string;
    role: string;
    tier: string;
    startLocationId?: string;
    label?: string;
  }[];
  relationships?: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
    affinitySeed?: {
      trust?: number;
      fondness?: number;
      fear?: number;
    };
  }[];
  tags?: {
    tagId: string;
    targetType: string;
    targetEntityId?: string | null;
  }[];
}

export interface CreateFullSessionResponse {
  id: string;
  settingId: string;
  playerCharacterId: string;
  personaId: string | null;
  startLocationId: string | null;
  secondsPerTurn: number;
  createdAt: string;
  npcs: {
    instanceId: string;
    templateId: string;
    role: string;
    tier: string;
    label: string | null;
    startLocationId: string | null;
  }[];
  tagBindings: {
    id: string;
    tagId: string;
    targetType: string;
    targetEntityId: string | null;
  }[];
  relationships: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
  }[];
}
