# @stzhu/skills

A collection of CLI tools (skills) for AI agents and developers.

## Installation

```bash
pnpm add @stzhu/skills
```

## Usage

The CLI is available as `stz-skills`. You can also run it via `pnpx`:

```bash
pnpx @stzhu/skills <command>
```

### Agent Logbook

Manage and validate AI agent activity logs in the `.agent-logbook/` directory.

#### Get Session Stats

Retrieve token usage and model information for a specific agent session.

```bash
# For Claude Code
pnpx @stzhu/skills agent-logbook stats <session-id> --agent claudecode

# For Gemini CLI
pnpx @stzhu/skills agent-logbook stats <session-id> --agent geminicli

# For Codex
pnpx @stzhu/skills agent-logbook stats <session-id> --agent codex
```

Codex stats read the requested session's rollout JSONL from `~/.codex/sessions/`
or `~/.codex/archived_sessions/`, respecting `CODEX_HOME` when set. Inside Codex,
use `CODEX_THREAD_ID` as the session ID when available. The report uses the latest
cumulative token counts and lists models recorded in turn contexts. Cached input
and reasoning tokens are included in input and output, respectively; they are not
added again to the grand total. Separate subagent sessions are not included.

#### Validate Logbook Files

Validate the filenames and frontmatter of your logbook entries.

```bash
# Validate all files in .agent-logbook/
pnpx @stzhu/skills agent-logbook validate

# Validate a specific file or directory
pnpx @stzhu/skills agent-logbook validate .agent-logbook/activity/
```

## License

MIT
