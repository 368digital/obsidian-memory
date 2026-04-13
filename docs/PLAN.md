# Obsidian Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Claude Code skill + Obsidian plugin system that persists full project context (sessions, memories, work streams) in `.claude-memory/` inside the project, with Obsidian as the UI for visualization and management.

**Architecture:** Two independent artifacts: (1) a superpowers-style markdown skill `obsidian-memory` that instructs Claude Code how to read/write `.claude-memory/`; (2) a TypeScript Obsidian plugin `obsidian-claude-memory` with custom views (Dashboard, Timeline), commands, sidebar, and realtime sync via `.changed` signal file.

**Tech Stack:** Skill: pure markdown (superpowers format). Plugin: TypeScript + Obsidian Plugin API + esbuild.

**Spec:** `docs/superpowers/specs/2026-04-13-obsidian-memory-design.md`

---

## File Structure

### Phase 1: Skill

```
obsidian-memory-skill/
├── SKILL.md                    ← Main skill definition (frontmatter + instructions)
├── init.md                     ← Init sub-skill: scaffold .claude-memory/, migrate
├── session-capture.md          ← Session capture instructions
├── stream-tracking.md          ← GSD stream tracking instructions
└── context-restore.md          ← Context restoration at session start
```

### Phase 2: Obsidian Plugin

```
obsidian-claude-memory/
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── manifest.json
├── styles.css
└── src/
    ├── main.ts                 ← Plugin entry, registers views + commands
    ├── types.ts                ← Shared types (MemoryFile, Session, Stream)
    ├── parser.ts               ← Parse .claude-memory/ files: frontmatter + wikilinks
    ├── views/
    │   ├── DashboardView.ts    ← Memory Dashboard (3-column: streams, sessions, memories)
    │   └── TimelineView.ts     ← Stream Timeline (vertical timeline per stream)
    ├── sidebar/
    │   └── SidebarView.ts      ← Tree view of .claude-memory/ with icons and filters
    ├── commands/
    │   └── commands.ts         ← All 5 commands: Create Memory/Stream, Link, Archive, Set Context
    └── sync/
        └── changed-writer.ts   ← Write .changed file on vault save events
```

---

## Phase 1: Skill `obsidian-memory`

### Task 1: Main Skill Definition (SKILL.md)

**Files:**
- Create: `obsidian-memory-skill/SKILL.md`

This is the core skill file. It contains frontmatter for discovery and the complete instruction set for Claude Code.

- [ ] **Step 1: Create SKILL.md with frontmatter and activation logic**

```markdown
---
name: obsidian-memory
description: Persistent project memory via Obsidian vault. Auto-activates when .claude-memory/ exists in project root. Records sessions, memories, streams with [[wikilinks]]. Replaces standard auto memory.
---

# Obsidian Memory

Система сохранения полного контекста проекта через Obsidian vault в `.claude-memory/`.

## Activation

This skill activates automatically when `.claude-memory/` directory exists in the project root. Check at session start:

1. Use Glob to check for `.claude-memory/MEMORY.md`
2. If found → this skill is active, follow all instructions below
3. If not found → skill is inactive, do nothing

## Directory Structure

`.claude-memory/` contains:
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

All memory operations write to `.claude-memory/memories/` instead of `~/.claude/projects/.../memory/`. Same frontmatter format:

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

Before each response, check if `.claude-memory/.changed` exists:
1. Read `.changed` — contains paths of files modified in Obsidian
2. Re-read those files to pick up changes
3. Delete `.changed` after processing

## IMPORTANT: Replace Standard Auto Memory

When this skill is active:
- ALL memory reads come from `.claude-memory/memories/` and `.claude-memory/MEMORY.md`
- ALL memory writes go to `.claude-memory/memories/` and update `.claude-memory/MEMORY.md`
- Do NOT read or write `~/.claude/projects/.../memory/`
```

- [ ] **Step 2: Verify skill file has valid frontmatter**

Run: Open the file in a text editor, confirm `---` delimiters and `name`/`description` fields are present.

- [ ] **Step 3: Commit**

```bash
git add obsidian-memory-skill/SKILL.md
git commit -m "feat(obsidian-memory): add main skill definition with activation and memory format"
```

---

### Task 2: Session Capture Instructions

**Files:**
- Create: `obsidian-memory-skill/session-capture.md`

- [ ] **Step 1: Create session-capture.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-memory-skill/session-capture.md
git commit -m "feat(obsidian-memory): add session capture instructions"
```

---

### Task 3: Stream Tracking Instructions

**Files:**
- Create: `obsidian-memory-skill/stream-tracking.md`

- [ ] **Step 1: Create stream-tracking.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-memory-skill/stream-tracking.md
git commit -m "feat(obsidian-memory): add stream tracking instructions with cross-refs"
```

---

### Task 4: Context Restoration Instructions

**Files:**
- Create: `obsidian-memory-skill/context-restore.md`

- [ ] **Step 1: Create context-restore.md**

