import { createGovernor, type Governor } from '../core/governor.js';
import type { GovernorConfig } from '../core/types.js';
import { NpcTurnHandler } from '../core/npc-turn-handler.js';
import type { AgentRegistry, NpcAgent, AgentStateSlices } from '@minimal-rpg/agents';

export interface GovernorFactoryConfig {
  agentRegistry: AgentRegistry;
  npcTranscriptLoader: GovernorConfig['npcTranscriptLoader'];
  devMode?: boolean;
  logging?: GovernorConfig['logging'];
}

export class GovernorFactory {
  constructor(private config: GovernorFactoryConfig) {}

  createForRequest(options: {
    ownerEmail: string;
    sessionId: string;
    stateSlices: AgentStateSlices;
  }): Governor {
    const { agentRegistry, npcTranscriptLoader, devMode, logging } = this.config;

    const npcAgent = agentRegistry.get('npc') as NpcAgent | undefined;
    if (!npcAgent) {
      throw new Error('[GovernorFactory] Required agent (npc) not registered');
    }

    const npcTurnHandler = new NpcTurnHandler({
      npcAgent,
      ownerEmail: options.ownerEmail,
      stateSlices: options.stateSlices,
    });

    const governorConfig: GovernorConfig = {
      toolTurnHandler: npcTurnHandler,
      ...(npcTranscriptLoader ? { npcTranscriptLoader } : {}),
      options: {
        ...(devMode !== undefined ? { devMode } : {}),
      },
      ...(logging ? { logging } : {}),
    };

    return createGovernor(governorConfig);
  }
}
