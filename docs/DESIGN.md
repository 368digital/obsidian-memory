# Obsidian Memory — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Overview

Система сохранения полного контекста проекта через Obsidian vault. Два продукта:
1. **Skill `obsidian-memory`** — Claude Code skill, который записывает диалоги, memories, потоки работы в `.claude-memory/` внутри проекта
2. **Plugin `obsidian-claude-memory`** — Obsidian plugin для визуализации и управления записанными данными

**Проблема:** При закрытии консоли контекст теряется. При работе через GSD идут несколько потоков задач — связи между ними не сохраняются. Приходится заново объяснять агенту что делать.

**Решение:** Obsidian vault в каждом проекте. Агент записывает всё в `.claude-memory/`. При новой сессии — автоматически восстанавливает контекст. Obsidian даёт UI для навигации, визуализации графа связей и активного управления.

---

## 1. Структура vault

```
my-project/
├── .obsidian/                  <- vault config + плагин
│   └── plugins/
│       └── obsidian-claude-memory/
├── .claude-memory/             <- всё что агент пишет
│   ├── MEMORY.md               <- главный индекс (Claude Code читает при старте)
│   ├── memories/               <- persistent memories (user, feedback, project, reference)
│   │   ├── Роль пользователя.md
│   │   ├── Фидбэк — Всегда использовать GSD.md
│   │   ├── Проект — Архитектура и деплой.md
│   │   └── ...
│   ├── sessions/               <- диалоги
│   │   ├── 2026-04-13 14-30 — Фикс отображения домена.md
│   │   └── ...
│   ├── streams/                <- GSD workstreams / потоки задач
│   │   ├── Фаза 04 — Каскады и режим редактирования/
│   │   │   ├── STREAM.md       <- метаданные потока
│   │   │   ├── Решения.md      <- решения в потоке
│   │   │   └── Прогресс.md     <- прогресс
│   │   └── Быстрая — Фикс domain ID.md
│   ├── graph/                  <- автогенерируемые связи между потоками
│   │   └── Перекрёстные ссылки.md
│   └── .changed                <- файл-сигнал для realtime sync
├── src/
└── ...
```

**Принципы:**
- `MEMORY.md` — единая точка входа для Claude Code
- Каждый файл — полноценная Obsidian-заметка с frontmatter и `[[wikilinks]]`
- Sessions хранят сжатый summary, не raw лог
- Streams маппятся на GSD phases/workstreams/quick tasks

**Именование файлов (user-friendly, русский):**
- Memories: `{Тип} — {Описание}.md` → `Фидбэк — Всегда использовать GSD.md`, `Проект — Архитектура и деплой.md`. Для type=user просто описание: `Роль пользователя.md`
- Sessions: `{YYYY-MM-DD HH-mm} — {Краткое описание}.md` → `2026-04-13 14-30 — Фикс отображения домена.md`
- Streams (фазы): `Фаза {NN} — {Название}/` → `Фаза 04 — Каскады и режим редактирования/`
- Streams (быстрые): `Быстрая — {Описание}.md` → `Быстрая — Фикс domain ID.md`
- Технические термины (GSD, ID, domain, API) остаются как есть

---

## 2. Skill: `obsidian-memory`

### Активация

Автоматически при обнаружении `.claude-memory/` в корне проекта. Работает через стандартные Claude Code tools (Read, Write, Glob) — без внешних зависимостей.

### При старте сессии

1. Читает `MEMORY.md` — получает индекс всего
2. Читает последние 3-5 session-файлов — понимает недавнюю работу
3. Читает активные streams — понимает текущие потоки
4. Проверяет `.changed` — подхватывает правки из Obsidian
5. Агент стартует с полным контекстом без вопросов пользователю

### Во время сессии

- При каждом значимом решении — append в текущий session-файл
- При работе с GSD — обновляет соответствующий stream
- При обнаружении связей между потоками — пишет `[[wikilinks]]` между файлами
- Memories создаёт/обновляет в `.claude-memory/memories/`

### При завершении сессии

- Генерирует summary: что сделано, какие решения, что осталось
- Обновляет `MEMORY.md` индекс
- Обновляет stream progress

### Замена стандартной auto memory

- Если `.claude-memory/` существует — все операции с памятью идут туда
- Стандартная `~/.claude/projects/.../memory/` не используется
- При первом запуске: миграция существующих memories с добавлением wikilinks и приведением frontmatter к единому стандарту

### MEMORY.md формат

```markdown
- [[Роль пользователя]] — разработчик, фокус на интеграции с Bitrix24
- [[Фидбэк — Всегда использовать GSD]] — все задачи через GSD workflow
- [[Проект — Архитектура и деплой]] — PHP backend, Vue SPA, Docker deploy flow
- [[Фаза 04 — Каскады и режим редактирования]] — завершена 2026-04-12
- [[2026-04-13 14-30 — Фикс отображения домена]] — последняя сессия
```

---

## 3. Форматы файлов

### Session

```markdown
---
date: 2026-04-13T14:30:00
duration: 45min
streams: ["Фаза 04 — Каскады и режим редактирования", "Быстрая — Фикс domain ID"]
status: completed
---

# Сессия 2026-04-13 14:30 — Фикс отображения домена

## Контекст
Продолжение работы по [[Фаза 04 — Каскады и режим редактирования]]. Пришёл баг с domain ID.

## Ключевые решения
- Домен показывал ID из-за race condition в debounced search
- Фикс: кэширование результата первого запроса

## Что сделано
- fix: домен показывает ID вместо названия — [[Быстрая — Фикс domain ID]]

## Файлы затронуты
- src/views/PaymentCalendar.vue
- src/views/TimesheetExternal.vue

## Git commits
- bd88926 feat(cleanup): add company whitelist cleanup tool skeleton

## Следующие шаги
- Проверить edit mode на всех формах
```

