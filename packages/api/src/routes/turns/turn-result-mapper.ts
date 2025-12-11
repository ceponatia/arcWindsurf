/**
 * Turn Result Mapper
 *
 * Maps TurnResult from governor to TurnResultDto for API response.
 */
import type { TurnResult } from '@minimal-rpg/governor';
import type { TurnResultDto } from '../../sessions/types.js';
import type { Speaker } from '../../types.js';

/**
 * Map governor TurnResult to TurnResultDto.
 *
 * @param turnResult - Result from governor
 * @param speaker - Speaker metadata (optional)
 * @returns DTO for API response
 */
export function mapTurnResultToDto(turnResult: TurnResult, speaker?: Speaker): TurnResultDto {
  return {
    message: turnResult.message,
    speaker,
    events: turnResult.events,
    stateChanges: turnResult.stateChanges,
    metadata: turnResult.metadata,
    success: turnResult.success,
  };
}
