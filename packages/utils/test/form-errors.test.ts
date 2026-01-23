import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { mapZodErrorsToFields, getInlineErrorProps } from '../src/forms/form-errors.js';

describe('form errors', () => {
  it('maps zod issues to fields', () => {
    const schema = z.object({ name: z.string().min(2), age: z.number().min(1) });
    const result = schema.safeParse({ name: '', age: 0 });
    if (result.success) throw new Error('Expected failure');

    const mapped = mapZodErrorsToFields(result.error, {
      pathToField: (path) => (path[0] === 'name' ? 'name' : 'age'),
      maxPerField: 2,
    });

    expect(mapped.name).toContain('String must contain');
    expect(mapped.age).toContain('Number must be greater');
  });

  it('builds inline error props', () => {
    expect(getInlineErrorProps('field', 'Error')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'field-error',
    });
    expect(getInlineErrorProps('field')).toEqual({});
  });
});
