# План реализации системы баз

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ СКИЛЛ: superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для пошагового выполнения. Шаги используют чекбоксы (`- [ ]`).

**Цель:** Добавить систему "баз" в obsidian-memory — контекстные блоки, группирующие сессии, отслеживающие хронологию и визуализирующиеся в Obsidian UI.

**Архитектура:** Базы — markdown-файлы в `claude-memory/bases/` с frontmatter (name, description, paths, tags). Сессии ссылаются на базы через поле `bases` во frontmatter. Плагин парсит базы и отображает их в Sidebar, Dashboard и Timeline. Файлы скилла направляют Claude спрашивать какая база при старте сессии.

**Стек:** TypeScript (Obsidian plugin API), Markdown (файлы скилла, CLAUDE.md)

---

## Структура файлов

### Изменяемые файлы
- `obsidian-claude-memory/src/types.ts` — тип `BaseFile`, обновление `SessionFile`, константа `BASES_DIR`
- `obsidian-claude-memory/src/parser.ts` — `parseBaseFile()`, обновление `loadMemoryIndex()`
- `obsidian-claude-memory/src/sidebar/SidebarView.ts` — секция баз
- `obsidian-claude-memory/src/views/DashboardView.ts` — карточки баз
- `obsidian-claude-memory/src/views/TimelineView.ts` — фильтр по базам
- `obsidian-claude-memory/src/commands/commands.ts` — команда `create-base`
- `obsidian-claude-memory/styles.css` — стили для баз
- `C:/Users/Admin/.claude/skills/obsidian-memory-skill/SKILL.md` — структура + описание баз
- `C:/Users/Admin/.claude/skills/obsidian-memory-skill/session-capture.md` — формат сессии
- `C:/Users/Admin/.claude/skills/obsidian-memory-skill/context-restore.md` — шаг чтения баз
- `C:/Users/Admin/.claude/skills/obsidian-memory-skill/commands.md` — новый файл команд `/obs-mem`
- `C:/Users/Admin/.claude/skills/obsidian-memory-skill/init.md` — добавить bases/ в init
- `CLAUDE.md` — инструкции старта сессии с базами
- `.claude/settings.json` — хук SessionStart с упоминанием баз

---

### Задача 1: Типы и парсер — тип BaseFile + парсинг

**Файлы:**
- Изменить: `obsidian-claude-memory/src/types.ts`
- Изменить: `obsidian-claude-memory/src/parser.ts`

- [ ] **Шаг 1: Добавить тип BaseFile и константы в types.ts**

Добавить после интерфейса `StreamFile` и перед `ClaudeMemoryFile`:

```typescript
export interface BaseFile {
  path: string;
  name: string;
  description: string;
  paths: string[];
  tags: string[];
  created: string;
  content: string;
  wikilinks: string[];
}
```

Обновить `ClaudeMemoryFile`:
```typescript
export type ClaudeMemoryFile = MemoryFile | SessionFile | StreamFile | BaseFile;
```

Обновить `MemoryIndex`:
```typescript
export interface MemoryIndex {
  memories: MemoryFile[];
  sessions: SessionFile[];
  streams: StreamFile[];
  bases: BaseFile[];
}
```

Добавить поля в `SessionFile`:
```typescript
export interface SessionFile {
  path: string;
  name: string;
  date: string;
  duration: string;
  streams: string[];
  bases: string[];       // НОВОЕ
  continues: string;     // НОВОЕ
  status: 'in_progress' | 'completed';
  content: string;
  wikilinks: string[];
}
```

Добавить константу:
```typescript
export const BASES_DIR = 'bases';
```

- [ ] **Шаг 2: Добавить parseBaseFile и обновить parser.ts**

Обновить импорты:
```typescript
import {
  MemoryFile,
  SessionFile,
  StreamFile,
  BaseFile,
  CLAUDE_MEMORY_DIR,
  MEMORIES_DIR,
  SESSIONS_DIR,
  STREAMS_DIR,
  BASES_DIR,
} from './types';
```

Обновить `getFileCategory` — добавить перед `return 'unknown'`:
```typescript
if (path.includes(`${BASES_DIR}/`)) return 'base';
```

Обновить тип возврата `getFileCategory`:
```typescript
export function getFileCategory(path: string): 'memory' | 'session' | 'stream' | 'base' | 'graph' | 'index' | 'unknown' {
```

