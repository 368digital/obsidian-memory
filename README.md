# Obsidian Memory

Система сохранения полного контекста проекта через Obsidian vault для Claude Code.

## Проблема

- При закрытии консоли Claude Code контекст теряется
- При работе через GSD идут несколько потоков задач — связи между ними не сохраняются
- Приходится заново объяснять агенту что делать

## Решение

Obsidian vault в каждом проекте. Агент записывает всё в `claude-memory/`. При новой сессии — автоматически восстанавливает контекст. Obsidian даёт UI для навигации, визуализации графа связей и активного управления.

## Компоненты

### 1. Skill `obsidian-memory-skill/`

Claude Code skill — набор markdown-инструкций, которые управляют поведением агента:

- **SKILL.md** — главный файл: активация, формат файлов, именование, wikilinks
- **session-capture.md** — как записывать сессии (диалоги с пользователем)
- **stream-tracking.md** — как отслеживать потоки работы (GSD phases, quick tasks)
- **context-restore.md** — как восстанавливать контекст при старте новой сессии
- **init.md** — инициализация `claude-memory/` в проекте с миграцией существующих memories

### 2. Plugin `obsidian-claude-memory/`

Obsidian plugin (TypeScript) для визуализации и управления:

- **Memory Dashboard** — три колонки: потоки, сессии, записи памяти
- **Stream Timeline** — вертикальный timeline для конкретного потока
- **Sidebar** — дерево файлов с фильтрами (все / активные / архив)
- **5 команд** — Create Memory, Create Stream, Link Streams, Archive Stream, Set Context
- **Realtime sync** — при редактировании в Obsidian агент подхватывает изменения через `.changed` файл

## Установка

### Claude Code Plugin (рекомендуется)

Установка через Claude Code — одна команда ставит и skill, и всё остальное:

```bash
claude /install-plugin 368digital/obsidian-memory
```

Skill автоматически зарегистрируется и станет доступен во всех проектах.

### Ручная установка

Если нужна ручная установка:

```bash
# Клонировать
git clone https://github.com/368digital/obsidian-memory.git
cd obsidian-memory

# Скопировать skill в Claude Code
cp -r skills/obsidian-memory ~/.claude/skills/obsidian-memory-skill
```

### Obsidian Plugin

Obsidian-плагин ставится в каждый проект отдельно:

```bash
# Собрать плагин
cd obsidian-claude-memory
npm install
npm run build

# Скопировать в vault проекта
mkdir -p /path/to/project/.obsidian/plugins/obsidian-claude-memory
cp main.js manifest.json styles.css /path/to/project/.obsidian/plugins/obsidian-claude-memory/
```

Затем в Obsidian: Settings → Community plugins → включить "Claude Memory".

## Использование

### Инициализация

В Claude Code скажите: **"init obsidian-memory"**

Skill создаст:
- `claude-memory/` — структуру папок (memories, sessions, streams, graph)
- `MEMORY.md` — индекс
- Мигрирует существующие memories из `~/.claude/projects/.../memory/`

### Структура vault

```
my-project/
├── .obsidian/plugins/obsidian-claude-memory/   ← плагин
├── claude-memory/                               ← данные
│   ├── MEMORY.md                                ← индекс
│   ├── memories/                                ← persistent memories
│   │   ├── Роль пользователя.md
│   │   ├── Фидбэк — Всегда использовать GSD.md
│   │   └── Проект — Архитектура и деплой.md
│   ├── sessions/                                ← диалоги
│   │   └── 2026-04-13 14-30 — Фикс домена.md
│   ├── streams/                                 ← потоки работы
│   │   ├── Фаза 04 — Каскады/
│   │   │   ├── STREAM.md
│   │   │   ├── Решения.md
│   │   │   └── Прогресс.md
│   │   └── Быстрая — Фикс domain ID.md
│   └── graph/                                   ← связи между потоками
│       └── Перекрёстные ссылки.md
└── src/
```

### Именование файлов

Все файлы именуются по-русски, user-friendly:

| Тип | Формат | Пример |
|-----|--------|--------|
| Memory (user) | `{Описание}.md` | `Роль пользователя.md` |
| Memory (feedback) | `Фидбэк — {Описание}.md` | `Фидбэк — Всегда использовать GSD.md` |
| Memory (project) | `Проект — {Описание}.md` | `Проект — Архитектура и деплой.md` |
| Memory (reference) | `Справка — {Описание}.md` | `Справка — API документация.md` |
| Session | `{YYYY-MM-DD HH-mm} — {Описание}.md` | `2026-04-13 14-30 — Фикс домена.md` |
| Stream (phase) | `Фаза {NN} — {Название}/` | `Фаза 04 — Каскады/` |
| Stream (quick) | `Быстрая — {Описание}.md` | `Быстрая — Фикс domain ID.md` |

### Wikilinks

Все файлы связаны через `[[wikilinks]]` — стандарт Obsidian:

```markdown
Продолжение работы по [[Фаза 04 — Каскады]]. 
Фикс бага из [[Быстрая — Фикс domain ID]].
См. также [[Роль пользователя]].
```

### Команды Obsidian (Command Palette)

| Команда | Что делает |
|---------|-----------|
| Claude Memory: Create Memory | Создаёт memory-файл с frontmatter |
| Claude Memory: Create Stream | Создаёт новый поток работы |
| Claude Memory: Link Streams | Связывает два потока с указанием причины |
| Claude Memory: Archive Stream | Помечает поток как завершённый |
| Claude Memory: Set Context | Помечает файл как приоритетный для агента |

## Как это работает

### Запись (Claude Code → Obsidian)

1. **При старте сессии** — skill создаёт session-файл в `claude-memory/sessions/`
2. **Во время работы** — записывает решения, изменённые файлы, прогресс
3. **При завершении** — генерирует summary и следующие шаги
4. **Memories** — пишутся в `claude-memory/memories/` вместо стандартного `~/.claude/`

### Чтение (Obsidian → Claude Code)

1. При сохранении файла в Obsidian, плагин пишет `claude-memory/.changed`
2. Skill перед каждым ответом проверяет `.changed`
3. Если есть — перечитывает изменённые файлы и удаляет `.changed`

### Восстановление контекста

При новой сессии skill автоматически:
1. Читает `MEMORY.md` — индекс всего
2. Читает последние 3-5 сессий
3. Читает активные потоки
4. Читает все memories

Агент стартует с полным контекстом без вопросов.

## Разработка

### Plugin

```bash
cd obsidian-claude-memory
npm install
npm run dev    # watch mode
npm run build  # production build
```

### Структура плагина

```
src/
├── main.ts              ← Plugin entry, views + commands
├── types.ts             ← MemoryFile, SessionFile, StreamFile
├── parser.ts            ← Frontmatter parser, wikilink extraction
├── views/
│   ├── DashboardView.ts ← 3-column dashboard
│   └── TimelineView.ts  ← Stream timeline
├── sidebar/
│   └── SidebarView.ts   ← Tree view with filters
├── commands/
│   └── commands.ts      ← 5 commands with modals
└── sync/
    └── changed-writer.ts ← .changed signal writer
```

## Лицензия

MIT
