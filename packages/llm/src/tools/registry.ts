import type { ToolDefinition } from './types.js';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.function.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolsByNames(names: string[]): ToolDefinition[] {
    return names
      .map((name) => this.getTool(name))
      .filter((tool): tool is ToolDefinition => tool !== undefined);
  }
}

export const toolRegistry = new ToolRegistry();
