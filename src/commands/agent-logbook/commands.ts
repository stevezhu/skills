import { buildCommand, buildRouteMap } from '@stricli/core';

export const statsCommand = buildCommand({
  loader: async () => {
    const { stats } = await import('./stats/index.ts');
    return stats;
  },
  parameters: {
    flags: {
      agent: {
        kind: 'enum',
        brief: 'The agent to get stats for',
        values: ['claudecode', 'geminicli'],
      },
      logLevel: {
        kind: 'enum',
        brief: 'The log level to use',
        values: ['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'verbose'],
        default: 'info',
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
    const { validate } = await import('./validate/index.ts');
    return validate;
  },
  parameters: {
    flags: {
      logLevel: {
        kind: 'enum',
        brief: 'The log level to use',
        values: ['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'verbose'],
        default: 'info',
      },
    },
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
