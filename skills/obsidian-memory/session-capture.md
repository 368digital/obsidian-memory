# Session Capture

## Language

Read `claude-memory/.lang` to determine the language (defaults to `en` if missing).
All session section headers, descriptions, and messages use the chosen language.

- **en:** `## Context`, `## Key decisions`, `## What was done`, `## Files touched`, `## Next steps`, `## Problems`
- **ru:** `## Контекст`, `## Ключевые решения`, `## Что сделано`, `## Затронутые файлы`, `## Следующие шаги`, `## Проблемы`

## Session Context Restore (BEFORE creating session)

Before creating a new session, read recent sessions to understand current state:

1. List files in `claude-memory/sessions/`
2. Find sessions for TODAY — read all of them
3. If no sessions today — find the LAST day that has sessions, read those
4. This gives you: what was done recently, what files were touched, what's next
5. Use `continues:` to link to the most recent session in the chosen base

This is NOT optional. Without reading prior sessions, you have no project context.

## Session File Creation

At the START of every session (first user message), create a session file:

1. Generate filename: `{YYYY-MM-DD HH-mm} — {Brief description}.md`
   - Brief description comes from the user's first message intent
   - If unclear, use "New session" (en) or "Новая сессия" (ru) and rename later when intent is clear
2. Write to `claude-memory/sessions/{filename}`
3. **Update base chronology** — for each base in session.bases, add a line to `## Chronology` in the base file:
   `- {YYYY-MM-DD} — {brief description}. [[session filename]]`
   This creates a bidirectional link: session → base AND base → session.
   Without this, the base is disconnected from its sessions in the Obsidian graph.

## Session File Format

```yaml
---
date: {ISO 8601 timestamp}
duration: {updated at session end}
streams: [{list of stream names touched during session}]
bases: [{list of base wikilinks, e.g. "[[Плагин Obsidian]]"}]
continues: "{wikilink to previous session in chain, or empty}"
status: in_progress
---
```

Body sections:

# Сессия {YYYY-MM-DD HH:mm} — {Description}

## Контекст
{Why the user started this session}

## Связи
- Продолжение: [[previous session name]] (if continues is set)
- Базы: [[Base 1]], [[Base 2]]

## Ключевые решения
{Each decision with brief reasoning}

## Что сделано
{Completed work items with [[wikilinks]] to streams}

## Файлы затронуты
{Files read and edited}

## Команды
{Commands run}

## Git commits
{Commits made during session}

## Проблемы
{Issues encountered and how resolved}

## Следующие шаги
{Concrete next actions — added at session end}

## CRITICAL: Session Is Always In Progress

**The session file is a LIVE document. It is NEVER "done early". Status stays `in_progress` until the conversation actually ends.**

Rules:
- NEVER set `status: completed` until the user explicitly ends the conversation or stops responding
- NEVER create a session, immediately close it, and then continue working without a session
- If a "small task" grows into a bigger task — that's fine, keep updating the SAME session
- ONE conversation = ONE session. No exceptions.

## What to Record During Session

**After EVERY tool call that modifies a file**, append to `## Затронутые файлы` in the session:
- The file path
- WHAT was changed (brief description of the semantic change)

Format: `- [[{path}]] — {what changed}`
Example: `- [[README.md]] — added "test" at end of file`
Example: `- [[src/sync/changed-writer.ts]] — expanded polling to entire vault instead of claude-memory/ only`

Use the project's chosen language (from `claude-memory/.lang`) for the description text.

ALL project files MUST be wrapped in `[[wikilinks]]`. This creates links in Obsidian's graph
between the session and every file it touched. Without wikilinks, the memory is disconnected.

Do not batch updates. Do not "update later". Write immediately after each edit.

The Obsidian plugin also auto-appends file paths (without descriptions) as a safety net.
Claude MUST write its own entries WITH descriptions — the plugin backup is just a fallback.

### Automatically (every action):
- Files edited (under `## Затронутые файлы`) — IMMEDIATELY after each edit, WITH description
- Commands run (under `## Команды`)
- Git commits made (under `## Git commits`)

### By judgment (significant moments):
- Under `## Контекст`: Why the user started this session (from first message)
- Under `## Ключевые решения`: Each decision with brief reasoning
- Under `## Что сделано`: Completed work items with `[[wikilinks]]` to streams
- Under `## Проблемы`: Issues encountered and how they were resolved

## Session End

When the session appears to be ending (user says goodbye, long pause, or explicit close):

1. Add `## Следующие шаги` section with concrete next actions
2. Update frontmatter: `status: completed`, `duration: {calculated}`
3. Update `streams:` list in frontmatter with all streams touched
4. Update `.claude-memory/MEMORY.md` index — add/update session entry
5. Update base chronology: for each base in session.bases, add a chronology entry in the base file if significant changes were made

## Session Size Target

50-150 lines of markdown. This is a compressed summary, not a raw log.
If a session is very long, summarize earlier sections more aggressively to stay within budget.

## Linking Sessions to Streams

Every time you work on something that maps to a GSD phase, workstream, or quick task:
1. Add the stream name to the session's `streams:` frontmatter
2. Add a `[[wikilink]]` to the stream in the session body
3. Update the stream's progress file if applicable
