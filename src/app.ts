import { buildInstallCommand, buildUninstallCommand } from '@stricli/auto-complete';
import { buildApplication, buildRouteMap } from '@stricli/core';

import { name, version, description } from '../package.json';
import { nestedRoutes } from './commands/nested/commands';
import { subdirCommand } from './commands/subdir/command';

const routes = buildRouteMap({
  routes: {
    subdir: subdirCommand,
    nested: nestedRoutes,
    install: buildInstallCommand('stz-skills', { bash: '__stz-skills_bash_complete' }),
    uninstall: buildUninstallCommand('stz-skills', { bash: true }),
  },
  docs: {
    brief: description,
    hideRoute: {
      install: true,
      uninstall: true,
    },
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
