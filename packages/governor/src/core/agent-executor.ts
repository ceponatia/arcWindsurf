import { type Operation } from 'fast-json-patch';
import { type Agent, type AgentInput, type AgentOutput, type AgentType } from '@minimal-rpg/agents';
import { type AgentExecutionResult, type TurnEvent, type TurnExecutionResult } from './types.js';

interface ExecuteAgentsOptions {
  agentTimeoutMs: number;
  logAgents?: boolean | undefined;
}

async function executeAgent(agent: Agent, input: AgentInput): Promise<AgentExecutionResult> {
  const startTime = Date.now();

  try {
    const output = await agent.execute(input);
    return {
      agentType: agent.agentType,
      output,
      executionTimeMs: Date.now() - startTime,
      success: true,
    };
  } catch (error) {
    const errorOutput: AgentOutput = {
      narrative: 'An error occurred while processing your action.',
      diagnostics: {
        warnings: [error instanceof Error ? error.message : 'Unknown error'],
      },
    };

    return {
      agentType: agent.agentType,
      output: errorOutput,
      executionTimeMs: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

async function executeAgentWithTimeout(
  agent: Agent,
  input: AgentInput,
  timeoutMs: number
): Promise<AgentExecutionResult> {
  const timeoutPromise = new Promise<AgentExecutionResult>((resolve) => {
    setTimeout(() => {
      resolve({
        agentType: agent.agentType,
        output: {
          narrative: '',
          diagnostics: {
            warnings: [`Agent ${agent.agentType} timed out after ${timeoutMs}ms`],
          },
        },
        executionTimeMs: timeoutMs,
        success: false,
        error: new Error(`Agent ${agent.agentType} timed out after ${timeoutMs}ms`),
      });
    }, timeoutMs);
  });

  const executePromise = executeAgent(agent, input);

  return Promise.race([executePromise, timeoutPromise]);
}

export async function executeAgentsWithTimeout(
  agents: Agent[],
  input: AgentInput,
  events: TurnEvent[],
  options: ExecuteAgentsOptions
): Promise<TurnExecutionResult> {
  const combinedPatches: Operation[] = [];
  const combinedEvents: TurnEvent[] = [];
  const successfulAgents: AgentType[] = [];
  const failedAgents: AgentType[] = [];
  const narratives: string[] = [];

  const { agentTimeoutMs, logAgents } = options;

  // Emit start events for all agents
  for (const agent of agents) {
    events.push({
      type: 'agent-started',
      timestamp: new Date(),
      payload: { agentType: agent.agentType },
      source: agent.agentType,
    });

    if (logAgents) {
      console.log(`[Governor] Executing agent: ${agent.name} (${agent.agentType})`);
    }
  }

  // Execute all agents in parallel
  const agentPromises = agents.map((agent) =>
    executeAgentWithTimeout(agent, input, agentTimeoutMs)
  );

  const agentResults = await Promise.all(agentPromises);

  // Process results
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i]!;
    const result = agentResults[i]!;

    events.push({
      type: 'agent-completed',
      timestamp: new Date(),
      payload: {
        agentType: agent.agentType,
        success: result.success,
        executionTimeMs: result.executionTimeMs,
      },
      source: agent.agentType,
    });

    if (result.success) {
      successfulAgents.push(agent.agentType);
      narratives.push(result.output.narrative);

      if (result.output.statePatches) {
        combinedPatches.push(...result.output.statePatches);
      }

      if (result.output.events) {
        for (const agentEvent of result.output.events) {
          combinedEvents.push({
            type: 'custom',
            timestamp: new Date(),
            payload: agentEvent.payload,
            source: agentEvent.source,
          });
        }
      }
    } else {
      failedAgents.push(agent.agentType);
    }
  }

  return {
    agentResults,
    combinedNarrative: narratives.join('\n\n'),
    combinedPatches,
    combinedEvents,
    successfulAgents,
    failedAgents,
  };
}
