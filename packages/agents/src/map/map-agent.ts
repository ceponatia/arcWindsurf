import { BaseAgent } from '../core/base.js';
import type {
  AgentConfig,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  IntentType,
  LocationExit,
  LocationSlice,
} from '../core/types.js';
import { MAP_INTENT_TYPES } from './types.js';

/**
 * Agent responsible for navigation and movement.
 * Handles intents like 'move' and 'look'.
 */
export class MapAgent extends BaseAgent {
  public readonly agentType: AgentType = 'map';
  public readonly name = 'Map/Navigation Agent';

  /** Intent types this agent can handle */
  private static readonly HANDLED_INTENTS: readonly IntentType[] = MAP_INTENT_TYPES;

  constructor(config: AgentConfig = {}) {
    super(config);
  }

  canHandle(intent: AgentIntent): boolean {
    return MapAgent.HANDLED_INTENTS.includes(intent.type);
  }

  protected process(input: AgentInput): Promise<AgentOutput> {
    const intent = input.intent;
    const location = input.stateSlices.location;

    // If no intent or no location, provide a generic response
    if (!intent) {
      return Promise.resolve(this.describeCurrentLocation(location));
    }

    switch (intent.type) {
      case 'move':
        return Promise.resolve(this.handleMove(input, location));
      case 'look':
        return Promise.resolve(this.handleLook(input, location));
      default:
        return Promise.resolve(this.describeCurrentLocation(location));
    }
  }

  /**
   * Handle a move intent.
   */
  private handleMove(input: AgentInput, location: LocationSlice | undefined): AgentOutput {
    if (!location) {
      return {
        narrative: 'You are in an undefined space. There is nowhere to go.',
        diagnostics: {
          warnings: ['No location data available'],
        },
      };
    }

    const direction = input.intent?.params.direction;
    if (!direction) {
      // No direction specified - describe available exits
      return this.describeExits(location);
    }

    // Find matching exit
    const exit = this.findExit(location, direction);
    if (!exit) {
      return {
        narrative: `You cannot go ${direction} from here.`,
      };
    }

    if (exit.accessible === false) {
      return {
        narrative: exit.description
          ? `You cannot go that way: ${exit.description}`
          : `The way ${direction} is blocked.`,
      };
    }

    // Movement successful - generate patch to update location
    const statePatches = [
      {
        op: 'replace' as const,
        path: '/location/id',
        value: exit.targetId,
      },
    ];

    const narrative = this.generateMoveNarrative(direction, exit);

    return {
      narrative,
      statePatches,
      events: [
        {
          type: 'location_changed',
          payload: {
            from: location.id,
            to: exit.targetId,
            direction,
          },
          source: this.agentType,
        },
      ],
    };
  }

  /**
   * Handle a look intent.
   */
  private handleLook(input: AgentInput, location: LocationSlice | undefined): AgentOutput {
    if (!location) {
      return {
        narrative: 'You look around but see only darkness.',
        diagnostics: {
          warnings: ['No location data available'],
        },
      };
    }

    const target = input.intent?.params.target;

    if (target) {
      // Looking at something specific
      return this.lookAtTarget(input, target);
    }

    // General look - describe the location
    return this.describeCurrentLocation(location);
  }

  /**
   * Describe the current location.
   */
  private describeCurrentLocation(location: LocationSlice | undefined): AgentOutput {
    if (!location) {
      return {
        narrative: 'You find yourself in an undefined space.',
      };
    }

    const parts: string[] = [];
    parts.push(`**${location.name}**`);
    parts.push('');
    parts.push(location.description);

    if (location.exits && location.exits.length > 0) {
      parts.push('');
      parts.push(this.formatExits(location.exits));
    }

    return {
      narrative: parts.join('\n'),
    };
  }

  /**
   * Describe available exits.
   */
  private describeExits(location: LocationSlice): AgentOutput {
    if (!location.exits || location.exits.length === 0) {
      return {
        narrative: 'There are no obvious exits from here.',
      };
    }

    return {
      narrative: `From here, you can go: ${this.formatExits(location.exits)}`,
    };
  }

  /**
   * Look at a specific target.
   */
  private lookAtTarget(input: AgentInput, target: string): AgentOutput {
    // Check knowledge context for relevant information
    const relevantContext = input.knowledgeContext?.filter((item) =>
      item.content.toLowerCase().includes(target.toLowerCase())
    );

    if (relevantContext && relevantContext.length > 0) {
      const descriptions = relevantContext.map((item) => item.content);
      return {
        narrative: descriptions.join(' '),
      };
    }

    return {
      narrative: `You don't see anything noteworthy about ${target}.`,
    };
  }

  /**
   * Find an exit matching the given direction.
   */
  private findExit(location: LocationSlice, direction: string): LocationExit | undefined {
    if (!location.exits) {
      return undefined;
    }

    const normalizedDirection = direction.toLowerCase().trim();

    return location.exits.find((exit) => {
      const exitDirection = exit.direction.toLowerCase().trim();
      return (
        exitDirection === normalizedDirection ||
        exitDirection.includes(normalizedDirection) ||
        normalizedDirection.includes(exitDirection)
      );
    });
  }

  /**
   * Generate narrative for a successful move.
   */
  private generateMoveNarrative(direction: string, exit: LocationExit): string {
    if (exit.description) {
      return `You head ${direction}. ${exit.description}`;
    }
    return `You head ${direction}.`;
  }

  /**
   * Format exits for display.
   */
  private formatExits(exits: LocationExit[]): string {
    const directions = exits
      .filter((exit) => exit.accessible !== false)
      .map((exit) => exit.direction);

    if (directions.length === 0) {
      return 'All exits are blocked.';
    }

    if (directions.length === 1) {
      return directions[0] ?? '';
    }

    const last = directions.pop();
    return `${directions.join(', ')} or ${last}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    return 'You look around, trying to get your bearings.';
  }
}