Добавить функцию `parseBaseFile` после `parseStreamFile`:
```typescript
export function parseBaseFile(path: string, content: string): BaseFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: (meta.name as string) || path.split('/').pop()?.replace('.md', '') || '',
    description: (meta.description as string) || '',
    paths: (meta.paths as string[]) || [],
    tags: (meta.tags as string[]) || [],
    created: (meta.created as string) || '',
    content: body,
    wikilinks: extractWikilinks(content),
  };
}
```

Обновить `parseSessionFile` — добавить новые поля:
```typescript
export function parseSessionFile(path: string, content: string): SessionFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: path.split('/').pop()?.replace('.md', '') || '',
    date: (meta.date as string) || '',
    duration: (meta.duration as string) || '',
    streams: (meta.streams as string[]) || [],
    bases: (meta.bases as string[]) || [],
    continues: (meta.continues as string) || '',
    status: (meta.status as SessionFile['status']) || 'completed',
    content: body,
    wikilinks: extractWikilinks(content),
  };
}
```

Обновить `loadMemoryIndex` — добавить базы:
```typescript
export async function loadMemoryIndex(vault: Vault): Promise<{
  memories: MemoryFile[];
  sessions: SessionFile[];
  streams: StreamFile[];
  bases: BaseFile[];
}> {
  const memories: MemoryFile[] = [];
  const sessions: SessionFile[] = [];
  const streams: StreamFile[] = [];
  const bases: BaseFile[] = [];

  const files = vault.getMarkdownFiles().filter((f) => f.path.startsWith(CLAUDE_MEMORY_DIR + '/'));

  for (const file of files) {
    const content = await vault.cachedRead(file);
    const category = getFileCategory(file.path);

    switch (category) {
      case 'memory':
        memories.push(parseMemoryFile(file.path, content));
        break;
      case 'session':
        sessions.push(parseSessionFile(file.path, content));
        break;
      case 'stream':
        streams.push(parseStreamFile(file.path, content));
        break;
      case 'base':
        bases.push(parseBaseFile(file.path, content));
        break;
    }
  }

  sessions.sort((a, b) => b.date.localeCompare(a.date));

  return { memories, sessions, streams, bases };
}
```

- [ ] **Шаг 3: Сборка и проверка**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка без ошибок

- [ ] **Шаг 4: Коммит**

```bash
git add obsidian-claude-memory/src/types.ts obsidian-claude-memory/src/parser.ts
git commit -m "feat: add BaseFile type and parser for bases system"
```

---

### Задача 2: Команда создания базы в Obsidian

**Файлы:**
- Изменить: `obsidian-claude-memory/src/commands/commands.ts`

- [ ] **Шаг 1: Добавить CreateBaseModal**

Обновить импорты:
```typescript
import { CLAUDE_MEMORY_DIR, MEMORIES_DIR, STREAMS_DIR, BASES_DIR, MEMORY_INDEX } from '../types';
```

Добавить регистрацию команды в `registerCommands` после существующих:
```typescript
  plugin.addCommand({
    id: 'create-base',
    name: 'Create Base',
    callback: () => new CreateBaseModal(plugin.app, plugin).open(),
  });
```

