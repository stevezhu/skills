import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SessionStatsPlugin, type StatsResult } from '../defineSessionStatsPlugin.ts';

/** Base directory where Gemini CLI stores its temporary session data. */
const GEMINICLI_TMP_DIR = path.join(os.homedir(), '.gemini', 'tmp');

/** Structure to hold token counts and model usage from a Gemini session file. */
interface GeminiCLIStats {
  input: number;
  output: number;
  cached: number;
  thoughts: number;
  tool: number;
  total: number;
  models: Set<string>;
}

/**
 * Helper to read and parse a JSON file from the filesystem.
 * @param filePath Path to the .json file.
 */
async function readJsonFile(filePath: string): Promise<any> {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * The GeminiCLI-specific stats plugin.
 * Handles parsing GeminiCLI session JSON files found in ~/.gemini/tmp.
 */
export class GeminiCLIStatsPlugin extends SessionStatsPlugin {
  readonly name = 'geminicli';

  /**
   * Searches the ~/.gemini/tmp folder for any chat session files matching the given ID.
   * Gemini sessions are stored in subfolders by project, under a 'chats' directory.
   */
  async findSession(sessionId: string): Promise<string[] | null> {
    const matchingFiles: string[] = [];
    try {
      const projectDirs = await fs.promises.readdir(GEMINICLI_TMP_DIR);
      // Scan each project directory in the tmp folder.
      const dirResults = await Promise.all(
        projectDirs.map(async (projectDir) => {
          const chatsDir = path.join(GEMINICLI_TMP_DIR, projectDir, 'chats');
          try {
            const files = await fs.promises.readdir(chatsDir);
            const jsonFiles = files
              .filter((f) => f.endsWith('.json'))
              .map((f) => path.join(chatsDir, f));

            // Check each JSON file in the 'chats' directory for a matching sessionId.
            const fileResults = await Promise.all(
              jsonFiles.map(async (filePath) => {
                const data = await readJsonFile(filePath);
                return data.sessionId === sessionId ? filePath : null;
              }),
            );
            return fileResults.filter((f): f is string => f !== null);
          } catch {
            // Directory might not exist or be inaccessible.
            return [];
          }
        }),
      );
      matchingFiles.push(...dirResults.flat());
    } catch (error: any) {
      this.logger.error('Error searching gemini tmp directory:', error.message);
    }
    return matchingFiles.length > 0 ? matchingFiles : null;
  }

  /**
   * Aggregates token stats from all JSON files associated with the Gemini session.
   */
  async aggregateStats(sessionFiles: string[]): Promise<StatsResult> {
    const stats: GeminiCLIStats = {
      input: 0,
      output: 0,
      cached: 0,
      thoughts: 0,
      tool: 0,
      total: 0,
      models: new Set(),
    };

    // Load all matching session files in parallel.
    const results = await Promise.all(
      sessionFiles.map(async (filePath) => {
        try {
          return await readJsonFile(filePath);
        } catch (error: any) {
          this.logger.error(`Error processing file ${filePath}:`, error.message);
          return null;
        }
      }),
    );

    // Iterate through messages in each session file and sum token counts.
    for (const data of results) {
      if (!data?.messages || !Array.isArray(data.messages)) continue;
      for (const msg of data.messages) {
        // Only count messages of type 'gemini' which contain usage/token data.
        if (msg.type === 'gemini' && msg.tokens) {
          stats.input += msg.tokens.input || 0;
          stats.output += msg.tokens.output || 0;
          stats.cached += msg.tokens.cached || 0;
          stats.thoughts += msg.tokens.thoughts || 0;
          stats.tool += msg.tokens.tool || 0;
          stats.total += msg.tokens.total || 0;

          if (msg.model) {
            stats.models.add(msg.model);
          }
        }
      }
    }

    // Construct the standardized report structure.
    const models = Array.from(stats.models);
    const meta: [string, string | number][] = [['Files Found', sessionFiles.length]];
    const sections: StatsResult['sections'] = [
      {
        label: 'TOKEN USAGE',
        entries: [
          ['Input Tokens', stats.input - stats.cached],
          ['Output Tokens', stats.output],
          ['Cached Tokens', stats.cached],
          ['Thoughts Tokens', stats.thoughts],
          ['Tool Tokens', stats.tool],
        ],
      },
    ];

    const summary = null; // No extra summary for Gemini currently.
    const grandTotal = stats.total;

    return { models, meta, sections, summary, grandTotal };
  }
}
