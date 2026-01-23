import type { ZodError } from 'zod';
import type { ZodIssue } from 'zod';
import { getRecordOptional, setPartialRecord } from '@minimal-rpg/schemas';
import type { FieldErrorMap } from './types.js';

export type { FieldErrorMap };

/**
 * Normalize Zod issue messages for stable, user-friendly display.
 */
function normalizeZodIssueMessage(issue: ZodIssue): string {
  if (issue.code === 'too_small') {
    const minimum = typeof issue.minimum === 'number' ? issue.minimum : 1;
    const lowerMessage = issue.message.toLowerCase();
    const isString = lowerMessage.includes('string') || lowerMessage.includes('character');
    const isNumber = lowerMessage.includes('number');
    if (isString) {
      const countLabel = minimum === 1 ? 'character' : 'characters';
      const comparator = issue.inclusive ? 'at least' : 'more than';
      return `String must contain ${comparator} ${minimum} ${countLabel}`;
    }
    if (isNumber) {
      const comparator = issue.inclusive ? 'greater than or equal to' : 'greater than';
      return `Number must be ${comparator} ${minimum}`;
    }
  }

  return issue.message;
}

export function mapZodErrorsToFields<FieldKey extends string = string>(
  error: ZodError<unknown>,
  opts: {
    pathToField: (path: (string | number)[]) => FieldKey | undefined;
    maxPerField?: number;
  }
): FieldErrorMap<FieldKey> {
  const { pathToField, maxPerField = 1 } = opts;
  const result: FieldErrorMap<FieldKey> = {};

  for (const issue of error.issues) {
    const key = pathToField(issue.path as (string | number)[]);
    if (!key) continue;
    const message = normalizeZodIssueMessage(issue);
    const existing = getRecordOptional(result, key);
    if (!existing) {
      setPartialRecord(result, key, message);
    } else if (maxPerField > 1) {
      const messages = existing.split('\n');
      if (messages.length < maxPerField && !messages.includes(message)) {
        setPartialRecord(result, key, [...messages, message].join('\n'));
      }
    }
  }

  return result;
}

export function getInlineErrorProps(fieldKey: string, message?: string) {
  if (!message) return {} as const;
  const id = `${fieldKey}-error`;
  return {
    'aria-invalid': true,
    'aria-describedby': id,
  } as const;
}
