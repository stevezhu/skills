import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

import { defineSessionStatsPlugin, type StatsResult } from '../defineSessionStatsPlugin.js';

/** Base directory where Claude Code stores project and session metadata. */
const CLAUDECODE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/** Structure to hold token counts and model usage from a Claude log file. */
interface ClaudeCodeStats {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  models: Set<string>;
}

/** Locates the main session log and any subagent logs for a given session. */
interface ClaudeCodeSessionData {
  sessionFile: string;
  subagentFiles: string[];
}

/**
 * Parses a single JSONL file from Claude's logs to extract token usage.
 * Only 'assistant' message types with 'usage' fields are counted.
 *
 * @param filePath Path to the .jsonl file.
 */
async function parseJsonlFile(filePath: string): Promise<ClaudeCodeStats> {
  const stats: ClaudeCodeStats = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    models: new Set(),
  };

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  // Read each line and parse the message usage.
  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      // Claude logs include 'assistant' messages that contain usage data.
      if (data.type === 'assistant' && data.message && data.message.usage) {
        const usage = data.message.usage;
        stats.input_tokens += usage.input_tokens || 0;
        stats.output_tokens += usage.output_tokens || 0;
        stats.cache_creation_input_tokens += usage.cache_creation_input_tokens || 0;
        stats.cache_read_input_tokens += usage.cache_read_input_tokens || 0;

        if (data.message.model) {
          stats.models.add(data.message.model);
        }
      }
    } catch {
      // Ignore lines that aren't valid JSON (e.g., EOF issues).
    }
  }

  return stats;
}

/**
 * Merges source stats into a target stats object.
 * Used for summing main session and subagent totals.
 */
function combineStats(target: ClaudeCodeStats, source: ClaudeCodeStats): void {
  target.input_tokens += source.input_tokens;
  target.output_tokens += source.output_tokens;
  target.cache_creation_input_tokens += source.cache_creation_input_tokens;
  target.cache_read_input_tokens += source.cache_read_input_tokens;
  source.models.forEach((m) => target.models.add(m));
}

/**
 * The ClaudeCode-specific stats plugin.
 * Handles parsing ClaudeCode's .jsonl logs found in ~/.claude/projects.
 */
const claudecodePlugin = defineSessionStatsPlugin({
  name: 'claudecode',

  /**
   * Searches the ~/.claude/projects folder for a session log matching the given ID.
   * Also checks for subagent logs in a subfolder with the same ID.
   */
  async findSession(sessionId: string): Promise<ClaudeCodeSessionData | null> {
    try {
      const projectDirs = await fs.promises.readdir(CLAUDECODE_PROJECTS_DIR);
      // Scan all project folders to find the one containing the requested session.
      const sessionLookup = projectDirs.map(async (projectDir) => {
        const projectPath = path.join(CLAUDECODE_PROJECTS_DIR, projectDir);
        const stats = await fs.promises.stat(projectPath);
        if (!stats.isDirectory()) {
          throw new Error(`Not a directory: ${projectPath}`);
        }

        const sessionFile = path.join(projectPath, `${sessionId}.jsonl`);
        const subagentsDir = path.join(projectPath, sessionId, 'subagents');

        // Check if the main session file exists.
        await fs.promises.access(sessionFile);

        // Try to collect any subagent logs if they exist.
        let subagentFiles: string[] = [];
        try {
          const files = await fs.promises.readdir(subagentsDir);
          subagentFiles = files
            .filter((f) => f.endsWith('.jsonl'))
            .map((f) => path.join(subagentsDir, f));
        } catch {
          // No subagents subdirectory or it's empty.
        }

        return { sessionFile, subagentFiles };
      });

      try {
        // Resolve the first successful find.
        return await Promise.any(sessionLookup);
      } catch (error) {
        // If all project scans fail, return null.
        if (error instanceof AggregateError) {
          return null;
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Error searching projects directory:', error.message);
    }
    return null;
  },

  /**
   * Aggregates stats from the main session and any associated subagent logs.
   */
  async aggregateStats(sessionData: ClaudeCodeSessionData): Promise<StatsResult> {
    // 1. Process the main session log.
    const mainStats = await parseJsonlFile(sessionData.sessionFile);
    const totalStats: ClaudeCodeStats = { ...mainStats, models: new Set(mainStats.models) };

    // 2. Aggregate stats for each subagent log file.
    const subagentsStats: ClaudeCodeStats & { count: number } = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      models: new Set(),
      count: sessionData.subagentFiles.length,
    };

    const allSubagentStats = await Promise.all(
      sessionData.subagentFiles.map((file) => parseJsonlFile(file)),
    );
    for (const stats of allSubagentStats) {
      combineStats(subagentsStats, stats);
      combineStats(totalStats, stats);
    }

    // 3. Construct the standardized StatsResult report.
    const models = Array.from(totalStats.models);
    const meta: [string, string | number][] = [];
    const sections: StatsResult['sections'] = [
      {
        label: 'MAIN SESSION',
        entries: [
          ['Input Tokens', mainStats.input_tokens],
          ['Output Tokens', mainStats.output_tokens],
          ['Cache Creation Input', mainStats.cache_creation_input_tokens],
          ['Cache Read Input', mainStats.cache_read_input_tokens],
        ],
      },
    ];

    // If subagents were found, add a section and metadata for them.
    if (subagentsStats.count > 0) {
      const modelLine = `Main: ${Array.from(mainStats.models).join(', ') || 'N/A'}`;
      const subLine = `Subagents: ${Array.from(subagentsStats.models).join(', ') || 'N/A'}`;
      meta.push(['Models', modelLine]);
      meta.push(['', subLine]);

      sections.push({
        label: `SUBAGENTS (${subagentsStats.count} total)`,
        entries: [
          ['Input Tokens', subagentsStats.input_tokens],
          ['Output Tokens', subagentsStats.output_tokens],
          ['Cache Creation Input', subagentsStats.cache_creation_input_tokens],
          ['Cache Read Input', subagentsStats.cache_read_input_tokens],
        ],
      });
    }

    // Summary of all tokens combined.
    const summary: StatsResult['summary'] = {
      label: 'TOTAL USAGE',
      entries: [
        ['Total Input Tokens', totalStats.input_tokens],
        ['Total Output Tokens', totalStats.output_tokens],
        ['Total Cache Creation', totalStats.cache_creation_input_tokens],
        ['Total Cache Read', totalStats.cache_read_input_tokens],
      ],
    };

    // Calculate the grand total token count.
    const grandTotal =
      totalStats.input_tokens +
      totalStats.output_tokens +
      totalStats.cache_creation_input_tokens +
      totalStats.cache_read_input_tokens;

    return { models, meta, sections, summary, grandTotal };
  },
});

export default claudecodePlugin;
