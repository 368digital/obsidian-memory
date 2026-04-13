# Stream Tracking

## What is a Stream

A stream maps to a unit of work tracked by GSD:
- **GSD Phase** → directory `Фаза {NN} — {Название}/` with STREAM.md, Решения.md, Прогресс.md
- **GSD Quick Task** → single file `Быстрая — {Описание}.md`
- **GSD Workstream** → directory `Поток — {Название}/` with STREAM.md

## Stream File Format (STREAM.md or single-file quick task)

```yaml
---
type: {gsd-phase|gsd-quick|gsd-workstream}
phase: "{NN}" # for phases only
name: {Human readable name}
status: {active|complete|blocked|paused}
started: {YYYY-MM-DD}
completed: {YYYY-MM-DD} # when done
related:
  - stream: "[[Other Stream Name]]"
    reason: "why related"
---
```

Body sections:
- `## Цель` — what this stream aims to achieve
- `## Решения` — key decisions made (or separate Решения.md for phases)
- `## Прогресс` — checklist of plans/tasks (or separate Прогресс.md for phases)

## When to Create a Stream

- When starting a GSD phase execution → create phase stream directory
- When starting a GSD quick task → create quick stream file
- When starting a GSD workstream → create workstream directory

## When to Update a Stream

- After completing a plan/task within the stream → update Прогресс.md checkboxes
- After making a decision → add to Решения.md with reasoning
- After discovering a relationship to another stream → add to `related:` frontmatter
- When stream completes → set `status: complete`, add `completed:` date

## Cross-References

When you detect that two streams are related:

1. **Shared files**: Two streams edited the same source file → add bidirectional `related:` entries
2. **GSD dependencies**: Phase has `Depends on` in ROADMAP → add `related:` with reason
3. **Decision impact**: A decision in stream A affects stream B → add `related:` and note in both streams' Решения

Format in frontmatter:
```yaml
related:
  - stream: "[[Фаза 03 — Frontend интеграция]]"
    reason: "использует cascade API из фазы 03"
```

Format inline: `Исправили баг из [[Быстрая — Фикс domain ID]] который ломал каскад`

## Graph File

After updating cross-references, update `.claude-memory/graph/Перекрёстные ссылки.md`:
- List all streams with their relationships
- This file is auto-generated — overwrite on each update
