---
name: obsidian-memory
description: Persistent project memory via Obsidian vault. Auto-activates when claude-memory/ exists in project root. Records sessions, memories, streams with [[wikilinks]]. Replaces standard auto memory.
---

# Obsidian Memory

Система сохранения полного контекста проекта через Obsidian vault в `claude-memory/`.

## Activation

This skill activates automatically when `claude-memory/` directory exists in the project root. Check at session start:

1. Use Glob to check for `claude-memory/MEMORY.md`
2. If found → this skill is active, follow all instructions below
3. If not found → skill is inactive, do nothing

## Directory Structure

`claude-memory/` contains:
- `MEMORY.md` — main index (replaces `~/.claude/projects/.../memory/MEMORY.md`)
- `memories/` — persistent memories (user, feedback, project, reference types)
- `sessions/` — session summaries with context, decisions, next steps
- `streams/` — GSD workstream tracking (phases, quick tasks)
- `graph/` — auto-generated cross-references
- `.changed` — signal file for realtime sync from Obsidian edits

## File Naming (Russian, user-friendly)

- Memories: `{Тип} — {Описание}.md` (e.g., `Фидбэк — Всегда использовать GSD.md`). For type=user: just description (`Роль пользователя.md`)
- Sessions: `{YYYY-MM-DD HH-mm} — {Краткое описание}.md` (e.g., `2026-04-13 14-30 — Фикс отображения домена.md`)
- Streams (phases): `Фаза {NN} — {Название}/` directory with `STREAM.md`, `Решения.md`, `Прогресс.md`
- Streams (quick): `Быстрая — {Описание}.md`
- Technical terms (GSD, ID, domain, API) stay as-is

## Wikilinks

Use `[[filename without extension]]` for all cross-references:
- `[[Роль пользователя]]` — link to memory
- `[[Фаза 04 — Каскады и режим редактирования]]` — link to stream
- `[[2026-04-13 14-30 — Фикс отображения домена]]` — link to session

## Memory Format

All memory operations write to `claude-memory/memories/` instead of `~/.claude/projects/.../memory/`. Same frontmatter format:

```yaml
---
name: {Readable name}
description: {One-line description}
type: {user|feedback|project|reference}
---
```

MEMORY.md index uses wikilinks:
```
- [[Роль пользователя]] — разработчик, фокус на интеграции с Bitrix24
- [[Фидбэк — Всегда использовать GSD]] — все задачи через GSD workflow
```

## Realtime Sync

Before each response, check if `claude-memory/.changed` exists:
1. Read `.changed` — contains paths of files modified in Obsidian
2. Re-read those files to pick up changes
3. Delete `.changed` after processing

## Images

NEVER embed base64 image data in markdown files. Obsidian cannot render inline base64.

When saving content that includes images:
1. Save the image as a file in `claude-memory/assets/` (create directory if needed)
2. Use descriptive filename: `assets/payment-calendar-form.png`
3. Reference in markdown with Obsidian syntax: `![[payment-calendar-form.png]]`

If you encounter existing files with base64 image data, extract images to `assets/` and replace the base64 with `![[filename.png]]`.

## IMPORTANT: Replace Standard Auto Memory

When this skill is active:
- ALL memory reads come from `claude-memory/memories/` and `claude-memory/MEMORY.md`
- ALL memory writes go to `claude-memory/memories/` and update `claude-memory/MEMORY.md`
- Do NOT read or write `~/.claude/projects/.../memory/`
