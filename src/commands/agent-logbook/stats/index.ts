import type { LocalContext } from '#/context.js';
import { defineCommandFunction } from '#/util/defineCommandFunction.js';

import type { SessionStatsPlugin } from './defineSessionStatsPlugin.js';
import { formatSessionStatsOutput } from './formatSessionStatsOutput.js';
import claudecodePlugin from './plugins/claudecode.js';
import geminicliPlugin from './plugins/geminicli.js';

/** Arguments for the stats command. */
export type StatsCommandFlags = {
  /** The agent to retrieve stats for. */
  agent: 'claudecode' | 'geminicli';
};

/** Mapping of agent names to their respective stats plugins. */
const plugins: Record<StatsCommandFlags['agent'], SessionStatsPlugin> = {
  claudecode: claudecodePlugin,
  geminicli: geminicliPlugin,
};

/**
 * The 'stats' command implementation.
 * Retrieves and displays aggregated token usage for a given agent session.
 */
export const stats = defineCommandFunction(async function stats(
  this: LocalContext,
  { agent }: StatsCommandFlags,
  sessionId: string,
): Promise<void> {
  // 1. Basic input validation
  if (!agent || !sessionId) {
    console.error('Usage: session-stats.js <agent> <session-id>');
    console.error('Agents: claudecode, geminicli');
    process.exit(1);
  }

  // 2. Select the appropriate plugin for the agent
  const plugin = plugins[agent];
  if (!plugin) {
    console.error(`Unknown agent: ${agent}`);
    console.error('Available agents: claudecode, geminicli');
    process.exit(1);
  }

  // 3. Locate session data using the plugin
  const sessionData = await plugin.findSession(sessionId);
  if (!sessionData) {
    console.error(`Session not found for ID: ${sessionId}`);
    process.exit(1);
  }

  // 4. Aggregate stats and format the output
  const result = await plugin.aggregateStats(sessionData);
  console.log(formatSessionStatsOutput(plugin.name, sessionId, result));
});
