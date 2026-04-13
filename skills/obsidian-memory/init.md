# Init Obsidian Memory

## Trigger

User says "init obsidian-memory" or similar request to set up the memory system.

## Steps

### 0. Language selection (BLOCKING — do not proceed without answer)

Ask the user:
> "Which language for obsidian-memory?\n1. English\n2. Russian"

Wait for the answer. Store the choice as `LANG` (en/ru). This determines:
- Session section headers
- Memory file names
- CLAUDE.md instructions
- Hook messages
- Base descriptions

Do NOT proceed to step 1 until the user answers.

### 1. Create directory structure

```
claude-memory/
├── MEMORY.md
├── memories/
├── sessions/
├── streams/
├── bases/
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
   - Determine user-friendly name from `name` and `type` fields:
     - **If LANG=ru:**
       - type=user → `{Name}.md`
       - type=feedback → `Фидбэк — {Name}.md`
       - type=project → `Проект — {Name}.md`
       - type=reference → `Справка — {Name}.md`
     - **If LANG=en:**
       - type=user → `{Name}.md`
       - type=feedback → `Feedback — {Name}.md`
       - type=project → `Project — {Name}.md`
       - type=reference → `Reference — {Name}.md`
   - Write to `claude-memory/memories/{new name}.md` with same frontmatter
   - Add `[[wikilinks]]` where content references other files
3. Rebuild MEMORY.md index with wikilinks

### 3. Install Obsidian plugin from GitHub

Download the plugin from the latest GitHub release and install it into the project:

```bash
# Create plugin directory
mkdir -p .obsidian/plugins/obsidian-claude-memory

