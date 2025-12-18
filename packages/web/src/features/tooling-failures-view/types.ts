export interface ToolingFailureEventDto {
  type: 'tooling-failure';
  timestamp: string | null;
  payload: Record<string, unknown>;
  source?: string;
}

export interface ToolingFailureEntryDto {
  turnIdx: number;
  createdAt: string;
  playerInput: string;
  events: ToolingFailureEventDto[];
}

export interface ToolingFailuresResponseDto {
  ok: true;
  sessionId: string;
  limit: number;
  count: number;
  failures: ToolingFailureEntryDto[];
}
