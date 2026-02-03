import type { ToolDefinition } from '@minimal-rpg/schemas';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

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
