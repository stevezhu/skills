import path from 'node:path';

import Ajv from 'ajv';

import type { LocalContext } from '#context.js';

import frontmatterSchema from './frontmatterSchema.json' with { type: 'json' };

export type ValidateCommandFlags = {
  // ...
};

export async function validate(
  this: LocalContext,
  flags: ValidateCommandFlags,
  /**
   * Relative to the workspace root.
   */
  targetPath: string = '.agent-logbook',
): Promise<void> {
  const absoluteTargetPath = path.resolve(this.workspacesRoot, targetPath);

  const ajv = new Ajv();
  const ajvValidate = ajv.compile(frontmatterSchema);
  console.log(this, flags, absoluteTargetPath);
}
