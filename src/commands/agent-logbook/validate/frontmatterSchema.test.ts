import { describe, expect, test } from 'vitest';

import { Compile } from 'typebox/compile';

import { FrontmatterSchema } from './frontmatterSchema.js';

const compiled = Compile(FrontmatterSchema);

const validFrontmatter = {
  date: '2024-03-15T14:30:22Z',
  type: 'activity' as const,
  status: 'done' as const,
  agent: 'claudecode',
  branch: 'main',
  models: ['claude-opus-4-6'],
};

describe('FrontmatterSchema', () => {
  test('Decode transforms date string into a Date object', () => {
    const decoded = compiled.Decode(validFrontmatter);
    expect(decoded.date).toBeInstanceOf(Date);
    expect(decoded.date.toISOString()).toBe('2024-03-15T14:30:22.000Z');
  });

  test('Encode transforms Date back into an ISO string', () => {
    const decoded = compiled.Decode(validFrontmatter);
    const encoded = compiled.Encode(decoded);
    expect(typeof encoded.date).toBe('string');
    expect(encoded.date).toBe('2024-03-15T14:30:22.000Z');
  });
});
