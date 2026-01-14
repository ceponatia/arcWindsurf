import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { InferredTrait, Contradiction } from './types.js';

/**
 * Detects contradictions between new inferred traits and existing profile data.
 */
export class ContradictionMirror {
  /**
   * Compare a new inferred trait with the existing character profile to find conflicts.
   */
  detectContradiction(
    newTrait: InferredTrait,
    profile: Partial<CharacterProfile>
  ): Contradiction | null {
    const existingValue = this.getValueAtPath(profile, newTrait.path);
    if (existingValue === undefined) return null;

    const isContradiction = this.valuesConflict(existingValue, newTrait.value);
    if (!isContradiction) return null;

    return {
      existingTrait: { path: newTrait.path, value: existingValue },
      newEvidence: { path: newTrait.path, value: newTrait.value },
      reflectionPrompt: this.buildReflectionPrompt(newTrait.path, existingValue, newTrait.value),
    };
  }

  /**
   * Build a prompt asking the character to reflect on the detected contradiction.
   */
  buildReflectionPrompt(path: string, oldValue: unknown, newValue: unknown): string {
    const fieldName = path.split('.').pop() ?? 'this aspect';
    return `Earlier, you seemed ${this.describeValue(oldValue)} (${fieldName}), but just now you showed something different - ${this.describeValue(newValue)}. How do you make sense of that contradiction in yourself?`;
  }

  private valuesConflict(existing: unknown, newVal: unknown): boolean {
    if (typeof existing === 'number' && typeof newVal === 'number') {
      return Math.abs(existing - newVal) > 0.3;
    }
    if (typeof existing === 'string' && typeof newVal === 'string') {
      return existing.toLowerCase() !== newVal.toLowerCase();
    }
    return false;
  }

  private describeValue(value: unknown): string {
    if (typeof value === 'number') {
      return value > 0.6 ? 'strongly inclined' : value < 0.4 ? 'resistant' : 'moderate';
    }
    return String(value);
  }

  private getValueAtPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((curr: unknown, key) => {
      if (curr && typeof curr === 'object' && key in curr) {
        return Reflect.get(curr, key);
      }
      return undefined;
    }, obj);
  }
}
