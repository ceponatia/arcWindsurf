import { useState } from 'react';

type InputMode = 'speech' | 'thought' | 'action';

const MODE_CONFIG: Record<InputMode, { prefix: string; suffix: string; icon: string }> = {
  speech: { prefix: '', suffix: '', icon: '💬' },
  thought: { prefix: '~', suffix: '~', icon: '💭' },
  action: { prefix: '*', suffix: '*', icon: '🎬' },
};

/**
 * Hook for managing input mode toggle (speech/thought/action).
 * Provides functions to cycle modes and insert/cleanup markers.
 */
export function useInputMode() {
  const [mode, setMode] = useState<InputMode>('speech');

  /**
   * Cycle to the next input mode
   */
  const cycleMode = () => {
    const modes: InputMode[] = ['speech', 'thought', 'action'];
    const idx = modes.indexOf(mode);
    const nextMode = modes[(idx + 1) % modes.length];
    if (nextMode) {
      setMode(nextMode);
    }
  };

  /**
   * Insert mode markers at cursor position
   * @returns Updated text and new cursor position
   */
  const insertModeMarkers = (
    text: string,
    cursorPos: number
  ): { newText: string; newCursor: number } => {
    const config = MODE_CONFIG[mode];
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    const newText = `${before}${config.prefix}${config.suffix}${after}`;
    const newCursor = cursorPos + config.prefix.length;
    return { newText, newCursor };
  };

  /**
   * Clean up empty markers (~~, **) from text
   */
  const cleanupEmptyMarkers = (text: string): string => {
    return text
      .replace(/~~|\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return {
    mode,
    cycleMode,
    insertModeMarkers,
    cleanupEmptyMarkers,
    config: MODE_CONFIG[mode],
  };
}
