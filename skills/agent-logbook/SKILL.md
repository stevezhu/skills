---
name: agent-logbook
description: >
  Systematically record and manage AI agent activity, research, architectural
  decisions (ADRs), and implementation plans in the .agent-logbook/ directory.
  YOU MUST use this skill whenever you complete a task, encounter a significant
  technical blocker, evaluate new technologies, or before starting complex
  refactors. It is CRITICAL to trigger this whenever the user says "log this",
  "document our progress", "write up the findings", "create an ADR", or "let's
  plan this out". Do not wait for the user to ask — if you've made a non-trivial
  decision or finished a research phase, proactively use this to maintain the
  project's searchable knowledge base.
targets: ['*']
---

# Agent Logbook

The `.agent-logbook/` directory is a permanent, searchable knowledge base. It
ensures that future agent sessions and human contributors understand the
"why" behind the code, preventing re-exploration of dead ends and providing
traceability from plan to execution.

## Directory Structure & Purposes

| Folder       | Purpose                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `activity/`  | Chronological record of session execution: changes, commands, reasoning. |
| `research/`  | Exploratory findings: library comparisons, bug investigations, API docs. |
| `decisions/` | ADRs (Architecture Decision Records): captures _why_ a path was chosen.  |
| `plans/`     | Step-by-step specifications and scoping docs written _before_ execution. |
| `templates/` | Boilerplate Markdown files for uniform documentation.                    |

## Workflow

### 1. Initialization (If missing)

If the directory structure doesn't exist, initialize it:

```bash
mkdir -p .agent-logbook/{activity,research,decisions,plans,templates}
```

### 2. Naming Convention

**ALWAYS generate the UTC timestamp via shell — never guess or use local time.**

- **Format**: `YYYY-MM-DD_HHMMSSZ_[agent]_[slug].md`
- **Agent**: Use your agent name (e.g., `claudecode`, `cursor`, `geminicli`).
- **Slug**: 3–6 words in `kebab-case` describing the **goal** (e.g., `fix-auth-refresh`).

```bash
# Example for Activity
echo "$(date -u +%Y-%m-%d_%H%M%SZ)_claudecode_<task-slug>.md"
```

### 3. Known Agent Names

Use these exact names in the `agent` field and filename:

| Agent        | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `claudecode` | Claude Code CLI (Anthropic)                                     |
| `cursor`     | Cursor IDE AI (supports auto mode — check active model setting) |
| `geminicli`  | Gemini CLI (supports auto mode — check active model setting)    |

For other agents, use a concise lowercase identifier (e.g., `copilot`, `aider`).

### 4. Frontmatter & Session Stats

**Before writing any document**, run the stats script to get the session's models and token usage. Use the output to populate `session_id` and `models` in the frontmatter, then paste the full output as a `## Session Stats` section at the end of the document.

```bash
# Claude
node .claude/skills/agent-logbook/scripts/session-stats.js claude <session-id>

# Gemini
node .claude/skills/agent-logbook/scripts/session-stats.js gemini <session-id>
```

If you do not have a session ID or the script fails, default `models` to `[unknown]` and omit `session_id`.

Every document **MUST** include YAML frontmatter:

```yaml
---
date: 2026-03-02T14:45:00Z # ISO 8601 UTC (date -u +%Y-%m-%dT%H:%M:%SZ)
type: activity | research | decision | plan
status: complete | in-progress | abandoned | success | failure | partial
agent: claudecode # Agent name (see Known Agent Names above)
models: [claude-opus-4-6] # From stats script output. Default: [unknown]
branch: <current-branch> # git branch --show-current
session_id: abc123 # From stats script output
task_id: TICKET-123 # Optional
cost: $0.00 # Optional per-session spend
tags: [auth, api] # Optional
files_modified: [path/to/file.ts] # Key files only
related_plan: plans/slug_v1.md # Link activity/decision back to its plan
---
```

_Note: Use `status: abandoned` for dead ends — these are often more valuable than successes as they prevent future wasted effort._

### 5. Validate Documents

Run the bundled script to catch missing fields, wrong enum values, bad date formats, or malformed filenames before committing:

```bash
# Validate all logbook docs (defaults to .agent-logbook/)
bash .claude/skills/agent-logbook/scripts/validate-frontmatter.sh

# Validate a specific file or subdirectory
bash .claude/skills/agent-logbook/scripts/validate-frontmatter.sh .agent-logbook/activity/

# Output as JSON (e.g. for piping into jq)
bash .claude/skills/agent-logbook/scripts/validate-frontmatter.sh --json
```

The script checks every `.md` file (excluding `templates/`) for:

- **Filename format**: `YYYY-MM-DD_HHMMSSZ_agent_slug.md`
- **Required fields**: `date`, `type`, `status`, `agent`, `branch`
- **`date`**: ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`)
- **`type`**: one of `activity | research | decision | plan`
- **`status`**: one of `complete | in-progress | abandoned | success | failure | partial`

Exit code `0` = all pass, `1` = one or more failures.

## Templates

Include a `## References` section at the bottom of any document where you consulted
external URLs (docs, GitHub issues, blog posts, RFCs, etc.). This makes it easy to
trace where information came from and revisit sources in future sessions.

Template files are in the `templates/` directory alongside this skill:

| Template                | Use when                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates/activity.md` | Finishing a task or session. Focus on "Work Performed" and "Outcome". **Before writing**, run the stats script to get `session_id`, `models`, and token counts. Paste the raw output into `## Session Stats`. |
| `templates/research.md` | Evaluation phases. Include "Question", "Findings", and "Recommendation".                                                                                                                                      |
| `templates/decision.md` | Choosing between multiple architectural or technical paths.                                                                                                                                                   |
| `templates/plan.md`     | **BEFORE** starting complex work to align on scope and steps.                                                                                                                                                 |
