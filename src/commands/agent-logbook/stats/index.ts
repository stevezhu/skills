import type { LocalContext } from '#context.js';
import { defineCommandFunction } from '#util/defineCommandFunction.js';

export type StatsCommandFlags = {
  agent: 'claudecode' | 'geminicli';
};

export const stats = defineCommandFunction(async function stats(
  this: LocalContext,
  flags: StatsCommandFlags,
  sessionId: string,
): Promise<void> {
  console.log(this, flags, sessionId);
});
