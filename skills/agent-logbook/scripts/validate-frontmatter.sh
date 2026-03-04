#!/usr/bin/env bash
# Validates .agent-logbook markdown frontmatter.
# Usage: bash validate-frontmatter.sh [path]
# Requires: yq, pnpm (for pnpx ajv-cli)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA="$SCRIPT_DIR/schema.json"
FILENAME_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}Z_[a-z][a-z0-9-]*_[a-z][a-z0-9-]+\.md$'

target="${1:-.agent-logbook}"

if [[ ! -e "$target" ]]; then
  echo "Error: path not found: $target" >&2
  exit 2
fi

# Ensure we have a valid project-local temp directory for JSON extraction
# This avoids macOS Seatbelt restrictions on /tmp/
logbook_root=".agent-logbook"
if [[ ! -d "$logbook_root" ]]; then
  # Fallback to current directory if .agent-logbook doesn't exist (unlikely in this context)
  logbook_root="."
fi

tmpdir="$logbook_root/.tmp-validate-fm-$(date +%s)"
mkdir -p "$tmpdir"
trap 'rm -rf "$tmpdir"' EXIT

filename_failed=0

while IFS= read -r file; do
  filename="$(basename "$file")"
  if ! [[ "$filename" =~ $FILENAME_RE ]]; then
    echo "FAIL (filename) $file"
    ((filename_failed++)) || true
  else
    yq -o=json --front-matter=extract '.' "$file" > "$tmpdir/${filename%.md}.json"
  fi
done < <(find "$target" -type f -name "*.md" ! -name "README.md" | grep -v '/templates/' | sort)

schema_failed=0
if compgen -G "$tmpdir/*.json" > /dev/null 2>&1; then
  pnpx ajv-cli validate -s "$SCHEMA" -d "$tmpdir/*.json" || schema_failed=1
fi

exit $(( filename_failed + schema_failed > 0 ? 1 : 0 ))
