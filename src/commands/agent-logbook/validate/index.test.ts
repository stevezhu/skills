import { afterEach, beforeEach, describe, expect, test, Mock, vi } from 'vitest';

import type { LocalContext } from '#context.js';

import { validate } from './index.js';

// All fixture subdirectories live here; each represents one test scenario.
// Pass the scenario name as `targetPath` with `workspacesRoot` pointing here.
const fixturesDir = new URL('./__fixtures__', import.meta.url).pathname;

async function runValidate(targetPath: string) {
  return validate.call({ workspacesRoot: fixturesDir } as unknown as LocalContext, {}, targetPath);
}

describe('validate', () => {
  let exitSpy: Mock<typeof process.exit>;
  let errorSpy: Mock<typeof console.error>;

  beforeEach(() => {
    // Prevent process.exit from actually terminating the test runner
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    // Suppress console.error output and capture calls for assertions
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Suppress console.log output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('happy path', () => {
    test('valid filename and frontmatter passes without errors', async () => {
      await runValidate('valid');

      expect(errorSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('filename validation', () => {
    test('rejects a filename with no date/time/agent/slug structure', async () => {
      await runValidate('bad-filename/notes.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a filename with uppercase letters in the agent segment', async () => {
      await runValidate('bad-filename/2024-03-15_143022Z_ClaudeCode_my-task.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a filename where the task slug is only 1 character', async () => {
      await runValidate('bad-filename/2024-03-15_143022Z_claudecode_x.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('reports all bad filenames in a directory and exits once', async () => {
      await runValidate('bad-filename');

      const errorCalls = errorSpy.mock.calls.filter((args) =>
        String(args[0]).includes('FAIL (filename)'),
      );
      expect(errorCalls).toHaveLength(3);
      expect(exitSpy).toHaveBeenCalledOnce();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('schema validation', () => {
    test('rejects frontmatter with additional properties', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_additional-properties.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects frontmatter missing the required date field', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_missing-date.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a date value that does not match the ISO 8601 UTC pattern', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_bad-date.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a type value not in the allowed enum', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_bad-type.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a status value not in the allowed enum', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_bad-status.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects an empty models array (minItems: 1)', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_empty-models.md');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('passes when all optional fields are present alongside required fields', async () => {
      await runValidate('optional-fields');

      expect(errorSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('directory traversal', () => {
    test('finds files in nested subdirectories', async () => {
      await runValidate('traversal');

      // The nested valid file passes — no errors
      expect(errorSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    test('skips the templates/ subdirectory entirely', async () => {
      // traversal/templates/ contains intentionally invalid frontmatter.
      // If it were not skipped, this test would report FAIL (schema) and exit 1.
      await runValidate('traversal');

      expect(exitSpy).not.toHaveBeenCalled();
    });

    test('accepts a single file path instead of a directory', async () => {
      await runValidate('single-file/2024-03-15_143022Z_claudecode_my-task.md');

      expect(errorSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('multiple failures', () => {
    test('reports every failure and calls process.extest(1) exactly once', async () => {
      await runValidate('multiple-failures');

      // notes.md → FAIL (filename), bad-type.md → FAIL (schema)
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledOnce();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
