import type { BaseArgs, BaseFlags, CommandContext, CommandFunction } from '@stricli/core';

/**
 * Identity wrapper for strongly typed command implementations.
 *
 * Keeps generic flag/arg/context types attached to the command function so
 * call sites get full inference and editor hints.
 */
export function defineCommandFunction<
  FLAGS extends BaseFlags,
  ARGS extends BaseArgs,
  CONTEXT extends CommandContext,
>(impl: CommandFunction<FLAGS, ARGS, CONTEXT>): CommandFunction<FLAGS, ARGS, CONTEXT> {
  return impl;
}
