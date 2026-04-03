import type { StatsResult } from './defineSessionStatsPlugin.js';

/**
 * Formats a StatsResult into a human-readable table/report for the CLI.
 *
 * @param agentName Name of the agent (e.g., ClaudeCode).
 * @param sessionId Unique ID of the session.
 * @param result Aggregated data to display.
 */
export function formatSessionStatsOutput(
  agentName: string,
  sessionId: string,
  result: StatsResult,
): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`${agentName} Session Stats: ${sessionId}`);
  lines.push('========================================');

  // Display models used.
  // Special handling for multi-line models (e.g., ClaudeCode's main agent vs subagents).
  if (result.models.length > 0) {
    const modelsMeta = result.meta?.filter(([label]) => label === 'Models' || label === '');
    if (modelsMeta && modelsMeta.length > 0) {
      for (const [label, value] of modelsMeta) {
        if (label === 'Models') {
          lines.push(`Models Used:  ${value}`);
        } else if (label === '') {
          lines.push(`              ${value}`);
        }
      }
    } else {
      lines.push(`Models Used:  ${result.models.join(', ')}`);
    }
  } else {
    lines.push('Models Used:  unknown');
  }

  // Display any extra metadata (non-model specific).
  if (result.meta) {
    for (const [label, value] of result.meta) {
      if (label !== 'Models' && label !== '') {
        lines.push(`${label}:  ${value}`);
      }
    }
  }

  // Display categorized data sections.
  for (const section of result.sections) {
    lines.push('----------------------------------------');
    lines.push(`${section.label}:`);
    for (const [label, value] of section.entries) {
      const num = typeof value === 'number' ? value.toLocaleString() : String(value);
      lines.push(`  ${label.padEnd(20)} ${num}`);
    }
  }

  // Display the final usage summary (optional).
  if (result.summary) {
    lines.push('----------------------------------------');
    lines.push(`${result.summary.label}:`);
    for (const [label, value] of result.summary.entries) {
      const num = typeof value === 'number' ? value.toLocaleString() : String(value);
      lines.push(`  ${label.padEnd(20)} ${num}`);
    }
  }

  // Final total token count.
  lines.push('----------------------------------------');
  lines.push(
    `GRAND TOTAL TOKENS:  ${typeof result.grandTotal === 'number' ? result.grandTotal.toLocaleString() : result.grandTotal}`,
  );
  lines.push('========================================');
  lines.push('');

  return lines.join('\n');
}
