import { describe, expect, test } from 'vitest';
import {
  CreateTagBindingRequestSchema,
  CreateTagRequestSchema,
  SessionTagBindingsResponseSchema,
  TagListResponseSchema,
  TagQuerySchema,
  TagResponseSchema,
  UpdateTagBindingRequestSchema,
  UpdateTagRequestSchema,
} from '../src/api/tags.js';
import createTagRequestFixture from './fixtures/tag-create-request-v1.json' with {
  type: 'json',
};
import createTagBindingRequestFixture from './fixtures/tag-binding-request-v1.json' with {
  type: 'json',
};

const baseTagDefinition = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'Strict Tone',
  promptText: 'Be concise.',
};

describe('api/tags schemas', () => {
  test('parses minimal create tag request', () => {
    const payload = {
      name: 'Strict Tone',
      promptText: 'Be concise.',
    };

    expect(() => CreateTagRequestSchema.parse(payload)).not.toThrow();
  });

  test('rejects invalid create tag request', () => {
    expect(() => CreateTagRequestSchema.parse({ name: '', promptText: '' })).toThrow();
  });

  test('parses update tag request with changelog', () => {
    const payload = {
      name: 'Updated',
      changelog: 'Refined wording.',
    };

    expect(() => UpdateTagRequestSchema.parse(payload)).not.toThrow();
  });

  test('rejects update tag request with oversized changelog', () => {
    const payload = {
      changelog: 'x'.repeat(1001),
    };

    expect(() => UpdateTagRequestSchema.parse(payload)).toThrow();
  });

  test('coerces tag query boolean filters', () => {
    const parsed = TagQuerySchema.parse({ isBuiltIn: 'true' });
    expect(parsed.isBuiltIn).toBe(true);
  });

  test('parses create tag binding requests', () => {
    const payload = {
      tagId: 'b6f14c2b-5cb1-4d9a-9c8a-6c9c7f33e9d1',
      targetEntityId: null,
      enabled: true,
    };

    expect(() => CreateTagBindingRequestSchema.parse(payload)).not.toThrow();
    expect(() => CreateTagBindingRequestSchema.parse(createTagBindingRequestFixture)).not.toThrow();
    expect(() => CreateTagBindingRequestSchema.parse({ tagId: 'not-a-uuid' })).toThrow();
  });

  test('requires enabled for update tag binding', () => {
    expect(() => UpdateTagBindingRequestSchema.parse({})).toThrow();
    expect(() => UpdateTagBindingRequestSchema.parse({ enabled: false })).not.toThrow();
  });

  test('parses tag responses and list responses', () => {
    const response = TagResponseSchema.parse(baseTagDefinition);
    const list = TagListResponseSchema.parse({ tags: [baseTagDefinition], total: 1 });

    expect(response.name).toBe('Strict Tone');
    expect(list.total).toBe(1);
  });

  test('parses session tag binding response collections', () => {
    const payload = {
      bindings: [
        {
          id: '7a0f88d1-6f6b-4b7a-8a2e-1f56c8f63c4e',
          sessionId: 'c25f1f3a-0b7b-4e6c-9f8a-3a8d5fd1b27a',
          tagId: 'b6f14c2b-5cb1-4d9a-9c8a-6c9c7f33e9d1',
          tag: baseTagDefinition,
        },
      ],
      total: 1,
    };

    expect(() => SessionTagBindingsResponseSchema.parse(payload)).not.toThrow();
  });

  test('parses legacy tag request fixture', () => {
    expect(() => CreateTagRequestSchema.parse(createTagRequestFixture)).not.toThrow();
  });

  test('documents JSON round-trip behavior for tag response dates', () => {
    const payload = {
      ...baseTagDefinition,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    const parsed = TagResponseSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => TagResponseSchema.parse(roundTripped)).toThrow();
  });
});
