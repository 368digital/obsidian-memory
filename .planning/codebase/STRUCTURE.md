# Codebase Structure

**Analysis Date:** 2026-04-13

## Directory Layout

```
obsidian-memory/
├── .planning/
│   └── codebase/               # GSD planning documents
├── .claude/
│   └── settings.local.json     # Claude Code local settings
├── .claude-plugin/
│   ├── plugin.json             # Plugin manifest for installation
│   └── marketplace.json        # Marketplace metadata
├── .obsidian/
│   ├── plugins/
│   │   └── obsidian-claude-memory/  # Compiled plugin
│   ├── app.json                # Vault visibility filters
│   └── workspace.json          # Obsidian layout state
├── .opencode/
│   └── plugins/obsidian-memory.js   # Distribution build
├── claude-memory/              # Per-project memory vault (created by init)
│   ├── MEMORY.md              # Index file
│   ├── memories/              # Persistent knowledge
│   ├── sessions/              # Session records
│   ├── streams/               # GSD phase/task tracking
│   ├── graph/                 # Cross-reference maps
│   ├── assets/                # Images and files
│   └── .changed               # Change signal for sync
├── docs/
│   ├── DESIGN.md             # Architecture decisions
│   └── PLAN.md               # Implementation roadmap
├── obsidian-claude-memory/    # Plugin source (TypeScript)
│   ├── src/
│   │   ├── main.ts           # Plugin entry point
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── parser.ts         # Frontmatter and wikilink parsing
│   │   ├── views/
│   │   │   ├── DashboardView.ts   # 3-column dashboard
│   │   │   └── TimelineView.ts    # Stream timeline
│   │   ├── sidebar/
│   │   │   └── SidebarView.ts     # Tree with filters
│   │   ├── commands/
│   │   │   └── commands.ts        # 5 command modals
│   │   └── sync/
│   │       └── changed-writer.ts  # .changed file writer
│   ├── esbuild.config.mjs    # Build configuration
│   ├── tsconfig.json         # TypeScript config
│   ├── package.json          # Dependencies
│   ├── main.js               # Compiled plugin
│   ├── manifest.json         # Plugin metadata
│   └── styles.css            # Plugin UI styles
├── obsidian-memory-skill/    # Claude Code skill (markdown)
│   ├── SKILL.md             # Activation and core rules
│   ├── session-capture.md   # Session file recording
│   ├── stream-tracking.md   # Stream management
│   ├── context-restore.md   # Session start procedures
│   └── init.md              # Setup instructions
├── skills/
│   └── obsidian-memory/     # Copy of skill for distribution
│       ├── SKILL.md
│       ├── session-capture.md
│       ├── stream-tracking.md
│       ├── context-restore.md
│       └── init.md
├── package.json             # Root dependencies (for plugin build)
├── README.md               # Project overview and installation
└── .gitignore              # Ignore rules
```

## Directory Purposes

**`.planning/codebase/`:**
- Purpose: GSD planning and architecture documentation
- Contains: ARCHITECTURE.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Key files: This document (STRUCTURE.md), ARCHITECTURE.md for design understanding

**`.claude/`:**
- Purpose: Claude Code local configuration (per-user, machine-local)
- Contains: settings.local.json with preferences
- Key files: settings.local.json
- Committed: No (machine-specific)

**`.claude-plugin/`:**
- Purpose: Plugin installation manifest for Claude Code `/install-plugin` command
- Contains: plugin.json (metadata), marketplace.json (discovery)
- Key files: `plugin.json` defines skill and plugin locations
- Committed: Yes

**`.obsidian/`:**
- Purpose: Obsidian vault configuration
- Contains: Plugin builds, app settings, workspace layout
- Key files: `plugins/obsidian-claude-memory/main.js` (compiled plugin binary), `app.json` (vault filters)
- Committed: Partially (settings yes, workspace state optional)

