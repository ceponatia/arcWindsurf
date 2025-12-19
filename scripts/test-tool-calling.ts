#!/usr/bin/env npx tsx
/**
 * Test script for LLM tool calling via OpenRouter/DeepSeek
 *
 * This script tests whether DeepSeek correctly:
 * 1. Recognizes when to call tools
 * 2. Generates valid tool call JSON
 * 3. Uses tool results to produce final responses
 *
 * Usage:
 *   npx tsx scripts/test-tool-calling.ts
 *   npx tsx scripts/test-tool-calling.ts --prompt "I want to go north"
 *   npx tsx scripts/test-tool-calling.ts --verbose
 *
 * Requires:
 *   OPENROUTER_API_KEY in repo-root .env or environment
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load repo-root .env so CLI tests reuse the same config as the API.
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// ============================================================================
// Types
// ============================================================================

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OpenRouterResponse {
  id?: string;
  choices?: {
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }[];
  error?: {
    message?: string;
    code?: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ============================================================================
// Tool Definitions (What the LLM sees)
// ============================================================================

const GAME_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'navigate_player',
      description:
        'Move the player to a new location or describe available exits. Use this when the player wants to move, go somewhere, or asks about exits/directions.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            description: 'The direction to move (north, south, east, west, up, down)',
            enum: ['north', 'south', 'east', 'west', 'up', 'down'],
          },
          describe_only: {
            type: 'boolean',
            description: 'If true, just describe exits without moving',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npc_dialogue',
      description:
        'Generate NPC dialogue in response to player speech or action. Use this when the player talks to, interacts with, or addresses an NPC.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: {
            type: 'string',
            description: 'The ID or name of the NPC to interact with',
          },
          player_utterance: {
            type: 'string',
            description: 'What the player said or did',
          },
          tone: {
            type: 'string',
            description: 'The emotional tone of the interaction',
            enum: ['friendly', 'hostile', 'neutral', 'flirty', 'formal'],
          },
        },
        required: ['npc_id', 'player_utterance'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sensory_detail',
      description:
        'Retrieve sensory information about a target. Use this when the player wants to smell, touch, taste, look at, or listen to something.',
      parameters: {
        type: 'object',
        properties: {
          sense_type: {
            type: 'string',
            description: 'The type of sensory perception',
            enum: ['smell', 'touch', 'taste', 'look', 'listen'],
          },
          target: {
            type: 'string',
            description: 'What or who the player is sensing',
          },
          body_part: {
            type: 'string',
            description: 'Specific body part if targeting a character',
          },
        },
        required: ['sense_type', 'target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'use_item',
      description:
        'Use an item from inventory, optionally on a target. Use this when the player wants to use, apply, or activate an item.',
      parameters: {
        type: 'object',
        properties: {
          item_name: {
            type: 'string',
            description: 'The name of the item to use',
          },
          target: {
            type: 'string',
            description: 'Optional target for the item (person, object, or location)',
          },
        },
        required: ['item_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'examine_object',
      description:
        'Closely examine an object, person, or area for details. Use this when the player wants to inspect, examine, or study something.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'What to examine',
          },
          focus: {
            type: 'string',
            description: 'Specific aspect to focus on',
          },
        },
        required: ['target'],
      },
    },
  },
];

// ============================================================================
// Mock Tool Handlers (Simulate game state)
// ============================================================================

const MOCK_GAME_STATE = {
  currentLocation: {
    id: 'tavern_bedroom',
    name: 'The Rusty Tankard - Bedroom',
    description:
      'A cozy tavern bedroom filled with the smell of ale and woodsmoke. Elara is sitting on the bed, looking at you deviously.',
    exits: {
      east: { targetId: 'lavatory', name: 'Lavatory' },
      down: { targetId: 'tavern_main', name: 'Tavern main floor' },
    },
  },
  npcs: [
    {
      id: 'elara',
      name: 'Elara',
      description:
        'A mysterious elven bard with silver hair. The top of her robe is pulled open, revealing ample cleavage. She has a playful smile and mischievous eyes.',
      mood: 'aroused',
      scent: 'her feet smell vinegary and earthy',
    },
  ],
  inventory: ['rusty sword', 'healing potion', 'torch', 'rope'],
};

type ToolHandler = (args: Record<string, unknown>) => unknown;

const toolHandlers: Record<string, ToolHandler> = {
  navigate_player: (args) => {
    const direction = args.direction as string | undefined;
    const describeOnly = args.describe_only as boolean | undefined;

    if (describeOnly || !direction) {
      const exits = Object.entries(MOCK_GAME_STATE.currentLocation.exits)
        .map(([dir, exit]) => `${dir}: ${exit.name}`)
        .join(', ');
      return {
        success: true,
        current_location: MOCK_GAME_STATE.currentLocation.name,
        available_exits: exits,
        description: MOCK_GAME_STATE.currentLocation.description,
      };
    }

    const exit =
      MOCK_GAME_STATE.currentLocation.exits[
        direction as keyof typeof MOCK_GAME_STATE.currentLocation.exits
      ];
    if (!exit) {
      return {
        success: false,
        error: `There is no exit to the ${direction}`,
        available_exits: Object.keys(MOCK_GAME_STATE.currentLocation.exits).join(', '),
      };
    }

    return {
      success: true,
      moved_to: exit.name,
      new_location_id: exit.targetId,
      message: `You head ${direction} toward the ${exit.name}.`,
    };
  },

  npc_dialogue: (args) => {
    const npcId = (args.npc_id as string)?.toLowerCase();
    const npc = MOCK_GAME_STATE.npcs.find((n) => n.id === npcId || n.name.toLowerCase() === npcId);

    if (!npc) {
      return {
        success: false,
        error: `No NPC named "${args.npc_id}" is present`,
        available_npcs: MOCK_GAME_STATE.npcs.map((n) => n.name).join(', '),
      };
    }

    return {
      success: true,
      npc_name: npc.name,
      npc_mood: npc.mood,
      npc_description: npc.description,
      player_said: args.player_utterance,
      suggested_response_tone: args.tone ?? 'neutral',
    };
  },

  get_sensory_detail: (args) => {
    const senseType = args.sense_type as string;
    const target = (args.target as string)?.toLowerCase();

    // Check if targeting an NPC
    const npc = MOCK_GAME_STATE.npcs.find(
      (n) => n.name.toLowerCase() === target || target?.includes(n.name.toLowerCase())
    );

    if (npc) {
      if (senseType === 'smell' && npc.scent) {
        return {
          success: true,
          sense_type: senseType,
          target: npc.name,
          body_part: args.body_part ?? 'general',
          detail: npc.scent,
          context: `${npc.name} carries the scent of ${npc.scent}`,
        };
      }
      if (senseType === 'look') {
        return {
          success: true,
          sense_type: senseType,
          target: npc.name,
          detail: npc.description,
        };
      }
      return {
        success: true,
        sense_type: senseType,
        target: npc.name,
        detail: `You ${senseType} ${npc.name} but notice nothing remarkable.`,
      };
    }

    // Location-based sensing
    if (senseType === 'smell') {
      return {
        success: true,
        sense_type: senseType,
        target: target ?? 'surroundings',
        detail: 'ale, woodsmoke, and roasting meat',
      };
    }

    return {
      success: true,
      sense_type: senseType,
      target: target ?? 'unknown',
      detail: `You ${senseType} but find nothing notable.`,
    };
  },

  use_item: (args) => {
    const itemName = (args.item_name as string)?.toLowerCase();
    const hasItem = MOCK_GAME_STATE.inventory.some(
      (i) => i.toLowerCase().includes(itemName) || itemName?.includes(i.toLowerCase())
    );

    if (!hasItem) {
      return {
        success: false,
        error: `You don't have a "${args.item_name}"`,
        inventory: MOCK_GAME_STATE.inventory.join(', '),
      };
    }

    return {
      success: true,
      item_used: args.item_name,
      target: args.target ?? 'nothing in particular',
      effect: `You use the ${args.item_name}${args.target ? ` on ${args.target}` : ''}.`,
    };
  },

  examine_object: (args) => {
    const target = (args.target as string)?.toLowerCase();

    // Check NPCs
    const npc = MOCK_GAME_STATE.npcs.find((n) => n.name.toLowerCase() === target);
    if (npc) {
      return {
        success: true,
        target: npc.name,
        description: npc.description,
        mood: npc.mood,
        notable_features: ['clothing', 'expression', 'posture'],
      };
    }

    // Check location
    if (target?.includes('room') || target?.includes('tavern') || target?.includes('area')) {
      return {
        success: true,
        target: MOCK_GAME_STATE.currentLocation.name,
        description: MOCK_GAME_STATE.currentLocation.description,
        notable_features: ['bar counter', 'fireplace', 'wooden tables', 'stage for performers'],
        npcs_present: MOCK_GAME_STATE.npcs.map((n) => n.name),
      };
    }

    return {
      success: true,
      target: args.target,
      description: `You examine the ${args.target} closely but find nothing remarkable.`,
    };
  },
};

// ============================================================================
// OpenRouter API with Tool Calling
// ============================================================================

async function callOpenRouterWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  options: { verbose?: boolean } = {}
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set. Check repo-root .env');
  }

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const body = {
    model,
    messages,
    tools,
    tool_choice: 'auto', // Let the model decide when to use tools
    temperature: 0.7,
    max_tokens: 1024,
  };

  if (options.verbose) {
    console.log('\n📤 Request to OpenRouter:');
    console.log('   Model:', model);
    console.log('   Messages:', messages.length);
    console.log('   Tools:', tools.map((t) => t.function.name).join(', '));
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/minimal-rpg',
      'X-Title': 'Minimal-RPG Tool Test',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  return (await response.json()) as OpenRouterResponse;
}

// ============================================================================
// Tool Execution Loop
// ============================================================================

async function executeToolLoop(
  playerInput: string,
  options: { verbose?: boolean; maxIterations?: number } = {}
): Promise<{
  finalResponse: string;
  toolCalls: Array<{ name: string; args: unknown; result: unknown }>;
}> {
  const verbose = options.verbose ?? false;
  const maxIterations = options.maxIterations ?? 5;

  const systemPrompt = `You are a game master for a text-based RPG. The player is in "${MOCK_GAME_STATE.currentLocation.name}".

NPCs present: ${MOCK_GAME_STATE.npcs.map((n) => n.name).join(', ')}
Player inventory: ${MOCK_GAME_STATE.inventory.join(', ')}

Use the available tools to:
1. Get information about the game world
2. Perform actions the player requests
3. Generate appropriate narrative responses

After using tools, synthesize the results into an engaging narrative response for the player.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: playerInput },
  ];

  const allToolCalls: Array<{ name: string; args: unknown; result: unknown }> = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    if (verbose) {
      console.log(`\n🔄 Iteration ${iterations}`);
    }

    const response = await callOpenRouterWithTools(messages, GAME_TOOLS, { verbose });

    const choice = response.choices?.[0];
    if (!choice?.message) {
      throw new Error('No response from model');
    }

    const assistantMessage = choice.message;

    // Check if the model wants to use tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      if (verbose) {
        console.log(`\n🔧 Model requested ${assistantMessage.tool_calls.length} tool call(s):`);
      }

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: assistantMessage.content ?? undefined,
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

        if (verbose) {
          console.log(`   📞 ${toolName}(${JSON.stringify(toolArgs)})`);
        }

        const handler = toolHandlers[toolName];
        let result: unknown;

        if (handler) {
          result = handler(toolArgs);
        } else {
          result = { error: `Unknown tool: ${toolName}` };
        }

        if (verbose) {
          console.log(
            `   📥 Result:`,
            JSON.stringify(result, null, 2).split('\n').slice(0, 5).join('\n')
          );
        }

        allToolCalls.push({ name: toolName, args: toolArgs, result });

        // Add tool result message
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }
    } else {
      // Model gave a final response without tool calls
      const finalResponse = assistantMessage.content ?? '';

      if (verbose) {
        console.log('\n✅ Final response (no more tool calls)');
        console.log('   Finish reason:', choice.finish_reason);
        console.log('   Tokens:', response.usage);
      }

      return { finalResponse, toolCalls: allToolCalls };
    }
  }

  throw new Error(`Exceeded max iterations (${maxIterations})`);
}

// ============================================================================
// Test Cases
// ============================================================================

const TEST_PROMPTS = [
  // Movement
  'I want to go north',
  'What exits are available?',

  // NPC interaction
  'I say hello to Elara',
  '"Good evening" I say to the bartender',

  // Sensory
  'I smell Elaras feet',
  'I look at her breasts',

  // Item use
  'I use my torch',
  'I drink the healing potion',

  // Compound
  'I ask Elara about rumors while examining her closely',
  '"Hello beautiful" *I notice her scent*',

  // Ambiguous (should the model ask for clarification or pick a tool?)
  'I check my stuff',
];

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const promptIdx = args.indexOf('--prompt');
  const customPrompt = promptIdx !== -1 ? args[promptIdx + 1] : null;

  console.log('🎮 LLM Tool Calling Test');
  console.log('========================\n');

  const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
  console.log(`Model: ${model}`);
  console.log(`API Key: ${process.env.OPENROUTER_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`Location: ${MOCK_GAME_STATE.currentLocation.name}`);
  console.log(`NPCs: ${MOCK_GAME_STATE.npcs.map((n) => n.name).join(', ')}`);
  console.log();

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found. Set it in repo-root .env');
    process.exit(1);
  }

  const prompts = customPrompt ? [customPrompt] : TEST_PROMPTS.slice(0, 3); // Default: first 3 tests

  for (const prompt of prompts) {
    console.log('─'.repeat(60));
    console.log(`\n👤 Player: "${prompt}"\n`);

    try {
      const { finalResponse, toolCalls } = await executeToolLoop(prompt, { verbose });

      if (toolCalls.length > 0) {
        console.log('🔧 Tools called:');
        for (const tc of toolCalls) {
          console.log(`   • ${tc.name}(${JSON.stringify(tc.args)})`);
        }
        console.log();
      } else {
        console.log('⚠️  No tools were called\n');
      }

      console.log('🎭 Response:');
      console.log(finalResponse);
      console.log();
    } catch (err) {
      console.error('❌ Error:', err instanceof Error ? err.message : err);
    }
  }

  console.log('─'.repeat(60));
  console.log('\n✨ Test complete!\n');
  console.log('Usage:');
  console.log('  npx tsx scripts/test-tool-calling.ts                    # Run default tests');
  console.log('  npx tsx scripts/test-tool-calling.ts --verbose          # Show detailed output');
  console.log('  npx tsx scripts/test-tool-calling.ts --prompt "..."     # Test custom prompt');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
