import type { ZodError } from 'zod';
import { getRecordOptional, setPartialRecord } from '@minimal-rpg/schemas';
import type { FieldErrorMap } from './types.js';

export type { FieldErrorMap };

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
    const existing = getRecordOptional(result, key);
    if (!existing) {
      setPartialRecord(result, key, issue.message);
    } else if (maxPerField > 1) {
      const messages = existing.split('\n');
      if (messages.length < maxPerField && !messages.includes(issue.message)) {
        setPartialRecord(result, key, [...messages, issue.message].join('\n'));
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
