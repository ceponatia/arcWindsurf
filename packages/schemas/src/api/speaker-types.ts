/**
 * Speaker metadata for chat UI display.
 * Included in turn responses so UI can show character name/avatar.
 */
export interface Speaker {
  /** Character template ID */
  id: string;
  /** Display name */
  name: string;
  /** Profile picture URL (user-uploadable) */
  profilePic?: string | undefined;
  /** Emote picture URL (future: generated per-response) */
  emotePic?: string | undefined;
}

/**
 * Speaker metadata persisted with assistant messages.
 * Subset of Speaker without emotePic for storage efficiency.
 */
export type MessageSpeaker = Omit<Speaker, 'emotePic'>;
