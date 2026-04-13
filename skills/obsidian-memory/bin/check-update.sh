#!/bin/bash
# Check for obsidian-memory updates from GitHub
# Used by Claude Code status line

REPO="368digital/obsidian-memory"
SKILL_DIR="$HOME/.claude/skills/obsidian-memory-skill"
VERSION_FILE="$SKILL_DIR/.version"
CACHE_FILE="$SKILL_DIR/.update-cache"
CACHE_TTL=3600  # 1 hour

# Get local version
if [ -f "$VERSION_FILE" ]; then
  LOCAL_VERSION=$(cat "$VERSION_FILE")
else
  LOCAL_VERSION="0.0.0"
fi

# Check cache to avoid hitting GitHub API too often
if [ -f "$CACHE_FILE" ]; then
  CACHE_AGE=$(( $(date +%s) - $(date -r "$CACHE_FILE" +%s 2>/dev/null || echo 0) ))
  if [ "$CACHE_AGE" -lt "$CACHE_TTL" ]; then
    cat "$CACHE_FILE"
    exit 0
  fi
fi

# Fetch latest release from GitHub
LATEST=$(curl -sf "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | grep -o '"tag_name": *"[^"]*"' | head -1 | grep -o '[0-9][0-9.]*')

if [ -z "$LATEST" ]; then
  # Also try tags if no releases
  LATEST=$(curl -sf "https://api.github.com/repos/${REPO}/tags" 2>/dev/null | grep -o '"name": *"v[^"]*"' | head -1 | grep -o '[0-9][0-9.]*')
fi

if [ -z "$LATEST" ]; then
  echo "" > "$CACHE_FILE"
  exit 0
fi

if [ "$LOCAL_VERSION" != "$LATEST" ]; then
  MSG="obsidian-memory ${LATEST} available (current: ${LOCAL_VERSION}) → /update-obsidian-memory"
  echo "$MSG" > "$CACHE_FILE"
  echo "$MSG"
else
  echo "" > "$CACHE_FILE"
fi
