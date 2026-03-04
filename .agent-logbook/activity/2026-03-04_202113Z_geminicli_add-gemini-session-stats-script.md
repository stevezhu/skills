---
# log migrated from an external repository
date: 2026-03-04T20:21:13Z
type: activity
status: success
agent: geminicli
models: [gemini-3-auto]
branch: main
---

# Add Gemini Session Stats Script

## Summary

Created a Node.js script to aggregate token usage and models used for Gemini CLI sessions by parsing `.json` files in `~/.gemini/tmp`.

## Context

Following the creation of the Claude session stats script, the user wanted a similar tool for Gemini CLI sessions. Gemini stores session data in JSON files (one or more per session) within project-specific directories in `~/.gemini/tmp`.

## Work Performed

- Researched the structure of `~/.gemini/tmp` and identified that session logs are in JSON files within `chats/` subdirectories.
- Confirmed that a single session can span multiple JSON files (e.g., if resumed or across multiple turns).
- Implemented `gemini-session-stats.js` in `.rulesync/skills/agent-logbook/scripts/`.
- The script aggregates:
  - Input Tokens
  - Output Tokens
  - Cached Tokens
  - Thoughts Tokens
  - Tool Tokens
  - Total Tokens (Input + Output + Thoughts)
  - List of unique models used.
- Tested the script with the current session ID `178337a4-61d3-423c-af10-d7fbed70afcb`.
- Updated `SKILL.md` to include instructions for both Claude and Gemini stats scripts.
- Synced changes using `rulesync generate`.

## Outcome

The script is now available and can be run via:
`node .claude/skills/agent-logbook/scripts/gemini-session-stats.js <session-id>`

Example Output:

```
Gemini Session Stats: 178337a4-61d3-423c-af10-d7fbed70afcb
========================================
Models Used:  gemini-3-flash-preview
Files Found:  2
----------------------------------------
Input Tokens:    2,703,192
Output Tokens:   11,118
Cached Tokens:   1,859,784
Thoughts Tokens: 5,283
Tool Tokens:     0
----------------------------------------
TOTAL TOKENS:    2,719,593
========================================
```
