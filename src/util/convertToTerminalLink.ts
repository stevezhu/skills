import { join, relative } from 'node:path';

import { colorize } from 'consola/utils';
import terminalLink from 'terminal-link';

export function convertToTerminalLink(
  path: string,
  {
    basePath = process.cwd(),
    basePathReplacement,
  }: {
    basePath?: string;
    basePathReplacement?: string;
  } = {},
): string {
  const relativePath = relative(basePath, path);
  const text = basePathReplacement ? join(basePathReplacement, relativePath) : relativePath;
  const url = `file://${path}`;
  return terminalLink(colorize('dim', text), url, {
    fallback: () => url,
  });
}
