import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { colorize } from 'consola/utils';

import { convertToTerminalLink } from '#util/convertToTerminalLink.ts';

import { SessionStatsPlugin, type SessionData, type StatsResult } from '../SessionStatsPlugin.ts';

/** Base directory where Gemini CLI stores its temporary session data. */
const GEMINICLI_TMP_DIR = path.join(os.homedir(), '.gemini', 'tmp');

/** Structure to hold token counts and model usage from a Gemini session file. */
type GeminiCLIStats = {
  input: number;
  output: number;
  cached: number;
  thoughts: number;
  tool: number;
  total: number;
  models: Set<string>;
};

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
  async findSession(sessionId: string): Promise<SessionData | null> {
    const matchingFiles: string[] = [];
    try {
      const projectDirs = await fs.promises.readdir(GEMINICLI_TMP_DIR);
      this.logger.debug('Searching for session id:', colorize('green', sessionId));
      // Scan each project directory in the tmp folder.
      const dirResults = await Promise.all(
        projectDirs.map(async (projectDir) => {
          const chatsDir = path.join(GEMINICLI_TMP_DIR, projectDir, 'chats');
          this.logger.debug(
            'Searching chats directory:',
            convertToTerminalLink(chatsDir, {
              basePath: GEMINICLI_TMP_DIR,
              basePathReplacement: '~/.gemini/tmp',
            }),
          );
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
    return matchingFiles.length > 0
      ? { sessionFiles: matchingFiles, subagentSessionFiles: [] }
      : null;
  }

  /**
   * Aggregates token stats from all JSON files associated with the Gemini session.
   */
  async aggregateStats(sessionData: SessionData): Promise<StatsResult> {
    const { sessionFiles } = sessionData;

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
    const stats = results.reduce<GeminiCLIStats>(
      (acc, data) => {
        if (!data?.messages || !Array.isArray(data.messages)) return acc;
        for (const msg of data.messages) {
          // Only count messages of type 'gemini' which contain usage/token data.
          if (msg.type === 'gemini' && msg.tokens) {
            acc.input += msg.tokens.input || 0;
            acc.output += msg.tokens.output || 0;
            acc.cached += msg.tokens.cached || 0;
            acc.thoughts += msg.tokens.thoughts || 0;
            acc.tool += msg.tokens.tool || 0;
            acc.total += msg.tokens.total || 0;

            if (msg.model) {
              acc.models.add(msg.model);
            }
          }
        }
        return acc;
      },
      {
        input: 0,
        output: 0,
        cached: 0,
        thoughts: 0,
        tool: 0,
        total: 0,
        models: new Set<string>(),
      },
    );

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
