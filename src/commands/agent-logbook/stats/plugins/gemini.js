import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GEMINI_TMP_DIR = path.join(os.homedir(), '.gemini', 'tmp');

async function readJsonFile(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export default {
  name: 'Gemini',

  async findSession(sessionId) {
    const matchingFiles = [];
    try {
      const projectDirs = await fs.promises.readdir(GEMINI_TMP_DIR);
      const dirResults = await Promise.all(
        projectDirs.map(async (projectDir) => {
          const chatsDir = path.join(GEMINI_TMP_DIR, projectDir, 'chats');
          try {
            const files = await fs.promises.readdir(chatsDir);
            const jsonFiles = files
              .filter((f) => f.endsWith('.json'))
              .map((f) => path.join(chatsDir, f));
            const fileResults = await Promise.all(
              jsonFiles.map(async (filePath) => {
                const data = await readJsonFile(filePath);
                return data.sessionId === sessionId ? filePath : null;
              }),
            );
            return fileResults.filter(Boolean);
          } catch {
            return [];
          }
        }),
      );
      matchingFiles.push(...dirResults.flat());
    } catch (error) {
      console.error('Error searching gemini tmp directory:', error.message);
    }
    return matchingFiles.length > 0 ? matchingFiles : null;
  },

  async aggregateStats(sessionFiles) {
    const stats = {
      input: 0,
      output: 0,
      cached: 0,
      thoughts: 0,
      tool: 0,
      total: 0,
      models: new Set(),
    };

    const results = await Promise.all(
      sessionFiles.map(async (filePath) => {
        try {
          return await readJsonFile(filePath);
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error.message);
          return null;
        }
      }),
    );

    for (const data of results) {
      if (!data?.messages || !Array.isArray(data.messages)) continue;
      for (const msg of data.messages) {
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

    const models = Array.from(stats.models);
    const meta = [['Files Found', sessionFiles.length]];
    const sections = [
      {
        label: 'TOKEN USAGE',
        entries: [
          ['Input Tokens', stats.input],
          ['Output Tokens', stats.output],
          ['Cached Tokens', stats.cached],
          ['Thoughts Tokens', stats.thoughts],
          ['Tool Tokens', stats.tool],
        ],
      },
    ];

    const summary = null;
    const grandTotal = stats.total;

    return { models, meta, sections, summary, grandTotal };
  },
};
