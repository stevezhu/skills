import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

async function parseJsonlFile(filePath) {
  const stats = {
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

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      if (data.type === 'assistant' && data.message && data.message.usage) {
        const usage = data.message.usage;
        stats.input_tokens += usage.input_tokens || 0;
        stats.output_tokens += usage.output_tokens || 0;
        stats.cache_creation_input_tokens +=
          usage.cache_creation_input_tokens || 0;
        stats.cache_read_input_tokens += usage.cache_read_input_tokens || 0;

        if (data.message.model) {
          stats.models.add(data.message.model);
        }
      }
    } catch {
      // ignore invalid json lines
    }
  }

  return stats;
}

function combineStats(target, source) {
  target.input_tokens += source.input_tokens;
  target.output_tokens += source.output_tokens;
  target.cache_creation_input_tokens += source.cache_creation_input_tokens;
  target.cache_read_input_tokens += source.cache_read_input_tokens;
  source.models.forEach((m) => target.models.add(m));
}

export default {
  name: 'Claude',

  async findSession(sessionId) {
    try {
      const projectDirs = await fs.promises.readdir(CLAUDE_PROJECTS_DIR);
      const sessionLookup = projectDirs.map(async (projectDir) => {
        const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
        const stats = await fs.promises.stat(projectPath);
        if (!stats.isDirectory()) {
          throw new Error(`Not a directory: ${projectPath}`);
        }

        const sessionFile = path.join(projectPath, `${sessionId}.jsonl`);
        const subagentsDir = path.join(projectPath, sessionId, 'subagents');

        await fs.promises.access(sessionFile);

        let subagentFiles = [];
        try {
          const files = await fs.promises.readdir(subagentsDir);
          subagentFiles = files
            .filter((f) => f.endsWith('.jsonl'))
            .map((f) => path.join(subagentsDir, f));
        } catch {}

        return { sessionFile, subagentFiles };
      });

      try {
        return await Promise.any(sessionLookup);
      } catch (error) {
        if (error instanceof AggregateError) {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error searching projects directory:', error.message);
    }
    return null;
  },

  async aggregateStats(sessionData) {
    const mainStats = await parseJsonlFile(sessionData.sessionFile);
    const totalStats = { ...mainStats, models: new Set(mainStats.models) };

    const subagentsStats = {
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

    const models = Array.from(totalStats.models);
    const meta = [];
    const sections = [
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

    const summary = {
      label: 'TOTAL USAGE',
      entries: [
        ['Total Input Tokens', totalStats.input_tokens],
        ['Total Output Tokens', totalStats.output_tokens],
        ['Total Cache Creation', totalStats.cache_creation_input_tokens],
        ['Total Cache Read', totalStats.cache_read_input_tokens],
      ],
    };

    const grandTotal =
      totalStats.input_tokens +
      totalStats.output_tokens +
      totalStats.cache_creation_input_tokens +
      totalStats.cache_read_input_tokens;

    return { models, meta, sections, summary, grandTotal };
  },
};
