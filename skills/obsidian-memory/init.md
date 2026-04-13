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

### 4. Generate CLAUDE.md instructions

Add obsidian-memory session tracking instructions to the project's CLAUDE.md. If CLAUDE.md already exists, append the section. If not, create it.

Add this block to CLAUDE.md:

```markdown
# obsidian-memory

## Session Tracking

При КАЖДОЙ сессии:

### Старт сессии (первое сообщение):
1. Проверь `claude-memory/.changed` — если есть, прочитай и обработай изменения из Obsidian
2. Прочитай `claude-memory/MEMORY.md` — загрузи контекст
3. Создай файл сессии: `claude-memory/sessions/{YYYY-MM-DD HH-mm} — {Описание}.md`

### В процессе работы:
- Записывай ключевые решения, файлы, коммиты в файл сессии
- Все memory-операции — через `claude-memory/`, НЕ через `~/.claude/projects/.../memory/`

### Завершение сессии:
- Обнови статус сессии: `status: completed`
- Добавь `## Следующие шаги`
- Обнови `claude-memory/MEMORY.md` индекс
```

This ensures Claude reads session tracking instructions at every session start, regardless of which skills are active.

### 5. Set up session hooks

Create `.claude/settings.json` (or merge into existing) with two hooks:

**SessionStart hook** — reminds Claude to create a session file if none exists for today:
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then TODAY=$(date +%Y-%m-%d); FOUND=$(ls claude-memory/sessions/ 2>/dev/null | grep \"^${TODAY}\" | head -1); if [ -z \"$FOUND\" ]; then echo \"{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"[obsidian-memory] claude-memory/ exists but no session file for today. Create session file NOW in claude-memory/sessions/ following the format in CLAUDE.md.\\\"}}\"; else echo \"{}\"; fi; else echo \"{}\"; fi'",
        "timeout": 5,
        "statusMessage": "Checking obsidian-memory session..."
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then TODAY=$(date +%Y-%m-%d); FOUND=$(ls claude-memory/sessions/ 2>/dev/null | grep \"^${TODAY}\" | head -1); if [ -n \"$FOUND\" ]; then STATUS=$(grep \"^status:\" \"claude-memory/sessions/$FOUND\" 2>/dev/null | head -1); if echo \"$STATUS\" | grep -q \"in_progress\"; then echo \"{\\\"systemMessage\\\":\\\"[obsidian-memory] Session still in_progress. Update status to completed and add next steps.\\\"}\"; else echo \"{}\"; fi; else echo \"{}\"; fi; else echo \"{}\"; fi'",
        "timeout": 5,
        "statusMessage": "Checking obsidian-memory session status..."
      }]
    }]
  }
}
```

**Stop hook** — reminds Claude to finalize the session (status: completed, next steps) before ending.

If `.claude/settings.json` already exists, merge the hooks into the existing file, preserving other settings.

### 6. Ask about .gitignore

Ask the user:
> "claude-memory/ содержит контекст проекта. Добавить в .gitignore или коммитить вместе с проектом?"

- If ignore: add `claude-memory/` and `.obsidian/` to `.gitignore`
- If commit: leave as-is, mention that session files may contain sensitive context

### 7. Confirm

Report what was done:
- Directories created
- Files migrated (count)
- CLAUDE.md updated with session tracking instructions
- Session hooks configured (SessionStart + Stop)
- Vault status
- Next: open the project folder in Obsidian to see the vault
