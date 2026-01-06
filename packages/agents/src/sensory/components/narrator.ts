import type { AgentInput, AgentOutput, CharacterSlice, LlmProvider } from '../../core/types.js';
import type {
  SensoryContext,
  SensoryIntentType,
  SensoryServiceConfig,
  BodyRegion,
} from '../types.js';

/**
 * Component responsible for generating sensory narratives (template or LLM).
 */
export class SensoryNarrator {
  constructor(
    private readonly llmProvider: LlmProvider | undefined,
    private readonly config: SensoryServiceConfig = {}
  ) {}

  generateTemplateSensoryResponse(targetName: string, data: Record<string, string>): AgentOutput {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('smell_') && !key.includes('_intensity')) {
        parts.push(`${targetName} has ${value}.`);
      }
      if (key.startsWith('touch_') && !key.includes('_temp')) {
        parts.push(`${targetName}'s skin feels ${value}.`);
      }
      if (key.startsWith('taste_') && !key.includes('_intensity')) {
        parts.push(`${targetName} tastes ${value}.`);
      }
    }

    if (parts.length === 0) {
      return this.createIgnoreResponse('No sensory data to template');
    }

    return {
      narrative: parts.join(' '),
      diagnostics: { debug: { source: 'template', data } },
    };
  }

  async generateCombinedSensoryNarrative(
    input: AgentInput,
    character: CharacterSlice,
    requests: { type: SensoryIntentType; bodyPart: string | undefined; content: string }[],
    availableData: Record<string, string>
  ): Promise<AgentOutput> {
    // Build list of what senses to describe
    const sensesList = requests
      .map((r) => {
        const region = r.bodyPart ? this.getRegionLabel(r.bodyPart) : '';
        return region ? `${r.type} (${region})` : r.type;
      })
      .join(', ');

    // Build data context
    const dataLines = Object.entries(availableData)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const systemPrompt = `Generate a brief sensory description for a narrative RPG.
Target NPC: ${character.name}
Requested senses: ${sensesList}

${dataLines ? `Available sensory data:\n${dataLines}` : 'No explicit sensory data - infer from context.'}

NPC info:
- Physique: ${typeof character.physique === 'string' ? character.physique : 'N/A'}

CRITICAL POV RULES:
- "You" refers to the PLAYER who is experiencing the sensation
- The NPC (${character.name}) is the TARGET being sensed/touched
- Describe what the PLAYER feels/smells/etc when interacting with the NPC
- Example: If player grabs NPC's wrists → "You feel her slender wrists in your grip" (NOT "his hands on your wrists")
- Use "your" for the player's body parts, "her/his" for the NPC's body parts

Rules:
- You MUST ONLY use sensory attributes explicitly listed in the "Available sensory data" section above
- DO NOT invent, infer, or hallucinate any sensory details not provided in the data
- If the player requests a sense for which no data is listed, describe only the senses that have data
- Be evocative and immersive in 1-3 sentences total
- Rephrase the provided data naturally - do not copy verbatim, but stay faithful to the listed attributes
- Example: If data lists "smell_feet: musky", you can say "catching her musky scent" but NOT "catching her musky scent mixed with lotion" (lotion was not provided)`;

    const userPrompt = `Player action: "${input.playerInput}"`;

    try {
      const response = await this.llmProvider?.generate(userPrompt, {
        systemPrompt,
        temperature: 0.5,
        maxTokens: 150,
      });

      const prompts = {
        system: systemPrompt,
        user: userPrompt,
        response: response.text,
      };

      return {
        narrative: response.text.trim(),
        diagnostics: {
          debug: {
            targetName: character.name,
            source: 'llm-combined',
            sensesRequested: requests.map((r) => r.type),
            contextParts: Object.keys(availableData).length,
            prompts,
          },
          tokenUsage: response.usage,
        },
      };
    } catch (error) {
      console.error('[SensoryService] Combined LLM generation failed:', error);
      return this.createIgnoreResponse('LLM generation failed');
    }
  }

  async generateSmellNarrative(input: AgentInput, context: SensoryContext): Promise<AgentOutput> {
    if (this.llmProvider) {
      return this.generateLlmSmellNarrative(input, context);
    }

    return this.generateTemplateSmellNarrative(context);
  }

  private generateTemplateSmellNarrative(context: SensoryContext): AgentOutput {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;
    const parts: string[] = [];
    const regionLabel = isExplicitBodyPart ? this.getRegionLabel(bodyRegion) : '';

    if (sensoryData['perfume']) {
      parts.push(`${targetName} wears ${sensoryData['perfume']}.`);
    }
    if (sensoryData['hairScent']) {
      parts.push(`${targetName}'s hair carries ${sensoryData['hairScent']}.`);
    }
    if (sensoryData['bodyScent']) {
      parts.push(`You catch ${sensoryData['bodyScent']}.`);
    }
    if (sensoryData[bodyRegion]) {
      const prefix = regionLabel ? `From ${targetName}'s ${regionLabel}, you` : 'You';
      parts.push(`${prefix} detect ${sensoryData[bodyRegion]}.`);
    }
    if (sensoryData['scent']) {
      parts.push(sensoryData['scent']);
    }

    if (parts.length === 0) {
      return this.createIgnoreResponse('Unexpected empty sensory data');
    }

    return {
      narrative: parts.join(' '),
      diagnostics: {
        debug: {
          sensoryData,
          targetName,
          bodyRegion,
          isExplicitBodyPart,
          source: 'template',
        },
      },
    };
  }

  async generateLlmSmellNarrative(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;

    const systemPrompt = this.buildSmellSystemPrompt(
      targetName,
      sensoryData,
      bodyRegion,
      isExplicitBodyPart
    );
    const userPrompt = `The player says: "${input.playerInput}"\n\nDescribe what they smell using ONLY the scent data provided. Keep it to 1-2 sentences.`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.4,
        maxTokens: 100,
      });

      const prompts = {
        system: systemPrompt,
        user: userPrompt,
        response: response.text,
      };

      return {
        narrative: response.text.trim(),
        diagnostics: {
          tokenUsage: response.usage,
          debug: {
            sensoryData,
            targetName,
            bodyRegion,
            isExplicitBodyPart,
            source: 'llm',
            prompts,
          },
        },
      };
    } catch {
      return this.generateTemplateSmellNarrative(context);
    }
  }

  async inferSmellFromContext(input: AgentInput, context: SensoryContext): Promise<AgentOutput> {
    const { targetName, bodyRegion, isExplicitBodyPart } = context;

    const contextParts: string[] = [];

    const character = input.stateSlices.npc ?? input.stateSlices.character;
    if (character) {
      contextParts.push(`Character: ${character.name}`);
      if (character.personality) {
        const traits = Array.isArray(character.personality)
          ? character.personality.join(', ')
          : character.personality;
        contextParts.push(`Personality: ${traits}`);
      }
    }

    if (input.knowledgeContext?.length) {
      const relevantContext = input.knowledgeContext
        .filter((k) => k.score > 0.5)
        .slice(0, 3)
        .map((k) => k.content);
      if (relevantContext.length) {
        contextParts.push(`Context: ${relevantContext.join(' ')}`);
      }
    }

    if (contextParts.length === 0) {
      return this.createIgnoreResponse('Insufficient context for smell inference');
    }

    const includeBodyRegion = this.config.includeBodyRegionInPrompts ?? true;
    const bodyRegionNote =
      includeBodyRegion && isExplicitBodyPart
        ? `\nThe player is specifically trying to smell their ${this.getRegionLabel(bodyRegion)}.`
        : '';

    const systemPrompt = `You are generating immersive sensory descriptions for a narrative RPG.
The player is trying to smell ${targetName ?? 'something'}.${bodyRegionNote}
You do NOT have explicit scent data, but you may be able to infer a likely scent based on the context provided.

CRITICAL POV RULES:
- "You" refers to the PLAYER who is experiencing the sensation
- ${targetName ?? 'The NPC'} is the TARGET being smelled
- Describe what the PLAYER smells from the NPC
- Example: "You catch her perfume" NOT "his nose detects your scent"
- Use "your" for player body parts, "her/his" for NPC body parts

Guidelines:
- Only generate a response if you can make a reasonable, grounded inference
- Base your inference on the character's description, setting, or other context
- Keep the response to 1-2 sentences
- Be evocative and immersive
- If you cannot make a confident inference, respond with exactly: [NO_INFERENCE]

Available context:
${contextParts.join('\n')}`;

    const userPrompt = `Player: "${input.playerInput}"\n\nWhat does the player smell?`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.6,
        maxTokens: 100,
      });

      const text = response.text.trim();

      if (text.includes('[NO_INFERENCE]') || text.length < 10) {
        return this.createIgnoreResponse('LLM could not infer scent from context');
      }

      return {
        narrative: text,
        diagnostics: {
          tokenUsage: response.usage,
          debug: {
            targetName,
            source: 'llm-inference',
            contextParts: contextParts.length,
            prompts: {
              system: systemPrompt,
              user: userPrompt,
              response: response.text,
            },
          },
        },
      };
    } catch {
      return this.createIgnoreResponse('LLM inference failed');
    }
  }

  async generateTouchNarrative(input: AgentInput, context: SensoryContext): Promise<AgentOutput> {
    if (this.llmProvider) {
      return this.generateLlmTouchNarrative(input, context);
    }

    return this.generateTemplateTouchNarrative(context);
  }

  private generateTemplateTouchNarrative(context: SensoryContext): AgentOutput {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;
    const parts: string[] = [];
    const regionLabel = isExplicitBodyPart ? this.getRegionLabel(bodyRegion) : '';

    if (sensoryData[bodyRegion]) {
      const prefix = regionLabel
        ? `${targetName}'s ${regionLabel} feels`
        : `You feel ${targetName}'s skin -`;
      parts.push(`${prefix} ${sensoryData[bodyRegion]}.`);
    }

    if (parts.length === 0) {
      return this.createIgnoreResponse('Unexpected empty texture data');
    }

    return {
      narrative: parts.join(' '),
      diagnostics: {
        debug: {
          sensoryData,
          targetName,
          bodyRegion,
          isExplicitBodyPart,
          source: 'template',
        },
      },
    };
  }

  async generateLlmTouchNarrative(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;

    const systemPrompt = this.buildTouchSystemPrompt(
      targetName,
      sensoryData,
      bodyRegion,
      isExplicitBodyPart
    );
    const userPrompt = `The player says: "${input.playerInput}"\n\nDescribe what they feel using ONLY the texture data provided. Keep it to 1-2 sentences.`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.4,
        maxTokens: 100,
      });

      const prompts = {
        system: systemPrompt,
        user: userPrompt,
        response: response.text,
      };

      return {
        narrative: response.text.trim(),
        diagnostics: {
          tokenUsage: response.usage,
          debug: {
            sensoryData,
            targetName,
            bodyRegion,
            isExplicitBodyPart,
            source: 'llm',
            prompts,
          },
        },
      };
    } catch {
      return this.generateTemplateTouchNarrative(context);
    }
  }

  async inferTouchFromContext(input: AgentInput, context: SensoryContext): Promise<AgentOutput> {
    const { targetName, bodyRegion, isExplicitBodyPart } = context;

    const contextParts: string[] = [];

    const character = input.stateSlices.npc ?? input.stateSlices.character;
    if (character) {
      contextParts.push(`Character: ${character.name}`);
    }

    if (contextParts.length === 0) {
      return this.createIgnoreResponse('Insufficient context for touch inference');
    }

    const includeBodyRegion = this.config.includeBodyRegionInPrompts ?? true;
    const bodyRegionNote =
      includeBodyRegion && isExplicitBodyPart
        ? `\nThe player is specifically touching their ${this.getRegionLabel(bodyRegion)}.`
        : '';

    const systemPrompt = `You are generating sensory descriptions for a narrative RPG.
The player is touching ${targetName ?? 'something'}.${bodyRegionNote}
You do NOT have explicit texture data, but you may be able to infer a likely sensation based on the context provided.

CRITICAL POV RULES:
- "You" refers to the PLAYER who is experiencing the sensation
- ${targetName ?? 'The NPC'} is the TARGET being touched
- Describe what the PLAYER feels when touching the NPC
- Example: "You feel her soft skin" NOT "his hands on your skin"
- Use "your" for player body parts, "her/his" for NPC body parts

Guidelines:
- Only generate a response if you can make a reasonable, grounded inference
- Keep the response to 1-2 sentences
- If you cannot make a confident inference, respond with exactly: [NO_INFERENCE]

Available context:
${contextParts.join('\n')}`;

    const userPrompt = `Player: "${input.playerInput}"\n\nWhat does the player feel?`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.6,
        maxTokens: 100,
      });

      const text = response.text.trim();

      if (text.includes('[NO_INFERENCE]') || text.length < 10) {
        return this.createIgnoreResponse('LLM could not infer texture from context');
      }

      return {
        narrative: text,
        diagnostics: {
          tokenUsage: response.usage,
          debug: {
            targetName,
            source: 'llm-inference',
            contextParts: contextParts.length,
            prompts: {
              system: systemPrompt,
              user: userPrompt,
              response: response.text,
            },
          },
        },
      };
    } catch {
      return this.createIgnoreResponse('LLM inference failed');
    }
  }

  private buildSmellSystemPrompt(
    targetName: string | undefined,
    sensoryData: Record<string, string>,
    bodyRegion: BodyRegion,
    isExplicitBodyPart: boolean
  ): string {
    const includeBodyRegion = this.config.includeBodyRegionInPrompts ?? true;
    const parts: string[] = [
      'You are generating sensory descriptions for a narrative RPG.',
      `The player is smelling ${targetName ?? 'something'}.`,
    ];

    if (includeBodyRegion && isExplicitBodyPart) {
      parts.push(`They are specifically smelling their ${this.getRegionLabel(bodyRegion)}.`);
    }

    parts.push('');
    parts.push('SCENT DATA (use ONLY this information):');

    for (const [key, value] of Object.entries(sensoryData)) {
      parts.push(`- ${key}: ${value}`);
    }

    parts.push('');
    parts.push('CRITICAL POV RULES:');
    parts.push(`- "You" refers to the PLAYER who is experiencing the sensation`);
    parts.push(`- ${targetName ?? 'The NPC'} is the TARGET being smelled`);
    parts.push('- Describe what the PLAYER smells from the NPC');
    parts.push('- Example: "You catch her perfume" NOT "his nose detects your scent"');
    parts.push('- Use "your" for player body parts, "her/his" for NPC body parts');
    parts.push('');
    parts.push('RULES:');
    parts.push(
      '- Use the scent data as STRONG GUIDANCE - do not copy verbatim, craft a vivid description around those qualities.'
    );
    parts.push('- Do NOT invent scents not listed above.');
    parts.push('- Keep it to 1-2 sentences.');
    parts.push('- Be evocative and immersive while staying faithful to the provided data.');
    parts.push('- Do not mention game mechanics or meta information.');

    return parts.join('\n');
  }

  private buildTouchSystemPrompt(
    targetName: string | undefined,
    sensoryData: Record<string, string>,
    bodyRegion: BodyRegion,
    isExplicitBodyPart: boolean
  ): string {
    const includeBodyRegion = this.config.includeBodyRegionInPrompts ?? true;
    const parts: string[] = [
      'You are generating sensory descriptions for a narrative RPG.',
      `The player is feeling/touching ${targetName ?? 'something'}.`,
    ];

    if (includeBodyRegion && isExplicitBodyPart) {
      parts.push(`They are specifically touching their ${this.getRegionLabel(bodyRegion)}.`);
    }

    parts.push('');
    parts.push('TEXTURE DATA (use ONLY this information):');

    for (const [key, value] of Object.entries(sensoryData)) {
      parts.push(`- ${key}: ${value}`);
    }

    parts.push('');
    parts.push('CRITICAL POV RULES:');
    parts.push(`- "You" refers to the PLAYER who is experiencing the sensation`);
    parts.push(`- ${targetName ?? 'The NPC'} is the TARGET being touched`);
    parts.push('- Describe what the PLAYER feels when touching the NPC');
    parts.push('- Example: "You feel her soft skin" NOT "his hands on your skin"');
    parts.push('- Use "your" for player body parts, "her/his" for NPC body parts');
    parts.push('');
    parts.push('RULES:');
    parts.push(
      '- Use the texture data as STRONG GUIDANCE - do not copy verbatim, craft a vivid description around those qualities.'
    );
    parts.push('- Do NOT invent textures/sensations not listed above.');
    parts.push('- Keep it to 1-2 sentences.');
    parts.push('- Be evocative and immersive while staying faithful to the provided data.');
    parts.push('- Do not mention game mechanics or meta information.');

    return parts.join('\n');
  }

  private getRegionLabel(region: string): string {
    if (region === 'torso') {
      return 'body';
    }

    return region
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();
  }

  private createIgnoreResponse(reason: string, debugData?: Record<string, unknown>): AgentOutput {
    return {
      narrative: '',
      diagnostics: {
        warnings: [`SensoryService ignored intent: ${reason}`],
        debug: { ignored: true, reason, ...debugData },
      },
    };
  }
}
