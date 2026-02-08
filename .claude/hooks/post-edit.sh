#!/bin/bash
# Post-edit hook: warn when .env or secrets are modified
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Warn on sensitive file edits
if [[ "$FILE_PATH" == *.env* ]] || [[ "$FILE_PATH" == *secret* ]] || [[ "$FILE_PATH" == *credential* ]]; then
  echo "WARNING: Sensitive file modified: $FILE_PATH" >&2
  exit 2
fi

exit 0
