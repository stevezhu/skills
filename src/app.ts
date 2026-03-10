import { buildInstallCommand, buildUninstallCommand } from '@stricli/auto-complete';
import { buildApplication, buildRouteMap } from '@stricli/core';

import packageJson from '../package.json' with { type: 'json' };
import { agentLogbookRoutes } from './commands/agent-logbook/commands.ts';

const routes = buildRouteMap({
  routes: {
    'agent-logbook': agentLogbookRoutes,
    install: buildInstallCommand('stz-skills', { bash: '__stz-skills_bash_complete' }),
    uninstall: buildUninstallCommand('stz-skills', { bash: true }),
  },
  docs: {
    brief: packageJson.description,
    hideRoute: {
      install: true,
      uninstall: true,
    },
  },
});

export const app = buildApplication(routes, {
  name: (() => {
    const name = Object.keys(packageJson.bin).find((key) => !key.startsWith('__'));
    if (!name) {
      throw new Error('Name not found');
    }
    return name;
  })(),
  versionInfo: {
    currentVersion: packageJson.version,
  },
});