Добавить класс модалки после `CreateStreamModal`:
```typescript
class CreateBaseModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Создать базу' });

    let name = '';
    let description = '';
    let paths = '';
    let tags = '';

    new Setting(contentEl).setName('Название').addText((t) =>
      t.setPlaceholder('Плагин Obsidian').onChange((v) => (name = v))
    );

    new Setting(contentEl).setName('Описание').addTextArea((t) =>
      t.setPlaceholder('Что это за направление работы').onChange((v) => (description = v))
    );

    new Setting(contentEl).setName('Пути').setDesc('Через запятую').addText((t) =>
      t.setPlaceholder('src/sync/, src/main.ts').onChange((v) => (paths = v))
    );

    new Setting(contentEl).setName('Теги').setDesc('Через запятую').addText((t) =>
      t.setPlaceholder('obsidian, plugin').onChange((v) => (tags = v))
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText('Создать')
        .setCta()
        .onClick(async () => {
          if (!name) {
            new Notice('Введите название');
            return;
          }

          const today = new Date().toISOString().slice(0, 10);
          const pathsList = paths ? paths.split(',').map((p) => p.trim()).filter(Boolean) : [];
          const tagsList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

          const pathsYaml = pathsList.length > 0
            ? `paths:\n${pathsList.map((p) => `  - ${p}`).join('\n')}`
            : 'paths: []';
          const tagsYaml = tagsList.length > 0
            ? `tags: [${tagsList.join(', ')}]`
            : 'tags: []';

          const content = [
            '---',
            `name: ${name}`,
            `description: ${description}`,
            pathsYaml,
            tagsYaml,
            `created: ${today}`,
            '---',
            '',
            '## Описание',
            description,
            '',
            '## Ключевые компоненты',
            '',
            '',
            '## Хронология',
            '',
          ].join('\n');

          const filePath = `${CLAUDE_MEMORY_DIR}/${BASES_DIR}/${name}.md`;
          await this.app.vault.create(filePath, content);
          new Notice(`Создана база: ${name}`);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

- [ ] **Шаг 2: Сборка и проверка**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка

- [ ] **Шаг 3: Коммит**

```bash
git add obsidian-claude-memory/src/commands/commands.ts
git commit -m "feat: add Create Base command to Obsidian"
```

---

### Задача 3: Sidebar — секция баз

**Файлы:**
- Изменить: `obsidian-claude-memory/src/sidebar/SidebarView.ts`

- [ ] **Шаг 1: Обновить render() для отображения баз**

Обновить деструктуризацию:
```typescript
const { memories, sessions, streams, bases } = await loadMemoryIndex(this.app.vault);
```

Обновить строку счётчиков:
```typescript
counts.setText(`${bases.length} баз · ${memories.length} памяти · ${sessions.length} сессий · ${streams.length} потоков`);
```

Добавить секцию баз после счётчиков и перед потоками:
```typescript
    if (bases.length > 0) {
      this.renderSection(container, 'Базы', bases.map((b) => ({
        name: b.name,
        path: b.path,
        badge: `${b.tags[0] || ''}`,
        badgeClass: 'cm-base-badge',
      })));
    }