```markdown
# Context Restoration

## At Session Start

When the skill activates (`.claude-memory/` detected), restore context in this order:

### Step 1: Check for Obsidian edits
- Read `.claude-memory/.changed` if it exists
- Re-read any files listed there
- Delete `.changed` after processing

### Step 2: Read memory index
- Read `.claude-memory/MEMORY.md`
- This gives you the full index of memories, recent sessions, active streams

### Step 3: Read recent sessions
- Glob `.claude-memory/sessions/*.md`, sort by filename (date descending)
- Read the last 3-5 session files
- From these, understand: what was done recently, what's pending, what decisions were made

### Step 4: Read active streams
- Glob `.claude-memory/streams/*/STREAM.md` and `.claude-memory/streams/Быстрая — *.md`
- Read only streams with `status: active` or `status: paused` in frontmatter
- From these, understand: what work is in progress, what's blocked

### Step 5: Read all memories
- Glob `.claude-memory/memories/*.md`
- Read all memory files — these are persistent context (user preferences, project facts, feedback)

### Result
After these steps, you have full context without asking the user. Proceed directly with the user's request.

## Context Budget

If there are too many files to read (>20 session files, >10 active streams), prioritize:
1. All memories (always read all)
2. Last 3 sessions (most recent context)
3. Active streams only (skip completed/archived)
4. `.changed` files (always check)
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-memory-skill/context-restore.md
git commit -m "feat(obsidian-memory): add context restoration instructions"
```

---

### Task 5: Init Sub-Skill

**Files:**
- Create: `obsidian-memory-skill/init.md`

- [ ] **Step 1: Create init.md**

```markdown
# Init Obsidian Memory

## Trigger

User says "init obsidian-memory" or similar request to set up the memory system.

## Steps

### 1. Create directory structure

```
.claude-memory/
├── MEMORY.md
├── memories/
├── sessions/
├── streams/
└── graph/
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
   - Write to `.claude-memory/memories/{new name}.md` with same frontmatter
   - Add `[[wikilinks]]` where content references other files
3. Rebuild MEMORY.md index with wikilinks

### 3. Set up .obsidian/ for vault

If `.obsidian/` doesn't exist, create it so Obsidian recognizes the project as a vault:

```
.obsidian/
├── app.json          ← {}
└── workspace.json    ← {}
```

### 4. Ask about .gitignore

Ask the user:
> ".claude-memory/ содержит контекст проекта. Добавить в .gitignore или коммитить вместе с проектом?"

- If ignore: add `.claude-memory/` and `.obsidian/` to `.gitignore`
- If commit: leave as-is, mention that session files may contain sensitive context

### 5. Confirm

Report what was done:
- Directories created
- Files migrated (count)
- Vault status
- Next: open the project folder in Obsidian to see the vault
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-memory-skill/init.md
git commit -m "feat(obsidian-memory): add init sub-skill with migration"
```

---

## Phase 2: Obsidian Plugin `obsidian-claude-memory`

### Task 6: Plugin Scaffold

**Files:**
- Create: `obsidian-claude-memory/package.json`
- Create: `obsidian-claude-memory/tsconfig.json`
- Create: `obsidian-claude-memory/esbuild.config.mjs`
- Create: `obsidian-claude-memory/manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "id": "obsidian-claude-memory",
  "name": "Claude Memory",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "Visualize and manage Claude Code project memory — sessions, streams, memories with graph connections",
  "author": "trishevae",
  "isDesktopOnly": false
}
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "obsidian-claude-memory",
  "version": "0.1.0",
  "description": "Obsidian plugin for Claude Code project memory visualization and management",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "esbuild": "^0.25.0",
    "obsidian": "latest",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES2018", "ES2021.String"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create esbuild.config.mjs**

```javascript
import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr"
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

- [ ] **Step 5: Commit**

```bash
git add obsidian-claude-memory/
git commit -m "feat(obsidian-plugin): scaffold project with manifest, package, tsconfig, esbuild"
```

---

### Task 7: Types and Parser

**Files:**
- Create: `obsidian-claude-memory/src/types.ts`
- Create: `obsidian-claude-memory/src/parser.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface MemoryFile {
  path: string;
  name: string;
  description: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  content: string;
  wikilinks: string[];
}

export interface SessionFile {
  path: string;
  name: string;
  date: string;
  duration: string;
  streams: string[];
  status: 'in_progress' | 'completed';
  content: string;
  wikilinks: string[];
}

export interface StreamFile {
  path: string;
  name: string;
  type: 'gsd-phase' | 'gsd-quick' | 'gsd-workstream';
  phase?: string;
  status: 'active' | 'complete' | 'blocked' | 'paused';
  started: string;
  completed?: string;
  related: Array<{ stream: string; reason: string }>;
  content: string;
  wikilinks: string[];
}

export type ClaudeMemoryFile = MemoryFile | SessionFile | StreamFile;

export interface MemoryIndex {
  memories: MemoryFile[];
  sessions: SessionFile[];
  streams: StreamFile[];
}

export const CLAUDE_MEMORY_DIR = '.claude-memory';
export const MEMORIES_DIR = 'memories';
export const SESSIONS_DIR = 'sessions';
export const STREAMS_DIR = 'streams';
export const GRAPH_DIR = 'graph';
export const CHANGED_FILE = '.changed';
export const MEMORY_INDEX = 'MEMORY.md';
```

- [ ] **Step 2: Create parser.ts**

```typescript
import { TFile, Vault } from 'obsidian';
import {
  MemoryFile,
  SessionFile,
  StreamFile,
  CLAUDE_MEMORY_DIR,
  MEMORIES_DIR,
  SESSIONS_DIR,
  STREAMS_DIR,
} from './types';

/**
 * Parse YAML frontmatter from markdown content.
 * Returns parsed key-value pairs and the body after frontmatter.
 */
