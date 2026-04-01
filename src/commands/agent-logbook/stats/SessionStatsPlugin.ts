import { consola, type ConsolaInstance } from 'consola';

/**
 * Represents the aggregated statistics for an agent session.
 */
export type StatsResult = {
  /** List of AI models used during the session. */
  models: string[];
  /** Optional metadata entries (key-value pairs) for the session. */
  meta?: [string, string | number][];
  /** Categorized sections of statistics (e.g., "MAIN SESSION", "SUBAGENTS"). */
  sections: {
    label: string;
    entries: [string, string | number][];
  }[];
  /** An optional summary section shown before the grand total. */
  summary: {
    label: string;
    entries: [string, string | number][];
  } | null;
  /** The final aggregated token count or cost. */
  grandTotal: string | number;
};

/**
 * Options for configuring an agent-specific stats plugin.
 */
export interface SessionStatsPluginOptions {
  /** A consola logger instance for plugin-specific logging. */
  logger?: ConsolaInstance;
}

/**
 * Represents the raw session data found by a plugin.
 */
export type SessionData = {
  /** The list of main session log files. */
  sessionFiles: string[];
  /** The list of subagent session log files. */
  subagentSessionFiles: string[];
};

/**
 * Base class that all agent-specific stats plugins must extend.
 */
export abstract class SessionStatsPlugin {
  /** Display name of the agent (e.g., "ClaudeCode", "GeminiCLI"). */
  abstract readonly name: string;

  /** Logger instance for the plugin. */
  protected readonly logger: ConsolaInstance;

  constructor(options: SessionStatsPluginOptions = {}) {
    this.logger = options.logger ?? consola;
  }

  /**
   * Locates session data on the local filesystem for a given session ID.
   * @param sessionId The unique identifier for the session.
   * @returns An agent-specific data structure or null if not found.
   */
  abstract findSession(sessionId: string): Promise<SessionData | null>;

  /**
   * Processes the raw session data into a standardized StatsResult.
   * @param sessionData The data returned by findSession.
   */
  abstract aggregateStats(sessionData: SessionData): Promise<StatsResult>;
}
