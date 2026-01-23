export interface SpokePayload {
  content?: string;
  entityProfileId?: string;
}

export interface SessionMessageDto {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  idx: number;
  speaker?: {
    id: string;
    name: string;
  };
}