export function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, unknown> = {};
  const lines = match[1].split('\n');

  let currentKey = '';
  let currentArray: unknown[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Array item
    if (trimmed.startsWith('- ') && currentKey) {
      if (!currentArray) {
        currentArray = [];
        meta[currentKey] = currentArray;
      }
      const val = trimmed.slice(2).trim();
      // Check if it's an object (has "key: value" inside)
      if (val.includes(': ')) {
        const obj: Record<string, string> = {};
        // Parse inline: `stream: "[[Name]]"`
        const parts = val.split(/,\s*/);
        for (const part of parts) {
          const colonIdx = part.indexOf(': ');
          if (colonIdx > 0) {
            const k = part.slice(0, colonIdx).trim();
            const v = part.slice(colonIdx + 2).trim().replace(/^["']|["']$/g, '');
            obj[k] = v;
          }
        }
        currentArray.push(obj);
      } else {
        currentArray.push(val.replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    // Key: value
    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      currentArray = null;
      const val = kvMatch[2].trim();
      if (val === '' || val === '[]') {
        meta[currentKey] = val === '[]' ? [] : '';
      } else if (val.startsWith('[') && val.endsWith(']')) {
        // Inline array: ["a", "b"]
        meta[currentKey] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        meta[currentKey] = val.replace(/^["']|["']$/g, '');
      }
    }
  }

  return { meta, body: match[2] };
}

/** Extract all [[wikilinks]] from content */
export function extractWikilinks(content: string): string[] {
  const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
  return [...matches].map((m) => m[1]);
}

/** Determine file category from its path within .claude-memory/ */
export function getFileCategory(path: string): 'memory' | 'session' | 'stream' | 'graph' | 'index' | 'unknown' {
  if (path.endsWith('MEMORY.md')) return 'index';
  if (path.includes(`${MEMORIES_DIR}/`)) return 'memory';
  if (path.includes(`${SESSIONS_DIR}/`)) return 'session';
  if (path.includes(`${STREAMS_DIR}/`)) return 'stream';
  if (path.includes('graph/')) return 'graph';
  return 'unknown';
}

/** Parse a memory file */
export function parseMemoryFile(path: string, content: string): MemoryFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: (meta.name as string) || path.split('/').pop()?.replace('.md', '') || '',
    description: (meta.description as string) || '',
    type: (meta.type as MemoryFile['type']) || 'project',
    content: body,
    wikilinks: extractWikilinks(content),
  };
}

/** Parse a session file */
export function parseSessionFile(path: string, content: string): SessionFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: path.split('/').pop()?.replace('.md', '') || '',
    date: (meta.date as string) || '',
    duration: (meta.duration as string) || '',
    streams: (meta.streams as string[]) || [],
    status: (meta.status as SessionFile['status']) || 'completed',
    content: body,
    wikilinks: extractWikilinks(content),
  };
}

/** Parse a stream file */
export function parseStreamFile(path: string, content: string): StreamFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: (meta.name as string) || path.split('/').pop()?.replace('.md', '') || '',
    type: (meta.type as StreamFile['type']) || 'gsd-phase',
    phase: meta.phase as string | undefined,
    status: (meta.status as StreamFile['status']) || 'active',
    started: (meta.started as string) || '',
    completed: meta.completed as string | undefined,
    related: (meta.related as StreamFile['related']) || [],
    content: body,
    wikilinks: extractWikilinks(content),
  };
}

/** Load all .claude-memory/ files and return a typed index */
export async function loadMemoryIndex(vault: Vault): Promise<{
  memories: MemoryFile[];
  sessions: SessionFile[];
  streams: StreamFile[];
}> {
  const memories: MemoryFile[] = [];
  const sessions: SessionFile[] = [];
  const streams: StreamFile[] = [];

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
    }
  }

  // Sort sessions by date descending
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  return { memories, sessions, streams };
}
```

- [ ] **Step 3: Commit**

```bash
git add obsidian-claude-memory/src/types.ts obsidian-claude-memory/src/parser.ts
git commit -m "feat(obsidian-plugin): add types and frontmatter parser with wikilink extraction"
```

---

### Task 8: Plugin Entry Point (main.ts)

**Files:**
- Create: `obsidian-claude-memory/src/main.ts`

- [ ] **Step 1: Create main.ts with plugin class, view registration, commands**

```typescript
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/DashboardView';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/TimelineView';
import { SidebarView, SIDEBAR_VIEW_TYPE } from './sidebar/SidebarView';
import { registerCommands } from './commands/commands';
import { ChangedWriter } from './sync/changed-writer';
import { CLAUDE_MEMORY_DIR } from './types';

export default class ClaudeMemoryPlugin extends Plugin {
  private changedWriter: ChangedWriter | null = null;

