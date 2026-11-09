import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import codexPlugin from './codex.js';

const sessionId = '12345678-1234-1234-1234-123456789abc';
const rolloutName = `rollout-2026-11-09T12-00-00-${sessionId}.jsonl`;

function tokenCount(total: Record<string, number>, last = total) {
  return {
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: { total_token_usage: total, last_token_usage: last },
    },
  };
}

describe('codex stats plugin', () => {
  let codexHome: string;

  beforeEach(async () => {
    codexHome = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-stats-'));
    vi.stubEnv('CODEX_HOME', codexHome);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await fs.rm(codexHome, { recursive: true, force: true });
  });

  async function writeRollout(relativePath: string, records: unknown[] = []) {
    const filePath = path.join(codexHome, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, records.map((record) => JSON.stringify(record)).join('\n'));
    return filePath;
  }

  test('finds a dated rollout under CODEX_HOME', async () => {
    const filePath = await writeRollout(`sessions/2026/11/09/${rolloutName}`);
    expect(await codexPlugin.findSession(sessionId)).toBe(filePath);
  });

  test('defaults to ~/.codex when CODEX_HOME is unset', async () => {
    vi.stubEnv('CODEX_HOME', '');
    vi.spyOn(os, 'homedir').mockReturnValue(codexHome);
    const filePath = await writeRollout(`.codex/sessions/2026/11/09/${rolloutName}`);
    expect(await codexPlugin.findSession(sessionId)).toBe(filePath);
  });

  test('finds archived sessions even when the active directory is missing', async () => {
    const filePath = await writeRollout(`archived_sessions/${rolloutName}`);
    expect(await codexPlugin.findSession(sessionId)).toBe(filePath);
  });

  test('returns null when no session directories exist', async () => {
    expect(await codexPlugin.findSession(sessionId)).toBeNull();
  });

  test('ignores other sessions, non-rollout files, and symlinks', async () => {
    await writeRollout(`sessions/2026/11/09/${rolloutName.replace(sessionId, 'other-id')}`);
    await writeRollout(`sessions/unrelated-${sessionId}.jsonl`);
    await writeRollout(`sessions/${rolloutName}.bak`);
    const target = await writeRollout('elsewhere/session.jsonl');
    await fs.symlink(target, path.join(codexHome, 'sessions', rolloutName));
    expect(await codexPlugin.findSession(sessionId)).toBeNull();
  });

  test('propagates filesystem errors other than missing directories', async () => {
    await fs.writeFile(path.join(codexHome, 'sessions'), 'not a directory');
    await expect(codexPlugin.findSession(sessionId)).rejects.toMatchObject({ code: 'ENOTDIR' });
  });

  test('uses the latest cumulative totals without recounting repeated snapshots', async () => {
    const total = {
      input_tokens: 1000,
      cached_input_tokens: 600,
      output_tokens: 200,
      reasoning_output_tokens: 50,
      total_tokens: 1200,
    };
    const filePath = await writeRollout(rolloutName, [
      { type: 'turn_context', payload: { model: 'gpt-5-codex' } },
      tokenCount({ input_tokens: 400, output_tokens: 100, total_tokens: 500 }),
      { type: 'turn_context', payload: { model: 'gpt-5.3-codex' } },
      { type: 'turn_context', payload: { model: 'gpt-5.3-codex' } },
      tokenCount(total, { input_tokens: 600, output_tokens: 100, total_tokens: 700 }),
      tokenCount(total),
      { type: 'event_msg', payload: { type: 'token_count', info: null } },
    ]);

    expect(await codexPlugin.aggregateStats(filePath)).toEqual({
      models: ['gpt-5-codex', 'gpt-5.3-codex'],
      sections: [
        {
          label: 'TOKEN USAGE',
          entries: [
            ['Input Tokens', 1000],
            ['Output Tokens', 200],
            ['Cached Input Tokens', 600],
            ['Reasoning Tokens', 50],
          ],
        },
      ],
      summary: null,
      grandTotal: 1200,
    });
  });

  test('ignores malformed lines and unrelated records in a running rollout', async () => {
    const filePath = await writeRollout(rolloutName, [
      null,
      { type: 'turn_context', payload: { model: 42 } },
      { type: 'response_item', payload: { usage: { total_tokens: 9999 } } },
      tokenCount({ input_tokens: 100, output_tokens: 20, total_tokens: 120 }),
      { type: 'event_msg', payload: { type: 'token_count', info: { last_token_usage: {} } } },
    ]);
    await fs.appendFile(filePath, '\ninvalid json\n{"type":');
    const result = await codexPlugin.aggregateStats(filePath);
    expect(result.models).toEqual([]);
    expect(result.grandTotal).toBe(120);
  });

  test('falls back to input plus output when total_tokens is absent', async () => {
    const filePath = await writeRollout(rolloutName, [
      tokenCount({ input_tokens: 100, output_tokens: 20 }),
    ]);
    const result = await codexPlugin.aggregateStats(filePath);
    expect(result.grandTotal).toBe(120);
    expect(result.sections[0]?.entries.slice(2)).toEqual([
      ['Cached Input Tokens', 0],
      ['Reasoning Tokens', 0],
    ]);
  });

  test('reports zero tokens and preserves models before usage is recorded', async () => {
    const filePath = await writeRollout(rolloutName, [
      { type: 'turn_context', payload: { model: 'gpt-5-codex' } },
    ]);
    const result = await codexPlugin.aggregateStats(filePath);
    expect(result.models).toEqual(['gpt-5-codex']);
    expect(result.grandTotal).toBe(0);
    expect(result.sections[0]?.entries.every(([, count]) => count === 0)).toBe(true);
  });

  test('propagates errors when a rollout cannot be read', async () => {
    await expect(codexPlugin.aggregateStats(path.join(codexHome, 'missing.jsonl'))).rejects.toThrow(
      'ENOENT',
    );
  });
});
