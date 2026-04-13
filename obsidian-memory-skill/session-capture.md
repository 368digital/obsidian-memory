# Session Capture

## Session File Creation

At the START of every session (first user message), create a session file:

1. Generate filename: `{YYYY-MM-DD HH-mm} — {Brief description}.md`
   - Brief description comes from the user's first message intent
   - If unclear, use "Новая сессия" and rename later when intent is clear
2. Write to `.claude-memory/sessions/{filename}`

## Session File Format

```yaml
---
date: {ISO 8601 timestamp}
duration: {updated at session end}
streams: [{list of stream names touched during session}]
status: in_progress
---
```

Body sections:

# Сессия {YYYY-MM-DD HH:mm} — {Description}

## Контекст
{Why the user started this session}

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

## What to Record During Session

Append to the current session file after each significant action:

### Automatically (every action):
- Files read and edited (under `## Файлы затронуты`)
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

## Session Size Target

50-150 lines of markdown. This is a compressed summary, not a raw log.
If a session is very long, summarize earlier sections more aggressively to stay within budget.

## Linking Sessions to Streams

Every time you work on something that maps to a GSD phase, workstream, or quick task:
1. Add the stream name to the session's `streams:` frontmatter
2. Add a `[[wikilink]]` to the stream in the session body
3. Update the stream's progress file if applicable