**Размер:** 50-150 строк markdown. Не raw промпты, а сжатая суть.

**Автоматически записывается:**
- Timestamp старта/завершения
- Какие файлы читались и редактировались
- Какие команды запускались
- Git commits за сессию
- Какие streams затронуты

**Агент генерирует:**
- Контекст: зачем пришёл пользователь
- Ключевые решения с обоснованием
- Проблемы и решения
- Что осталось незакончено
- Следующие шаги

### Stream

```markdown
---
type: gsd-phase
phase: "04"
name: Каскады и режим редактирования
status: complete
started: 2026-04-10
completed: 2026-04-12
related:
  - stream: "[[Фаза 03 — Frontend интеграция]]"
    reason: "использует cascade API из фазы 03"
  - stream: "[[Быстрая — Фикс 5 каскадных багов]]"
    reason: "исправлен баг введённый этим потоком"
---

# Фаза 04 — Каскады и режим редактирования

## Цель
Каскадные зависимости полей + режим редактирования

## Решения
- Config.php domain field uses DOMAINS sp_code (1038)
- Cascade traversal через Projects PARENT_ID_1038

## Прогресс
- [x] Plan 01 — base cascade logic
- [x] Plan 02 — edit mode load
- [x] Plan 03 — domain ID fix
```

### Memory

Тот же формат что и текущий Claude Code auto memory:

```markdown
---
name: Роль пользователя
description: разработчик, фокус на интеграции с Bitrix24
type: user
---

Контент с [[wikilinks]] на связанные memories и streams.
Например: работа в рамках [[Фаза 04 — Каскады и режим редактирования]].
```

---

## 4. Cross-references между потоками

### Как агент определяет связи

- **Общие файлы** — два потока редактировали один файл
- **Явные зависимости** — GSD phases с `Depends on`
- **Решения влияющие на другие потоки** — агент проверяет при принятии решения

### Формат

В frontmatter — структурированные связи с причиной. В теле — inline wikilinks в тексте решений и прогресса.

---

## 5. Obsidian Plugin: `obsidian-claude-memory`

### Views

**Memory Dashboard (главный view):**
- Открывается как tab в Obsidian
- Три колонки: Active Streams | Recent Sessions | Memories
- Каждый элемент кликабелен — открывает заметку
- Статусы потоков цветом: active (синий), complete (зелёный), blocked (красный)

**Stream Timeline:**
- Вертикальный timeline для конкретного потока
- Sessions, decisions, commits привязанные к потоку
- Пересечения с другими потоками визуально выделены

**Graph View (расширение стандартного):**
- Кастомные цвета для типов нод:
  - Memories — жёлтые
  - Sessions — серые
  - Streams — синие
  - Cross-refs — оранжевые связи

### Команды (Command Palette)

| Команда | Что делает |
|---------|-----------|
| `Create Memory` | Создаёт memory-файл с frontmatter, обновляет MEMORY.md |
| `Create Stream` | Создаёт новый поток работы |
| `Link Streams` | Добавляет cross-reference между потоками |
| `Archive Stream` | Помечает поток как завершённый |
| `Set Context` | Помечает sessions/streams как приоритетные для агента |

### Sidebar

- Дерево `.claude-memory/` с иконками по типам
- Быстрый фильтр: All | Active | Archived
- Счётчик memories, sessions, streams

### Редактирование и realtime sync

Пользователь редактирует любой файл как обычную Obsidian-заметку. При сохранении плагин пишет `.claude-memory/.changed` с путями изменённых файлов. Skill перед каждым ответом проверяет этот файл — если есть, перечитывает указанные файлы и удаляет `.changed`.

---

## 6. Технический стек

### Skill: `obsidian-memory`
- Формат: markdown skill definition
- Зависимости: нет — стандартные Claude Code tools (Read, Write, Glob)
- Установка: копирование в папку skills

### Plugin: `obsidian-claude-memory`
- Язык: TypeScript
- Сборка: esbuild
- Файлы: `main.ts`, `manifest.json`, `styles.css`
- API: Obsidian Plugin API (`Plugin`, `WorkspaceLeaf`, `MarkdownView`, `TFile`)
- Зависимости: только `obsidian` (type definitions)
- Установка: `.obsidian/plugins/obsidian-claude-memory/`

### Init команда

Пользователь говорит "init obsidian-memory", skill:
1. Создаёт `.claude-memory/` с начальной структурой
2. Создаёт `.obsidian/plugins/obsidian-claude-memory/` с собранным плагином
3. Мигрирует существующие memories из `~/.claude/projects/.../memory/`
4. Предлагает добавить в `.gitignore` (или спрашивает — может пользователь хочет коммитить memories)

---

## 7. Scope и порядок реализации

### Фаза 1: Skill `obsidian-memory`
- Структура `.claude-memory/`
- Запись sessions (автоматический capture)
- Запись memories (замена стандартной auto memory)
- Запись streams (интеграция с GSD)
- Восстановление контекста при старте
- Init команда
- Wikilinks и cross-refs

### Фаза 2: Obsidian Plugin `obsidian-claude-memory`
- Memory Dashboard view
- Stream Timeline view
- Кастомные цвета для Graph View
- Команды (Create Memory, Create Stream, Link, Archive, Set Context)
- Sidebar с деревом и фильтрами
- `.changed` файл-сигнал при сохранении

### Вне scope
- Шифрование memories
- Мультипользовательская работа
- Синхронизация между устройствами (Obsidian Sync)
- Веб-интерфейс
- Экспорт/импорт в другие форматы
