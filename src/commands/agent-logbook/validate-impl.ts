import type { LocalContext } from '../../context.js';

interface ValidateCommandFlags {
  // ...
}

export async function validate(this: LocalContext, flags: ValidateCommandFlags): Promise<void> {
  // ...
}