  async onload() {
    // Only activate if .claude-memory/ exists
    const memoryDir = this.app.vault.getAbstractFileByPath(CLAUDE_MEMORY_DIR);
    if (!memoryDir) {
      console.log('Claude Memory: .claude-memory/ not found, plugin inactive');
      return;
    }

    // Register views
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this));
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, this));

    // Register commands
    registerCommands(this);

    // Add ribbon icon to open dashboard
    this.addRibbonIcon('brain', 'Claude Memory Dashboard', () => {
      this.activateView(DASHBOARD_VIEW_TYPE);
    });

    // Set up sidebar
    this.app.workspace.onLayoutReady(() => {
      this.activateView(SIDEBAR_VIEW_TYPE, 'left');
    });

    // Start .changed writer
    this.changedWriter = new ChangedWriter(this);
    this.changedWriter.start();
  }

  onunload() {
    this.changedWriter?.stop();
  }

  async activateView(viewType: string, side?: 'left' | 'right') {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(viewType);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      if (side) {
        leaf = workspace.getLeftLeaf(false);
      } else {
        leaf = workspace.getLeaf('tab');
      }
      if (leaf) {
        await leaf.setViewState({ type: viewType, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/src/main.ts
git commit -m "feat(obsidian-plugin): add plugin entry point with view registration and ribbon icon"
```

---

### Task 9: Dashboard View

**Files:**
- Create: `obsidian-claude-memory/src/views/DashboardView.ts`

- [ ] **Step 1: Create DashboardView.ts**

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import type { MemoryFile, SessionFile, StreamFile } from '../types';

export const DASHBOARD_VIEW_TYPE = 'claude-memory-dashboard';

export class DashboardView extends ItemView {
  private plugin: ClaudeMemoryPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeMemoryPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Claude Memory';
  }

  getIcon(): string {
    return 'brain';
  }

  async onOpen() {
    await this.render();
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-dashboard');

    const { memories, sessions, streams } = await loadMemoryIndex(this.app.vault);

    // Header
    const header = container.createDiv({ cls: 'cm-dashboard-header' });
    header.createEl('h2', { text: 'Claude Memory' });
    const stats = header.createDiv({ cls: 'cm-stats' });
    stats.createSpan({ text: `${streams.length} потоков` });
    stats.createSpan({ text: ` · ${sessions.length} сессий` });
    stats.createSpan({ text: ` · ${memories.length} записей` });

    // Three columns
    const grid = container.createDiv({ cls: 'cm-dashboard-grid' });

    // Column 1: Active Streams
    this.renderStreamsColumn(grid, streams);

    // Column 2: Recent Sessions
    this.renderSessionsColumn(grid, sessions.slice(0, 10));

    // Column 3: Memories
    this.renderMemoriesColumn(grid, memories);
  }

  private renderStreamsColumn(parent: HTMLElement, streams: StreamFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Потоки' });

    const active = streams.filter((s) => s.status === 'active' || s.status === 'paused');
    const complete = streams.filter((s) => s.status === 'complete');

    for (const stream of [...active, ...complete]) {
      const item = col.createDiv({ cls: `cm-item cm-stream cm-status-${stream.status}` });
      const badge = item.createSpan({ cls: 'cm-badge' });
      badge.setText(stream.status);
      item.createSpan({ cls: 'cm-item-name', text: stream.name });

      item.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(stream.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }

    if (streams.length === 0) {
      col.createDiv({ cls: 'cm-empty', text: 'Нет потоков' });
    }
  }

  private renderSessionsColumn(parent: HTMLElement, sessions: SessionFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Последние сессии' });

    for (const session of sessions) {
      const item = col.createDiv({ cls: 'cm-item cm-session' });
      const date = item.createSpan({ cls: 'cm-date' });
      date.setText(session.date.slice(0, 10));
      item.createSpan({ cls: 'cm-item-name', text: session.name });

      if (session.streams.length > 0) {
        const tags = item.createDiv({ cls: 'cm-tags' });
        for (const s of session.streams) {
          tags.createSpan({ cls: 'cm-tag', text: s });
        }
      }

      item.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(session.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }

    if (sessions.length === 0) {
      col.createDiv({ cls: 'cm-empty', text: 'Нет сессий' });
    }
  }

  private renderMemoriesColumn(parent: HTMLElement, memories: MemoryFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Память' });

    // Group by type
    const groups: Record<string, MemoryFile[]> = {};
    for (const mem of memories) {
      const group = groups[mem.type] || (groups[mem.type] = []);
      group.push(mem);
    }

    const typeLabels: Record<string, string> = {
      user: 'Пользователь',
      feedback: 'Фидбэк',
      project: 'Проект',
      reference: 'Справка',
    };

    for (const [type, items] of Object.entries(groups)) {
      col.createEl('h4', { text: typeLabels[type] || type });
      for (const mem of items) {
        const item = col.createDiv({ cls: 'cm-item cm-memory' });
        item.createSpan({ cls: 'cm-item-name', text: mem.name });
        item.createSpan({ cls: 'cm-item-desc', text: mem.description });

        item.addEventListener('click', () => {
          const file = this.app.vault.getAbstractFileByPath(mem.path);
          if (file) {
            this.app.workspace.getLeaf('tab').openFile(file as any);
          }
        });
      }
    }

    if (memories.length === 0) {
      col.createDiv({ cls: 'cm-empty', text: 'Нет записей' });
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/src/views/DashboardView.ts
git commit -m "feat(obsidian-plugin): add Memory Dashboard view with 3-column layout"
```

---

### Task 10: Timeline View

**Files:**
- Create: `obsidian-claude-memory/src/views/TimelineView.ts`

- [ ] **Step 1: Create TimelineView.ts**

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import type { SessionFile, StreamFile } from '../types';

export const TIMELINE_VIEW_TYPE = 'claude-memory-timeline';

export class TimelineView extends ItemView {
  private plugin: ClaudeMemoryPlugin;
  private currentStream: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeMemoryPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.currentStream ? `Timeline: ${this.currentStream}` : 'Stream Timeline';
  }

  getIcon(): string {
    return 'git-branch';
  }

  async onOpen() {
    await this.render();
  }

  setStream(streamName: string) {
    this.currentStream = streamName;
    this.render();
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-timeline');

    const { sessions, streams } = await loadMemoryIndex(this.app.vault);

    if (!this.currentStream) {
      this.renderStreamPicker(container, streams);
      return;
    }

    const stream = streams.find((s) => s.name === this.currentStream);
    if (!stream) {
      container.createEl('p', { text: `Поток "${this.currentStream}" не найден` });
      return;
    }

    // Header
    const header = container.createDiv({ cls: 'cm-timeline-header' });
    header.createEl('h2', { text: stream.name });
    const badge = header.createSpan({ cls: `cm-badge cm-status-${stream.status}` });
    badge.setText(stream.status);

    if (stream.started) {
      header.createDiv({ cls: 'cm-date', text: `${stream.started}${stream.completed ? ' → ' + stream.completed : ' → ...'}` });
    }

    // Related streams
    if (stream.related.length > 0) {
      const relSection = container.createDiv({ cls: 'cm-related' });
      relSection.createEl('h3', { text: 'Связанные потоки' });
      for (const rel of stream.related) {
        const item = relSection.createDiv({ cls: 'cm-related-item' });
        item.createSpan({ cls: 'cm-related-name', text: rel.stream.replace(/\[\[|\]\]/g, '') });
        item.createSpan({ cls: 'cm-related-reason', text: rel.reason });
      }
    }

    // Sessions timeline
    const streamSessions = sessions.filter((s) =>
      s.streams.some((name) => name === this.currentStream)
    );

    const timeline = container.createDiv({ cls: 'cm-timeline' });
    timeline.createEl('h3', { text: 'Сессии' });

    for (const session of streamSessions) {
      const entry = timeline.createDiv({ cls: 'cm-timeline-entry' });
      const dot = entry.createDiv({ cls: 'cm-timeline-dot' });
      const body = entry.createDiv({ cls: 'cm-timeline-body' });

      body.createDiv({ cls: 'cm-date', text: session.date.slice(0, 16).replace('T', ' ') });
      body.createDiv({ cls: 'cm-item-name', text: session.name });

      entry.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(session.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }

    if (streamSessions.length === 0) {
      timeline.createDiv({ cls: 'cm-empty', text: 'Нет сессий для этого потока' });
    }
  }

  private renderStreamPicker(container: HTMLElement, streams: StreamFile[]) {
    container.createEl('h2', { text: 'Выберите поток' });
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
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/src/views/TimelineView.ts
git commit -m "feat(obsidian-plugin): add Stream Timeline view with session entries and related streams"
```

---

### Task 11: Sidebar View

**Files:**
- Create: `obsidian-claude-memory/src/sidebar/SidebarView.ts`

- [ ] **Step 1: Create SidebarView.ts**

```typescript
import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import { CLAUDE_MEMORY_DIR } from '../types';

export const SIDEBAR_VIEW_TYPE = 'claude-memory-sidebar';

type Filter = 'all' | 'active' | 'archived';

export class SidebarView extends ItemView {
  private plugin: ClaudeMemoryPlugin;
  private filter: Filter = 'all';

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeMemoryPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SIDEBAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Claude Memory';
  }

  getIcon(): string {
    return 'brain';
  }

  async onOpen() {
    await this.render();

    // Re-render when files change in .claude-memory/
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.path.startsWith(CLAUDE_MEMORY_DIR)) {
          this.render();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (file.path.startsWith(CLAUDE_MEMORY_DIR)) {
          this.render();
        }
      })
    );
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-sidebar');

    const { memories, sessions, streams } = await loadMemoryIndex(this.app.vault);

    // Filter bar
    const filterBar = container.createDiv({ cls: 'cm-filter-bar' });
    for (const f of ['all', 'active', 'archived'] as Filter[]) {
      const btn = filterBar.createEl('button', {
        cls: `cm-filter-btn ${this.filter === f ? 'cm-active' : ''}`,
        text: f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Архив',
      });
      btn.addEventListener('click', () => {
        this.filter = f;
        this.render();
      });
    }

    // Counts
    const counts = container.createDiv({ cls: 'cm-sidebar-counts' });
    counts.setText(`${memories.length} памяти · ${sessions.length} сессий · ${streams.length} потоков`);

    // Streams section
    const filteredStreams = streams.filter((s) => {
      if (this.filter === 'active') return s.status === 'active' || s.status === 'paused';
      if (this.filter === 'archived') return s.status === 'complete';
      return true;
    });

    if (filteredStreams.length > 0) {
      this.renderSection(container, '📁 Потоки', filteredStreams.map((s) => ({
        name: s.name,
        path: s.path,
        badge: s.status,
        badgeClass: `cm-status-${s.status}`,
      })));
    }

    // Sessions section (last 10)
    if (this.filter !== 'archived') {
      this.renderSection(container, '💬 Сессии', sessions.slice(0, 10).map((s) => ({
        name: s.name,
        path: s.path,
        badge: s.date.slice(0, 10),
        badgeClass: 'cm-date-badge',
      })));
    }

    // Memories section
    if (this.filter !== 'archived') {
      this.renderSection(container, '🧠 Память', memories.map((m) => ({
        name: m.name,
        path: m.path,
        badge: m.type,
        badgeClass: `cm-type-${m.type}`,
      })));
    }
  }

  private renderSection(
    parent: HTMLElement,
    title: string,
    items: Array<{ name: string; path: string; badge: string; badgeClass: string }>
  ) {
    const section = parent.createDiv({ cls: 'cm-sidebar-section' });
    const header = section.createDiv({ cls: 'cm-sidebar-section-header' });
    header.createSpan({ text: title });
    header.createSpan({ cls: 'cm-count', text: `${items.length}` });

    for (const item of items) {
      const row = section.createDiv({ cls: 'cm-sidebar-item' });
      row.createSpan({ cls: `cm-badge ${item.badgeClass}`, text: item.badge });
      row.createSpan({ cls: 'cm-item-name', text: item.name });

      row.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (file && file instanceof TFile) {
          this.app.workspace.getLeaf('tab').openFile(file);
        }
      });
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/src/sidebar/SidebarView.ts
git commit -m "feat(obsidian-plugin): add sidebar view with tree, filters, and counts"
```

---

### Task 12: Commands

**Files:**
- Create: `obsidian-claude-memory/src/commands/commands.ts`

- [ ] **Step 1: Create commands.ts**

```typescript
import { Notice, Modal, App, Setting, TFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, MEMORIES_DIR, STREAMS_DIR, MEMORY_INDEX } from '../types';
import { loadMemoryIndex } from '../parser';

export function registerCommands(plugin: ClaudeMemoryPlugin) {
  // Create Memory
  plugin.addCommand({
    id: 'create-memory',
    name: 'Create Memory',
    callback: () => new CreateMemoryModal(plugin.app, plugin).open(),
  });

  // Create Stream
  plugin.addCommand({
    id: 'create-stream',
    name: 'Create Stream',
    callback: () => new CreateStreamModal(plugin.app, plugin).open(),
  });

  // Link Streams
  plugin.addCommand({
    id: 'link-streams',
    name: 'Link Streams',
    callback: () => new LinkStreamsModal(plugin.app, plugin).open(),
  });

  // Archive Stream
  plugin.addCommand({
    id: 'archive-stream',
    name: 'Archive Stream',
    callback: () => archiveCurrentStream(plugin),
  });

  // Set Context
  plugin.addCommand({
    id: 'set-context',
    name: 'Set Context (prioritize for agent)',
    callback: () => setContextPriority(plugin),
  });
}

class CreateMemoryModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Создать запись памяти' });

    let name = '';
    let type: string = 'project';
    let description = '';

    new Setting(contentEl).setName('Тип').addDropdown((dd) =>
      dd
        .addOption('user', 'Пользователь')
        .addOption('feedback', 'Фидбэк')
        .addOption('project', 'Проект')
        .addOption('reference', 'Справка')
        .setValue(type)
        .onChange((v) => (type = v))
    );

    new Setting(contentEl).setName('Название').addText((t) =>
      t.setPlaceholder('Описательное название').onChange((v) => (name = v))
    );

    new Setting(contentEl).setName('Описание').addText((t) =>
      t.setPlaceholder('Краткое описание (одна строка)').onChange((v) => (description = v))
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

          const typePrefix: Record<string, string> = {
            user: '',
            feedback: 'Фидбэк — ',
            project: 'Проект — ',
            reference: 'Справка — ',
          };

          const fileName = `${typePrefix[type]}${name}.md`;
          const filePath = `${CLAUDE_MEMORY_DIR}/${MEMORIES_DIR}/${fileName}`;

          const content = `---\nname: ${name}\ndescription: ${description}\ntype: ${type}\n---\n\n`;

          await this.app.vault.create(filePath, content);

          // Update MEMORY.md
          const indexPath = `${CLAUDE_MEMORY_DIR}/${MEMORY_INDEX}`;
          const indexFile = this.app.vault.getAbstractFileByPath(indexPath);
          if (indexFile && indexFile instanceof TFile) {
            const indexContent = await this.app.vault.read(indexFile);
            const wikiName = fileName.replace('.md', '');
            const newLine = `- [[${wikiName}]] — ${description}`;
            await this.app.vault.modify(indexFile, indexContent + '\n' + newLine);
          }

          new Notice(`Создана запись: ${fileName}`);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class CreateStreamModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Создать поток' });

    let name = '';
    let type: string = 'gsd-phase';
    let phase = '';

    new Setting(contentEl).setName('Тип').addDropdown((dd) =>
      dd
        .addOption('gsd-phase', 'Фаза')
        .addOption('gsd-quick', 'Быстрая задача')
        .addOption('gsd-workstream', 'Поток работы')
        .setValue(type)
        .onChange((v) => (type = v))
    );

    new Setting(contentEl).setName('Номер фазы').setDesc('Только для фаз').addText((t) =>
      t.setPlaceholder('04').onChange((v) => (phase = v))
    );

    new Setting(contentEl).setName('Название').addText((t) =>
      t.setPlaceholder('Описание потока').onChange((v) => (name = v))
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
          const frontmatter = `---\ntype: ${type}\n${phase ? `phase: "${phase}"\n` : ''}name: ${name}\nstatus: active\nstarted: ${today}\nrelated: []\n---\n\n`;

          if (type === 'gsd-quick') {
            const fileName = `Быстрая — ${name}.md`;
            const filePath = `${CLAUDE_MEMORY_DIR}/${STREAMS_DIR}/${fileName}`;
            const content = frontmatter + `# Быстрая — ${name}\n\n## Цель\n\n\n## Прогресс\n\n- [ ] \n`;
            await this.app.vault.create(filePath, content);
            new Notice(`Создан поток: ${fileName}`);
          } else {
            const dirPrefix = type === 'gsd-phase' ? `Фаза ${phase} — ` : 'Поток — ';
            const dirName = `${dirPrefix}${name}`;
            const dirPath = `${CLAUDE_MEMORY_DIR}/${STREAMS_DIR}/${dirName}`;

            // Create directory by creating files in it
            const streamContent = frontmatter + `# ${dirName}\n\n## Цель\n\n`;
            await this.app.vault.create(`${dirPath}/STREAM.md`, streamContent);
            await this.app.vault.create(`${dirPath}/Решения.md`, `# Решения\n\n`);
            await this.app.vault.create(`${dirPath}/Прогресс.md`, `# Прогресс\n\n- [ ] \n`);
            new Notice(`Создан поток: ${dirName}/`);
          }

          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LinkStreamsModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Связать потоки' });

    const { streams } = await loadMemoryIndex(this.app.vault);
    const streamNames = streams.map((s) => s.name);

    let from = '';
    let to = '';
    let reason = '';

    new Setting(contentEl).setName('Из потока').addDropdown((dd) => {
      dd.addOption('', '— выберите —');
      for (const name of streamNames) dd.addOption(name, name);
      dd.onChange((v) => (from = v));
    });

    new Setting(contentEl).setName('В поток').addDropdown((dd) => {
      dd.addOption('', '— выберите —');
      for (const name of streamNames) dd.addOption(name, name);
      dd.onChange((v) => (to = v));
    });

    new Setting(contentEl).setName('Причина связи').addText((t) =>
      t.setPlaceholder('Почему связаны').onChange((v) => (reason = v))
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText('Связать')
        .setCta()
        .onClick(async () => {
          if (!from || !to || !reason) {
            new Notice('Заполните все поля');
            return;
          }

          const fromStream = streams.find((s) => s.name === from);
          if (fromStream) {
            const file = this.app.vault.getAbstractFileByPath(fromStream.path);
            if (file && file instanceof TFile) {
              const content = await this.app.vault.read(file);
              // Add related entry before the closing --- or append to frontmatter
              const newRelated = `  - stream: "[[${to}]]"\n    reason: "${reason}"`;
              const updated = content.replace(
                /related:\s*\[\]/,
                `related:\n${newRelated}`
              ).replace(
                /(related:\n(?:  - .*\n    .*\n)*)/,
                `$1${newRelated}\n`
              );
              await this.app.vault.modify(file, updated);
            }
          }

          new Notice(`Связь добавлена: ${from} → ${to}`);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

async function archiveCurrentStream(plugin: ClaudeMemoryPlugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.includes(STREAMS_DIR)) {
    new Notice('Откройте файл потока для архивации');
    return;
  }

  const content = await plugin.app.vault.read(activeFile);
  const today = new Date().toISOString().slice(0, 10);
  const updated = content
    .replace(/status:\s*active/, 'status: complete')
    .replace(/status:\s*paused/, 'status: complete')
    .replace(/(started:.*\n)/, `$1completed: ${today}\n`);

  await plugin.app.vault.modify(activeFile, updated);
  new Notice('Поток помечен как завершённый');
}

async function setContextPriority(plugin: ClaudeMemoryPlugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.startsWith(CLAUDE_MEMORY_DIR)) {
    new Notice('Откройте файл из .claude-memory/');
    return;
  }

  const content = await plugin.app.vault.read(activeFile);

  if (content.includes('priority: high')) {
    const updated = content.replace(/priority:\s*high\n?/, '');
    await plugin.app.vault.modify(activeFile, updated);
    new Notice('Приоритет снят');
  } else {
    // Add priority to frontmatter
    const updated = content.replace(/---\n/, '---\npriority: high\n');
    await plugin.app.vault.modify(activeFile, updated);
    new Notice('Файл помечен как приоритетный — агент прочитает его первым');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/src/commands/commands.ts
git commit -m "feat(obsidian-plugin): add 5 commands — Create Memory/Stream, Link, Archive, Set Context"
```

---

### Task 13: Changed Writer (Realtime Sync)

**Files:**
- Create: `obsidian-claude-memory/src/sync/changed-writer.ts`

- [ ] **Step 1: Create changed-writer.ts**

```typescript
import { TFile, EventRef } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, CHANGED_FILE } from '../types';

/**
 * Watches for file saves within .claude-memory/ and writes
 * a .changed signal file with paths of modified files.
 * Claude Code skill checks this file before each response.
 */
export class ChangedWriter {
  private plugin: ClaudeMemoryPlugin;
  private eventRef: EventRef | null = null;
  private pendingPaths: Set<string> = new Set();
  private writeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(plugin: ClaudeMemoryPlugin) {
    this.plugin = plugin;
  }

  start() {
    // Listen for file modifications in .claude-memory/
    this.eventRef = this.plugin.app.vault.on('modify', (file) => {
      if (!(file instanceof TFile)) return;
      if (!file.path.startsWith(CLAUDE_MEMORY_DIR + '/')) return;
      // Don't trigger on .changed file itself
      if (file.path.endsWith(CHANGED_FILE)) return;

      this.pendingPaths.add(file.path);
      this.scheduleWrite();
    });

    this.plugin.registerEvent(this.eventRef);
  }

  stop() {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    this.pendingPaths.clear();
  }

  private scheduleWrite() {
    // Debounce: wait 500ms after last change before writing .changed
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    this.writeTimeout = setTimeout(() => this.writeChangedFile(), 500);
  }

  private async writeChangedFile() {
    if (this.pendingPaths.size === 0) return;

    const changedPath = `${CLAUDE_MEMORY_DIR}/${CHANGED_FILE}`;
    const content = [...this.pendingPaths].join('\n') + '\n';

    const existing = this.plugin.app.vault.getAbstractFileByPath(changedPath);
    if (existing && existing instanceof TFile) {
      // Append to existing .changed file
      const current = await this.plugin.app.vault.read(existing);
      const merged = new Set([
        ...current.trim().split('\n').filter(Boolean),
        ...this.pendingPaths,
      ]);
      await this.plugin.app.vault.modify(existing, [...merged].join('\n') + '\n');
    } else {
      await this.plugin.app.vault.create(changedPath, content);
    }

    this.pendingPaths.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/src/sync/changed-writer.ts
git commit -m "feat(obsidian-plugin): add .changed signal writer for realtime sync"
```

---

### Task 14: Styles

**Files:**
- Create: `obsidian-claude-memory/styles.css`

- [ ] **Step 1: Create styles.css**

```css
/* === Dashboard === */
.claude-memory-dashboard {
  padding: 16px;
}

.cm-dashboard-header {
  margin-bottom: 20px;
}

.cm-dashboard-header h2 {
  margin: 0 0 4px 0;
}

.cm-stats {
  color: var(--text-muted);
  font-size: 0.85em;
}

.cm-dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.cm-column h3 {
  margin: 0 0 8px 0;
  font-size: 0.95em;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.cm-column h4 {
  margin: 12px 0 4px 0;
  font-size: 0.85em;
  color: var(--text-muted);
}

/* === Items === */
.cm-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.cm-item:hover {
  background: var(--background-modifier-hover);
}

.cm-item-name {
  font-size: 0.9em;
}

.cm-item-desc {
  font-size: 0.8em;
  color: var(--text-muted);
  width: 100%;
}

/* === Badges === */
.cm-badge {
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.cm-status-active {
  background: var(--color-blue);
  color: white;
}

.cm-status-complete {
  background: var(--color-green);
  color: white;
}

.cm-status-blocked {
  background: var(--color-red);
  color: white;
}

.cm-status-paused {
  background: var(--color-yellow);
  color: var(--text-normal);
}

.cm-date-badge {
  background: var(--background-modifier-border);
  color: var(--text-muted);
}

.cm-type-user { background: #e8d44d33; color: var(--text-normal); }
.cm-type-feedback { background: #4da6e833; color: var(--text-normal); }
.cm-type-project { background: #4de88d33; color: var(--text-normal); }
.cm-type-reference { background: #e8844d33; color: var(--text-normal); }

/* === Tags === */
.cm-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  width: 100%;
  margin-top: 2px;
}

.cm-tag {
  font-size: 0.7em;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--background-modifier-border);
  color: var(--text-muted);
}

/* === Date === */
.cm-date {
  font-size: 0.8em;
  color: var(--text-muted);
}

/* === Empty state === */
.cm-empty {
  color: var(--text-faint);
  font-size: 0.85em;
  padding: 8px 0;
}

/* === Timeline === */
.claude-memory-timeline {
  padding: 16px;
}

.cm-timeline-header {
  margin-bottom: 16px;
}

.cm-timeline-header h2 {
  display: inline;
  margin-right: 8px;
}

.cm-related {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--background-secondary);
  border-radius: 8px;
}

.cm-related h3 {
  margin: 0 0 8px 0;
  font-size: 0.9em;
}

.cm-related-item {
  padding: 4px 0;
  display: flex;
  gap: 8px;
}

.cm-related-name {
  font-weight: 500;
  font-size: 0.9em;
}

.cm-related-reason {
  color: var(--text-muted);
  font-size: 0.85em;
}

.cm-timeline {
  position: relative;
  padding-left: 20px;
}

.cm-timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 32px;
  bottom: 0;
  width: 2px;
  background: var(--background-modifier-border);
}

.cm-timeline-entry {
  position: relative;
  padding: 8px 0 8px 16px;
  cursor: pointer;
}

.cm-timeline-entry:hover {
  background: var(--background-modifier-hover);
  border-radius: 6px;
}

.cm-timeline-dot {
  position: absolute;
  left: -17px;
  top: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-blue);
  border: 2px solid var(--background-primary);
}

.cm-timeline-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* === Stream Picker === */
.cm-stream-picker {
  margin-top: 12px;
}

/* === Sidebar === */
.claude-memory-sidebar {
  padding: 8px;
}

.cm-filter-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.cm-filter-btn {
  font-size: 0.8em;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
}

.cm-filter-btn.cm-active {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border-color: var(--interactive-accent);
}

.cm-sidebar-counts {
  font-size: 0.75em;
  color: var(--text-faint);
  margin-bottom: 12px;
}

.cm-sidebar-section {
  margin-bottom: 12px;
}

.cm-sidebar-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  font-weight: 600;
  margin-bottom: 4px;
  padding: 2px 0;
}

.cm-count {
  font-size: 0.8em;
  color: var(--text-faint);
}

.cm-sidebar-item {
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
}

.cm-sidebar-item:hover {
  background: var(--background-modifier-hover);
}
```

- [ ] **Step 2: Commit**

```bash
git add obsidian-claude-memory/styles.css
git commit -m "feat(obsidian-plugin): add styles for dashboard, timeline, sidebar"
```

---

### Task 15: Build and Test

- [ ] **Step 1: Install dependencies**

```bash
cd obsidian-claude-memory && npm install
```

- [ ] **Step 2: Build plugin**

```bash
npm run build
```

Expected: `main.js` created in project root, no TypeScript errors.

- [ ] **Step 3: Verify output files exist**

```bash
ls -la main.js manifest.json styles.css
```

All three files must be present — these are what get copied to `.obsidian/plugins/obsidian-claude-memory/`.

- [ ] **Step 4: Commit build output**

```bash
git add main.js
git commit -m "build(obsidian-plugin): compile plugin bundle"
```

---

### Task 16: Integration Test — Init and Verify

- [ ] **Step 1: Test init in mn_forms project**

Use the skill by telling Claude Code: "init obsidian-memory"

Verify:
- `.claude-memory/` directory created with `MEMORY.md`, `memories/`, `sessions/`, `streams/`, `graph/`
- Existing memories from `~/.claude/projects/.../memory/` migrated with Russian names
- `.obsidian/` created if not present

- [ ] **Step 2: Copy plugin to vault**

```bash
mkdir -p .obsidian/plugins/obsidian-claude-memory
cp obsidian-claude-memory/main.js .obsidian/plugins/obsidian-claude-memory/
cp obsidian-claude-memory/manifest.json .obsidian/plugins/obsidian-claude-memory/
cp obsidian-claude-memory/styles.css .obsidian/plugins/obsidian-claude-memory/
```

- [ ] **Step 3: Open in Obsidian**

Open the project folder as an Obsidian vault. Enable the "Claude Memory" plugin in Settings → Community plugins.

Verify:
- Brain icon appears in ribbon
- Sidebar shows with filter buttons
- Dashboard opens with 3 columns
- Click on any item opens the file

- [ ] **Step 4: Verify realtime sync**

1. Edit a memory file in Obsidian
2. Check `.claude-memory/.changed` exists with the modified path
3. Start a new Claude Code session — verify agent reads changed files

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(obsidian-memory): integration test fixes"
```
