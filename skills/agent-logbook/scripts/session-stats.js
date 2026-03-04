#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatOutput(providerName, sessionId, result) {
  const lines = [];
  lines.push('');
  lines.push(`${providerName} Session Stats: ${sessionId}`);
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
      const num =
        typeof value === 'number' ? value.toLocaleString() : String(value);
      lines.push(`  ${label.padEnd(20)} ${num}`);
    }
  }

  if (result.summary) {
    lines.push('----------------------------------------');
    lines.push(`${result.summary.label}:`);
    for (const [label, value] of result.summary.entries) {
      const num =
        typeof value === 'number' ? value.toLocaleString() : String(value);
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

async function main() {
  const provider = process.argv[2];
  const sessionId = process.argv[3];

  if (!provider || !sessionId) {
    console.error('Usage: session-stats.js <provider> <session-id>');
    console.error('Providers: claude, gemini');
    process.exit(1);
  }

  let plugin;
  try {
    const mod = await import(path.join(__dirname, 'plugins', `${provider}.js`));
    plugin = mod.default;
  } catch {
    console.error(`Unknown provider: ${provider}`);
    console.error('Available providers: claude, gemini');
    process.exit(1);
  }

  const sessionData = await plugin.findSession(sessionId);
  if (!sessionData) {
    console.error(`Session not found for ID: ${sessionId}`);
    process.exit(1);
  }

  const result = await plugin.aggregateStats(sessionData);
  console.log(formatOutput(plugin.name, sessionId, result));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
