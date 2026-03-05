import { buildCommand, buildRouteMap } from '@stricli/core';

export const statsCommand = buildCommand({
  loader: async () => {
    const { stats } = await import('./stats/index.js');
    return stats;
  },
  parameters: {
    flags: {
      agent: {
        kind: 'enum',
        brief: 'The agent to get stats for',
        values: ['claudecode', 'geminicli'],
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [
        {
          parse: String,
          brief: 'The session ID to get stats for',
        },
      ],
    },
  },
  docs: {
    brief: 'Agent logbook stats command',
  },
});

export const validateCommand = buildCommand({
  loader: async () => {
    const { validate } = await import('./validate/index.js');
    return validate;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [
        {
          parse: String,
          brief: 'The target file or directory to validate frontmatter for',
          optional: true,
        },
      ],
    },
  },
  docs: {
    brief: 'Agent logbook validate command',
  },
});

export const agentLogbookRoutes = buildRouteMap({
  routes: {
    stats: statsCommand,
    validate: validateCommand,
  },
  docs: {
    brief: 'Agent logbook commands',
  },
});
