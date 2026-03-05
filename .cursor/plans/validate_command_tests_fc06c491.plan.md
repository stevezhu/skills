---
name: Validate command tests
overview: Write Vitest tests for the `validate` command in `index.test.ts`, covering filename validation, frontmatter schema validation, directory traversal behavior, and exit code behavior.
todos:
  - id: write-tests
    content: Write all test cases in src/commands/agent-logbook/validate/index.test.ts
    status: in_progress
isProject: false
---

# Validate Command Tests

## Test file

`[src/commands/agent-logbook/validate/index.test.ts](src/commands/agent-logbook/validate/index.test.ts)`

## Fixture layout

Static fixture files live at `src/commands/agent-logbook/validate/__fixtures__/`. Each subdirectory represents one test scenario and is passed directly as `workspacesRoot` (with `targetPath` defaulting to `.` or a specific subfolder).

```
__fixtures__/
  valid/
    2024-03-15_143022Z_claudecode_my-task.md        ← valid filename + valid frontmatter
  bad-filename/
    notes.md                                         ← no date/time/agent/slug structure
    2024-03-15_143022Z_ClaudeCode_my-task.md        ← uppercase agent name
    2024-03-15_143022Z_claudecode_x.md              ← task slug only 1 char
  bad-schema/
    2024-03-15_143022Z_claudecode_missing-date.md   ← frontmatter missing required `date`
    2024-03-15_143022Z_claudecode_bad-date.md       ← date value doesn't match ISO 8601 UTC pattern
    2024-03-15_143022Z_claudecode_bad-type.md       ← type not in enum
    2024-03-15_143022Z_claudecode_bad-status.md     ← status not in enum
    2024-03-15_143022Z_claudecode_empty-models.md   ← models: [] (minItems: 1 violation)
  optional-fields/
    2024-03-15_143022Z_claudecode_my-task.md        ← all required + all optional fields present
  traversal/
    subdir/
      2024-03-15_143022Z_claudecode_nested.md       ← should be found and validated
    templates/
      2024-03-15_143022Z_claudecode_stub.md         ← should be skipped
  single-file/
    2024-03-15_143022Z_claudecode_my-task.md        ← passed as a direct file path
  multiple-failures/
    notes.md                                         ← filename failure
    2024-03-15_143022Z_claudecode_bad-type.md       ← schema failure
```

## Setup pattern

Mock `process.exit` to prevent the test process from actually exiting, and spy on `console.error` to assert reported failures. Both reset between tests via `beforeEach`.

```ts
const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
```

Invoke `validate` with a `LocalContext` pointing at the fixture directory:

```ts
const fixturesDir = new URL('./__fixtures__/valid', import.meta.url).pathname;
await validate.call({ workspacesRoot: fixturesDir } as LocalContext, {});
// targetPath defaults to '.agent-logbook', so pass '.' to target the fixture root
await validate.call({ workspacesRoot: fixturesDir } as LocalContext, {}, '.');
```

---

## Test cases

### Happy path

- `valid/` fixture → `console.error` not called, `process.exit` not called

### Filename validation

- `bad-filename/notes.md` → `FAIL (filename)` logged, exits 1
- `bad-filename/2024-03-15_143022Z_ClaudeCode_my-task.md` → fails (uppercase agent)
- `bad-filename/2024-03-15_143022Z_claudecode_x.md` → fails (slug too short)
- Entire `bad-filename/` directory → all three reported, exits 1

### Schema validation

- `bad-schema/...-missing-date.md` → `FAIL (schema)` logged, exits 1
- `bad-schema/...-bad-date.md` → fails (date pattern mismatch)
- `bad-schema/...-bad-type.md` → fails (type enum violation)
- `bad-schema/...-bad-status.md` → fails (status enum violation)
- `bad-schema/...-empty-models.md` → fails (minItems: 1 violation)
- `optional-fields/` fixture → passes (all optional fields present don't cause failure)

### Directory traversal

- `traversal/templates/` file is skipped — only `subdir/nested.md` is validated
- `single-file/` — pass the `.md` file path directly, not the directory

### Multiple failures

- `multiple-failures/` → both failures reported, single `process.exit(1)` at end

---

## Todos
