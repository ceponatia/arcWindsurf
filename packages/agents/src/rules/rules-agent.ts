import { BaseAgent } from '../core/base.js';
import type {
  AgentConfig,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  IntentType,
  InventoryItem,
} from '../core/types.js';

/**
 * Agent responsible for game rules, checks, and item interactions.
 * Handles intents like 'use', 'take', 'give', and 'attack'.
 */
export class RulesAgent extends BaseAgent {
  public readonly agentType: AgentType = 'rules';
  public readonly name = 'Rules/System Agent';

  /** Intent types this agent can handle */
  private static readonly HANDLED_INTENTS: IntentType[] = ['use', 'take', 'give', 'attack'];

  constructor(config: AgentConfig = {}) {
    super(config);
  }

  canHandle(intent: AgentIntent): boolean {
    return RulesAgent.HANDLED_INTENTS.includes(intent.type);
  }

  protected process(input: AgentInput): Promise<AgentOutput> {
    const intent = input.intent;

    if (!intent) {
      return Promise.resolve({
        narrative: 'You consider your options.',
      });
    }

    switch (intent.type) {
      case 'use':
        return Promise.resolve(this.handleUse(input));
      case 'take':
        return Promise.resolve(this.handleTake(input));
      case 'give':
        return Promise.resolve(this.handleGive(input));
      case 'attack':
        return Promise.resolve(this.handleAttack(input));
      default:
        return Promise.resolve({
          narrative: 'You are unsure how to proceed.',
        });
    }
  }

  /**
   * Handle using an item.
   */
  private handleUse(input: AgentInput): AgentOutput {
    const itemName = input.intent?.params.item;
    const target = input.intent?.params.target;

    if (!itemName) {
      return {
        narrative: 'What do you want to use?',
      };
    }

    // Find the item in inventory
    const inventory = input.stateSlices.inventory;
    const item = this.findItem(inventory?.items ?? [], itemName);

    if (!item) {
      return {
        narrative: `You don't have a ${itemName}.`,
      };
    }

    if (item.usable === false) {
      return {
        narrative: `You cannot use the ${item.name} like that.`,
      };
    }

    // Generate use narrative
    const narrative = target
      ? `You use the ${item.name} on ${target}.`
      : `You use the ${item.name}.`;

    return {
      narrative,
      events: [
        {
          type: 'item_used',
          payload: {
            itemId: item.id,
            itemName: item.name,
            target,
          },
          source: this.agentType,
        },
      ],
    };
  }

  /**
   * Handle taking an item.
   */
  private handleTake(input: AgentInput): AgentOutput {
    const itemName = input.intent?.params.item ?? input.intent?.params.target;

    if (!itemName) {
      return {
        narrative: 'What do you want to take?',
      };
    }

    // Check inventory capacity
    const inventory = input.stateSlices.inventory;
    if (inventory?.capacity !== undefined) {
      const currentCount = inventory.items.length;
      if (currentCount >= inventory.capacity) {
        return {
          narrative: 'Your inventory is full. You cannot carry anything more.',
        };
      }
    }

    // In a real implementation, we'd check if the item exists in the location
    // For now, we assume the action is valid and emit an event

    return {
      narrative: `You pick up the ${itemName}.`,
      events: [
        {
          type: 'item_taken',
          payload: {
            itemName,
          },
          source: this.agentType,
        },
      ],
    };
  }

  /**
   * Handle giving an item.
   */
  private handleGive(input: AgentInput): AgentOutput {
    const itemName = input.intent?.params.item;
    const target = input.intent?.params.target;

    if (!itemName) {
      return {
        narrative: 'What do you want to give?',
      };
    }

    if (!target) {
      return {
        narrative: 'Who do you want to give it to?',
      };
    }

    // Find the item in inventory
    const inventory = input.stateSlices.inventory;
    const item = this.findItem(inventory?.items ?? [], itemName);

    if (!item) {
      return {
        narrative: `You don't have a ${itemName} to give.`,
      };
    }

    // Remove from inventory
    const statePatches = [
      {
        op: 'remove' as const,
        path: `/inventory/items/${this.findItemIndex(inventory?.items ?? [], item.id)}`,
      },
    ];

    return {
      narrative: `You give the ${item.name} to ${target}.`,
      statePatches,
      events: [
        {
          type: 'item_given',
          payload: {
            itemId: item.id,
            itemName: item.name,
            recipient: target,
          },
          source: this.agentType,
        },
      ],
    };
  }

  /**
   * Handle an attack action.
   */
  private handleAttack(input: AgentInput): AgentOutput {
    const target = input.intent?.params.target;

    if (!target) {
      return {
        narrative: 'Who or what do you want to attack?',
      };
    }

    // Combat is not fully implemented - emit an event for the governor to handle
    return {
      narrative: `You prepare to attack ${target}!`,
      events: [
        {
          type: 'combat_initiated',
          payload: {
            target,
            initiator: 'player',
          },
          source: this.agentType,
        },
      ],
      diagnostics: {
        warnings: ['Combat system not fully implemented'],
      },
    };
  }

  /**
   * Find an item in the inventory by name.
   */
  private findItem(items: InventoryItem[], name: string): InventoryItem | undefined {
    const normalizedName = name.toLowerCase().trim();

    return items.find((item) => {
      const itemName = item.name.toLowerCase().trim();
      return itemName === normalizedName || itemName.includes(normalizedName);
    });
  }

  /**
   * Find the index of an item in the inventory.
   */
  private findItemIndex(items: InventoryItem[], itemId: string): number {
    return items.findIndex((item) => item.id === itemId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    return 'Nothing happens.';
  }
}
