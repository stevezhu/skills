import fs from 'node:fs/promises';
import path from 'node:path';

import matter from 'gray-matter';
import { Compile } from 'typebox/compile';
import yaml from 'yaml';

import type { LocalContext } from '#context.ts';

import { FrontmatterSchema } from './frontmatterSchema.ts';

export type ValidateCommandFlags = {
  // ...
};

/**
 * Expected filename format: `YYYY-MM-DD_HHMMSSZ_<agent>_<task-slug>.md`
 *
 * - `[0-9]{4}-[0-9]{2}-[0-9]{2}` — date (YYYY-MM-DD)
 * - `[0-9]{6}Z`                  — UTC time without separators (HHMMSS) + Z suffix
 * - `[a-z][a-z0-9-]*`            — agent name: starts with a letter, then letters/digits/hyphens
 * - `[a-z][a-z0-9-]+`            — task slug: same rules, but at least 2 characters
 *
 * Example: `2024-03-15_143022Z_claudecode_my-task.md`
 */
const FILENAME_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}Z_[a-z][a-z0-9-]*_[a-z][a-z0-9-]+\.md$/;

/**
 * Recursively collects `.md` files under `targetPath`, excluding anything inside a `templates/`
 * subdirectory. When `targetPath` is a single file, returns it directly.
 */
async function findMarkdownFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);

  // If the caller passed a single file path rather than a directory, return it directly
  if (!stat.isDirectory()) {
    return [targetPath];
  }

  const results: string[] = [];
  // Seed the queue with the top-level directory; each iteration pops one directory
  // and enqueues any subdirectories it discovers
  const queue: string[] = [targetPath];

  while (queue.length > 0) {
    const dir = queue.shift()!;
    // oxlint-disable-next-line no-await-in-loop
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip the templates/ folder — its files are stubs, not real entries
        if (entry.name === 'templates') continue;
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  // Sort so output is deterministic regardless of filesystem ordering
  return results.sort();
}

export async function validate(
  this: LocalContext,
  _flags: ValidateCommandFlags,
  /**
   * Target path relative to the workspace root.
   */
  targetPath: string = '.agent-logbook',
): Promise<void> {
  // Resolve to an absolute path so all downstream fs calls are unambiguous
  const absoluteTargetPath = path.resolve(this.workspacesRoot, targetPath);

  const typeboxValidate = Compile(FrontmatterSchema);

  const files = await findMarkdownFiles(absoluteTargetPath);
  // Track total failures across both checks so we can exit 1 at the end
  let failed = 0;

  const filePromises = files.map(async (file) => {
    const filename = path.basename(file);

    // Check 1: filename must match the expected naming convention.
    // We report and skip rather than also schema-validating a misnamed file,
    // since the name itself already signals something is wrong.
    if (!FILENAME_RE.test(filename)) {
      console.error(`FAIL (filename) ${file}`);
      failed++;
      return;
    }

    // Check 2: frontmatter must match the JSON Schema.
    // gray-matter reads the YAML block between the leading `---` delimiters
    // and returns it parsed as a plain object in `data`.
    const { data } = matter(await fs.readFile(file, 'utf8'), {
      engines: {
        yaml: {
          parse: (text) => yaml.parse(text),
          stringify: (data) => yaml.stringify(data),
        },
      },
    });

    if (!typeboxValidate.Check(data)) {
      console.error(`FAIL (schema) ${file}`);

      // Print each error on its own indented line for readability.
      // instancePath is the JSON pointer to the offending field (e.g. "/date");
      // it is empty for top-level errors like "must have required property".
      const errors = typeboxValidate.Errors(data);
      for (const error of errors) {
        console.error(`  ${error.instancePath || '(root)'} ${error.message}`);
      }
      failed++;
    }
  });

  await Promise.all(filePromises);

  // Exit with a non-zero code so callers (CI, shell scripts) can detect failure
  if (failed > 0) {
    return process.exit(1);
  }

  console.log('All files validated successfully');
}
