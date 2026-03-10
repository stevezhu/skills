import { createConsola, LogLevels } from 'consola';
import { colorize } from 'consola/utils';

import type { LocalContext } from '#context.ts';
import { defineCommandFunction } from '#util/defineCommandFunction.ts';

import { formatSessionStatsOutput } from './formatSessionStatsOutput.ts';
import { ClaudeCodeStatsPlugin } from './plugins/claudecode.ts';
import { GeminiCLIStatsPlugin } from './plugins/geminicli.ts';
import type { SessionStatsPlugin, SessionStatsPluginOptions } from './SessionStatsPlugin.ts';

const baseLogger = createConsola({
  level: LogLevels.debug,
  fancy: true,
  defaults: {
    tag: 'agent-logbook/stats',
  },
  formatOptions: {
    colors: true,
    date: true,
  },
});

/** Arguments for the stats command. */
export type StatsCommandFlags = {
  /** The agent to retrieve stats for. */
  agent: 'claudecode' | 'geminicli';
};

/** Mapping of agent names to their respective stats plugin classes. */
const plugins: Record<
  StatsCommandFlags['agent'],
  new (options?: SessionStatsPluginOptions) => SessionStatsPlugin
> = {
  claudecode: ClaudeCodeStatsPlugin,
  geminicli: GeminiCLIStatsPlugin,
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

  // 2. Select and instantiate the appropriate plugin for the agent
  const PluginClass = plugins[agent];
  if (!PluginClass) {
    console.error(`Unknown agent: ${agent}`);
    console.error('Available agents: claudecode, geminicli');
    process.exit(1);
  }

  // Create a sub-logger for the specific agent/session
  const logger = baseLogger.withTag(agent);
  const plugin = new PluginClass({ logger });

  // 3. Locate session data using the plugin
  const sessionData = await plugin.findSession(sessionId);
  if (!sessionData) {
    baseLogger.error('Session not found for id:', colorize('green', sessionId));
    process.exit(1);
  }

  // 4. Aggregate stats and format the output
  const result = await plugin.aggregateStats(sessionData);
  baseLogger.log(formatSessionStatsOutput(plugin.name, sessionId, result));
});
