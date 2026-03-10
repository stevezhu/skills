import { LogLevels, type LogType } from 'consola';
import { colorize } from 'consola/utils';

import type { LocalContext } from '#context.ts';
import { defineCommandFunction } from '#util/defineCommandFunction.ts';

import { formatSessionStatsOutput } from './formatSessionStatsOutput.ts';
import { ClaudeCodeStatsPlugin } from './plugins/claudecode.ts';
import { GeminiCLIStatsPlugin } from './plugins/geminicli.ts';
import type { SessionStatsPlugin, SessionStatsPluginOptions } from './SessionStatsPlugin.ts';

/** Arguments for the stats command. */
export type StatsCommandFlags = {
  /** The agent to retrieve stats for. */
  agent: 'claudecode' | 'geminicli';
  /** The log level to use. */
  logLevel: Extract<
    LogType,
    'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'verbose'
  >;
};

/** Mapping of agent names to their respective stats plugin classes. */
const plugins = {
  claudecode: ClaudeCodeStatsPlugin,
  geminicli: GeminiCLIStatsPlugin,
} satisfies Record<
  StatsCommandFlags['agent'],
  new (options?: SessionStatsPluginOptions) => SessionStatsPlugin
>;

/**
 * The 'stats' command implementation.
 * Retrieves and displays aggregated token usage for a given agent session.
 */
export const stats = defineCommandFunction(async function stats(
  this: LocalContext,
  { agent, logLevel }: StatsCommandFlags,
  sessionId: string,
): Promise<void> {
  // 1. Configure the logger
  const statsLogger = this.logger.withTag('agent-logbook:stats');
  statsLogger.level = LogLevels[logLevel];

  // 2. Basic input validation
  if (!agent || !sessionId) {
    statsLogger.error('Usage: session-stats.js <agent> <session-id>');
    statsLogger.error('Agents: claudecode, geminicli');
    process.exit(1);
  }

  // 3. Select and instantiate the appropriate plugin for the agent
  const PluginClass = plugins[agent];
  if (!PluginClass) {
    statsLogger.error(`Unknown agent: ${agent}`);
    statsLogger.error('Available agents: claudecode, geminicli');
    process.exit(1);
  }

  // Create a sub-logger for the specific agent/session
  const logger = statsLogger.withTag(agent);
  const plugin = new PluginClass({ logger });

  // 4. Locate session data using the plugin
  const sessionData = await plugin.findSession(sessionId);
  if (!sessionData) {
    statsLogger.error('Session not found for id:', colorize('green', sessionId));
    process.exit(1);
  }

  // 5. Aggregate stats and format the output
  const result = await plugin.aggregateStats(sessionData);
  statsLogger.log(formatSessionStatsOutput(plugin.name, sessionId, result));
});
