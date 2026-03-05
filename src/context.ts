import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { StricliAutoCompleteContext } from '@stricli/auto-complete';
import type { CommandContext } from '@stricli/core';
import { findWorkspacesRoot } from 'find-workspaces';

export interface LocalContext extends CommandContext, StricliAutoCompleteContext {
  readonly process: NodeJS.Process;
  readonly workspacesRoot: string;
}

export function buildContext(process: NodeJS.Process): LocalContext {
  const workspacesRoot = findWorkspacesRoot();
  if (!workspacesRoot) {
    throw new Error('Not in an npm project');
  }

  return {
    process,
    os,
    fs,
    path,
    workspacesRoot: workspacesRoot.location,
  };
}
