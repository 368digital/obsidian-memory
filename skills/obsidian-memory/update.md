# Update Obsidian Memory

## Trigger

User says "update obsidian-memory", "/update-obsidian-memory", or similar.

## Steps

### 1. Check current version

Read `~/.claude/skills/obsidian-memory-skill/.version` for local version.

### 2. Fetch latest from GitHub

```bash
REPO="368digital/obsidian-memory"
LATEST_TAG=$(curl -sf "https://api.github.com/repos/${REPO}/releases/latest" | grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*"v\?\([^"]*\)"/\1/')
```

If no releases, check tags:
```bash
LATEST_TAG=$(curl -sf "https://api.github.com/repos/${REPO}/tags" | grep -o '"name": *"v[^"]*"' | head -1 | sed 's/.*"v\?\([^"]*\)"/\1/')
```

### 3. Compare versions

If local == latest: report "Already up to date (v{version})" and exit.

### 4. Download and install

```bash
TMPDIR=$(mktemp -d)
cd "$TMPDIR"
git clone --depth 1 --branch "v${LATEST_TAG}" "https://github.com/${REPO}.git" obsidian-memory 2>/dev/null || git clone --depth 1 "https://github.com/${REPO}.git" obsidian-memory

# Update skill files
SKILL_DIR="$HOME/.claude/skills/obsidian-memory-skill"
cp -r obsidian-memory/skills/obsidian-memory/* "$SKILL_DIR/"
echo "$LATEST_TAG" > "$SKILL_DIR/.version"

# Build plugin if node_modules exist or npm is available
if command -v npm &>/dev/null; then
  cd obsidian-memory/obsidian-claude-memory
  npm install --silent 2>/dev/null
  node esbuild.config.mjs production 2>/dev/null
  BUILT=true
else
  BUILT=false
fi

cd /
rm -rf "$TMPDIR"
```

### 5. Update plugin in projects (optional)

If plugin was built successfully, ask user:

> "Обновить плагин Obsidian в текущем проекте? (скопирует main.js, manifest.json, styles.css в .obsidian/plugins/)"

If yes and `.obsidian/plugins/obsidian-claude-memory/` exists:
```bash
cp main.js manifest.json styles.css .obsidian/plugins/obsidian-claude-memory/
```

### 6. Show changelog

Fetch release notes from GitHub:
```bash
curl -sf "https://api.github.com/repos/${REPO}/releases/latest" | grep -o '"body": *"[^"]*"' | sed 's/"body": *"//;s/"$//'
```

Or read CHANGELOG.md from the downloaded repo if available.

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 obsidian-memory UPDATED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

v{old} → v{new}

## What's new

{changelog content}

**Updated:**
- Skill files: ~/.claude/skills/obsidian-memory-skill/
- Plugin: .obsidian/plugins/obsidian-claude-memory/ (if updated)

Reload Obsidian to apply plugin changes (Ctrl+P → "Reload app").
```

### 7. Clear update cache

```bash
rm -f "$HOME/.claude/skills/obsidian-memory-skill/.update-cache"
```

This forces the status line to re-check on next refresh.
