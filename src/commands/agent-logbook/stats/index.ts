import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LocalContext } from '#context.js';
import { defineCommandFunction } from '#util/defineCommandFunction.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type StatsCommandFlags = {
  agent: 'claudecode' | 'geminicli';
};

export const stats = defineCommandFunction(async function stats(
  this: LocalContext,
  { agent }: StatsCommandFlags,
  sessionId: string,
): Promise<void> {
  if (!agent || !sessionId) {
    console.error('Usage: session-stats.js <agent> <session-id>');
    console.error('Agents: claudecode, geminicli');
    process.exit(1);
  }

  let plugin;
  try {
    const mod = await import(path.join(__dirname, 'plugins', `${agent}.js`));
    plugin = mod.default;
    if (agent === 'claudecode') {
      plugin = mod.default;
    } else if (agent === 'geminicli') {
      plugin = mod.default;
    } else {
      console.error(`Unknown agent: ${agent}`);
      console.error('Available agents: claudecode, geminicli');
      process.exit(1);
    }
  } catch {
    console.error(`Unknown agent: ${agent}`);
    console.error('Available agents: claudecode, geminicli');
    process.exit(1);
  }

  const sessionData = await plugin.findSession(sessionId);
  if (!sessionData) {
    console.error(`Session not found for ID: ${sessionId}`);
    process.exit(1);
  }

  const result = await plugin.aggregateStats(sessionData);
  console.log(formatOutput(plugin.name, sessionId, result));
});

function formatOutput(agentName, sessionId, result) {
  const lines: string[] = [];
  lines.push('');
  lines.push(`${agentName} Session Stats: ${sessionId}`);
  lines.push('========================================');

  if (result.models.length > 0) {
    if (result.meta?.some(([label]) => label === 'Models')) {
      // Multi-line model display (e.g. Claude with subagents)
      for (const [label, value] of result.meta) {
        if (label === 'Models') {
          lines.push(`Models Used:  ${value}`);
        } else if (label === '') {
          lines.push(`              ${value}`);
        } else {
          lines.push(`${label}:  ${value}`);
        }
      }
    } else {
      lines.push(`Models Used:  ${result.models.join(', ') || 'N/A'}`);
    }
  }

  // Extra metadata lines (non-model)
  if (result.meta) {
    for (const [label, value] of result.meta) {
      if (label !== 'Models' && label !== '') {
        lines.push(`${label}:  ${value}`);
      }
    }
  }

  for (const section of result.sections) {
    lines.push('----------------------------------------');
    lines.push(`${section.label}:`);
    for (const [label, value] of section.entries) {
      const num = typeof value === 'number' ? value.toLocaleString() : String(value);
      lines.push(`  ${label.padEnd(20)} ${num}`);
    }
  }

  if (result.summary) {
    lines.push('----------------------------------------');
    lines.push(`${result.summary.label}:`);
    for (const [label, value] of result.summary.entries) {
      const num = typeof value === 'number' ? value.toLocaleString() : String(value);
      lines.push(`  ${label.padEnd(20)} ${num}`);
    }
  }

  lines.push('----------------------------------------');
  lines.push(
    `GRAND TOTAL TOKENS:  ${typeof result.grandTotal === 'number' ? result.grandTotal.toLocaleString() : result.grandTotal}`,
  );
  lines.push('========================================');
  lines.push('');

  return lines.join('\n');
}