```

- [ ] **Шаг 2: Сборка и проверка**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка

- [ ] **Шаг 3: Коммит**

```bash
git add obsidian-claude-memory/src/sidebar/SidebarView.ts
git commit -m "feat: show bases in sidebar"
```

---

### Задача 4: Dashboard — карточки баз

**Файлы:**
- Изменить: `obsidian-claude-memory/src/views/DashboardView.ts`

- [ ] **Шаг 1: Импортировать тип BaseFile**

Обновить импорт:
```typescript
import type { MemoryFile, SessionFile, StreamFile, BaseFile } from '../types';
```

- [ ] **Шаг 2: Обновить render() для баз**

Обновить деструктуризацию:
```typescript
const { memories, sessions, streams, bases } = await loadMemoryIndex(this.app.vault);
```

Обновить статистику:
```typescript
stats.createSpan({ text: `${bases.length} баз` });
stats.createSpan({ text: ` · ${streams.length} потоков` });
stats.createSpan({ text: ` · ${sessions.length} сессий` });
stats.createSpan({ text: ` · ${memories.length} записей` });
```

Обновить грид — 4 колонки если есть базы:
```typescript
const grid = container.createDiv({ cls: 'cm-dashboard-grid' });
if (bases.length > 0) {
  grid.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
}
```

Добавить рендер колонки баз перед существующими:
```typescript
if (bases.length > 0) {
  this.renderBasesColumn(grid, bases, sessions);
}
```

- [ ] **Шаг 3: Добавить метод renderBasesColumn**

Добавить после `renderMemoriesColumn`:
```typescript
  private renderBasesColumn(parent: HTMLElement, bases: BaseFile[], sessions: SessionFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Базы' });

    for (const base of bases) {
      const card = col.createDiv({ cls: 'cm-item cm-base' });
      card.createSpan({ cls: 'cm-item-name', text: base.name });
      card.createSpan({ cls: 'cm-item-desc', text: base.description });

      // Подсчёт сессий для этой базы
      const baseName = base.name;
      const baseSessions = sessions.filter((s) =>
        s.bases.some((b) => b.includes(baseName))
      );
      if (baseSessions.length > 0) {
        const info = card.createDiv({ cls: 'cm-tags' });
        info.createSpan({ cls: 'cm-tag', text: `${baseSessions.length} сессий` });
        const lastSession = baseSessions[0];
        if (lastSession) {
          info.createSpan({ cls: 'cm-tag', text: lastSession.date.slice(0, 10) });
        }
      }

      if (base.tags.length > 0) {
        const tags = card.createDiv({ cls: 'cm-tags' });
        for (const tag of base.tags) {
          tags.createSpan({ cls: 'cm-tag', text: tag });
        }
      }

      card.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(base.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }
  }
```

- [ ] **Шаг 4: Сборка и проверка**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка

- [ ] **Шаг 5: Коммит**

```bash
git add obsidian-claude-memory/src/views/DashboardView.ts
git commit -m "feat: show base cards in dashboard"
```

---

### Задача 5: Timeline — фильтр по базам

**Файлы:**
- Изменить: `obsidian-claude-memory/src/views/TimelineView.ts`

- [ ] **Шаг 1: Импортировать BaseFile и добавить состояние**

Обновить импорт:
```typescript
import type { SessionFile, StreamFile, BaseFile } from '../types';
```

Добавить поле `currentBase` рядом с `currentStream`:
```typescript
  private currentBase: string | null = null;
```

- [ ] **Шаг 2: Обновить render() для поддержки фильтрации по базам и потокам**

Заменить весь метод `render()`:
```typescript
  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-timeline');

    const { sessions, streams, bases } = await loadMemoryIndex(this.app.vault);

    if (!this.currentStream && !this.currentBase) {
      this.renderPicker(container, streams, bases);
      return;
    }

    if (this.currentBase) {
      const base = bases.find((b) => b.name === this.currentBase);
      if (!base) {
        container.createEl('p', { text: `База "${this.currentBase}" не найдена` });
        return;
      }

      const header = container.createDiv({ cls: 'cm-timeline-header' });
      header.createEl('h2', { text: base.name });
      const backBtn = header.createEl('button', { cls: 'cm-filter-btn', text: '← Назад' });
      backBtn.addEventListener('click', () => {
        this.currentBase = null;
        this.render();
      });

      if (base.description) {
        container.createDiv({ cls: 'cm-date', text: base.description });
      }

      const baseSessions = sessions.filter((s) =>
        s.bases.some((b) => b.includes(base.name))
      );

      const timeline = container.createDiv({ cls: 'cm-timeline' });
      timeline.createEl('h3', { text: 'Сессии' });

      for (const session of baseSessions) {
        this.renderTimelineEntry(timeline, session);
      }

      if (baseSessions.length === 0) {
        timeline.createDiv({ cls: 'cm-empty', text: 'Нет сессий для этой базы' });
      }
      return;
    }

    // Рендер потока (существующая логика)
    const stream = streams.find((s) => s.name === this.currentStream);
    if (!stream) {
      container.createEl('p', { text: `Поток "${this.currentStream}" не найден` });
      return;
    }

    const header = container.createDiv({ cls: 'cm-timeline-header' });
    header.createEl('h2', { text: stream.name });
    const badge = header.createSpan({ cls: `cm-badge cm-status-${stream.status}` });
    badge.setText(stream.status);
    const backBtn = header.createEl('button', { cls: 'cm-filter-btn', text: '← Назад' });
    backBtn.addEventListener('click', () => {
      this.currentStream = null;
      this.render();
    });

    if (stream.started) {
      header.createDiv({ cls: 'cm-date', text: `${stream.started}${stream.completed ? ' → ' + stream.completed : ' → ...'}` });
    }

    if (stream.related.length > 0) {
      const relSection = container.createDiv({ cls: 'cm-related' });
      relSection.createEl('h3', { text: 'Связанные потоки' });
      for (const rel of stream.related) {
        const item = relSection.createDiv({ cls: 'cm-related-item' });
        item.createSpan({ cls: 'cm-related-name', text: rel.stream.replace(/\[\[|\]\]/g, '') });
        item.createSpan({ cls: 'cm-related-reason', text: rel.reason });
      }
    }

    const streamSessions = sessions.filter((s) =>
      s.streams.some((name) => name === this.currentStream)
    );

    const timeline = container.createDiv({ cls: 'cm-timeline' });
    timeline.createEl('h3', { text: 'Сессии' });

    for (const session of streamSessions) {
      this.renderTimelineEntry(timeline, session);
    }

    if (streamSessions.length === 0) {
      timeline.createDiv({ cls: 'cm-empty', text: 'Нет сессий для этого потока' });
    }
  }
