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
 * Interface that all agent-specific stats plugins must implement.
 */
export interface SessionStatsPlugin {
  /** Display name of the agent (e.g., "ClaudeCode", "GeminiCLI"). */
  name: string;
  /**
   * Locates session data on the local filesystem for a given session ID.
   * @param sessionId The unique identifier for the session.
   * @returns An agent-specific data structure or null if not found.
   */
  findSession(sessionId: string): Promise<any>;
  /**
   * Processes the raw session data into a standardized StatsResult.
   * @param sessionData The data returned by findSession.
   */
  aggregateStats(sessionData: any): Promise<StatsResult>;
}

/**
 * Identity wrapper for strongly typed session stats plugin implementations.
 *
 * Keeps types attached to the plugin object so call sites get full inference
 * and editor hints.
 */
export function defineSessionStatsPlugin(plugin: SessionStatsPlugin): SessionStatsPlugin {
  return plugin;
}
