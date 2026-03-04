import { buildCommand, buildRouteMap } from '@stricli/core';

export const statsCommand = buildCommand({
  loader: async () => {
    const { stats } = await import('./stats-impl.js');
    return stats;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
  },
  docs: {
    brief: 'Agent logbook stats command',
  },
});

export const validateCommand = buildCommand({
  loader: async () => {
    const { validate } = await import('./validate-impl.js');
    return validate;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
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