```

- [ ] **Шаг 3: Добавить хелперы renderPicker и renderTimelineEntry**

Заменить `renderStreamPicker` на:
```typescript
  private renderPicker(container: HTMLElement, streams: StreamFile[], bases: BaseFile[]) {
    if (bases.length > 0) {
      container.createEl('h2', { text: 'Базы' });
      const baseList = container.createDiv({ cls: 'cm-stream-picker' });
      for (const base of bases) {
        const item = baseList.createDiv({ cls: 'cm-item cm-base' });
        item.createSpan({ cls: 'cm-badge cm-base-badge', text: base.tags[0] || 'база' });
        item.createSpan({ cls: 'cm-item-name', text: base.name });
        item.addEventListener('click', () => {
          this.currentBase = base.name;
          this.render();
        });
      }
    }

    container.createEl('h2', { text: 'Потоки' });
    const list = container.createDiv({ cls: 'cm-stream-picker' });
    for (const stream of streams) {
      const item = list.createDiv({ cls: `cm-item cm-stream cm-status-${stream.status}` });
      item.createSpan({ cls: 'cm-badge', text: stream.status });
      item.createSpan({ cls: 'cm-item-name', text: stream.name });
      item.addEventListener('click', () => {
        this.currentStream = stream.name;
        this.render();
      });
    }
  }

  private renderTimelineEntry(timeline: HTMLElement, session: SessionFile) {
    const entry = timeline.createDiv({ cls: 'cm-timeline-entry' });
    entry.createDiv({ cls: 'cm-timeline-dot' });
    const body = entry.createDiv({ cls: 'cm-timeline-body' });
    body.createDiv({ cls: 'cm-date', text: session.date.slice(0, 16).replace('T', ' ') });
    body.createDiv({ cls: 'cm-item-name', text: session.name });

    if (session.bases.length > 0) {
      const tags = body.createDiv({ cls: 'cm-tags' });
      for (const b of session.bases) {
        tags.createSpan({ cls: 'cm-tag', text: b.replace(/\[\[|\]\]/g, '') });
      }
    }

    entry.addEventListener('click', () => {
      const file = this.app.vault.getAbstractFileByPath(session.path);
      if (file) {
        this.app.workspace.getLeaf('tab').openFile(file as any);
      }
    });
  }
```

- [ ] **Шаг 4: Сборка и проверка**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка

- [ ] **Шаг 5: Коммит**

```bash
git add obsidian-claude-memory/src/views/TimelineView.ts
git commit -m "feat: add base filter to timeline view"
```

---

### Задача 6: CSS-стили для баз

**Файлы:**
- Изменить: `obsidian-claude-memory/styles.css`

- [ ] **Шаг 1: Добавить стили баз в конец styles.css**

```css
/* === Базы === */
.cm-base {
  border-left: 3px solid var(--color-purple);
}

.cm-base-badge {
  background: #9b59b633;
  color: var(--text-normal);
}
```

- [ ] **Шаг 2: Сборка и проверка**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка

- [ ] **Шаг 3: Коммит**

```bash
git add obsidian-claude-memory/styles.css
git commit -m "feat: add base styles"
```

---

### Задача 7: Обновление файлов скилла

**Файлы:**
- Изменить: `C:/Users/Admin/.claude/skills/obsidian-memory-skill/SKILL.md`
- Изменить: `C:/Users/Admin/.claude/skills/obsidian-memory-skill/session-capture.md`
- Изменить: `C:/Users/Admin/.claude/skills/obsidian-memory-skill/context-restore.md`
- Изменить: `C:/Users/Admin/.claude/skills/obsidian-memory-skill/init.md`
- Создать: `C:/Users/Admin/.claude/skills/obsidian-memory-skill/commands.md`

- [ ] **Шаг 1: Обновить SKILL.md — добавить базы в структуру и описание**

В секции `## Directory Structure` добавить `bases/`:
```
- `bases/` — контекстные блоки, группирующие сессии по направлениям работы
```