# Download plugin files from latest release
REPO="368digital/obsidian-memory"
RELEASE_URL="https://github.com/$REPO/releases/latest/download"
curl -sL "$RELEASE_URL/main.js" -o .obsidian/plugins/obsidian-claude-memory/main.js
curl -sL "$RELEASE_URL/manifest.json" -o .obsidian/plugins/obsidian-claude-memory/manifest.json
curl -sL "$RELEASE_URL/styles.css" -o .obsidian/plugins/obsidian-claude-memory/styles.css
```

If curl fails (no internet, GitHub unavailable), warn the user and continue without the plugin.
The skill works without the plugin — the plugin just adds visualization.

### 4. Set up .obsidian/ for vault

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

Enable the plugin automatically in `.obsidian/community-plugins.json`:
```json
["obsidian-claude-memory"]
```

Also create `.obsidian/workspace.json`:
```json
{}
```

Note: `userIgnoreFilters` only affects Obsidian display (file explorer, graph). The Vault API still has full access — plugin can read/write any file.

### 4. Create initial base (INTERACTIVE)

Ask the user to describe the project and its main work directions. Questions:

1. "What is this project? (brief description)"
2. "What are the main areas of work? (e.g., Backend API, Frontend, Database, DevOps)"

If GSD `.planning/PROJECT.md` or `superpowers` context exists, read it to pre-fill the description.
If not — ask the user directly. Do NOT guess or skip.

For each area the user names, create a base file in `claude-memory/bases/{Name}.md`:

```yaml
---
name: {Name}
description: {One-line description from user's answer}
paths:
  - {relevant paths if known}
tags: [{relevant tags}]
created: {YYYY-MM-DD}
---
```

Body:
```markdown
## Description
{What this base covers}

## Chronology
(no sessions yet)
```

### 5. Generate CLAUDE.md instructions

Add obsidian-memory session tracking instructions to the project's CLAUDE.md. If CLAUDE.md already exists, append the section. If not, create it.

**If LANG=ru**, add this block:

```markdown
# obsidian-memory

## Session Tracking (ОБЯЗАТЕЛЬНО)

При КАЖДОЙ сессии:

### Старт сессии (первое сообщение, БЕЗ ИСКЛЮЧЕНИЙ):
1. Проверь `claude-memory/.changed` — если есть, прочитай и обработай изменения из Obsidian
2. Прочитай `claude-memory/MEMORY.md` — загрузи контекст
3. Прочитай `claude-memory/bases/*.md` — загрузи список баз
4. Прочитай сессии за сегодня (или последний день с сессиями) — пойми текущее состояние
5. Спроси пользователя: "К какой базе относится? 1) {список баз} N) Новая база"
6. Создай НОВЫЙ файл сессии: `claude-memory/sessions/{YYYY-MM-DD HH-mm} — {Description}.md`
   - Каждый диалог = НОВАЯ сессия (даже если за сегодня уже есть другие)
   - bases: ["[[выбранные базы]]"]
   - continues: "[[последняя сессия в базе]]" (если продолжение)
   - status: in_progress

### ЖЁСТКОЕ ПРАВИЛО: Запись изменений файлов

**После КАЖДОГО изменения файла** (Edit, Write) — СРАЗУ дописать в сессию `## Затронутые файлы`:

\`\`\`
- [[path/to/file]] — что именно изменилось
\`\`\`

Это НЕ опционально. СРАЗУ после каждого Edit/Write.

Один диалог = одна сессия. Статус `in_progress` до конца диалога.

### В процессе работы:
- Записывай ключевые решения в файл сессии
- Все memory-операции — через `claude-memory/`, НЕ через `~/.claude/projects/.../memory/`

### Завершение сессии:
- Обнови статус сессии: `status: completed`
- Добавь `## Следующие шаги`
- Обнови `claude-memory/MEMORY.md` индекс
```

**If LANG=en**, add this block:

```markdown
# obsidian-memory

## Session Tracking (MANDATORY)

Every session:

### Session start (first message, NO EXCEPTIONS):
1. Check `claude-memory/.changed` — if exists, read and process Obsidian changes
2. Read `claude-memory/MEMORY.md` — load context
3. Read `claude-memory/bases/*.md` — load base list
4. Read today's sessions (or last day with sessions) — understand current state
5. Ask user: "Which base? 1) {base list} N) New base"
6. Create NEW session file: `claude-memory/sessions/{YYYY-MM-DD HH-mm} — {Description}.md`
   - Each conversation = NEW session
   - bases: ["[[selected bases]]"]
   - continues: "[[last session in base]]" (if continuing)
   - status: in_progress

### HARD RULE: Recording file changes

**After EVERY file change** (Edit, Write) — IMMEDIATELY append to `## Files touched` in session:

\`\`\`
- [[path/to/file]] — what exactly changed
\`\`\`

This is NOT optional. IMMEDIATELY after every Edit/Write.

One conversation = one session. Status `in_progress` until conversation ends.

### During work:
- Record key decisions in session file
- All memory operations via `claude-memory/`, NOT `~/.claude/projects/.../memory/`

### Session end:
- Update session status: `status: completed`
- Add `## Next steps`
- Update `claude-memory/MEMORY.md` index
```

### 6. Save language preference

Write `claude-memory/.lang` with the chosen language code:
```
en
```
or
```
ru
```

The skill reads this file to determine language for all generated content (session sections, memory names, base descriptions, hook messages).

### 7. Set up session hooks

Create `.claude/settings.json` (or merge into existing) with three hooks.

Use LANG to determine hook message language:

**SessionStart hook** — reminds Claude to create a session file and load bases:
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then BASES=$(ls claude-memory/bases/ 2>/dev/null | sed \"s/.md//\" | head -10 | tr \"\\n\" \", \"); LANG=$(cat claude-memory/.lang 2>/dev/null || echo en); if [ \"$LANG\" = \"ru\" ]; then MSG=\"ОБЯЗАТЕЛЬНО: 1) Прочитай claude-memory/.changed 2) Прочитай claude-memory/MEMORY.md 3) Прочитай claude-memory/bases/*.md 4) Спроси к какой базе относится работа (доступные: ${BASES:-нет баз}) 5) Создай НОВЫЙ файл сессии с bases и continues. Каждый диалог = новая сессия.\"; else MSG=\"MANDATORY: 1) Read claude-memory/.changed 2) Read claude-memory/MEMORY.md 3) Read claude-memory/bases/*.md 4) Ask which base (available: ${BASES:-none}) 5) Create NEW session file with bases and continues. Each conversation = new session.\"; fi; echo \"{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"[obsidian-memory] $MSG\\\"}}\"; else echo \"{}\"; fi'",
        "timeout": 5,
        "statusMessage": "Checking obsidian-memory session..."
      }]
    }],
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\"; if echo \"$TOOL_INPUT\" | grep -q \"claude-memory/\"; then echo \"{}\"; else TODAY=$(date +%Y-%m-%d); SESSION=$(ls claude-memory/sessions/ 2>/dev/null | grep \"^${TODAY}\" | sort -r | head -1); if [ -n \"$SESSION\" ]; then LANG=$(cat claude-memory/.lang 2>/dev/null || echo en); if [ \"$LANG\" = \"ru\" ]; then MSG=\"Ты только что изменил файл. Добавь его в секцию Затронутые файлы текущей сессии: claude-memory/sessions/${SESSION}\"; else MSG=\"You just modified a file. Add it to Files touched section in current session: claude-memory/sessions/${SESSION}\"; fi; echo \"{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"PostToolUse\\\",\\\"additionalContext\\\":\\\"[obsidian-memory] $MSG\\\"}}\"; else echo \"{}\"; fi; fi; else echo \"{}\"; fi'",
        "timeout": 3
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then TODAY=$(date +%Y-%m-%d); FOUND=$(ls claude-memory/sessions/ 2>/dev/null | grep \"^${TODAY}\" | sort -r | head -1); if [ -n \"$FOUND\" ]; then STATUS=$(grep \"^status:\" \"claude-memory/sessions/$FOUND\" 2>/dev/null | head -1); if echo \"$STATUS\" | grep -q \"in_progress\"; then LANG=$(cat claude-memory/.lang 2>/dev/null || echo en); if [ \"$LANG\" = \"ru\" ]; then MSG=\"Сессия $FOUND ещё in_progress. Обнови status: completed и добавь Следующие шаги.\"; else MSG=\"Session $FOUND is still in_progress. Update status: completed and add Next steps.\"; fi; echo \"{\\\"systemMessage\\\":\\\"[obsidian-memory] $MSG\\\"}\"; else echo \"{}\"; fi; else echo \"{}\"; fi; else echo \"{}\"; fi'",
        "timeout": 5,
        "statusMessage": "Checking obsidian-memory session status..."
      }]
    }]
  }
}
```

**PostToolUse hook** — after each Edit/Write to a project file (not claude-memory/), reminds Claude to log it in the current session.

**Stop hook** — reminds Claude to finalize the session (status: completed, next steps) before ending.

If `.claude/settings.json` already exists, merge the hooks into the existing file, preserving other settings.

### 8. Ask about .gitignore

Ask the user (in chosen language):
- **en:** "claude-memory/ contains project context. Add to .gitignore or commit with the project?"
- **ru:** "claude-memory/ содержит контекст проекта. Добавить в .gitignore или коммитить вместе с проектом?"

- If ignore: add `claude-memory/` and `.obsidian/` to `.gitignore`
- If commit: leave as-is, mention that session files may contain sensitive context

### 9. Confirm

Report what was done:
- Language chosen
- Directories created
- Plugin installed (version, or skipped if no internet)
- Bases created (list)
- Files migrated (count)
- CLAUDE.md updated with session tracking instructions
- Session hooks configured (SessionStart + PostToolUse + Stop)
- Vault status
- Next: open the project folder in Obsidian to see the vault
