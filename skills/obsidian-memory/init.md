# Init Obsidian Memory

## Trigger

User says "init obsidian-memory" or similar request to set up the memory system.

## Steps

### 1. Create directory structure

```
claude-memory/
├── MEMORY.md
├── memories/
├── sessions/
├── streams/
├── graph/
└── assets/
```

Create each directory. Write initial MEMORY.md:

```markdown
# Project Memory

Memory index for this project. Claude Code reads this file at session start.

## Memories

(no memories yet)

## Recent Sessions

(no sessions yet)

## Active Streams

(no streams yet)
```

### 2. Migrate existing memories

Check if `~/.claude/projects/{project-hash}/memory/` contains files:

1. Read the existing MEMORY.md index
2. For each memory file referenced:
   - Read the file
   - Determine Russian user-friendly name from `name` and `type` fields:
     - type=user → `{Name}.md`
     - type=feedback → `Фидбэк — {Name}.md`
     - type=project → `Проект — {Name}.md`
     - type=reference → `Справка — {Name}.md`
   - Write to `claude-memory/memories/{new name}.md` with same frontmatter
   - Add `[[wikilinks]]` where content references other files
3. Rebuild MEMORY.md index with wikilinks

### 3. Set up .obsidian/ for vault

If `.obsidian/` doesn't exist, create it so Obsidian recognizes the project as a vault.

Create `.obsidian/app.json` with filters that hide everything except `claude-memory/` in Obsidian's file explorer and graph:

```json
{
  "userIgnoreFilters": [
    "node_modules/",
    ".planning/",
    "docs/",
    "src/",
    "dist/",
    "local/",
    ".claude/",
    ".idea/",
    "obsidian-claude-memory/",
    "obsidian-memory-skill/",
    "public/",
    "CLAUDE.md",
    ".gitignore"
  ]
}
```

Also create `.obsidian/workspace.json`:
```json
{}
```

Note: `userIgnoreFilters` only affects Obsidian display (file explorer, graph). The Vault API still has full access — plugin can read/write any file.

### 4. Ask about .gitignore

Ask the user:
> "claude-memory/ содержит контекст проекта. Добавить в .gitignore или коммитить вместе с проектом?"

- If ignore: add `claude-memory/` and `.obsidian/` to `.gitignore`
- If commit: leave as-is, mention that session files may contain sensitive context

### 5. Confirm

Report what was done:
- Directories created
- Files migrated (count)
- Vault status
- Next: open the project folder in Obsidian to see the vault