Добавить новую секцию после `## Wikilinks`:
```markdown
## Базы (Bases)

Базы — контекстные блоки (направления работы), группирующие сессии. Каждая база — файл в `claude-memory/bases/{Название}.md`.

### Формат файла базы
\```yaml
---
name: {Читаемое название}
description: {Однострочное описание — используется для определения принадлежности сессий}
paths:
  - {подсказки путей для автоопределения}
tags: [{теги для группировки}]
created: {YYYY-MM-DD}
---
\```

Секции тела:
- `## Описание` — что покрывает база
- `## Ключевые компоненты` — основные части (опционально)
- `## Хронология` — снимки состояния: дата — что изменилось + [[wikilink на сессию]]

### Связь сессий и баз
- Сессии ссылаются на базы во frontmatter: `bases: ["[[Название базы]]"]`
- Одна сессия может принадлежать нескольким базам
- Claude спрашивает какая база при старте сессии
- Команда `/obs-mem base` для управления базами в процессе
```

- [ ] **Шаг 2: Обновить session-capture.md — новый формат сессии**

Заменить секцию frontmatter:
```yaml
---
date: {ISO 8601 timestamp}
duration: {обновляется в конце сессии}
streams: [{список потоков, затронутых в сессии}]
bases: [{список wikilinks баз, например "[[Плагин Obsidian]]"}]
continues: "{wikilink на предыдущую сессию в цепочке, или пусто}"
status: in_progress
---
```

Добавить секцию `## Связи` после `## Контекст`:
```markdown
## Связи
- Продолжение: [[имя предыдущей сессии]] (если continues задан)
- Базы: [[База 1]], [[База 2]]
```

Добавить в `## Session End` шаг:
```
5. Обновить хронологию баз: для каждой базы в session.bases добавить запись в хронологию, если были значимые изменения
```

- [ ] **Шаг 3: Обновить context-restore.md — добавить чтение баз**

Вставить после Шага 2 (Чтение индекса), перед Шагом 3 (Чтение сессий):

