import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

import { defineSessionStatsPlugin, type StatsResult } from '../defineSessionStatsPlugin.js';

interface TokenUsage {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
}

/** Search dated session directories and the flat archived_sessions directory. */
async function findRollout(directory: string, sessionId: string): Promise<string | null> {
  let entries;
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const match = entries.find(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith('rollout-') &&
      entry.name.endsWith(`-${sessionId}.jsonl`),
  );
  if (match) return path.join(directory, match.name);

  const nestedMatches = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => findRollout(path.join(directory, entry.name), sessionId)),
  );
  return nestedMatches.find((filePath) => filePath !== null) ?? null;
}

/** Read local Codex rollout JSONL files without counting repeated usage snapshots. */
const codexPlugin = defineSessionStatsPlugin({
  name: 'codex',

  async findSession(sessionId: string): Promise<string | null> {
    const codexHome = process.env['CODEX_HOME'] || path.join(os.homedir(), '.codex');
    return (
      (await findRollout(path.join(codexHome, 'sessions'), sessionId)) ??
      findRollout(path.join(codexHome, 'archived_sessions'), sessionId)
    );
  },

  async aggregateStats(sessionFile: string): Promise<StatsResult> {
    const models = new Set<string>();
    let usage: TokenUsage = {};
    const lines = readline.createInterface({
      input: fs.createReadStream(sessionFile),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        // A running session can end with a partially written JSONL record.
        continue;
      }

      const payload = record?.payload;
      if (record?.type === 'turn_context' && typeof payload?.model === 'string') {
        models.add(payload.model);
      }
      if (record?.type === 'event_msg' && payload?.type === 'token_count') {
        const total = payload.info?.total_token_usage;
        // Totals are cumulative; last_token_usage can repeat on rate-limit updates.
        if (total) usage = total;
      }
    }

    const input = usage.input_tokens ?? 0;
    const output = usage.output_tokens ?? 0;
    return {
      models: [...models],
      sections: [
        {
          label: 'TOKEN USAGE',
          entries: [
            ['Input Tokens', input],
            ['Output Tokens', output],
            ['Cached Input Tokens', usage.cached_input_tokens ?? 0],
            ['Reasoning Tokens', usage.reasoning_output_tokens ?? 0],
          ],
        },
      ],
      summary: null,
      // Cached input and reasoning tokens are subsets of input and output.
      grandTotal: usage.total_tokens ?? input + output,
    };
  },
});

export default codexPlugin;
