import type { LocalContext } from '../../context.js';

interface StatsCommandFlags {
  // ...
}

export async function stats(this: LocalContext, flags: StatsCommandFlags): Promise<void> {
  // ...
}