```markdown
### Шаг 2.5: Чтение баз и выбор
- Glob `claude-memory/bases/*.md`
- Прочитать все файлы баз (обычно немного — 2-10 файлов)
- Показать список баз пользователю и спросить: "К какой базе относится эта работа?"
  - Нумерованный список с названиями и описаниями
  - Можно выбрать одну или несколько, или сказать "Новая база"
- Если "Новая база": спросить название и описание, создать файл базы
- Прочитать хронологию выбранных баз — это контекст текущего состояния
- Определить `continues`: найти последнюю сессию в выбранных базах, предложить как продолжение
```

- [ ] **Шаг 4: Создать commands.md — справочник команд /obs-mem**

Создать `C:/Users/Admin/.claude/skills/obsidian-memory-skill/commands.md`:

```markdown
# Команды

## /obs-mem init

Инициализация claude-memory в текущем проекте. Полные шаги — в init.md.

## /obs-mem base

Показать текущие базы сессии и список всех доступных баз.

### Поведение:
1. Прочитать frontmatter текущей сессии → показать поле `bases`
2. Glob `claude-memory/bases/*.md` → список всех баз с названиями и описаниями
3. Показать оба списка пользователю

## /obs-mem base {Название}

Добавить базу к текущей сессии.

### Поведение:
1. Найти файл базы `claude-memory/bases/{Название}.md`
2. Если не найден, предложить: "База '{Название}' не найдена. Создать? (да/нет)"
3. Если найден, добавить `[[{Название}]]` в массив `bases` во frontmatter сессии
4. Прочитать секцию `## Хронология` базы для загрузки контекста
5. Подтвердить: "База {Название} добавлена к сессии. Последнее состояние: {последняя запись хронологии}"

## /obs-mem base new

Создать новую базу интерактивно.

### Поведение:
1. Спросить: название, описание, пути (опционально), теги (опционально)
2. Создать `claude-memory/bases/{Название}.md` с frontmatter и пустыми секциями
3. Добавить новую базу в `bases` текущей сессии, если сессия активна
4. Подтвердить создание

## /obs-mem base remove {Название}

Убрать базу из текущей сессии (файл базы не удаляется).

### Поведение:
1. Убрать `[[{Название}]]` из массива `bases` во frontmatter сессии
2. Подтвердить: "База {Название} убрана из текущей сессии"
```

- [ ] **Шаг 5: Обновить init.md — добавить директорию баз**

В Шаге 1 (Создание структуры) добавить `bases/`:
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

Обновить шаблон CLAUDE.md в Шаге 4:
```markdown
### Старт сессии (первое сообщение, БЕЗ ИСКЛЮЧЕНИЙ):
1. Проверь `claude-memory/.changed` — если есть, прочитай и обработай изменения из Obsidian
2. Прочитай `claude-memory/MEMORY.md` — загрузи контекст
3. Прочитай `claude-memory/bases/*.md` — загрузи список баз
4. Спроси пользователя: "К какой базе относится? 1) ... 2) ... 3) Новая база"
5. Создай НОВЫЙ файл сессии с выбранными базами
   - Каждый диалог = НОВАЯ сессия
   - status: in_progress
```

Обновить хук SessionStart в Шаге 5:
```json
"command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then echo \"{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"[obsidian-memory] ОБЯЗАТЕЛЬНО: 1) Прочитай claude-memory/.changed 2) Прочитай claude-memory/MEMORY.md 3) Прочитай claude-memory/bases/*.md 4) Спроси пользователя к какой базе относится работа 5) Создай НОВЫЙ файл сессии. Каждый диалог = новая сессия.\\\"}}\"; else echo \"{}\"; fi'"
```

- [ ] **Шаг 6: Коммит**

```bash
git add C:/Users/Admin/.claude/skills/obsidian-memory-skill/SKILL.md \
  C:/Users/Admin/.claude/skills/obsidian-memory-skill/session-capture.md \
  C:/Users/Admin/.claude/skills/obsidian-memory-skill/context-restore.md \
  C:/Users/Admin/.claude/skills/obsidian-memory-skill/init.md \
  C:/Users/Admin/.claude/skills/obsidian-memory-skill/commands.md
git commit -m "feat: update skill files with bases system"
```

---

### Задача 8: Обновление CLAUDE.md и хуков

**Файлы:**
- Изменить: `CLAUDE.md`
- Изменить: `.claude/settings.json`

- [ ] **Шаг 1: Обновить инструкции старта сессии в CLAUDE.md**

Заменить секцию `### Старт сессии`:
```markdown
### Старт сессии (первое сообщение, БЕЗ ИСКЛЮЧЕНИЙ):
1. Проверь `claude-memory/.changed` — если есть, прочитай и обработай изменения из Obsidian
2. Прочитай `claude-memory/MEMORY.md` — загрузи контекст
3. Прочитай `claude-memory/bases/*.md` — загрузи список баз
4. Спроси пользователя: "К какой базе относится? 1) {список баз} N) Новая база"
5. Прочитай хронологию выбранных баз — пойми текущее состояние
6. Создай НОВЫЙ файл сессии: `claude-memory/sessions/{YYYY-MM-DD HH-mm} — {Описание}.md`
   - Каждый диалог = НОВАЯ сессия (даже если за сегодня уже есть другие)
   - bases: ["[[выбранные базы]]"]
   - continues: "[[последняя сессия в базе]]" (если продолжение)
   - status: in_progress
   - Описание — краткое, по теме первого запроса
```

- [ ] **Шаг 2: Обновить хук SessionStart в settings.json**

Обновить команду хука с упоминанием баз:
```json
"command": "bash -c 'if [ -d \"claude-memory/sessions\" ]; then BASES=$(ls claude-memory/bases/ 2>/dev/null | sed \"s/.md//\" | head -10 | tr \"\\n\" \", \"); echo \"{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"[obsidian-memory] ОБЯЗАТЕЛЬНО: 1) Прочитай claude-memory/.changed 2) Прочитай claude-memory/MEMORY.md 3) Прочитай claude-memory/bases/*.md 4) Спроси к какой базе относится работа (доступные: ${BASES:-нет баз}) 5) Создай НОВЫЙ файл сессии с bases и continues. Каждый диалог = новая сессия.\\\"}}\"; else echo \"{}\"; fi'"
```

- [ ] **Шаг 3: Коммит**

```bash
git add CLAUDE.md .claude/settings.json
git commit -m "feat: update CLAUDE.md and hooks for bases system"
```

---

### Задача 9: Деплой и создание начальных баз

**Файлы:**
- Результат сборки: `obsidian-claude-memory/main.js` → `.obsidian/plugins/obsidian-claude-memory/main.js`

- [ ] **Шаг 1: Собрать плагин**

Запустить: `cd obsidian-claude-memory && npm run build`
Ожидаемо: чистая сборка

- [ ] **Шаг 2: Скопировать в плагины Obsidian**

```bash
cp obsidian-claude-memory/main.js .obsidian/plugins/obsidian-claude-memory/main.js
cp obsidian-claude-memory/styles.css .obsidian/plugins/obsidian-claude-memory/styles.css
```

- [ ] **Шаг 3: Создать директорию баз**

```bash
mkdir -p claude-memory/bases
```

- [ ] **Шаг 4: Создать начальные базы проекта**

Создать `claude-memory/bases/Плагин Obsidian.md`:
```markdown
---
name: Плагин Obsidian
description: Obsidian-плагин для визуализации и синхронизации claude-memory
paths:
  - obsidian-claude-memory/src/
  - obsidian-claude-memory/manifest.json
tags: [obsidian, plugin, typescript]
created: 2026-04-13
---

## Описание
Плагин Obsidian для работы с claude-memory: sidebar, dashboard, timeline,
синхронизация через ChangedWriter, управление сессиями через SessionGuardian.

## Ключевые компоненты
- ChangedWriter — polling внешних изменений через vault.adapter
- SessionGuardian — закрытие stale сессий, создание stubs
- DashboardView, TimelineView, SidebarView — UI компоненты
- Парсер — чтение frontmatter и wikilinks из markdown файлов

## Хронология
- 2026-04-13 — v0.2.0 опубликован. ChangedWriter на vault events (не работал). [[2026-04-13 — Инициализация obsidian-memory]]
- 2026-04-13 — ChangedWriter переписан на adapter polling. Хуки обновлены. [[2026-04-13 15-30 — Починка сессий и ChangedWriter]]
```

Создать `claude-memory/bases/Скилл obsidian-memory.md`:
```markdown
---
name: Скилл obsidian-memory
description: Claude Code скилл для автоматического ведения памяти проекта через Obsidian
paths:
  - C:/Users/Admin/.claude/skills/obsidian-memory-skill/
tags: [skill, claude-code, memory]
created: 2026-04-13
---

## Описание
Скилл для Claude Code, который активируется при наличии claude-memory/ в проекте.
Управляет сессиями, памятью, потоками. Использует wikilinks для графа в Obsidian.

## Ключевые компоненты
- SKILL.md — главный файл скилла
- session-capture.md — формат и правила записи сессий
- context-restore.md — восстановление контекста при старте
- stream-tracking.md — отслеживание потоков работы
- commands.md — команды /obs-mem
- init.md — инициализация в новом проекте

## Хронология
- 2026-04-13 — Скилл создан, базовая функциональность. [[2026-04-13 — Инициализация obsidian-memory]]
- 2026-04-13 — Добавлена система баз, обновлены все файлы скилла. [[2026-04-13 15-30 — Починка сессий и ChangedWriter]]
```

- [ ] **Шаг 5: Коммит**

```bash
git add claude-memory/bases/
git commit -m "feat: create initial bases for project"
```

---

### Задача 10: Обновление текущей сессии и проверка

- [ ] **Шаг 1: Обновить файл текущей сессии с базами**

Обновить frontmatter `claude-memory/sessions/2026-04-13 15-30 — Починка сессий и ChangedWriter.md`:
```yaml
bases: ["[[Плагин Obsidian]]", "[[Скилл obsidian-memory]]"]
continues: "[[2026-04-13 — Инициализация obsidian-memory]]"
```

Добавить секцию `## Связи`:
```markdown
## Связи
- Продолжение: [[2026-04-13 — Инициализация obsidian-memory]]
- Базы: [[Плагин Obsidian]], [[Скилл obsidian-memory]]
```

- [ ] **Шаг 2: Попросить пользователя перезагрузить плагин и проверить**

Проверить:
- Sidebar показывает секцию "Базы" с 2 записями
- Dashboard показывает колонку карточек баз
- Timeline показывает выбор баз: "Плагин Obsidian" и "Скилл obsidian-memory"
- Клик по базе в timeline показывает её сессии
- Граф в Obsidian показывает связи: сессии ↔ базы

- [ ] **Шаг 3: Коммит обновления сессии**

```bash
git add claude-memory/sessions/
git commit -m "feat: update sessions with bases references"
```