**`.opencode/`:**
- Purpose: Distribution format for OpenCode integration
- Contains: Compiled plugin as JavaScript
- Key files: `plugins/obsidian-memory.js`
- Committed: Yes

**`claude-memory/`:**
- Purpose: Per-project memory vault (created by `init` skill command)
- Contains: All persistent project context
- Key files: `MEMORY.md` (index), memories/*, sessions/*, streams/*, .changed (sync signal)
- Committed: User's choice (ignored or tracked)

**`docs/`:**
- Purpose: Project documentation and design decisions
- Contains: Architecture rationale (DESIGN.md), roadmap (PLAN.md)
- Key files: DESIGN.md (architectural decisions), PLAN.md (implementation phases)
- Committed: Yes

**`obsidian-claude-memory/`:**
- Purpose: Obsidian plugin source code (primary deliverable)
- Contains: TypeScript source, build config, compiled output
- Key files: `src/main.ts` (plugin entry), `src/parser.ts` (YAML/wikilink parsing), `src/views/` (UI components)
- Committed: Yes (src/ and config, generated binaries tracked)

**`obsidian-memory-skill/`:**
- Purpose: Claude Code skill source (markdown instructions)
- Contains: Behavior definitions for Claude agents
- Key files: `SKILL.md` (activation), `session-capture.md`, `stream-tracking.md`, `context-restore.md`, `init.md`
- Committed: Yes

**`skills/`:**
- Purpose: Distribution copy of skill for package installation
- Contains: Mirror of obsidian-memory-skill/
- Key files: Same as obsidian-memory-skill/
- Committed: Yes

## Key File Locations

**Entry Points:**

- `obsidian-claude-memory/src/main.ts`: Plugin entry point — exports ClaudeMemoryPlugin class, registers views, commands, change writer
- `obsidian-memory-skill/SKILL.md`: Skill activation check — Claude Code reads this to determine if system is enabled
- `obsidian-claude-memory/package.json`: Plugin build definition — `npm run build` creates main.js

**Configuration:**

- `obsidian-claude-memory/tsconfig.json`: TypeScript compilation settings
- `obsidian-claude-memory/esbuild.config.mjs`: Build bundler config (produces main.js from src/)
- `obsidian-claude-memory/manifest.json`: Plugin metadata (version, author, description)
- `.obsidian/app.json`: Vault display filters (hides non-memory dirs from Obsidian UI)

**Core Logic:**

- `obsidian-claude-memory/src/parser.ts`: Frontmatter parsing (YAML extraction), wikilink detection, file categorization (memory/session/stream)
- `obsidian-claude-memory/src/views/DashboardView.ts`: Dashboard rendering (3-column layout: streams, sessions, memories)
- `obsidian-claude-memory/src/views/TimelineView.ts`: Timeline view (vertical session timeline for stream)
- `obsidian-claude-memory/src/sidebar/SidebarView.ts`: Sidebar tree (filters: all/active/archived, hierarchical lists)
- `obsidian-claude-memory/src/commands/commands.ts`: 5 command modals (Create Memory, Create Stream, Link Streams, Archive Stream, Set Context)
- `obsidian-claude-memory/src/sync/changed-writer.ts`: Real-time sync (monitors vault.on('modify'), debounces changes to .changed file)
- `obsidian-memory-skill/session-capture.md`: Session file creation and update procedures
- `obsidian-memory-skill/stream-tracking.md`: Stream creation and relationship management
- `obsidian-memory-skill/context-restore.md`: Context loading at session start

**Testing:**

- No test files present (see CONCERNS.md)

## Naming Conventions

**Files:**

- **Plugin source:** camelCase (`main.ts`, `DashboardView.ts`, `changed-writer.ts`)
- **Skill/markdown:** Russian user-friendly names (`SKILL.md`, `session-capture.md`, `Роль пользователя.md`)
- **Generated memory files:** Russian with type prefix
  - User memories: `{Название}.md` (e.g., `Роль пользователя.md`)
  - Feedback: `Фидбэк — {Название}.md` (e.g., `Фидбэк — Всегда использовать GSD.md`)
  - Project: `Проект — {Название}.md` (e.g., `Проект — Архитектура и деплой.md`)
  - Reference: `Справка — {Название}.md` (e.g., `Справка — API документация.md`)
  - Sessions: `{YYYY-MM-DD HH-mm} — {Описание}.md` (e.g., `2026-04-13 14-30 — Фикс отображения домена.md`)
  - Phase streams: `Фаза {NN} — {Название}/` (e.g., `Фаза 04 — Каскады/`)
  - Quick streams: `Быстрая — {Описание}.md` (e.g., `Быстрая — Фикс domain ID.md`)

**Directories:**

- **Plugin:** `obsidian-claude-memory/` (kebab-case with scope)
- **Skill:** `obsidian-memory-skill/` (kebab-case)
- **Memory vault:** `claude-memory/` (kebab-case), subdirs: `memories/`, `sessions/`, `streams/`, `graph/`, `assets/`
- **TypeScript dirs:** `src/`, `views/`, `commands/`, `sidebar/`, `sync/` (lowercase, descriptive)

## Where to Add New Code

**New Plugin Feature (new view or command):**
- Implementation: `obsidian-claude-memory/src/views/{FeatureName}.ts` or `obsidian-claude-memory/src/commands/`
- Register in: `obsidian-claude-memory/src/main.ts` (registerView, addCommand)
- Import types: `obsidian-claude-memory/src/types.ts`

**New Parser Function (for frontmatter or wikilinks):**
- Location: `obsidian-claude-memory/src/parser.ts`
- Export and use in views or commands
- Example: `parseFrontmatter()`, `extractWikilinks()`, `getFileCategory()`

**New Skill Instruction (for Claude Code behavior):**
- Location: `obsidian-memory-skill/{new-file}.md`
- If updates existing behavior (e.g., session capture), append to `session-capture.md`
- If new workflow area, create new file and link from `SKILL.md`

**New Memory Type (beyond user/feedback/project/reference):**
- Update `MemoryFile['type']` in `obsidian-claude-memory/src/types.ts`
- Update command modal in `obsidian-claude-memory/src/commands/commands.ts` to add dropdown option
- Update skill naming in `obsidian-memory-skill/SKILL.md`
- Update parser display labels in `DashboardView.ts` (typeLabels map)

**New UI Component (dashboard, sidebar, timeline):**
- Create file: `obsidian-claude-memory/src/views/{NewView}.ts`
- Export constant: `export const {NEW_VIEW_TYPE} = 'claude-memory-{new-view}'`
- Register in main.ts: `this.registerView({NEW_VIEW_TYPE}, (leaf) => new {NewView}(leaf, this))`
- Add command to open: `plugin.addCommand({ id: 'open-{new-view}', name: '...', ... })`

**Utilities and Helpers:**
- Shared helper functions: `obsidian-claude-memory/src/` at same level as main.ts
- Type definitions: `obsidian-claude-memory/src/types.ts`
- Parsing utilities: `obsidian-claude-memory/src/parser.ts`

## Special Directories

**`claude-memory/`:**
- Purpose: Per-project memory vault
- Generated: Yes (created by `init` skill command)
- Committed: User's choice (guided by init.md step 4)
- Modified by: Both Claude Code skill and Obsidian plugin
- Read by: Claude Code at session start, Obsidian plugin on every view render

**`.obsidian/plugins/obsidian-claude-memory/`:**
- Purpose: Compiled plugin files in vault
- Generated: Yes (built via `npm run build`)
- Committed: Yes (binaries tracked for distribution)
- Modified by: Build process only
- Read by: Obsidian app on plugin load

**`dist/` (if present):**
- Purpose: Alternative build output location
- Generated: Yes (from esbuild)
- Committed: Typically no (use .gitignore)

---

*Structure analysis: 2026-04-13*
