import { afterEach, beforeEach, describe, expect, test, type Mock, vi } from 'vitest';

import type { LocalContext } from '#context.ts';

import { validate } from './index.ts';

// Mock consola so we can capture and assert on logger calls
const { mockLogger } = vi.hoisted(() => {
  const logger = {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    level: 3,
    withTag: vi.fn(),
  };
  logger.withTag.mockReturnValue(logger);
  return { mockLogger: logger };
});

vi.mock('consola', () => ({
  createConsola: vi.fn(() => mockLogger),
  LogLevels: {
    silent: -1,
    fatal: 0,
    error: 1,
    warn: 2,
    log: 3,
    info: 3,
    success: 3,
    debug: 4,
    trace: 5,
    verbose: Infinity,
  },
}));

// All fixture subdirectories live here; each represents one test scenario.
// Pass the scenario name as `targetPath` with `workspacesRoot` pointing here.
const fixturesDir = new URL('./__fixtures__', import.meta.url).pathname;

async function runValidate(targetPath: string) {
  return validate.call(
    { workspacesRoot: fixturesDir, logger: mockLogger } as unknown as LocalContext,
    { logLevel: 'info' },
    targetPath,
  );
}

describe('validate', () => {
  let exitSpy: Mock<typeof process.exit>;

  beforeEach(() => {
    // Prevent process.exit from actually terminating the test runner
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset all mock logger calls between tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('happy path', () => {
    test('valid filename and frontmatter passes without errors', async () => {
      await runValidate('valid');

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('filename validation', () => {
    test('rejects a filename with no date/time/agent/slug structure', async () => {
      await runValidate('bad-filename/notes.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a filename with uppercase letters in the agent segment', async () => {
      await runValidate('bad-filename/2024-03-15_143022Z_ClaudeCode_my-task.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a filename where the task slug is only 1 character', async () => {
      await runValidate('bad-filename/2024-03-15_143022Z_claudecode_x.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('reports all bad filenames in a directory and exits once', async () => {
      await runValidate('bad-filename');

      const errorCalls = mockLogger.error.mock.calls.filter((args) =>
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

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects frontmatter missing the required date field', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_missing-date.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a date value that does not match the ISO 8601 UTC pattern', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_bad-date.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a type value not in the allowed enum', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_bad-type.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects a status value not in the allowed enum', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_bad-status.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('rejects an empty models array (minItems: 1)', async () => {
      await runValidate('bad-schema/2024-03-15_143022Z_claudecode_empty-models.md');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test('passes when all optional fields are present alongside required fields', async () => {
      await runValidate('optional-fields');

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('directory traversal', () => {
    test('finds files in nested subdirectories', async () => {
      await runValidate('traversal');

      // The nested valid file passes — no errors
      expect(mockLogger.error).not.toHaveBeenCalled();
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

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('multiple failures', () => {
    test('reports every failure and calls process.exit(1) exactly once', async () => {
      await runValidate('multiple-failures');

      // notes.md → FAIL (filename), bad-type.md → FAIL (schema)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (filename)'));
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FAIL (schema)'));
      expect(exitSpy).toHaveBeenCalledOnce();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
