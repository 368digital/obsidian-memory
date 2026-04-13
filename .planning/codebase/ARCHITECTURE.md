# Architecture

**Analysis Date:** 2026-04-13

## Pattern Overview

**Overall:** Dual-layer system integrating Claude Code persistent memory with Obsidian vault visualization.

**Key Characteristics:**
- **Memory layer**: File-based markdown storage (`claude-memory/`) that replaces Claude's default memory
- **Visualization layer**: Obsidian plugin providing UI (dashboard, timeline, sidebar) for memory exploration
- **Sync layer**: Bidirectional change detection between Claude Code and Obsidian via `.changed` signal file
- **Skill layer**: Claude Code behavior modifications via markdown instructions that auto-activate when `claude-memory/` exists

## Layers

**Claude Code Skill (`obsidian-memory-skill/`):**
- Purpose: Define behavior for Claude Code agents when working on projects with obsidian-memory
- Location: `obsidian-memory-skill/` (installs to `~/.claude/skills/obsidian-memory-skill`)
- Contains: Markdown files with activation rules, file formats, context restoration procedures
- Depends on: Nothing (executes within Claude Code runtime)
- Used by: Claude Code when `claude-memory/MEMORY.md` is detected in project

**Obsidian Plugin (`obsidian-claude-memory/`):**
- Purpose: Visualize and manage memories, sessions, streams within Obsidian UI
- Location: `obsidian-claude-memory/src/`
- Contains: TypeScript components for views, commands, parsers, file monitoring
- Depends on: Obsidian API, existing `claude-memory/` directory structure
- Used by: Obsidian users viewing project memory directly

**Storage Layer (`claude-memory/`):**
- Purpose: Persistent vault containing memories, sessions, streams, and relationships
- Location: Project-root `claude-memory/` directory
- Contains: Markdown files with YAML frontmatter (memories, sessions, streams), index files, change signal
- Depends on: Nothing (pure markdown/text files)
- Used by: Both Claude Code (via skill) and Obsidian Plugin (via API)

## Data Flow

**Claude Code → Obsidian (Write):**
1. Claude Code skill observes user actions (phase completion, session end, decisions)
2. Writes/appends to `claude-memory/memories/`, `claude-memory/sessions/`, `claude-memory/streams/`
3. Updates `claude-memory/MEMORY.md` index with new wikilinks
4. Obsidian plugin detects vault changes via `vault.on('modify')` event
5. Plugin views re-render automatically via `.render()` methods

**Obsidian → Claude Code (Read):**
1. User edits memory/session/stream files in Obsidian
2. ChangedWriter (`src/sync/changed-writer.ts`) tracks modifications in real-time
3. Writes file paths to `claude-memory/.changed` with 500ms debounce
4. Claude Code skill checks for `.changed` at session start
5. Skill re-reads modified files and updates internal context
6. Skill deletes `.changed` after processing

**At Session Start (Context Restoration):**
1. Skill detects `claude-memory/MEMORY.md` exists → activate
2. Check `.changed`, re-read listed files, delete `.changed`
3. Read `MEMORY.md` index → understand all memories, recent sessions, active streams
4. Glob and read last 3-5 session files → understand recent work
5. Glob and read active streams (`status: active` or `status: paused`) → understand in-progress work
6. Read all memory files → load persistent user/project/feedback context
7. Start session with full context in scope

## State Management

**Session State:**
- Stored in `claude-memory/sessions/{YYYY-MM-DD HH-mm} — {Description}.md`
- Frontmatter: `date`, `duration`, `streams` (list of touched stream names), `status` (in_progress/completed)
- Body: sections for context, decisions, completed work, files changed, commands run, problems, next steps

**Stream State:**
- Stored in directory (`Фаза {NN}/`, `Поток — {Name}/`) or single file (`Быстрая — {Name}.md`)
- Frontmatter: `type` (gsd-phase, gsd-quick, gsd-workstream), `phase`, `name`, `status` (active/complete/blocked/paused), `started`, `completed`, `related[]`
- Body: `## Цель` (goal), `## Решения` (decisions), `## Прогресс` (tasks)
- Related streams tracked bidirectionally via `related: [{stream, reason}]` array

**Memory State:**
- Stored in `claude-memory/memories/{Type} — {Name}.md`
- Frontmatter: `name`, `description`, `type` (user/feedback/project/reference)
- Body: User-readable persistent context
- Indexed in `claude-memory/MEMORY.md` via wikilinks

**Change Signal:**
- File: `claude-memory/.changed`
- Format: newline-separated file paths modified in Obsidian
- Lifecycle: Created by ChangedWriter, read by skill, deleted by skill
- Purpose: Notify Claude Code of Obsidian edits without polling

## Key Abstractions

**MemoryFile:**
- Purpose: Persistent knowledge about user preferences, project facts, feedback patterns
- Location examples: `claude-memory/memories/Роль пользователя.md`, `claude-memory/memories/Проект — Архитектура.md`
- Pattern: YAML frontmatter (name, description, type) + markdown body with wikilinks
- Types: user (developer info), feedback (lessons learned), project (code/architecture), reference (documentation)

**SessionFile:**
- Purpose: Compressed record of work done in one conversation
- Location examples: `claude-memory/sessions/2026-04-13 14-30 — Фикс домена.md`
- Pattern: YAML frontmatter (date, duration, streams list, status) + sections (context, decisions, work, files, commands, problems, next steps)
- Lifecycle: Created at session start, updated during work, completed at session end

**StreamFile:**
- Purpose: Track units of work mapped to GSD phases, quick tasks, or workstreams
- Location examples: `claude-memory/streams/Фаза 04 — Каскады/STREAM.md`, `claude-memory/streams/Быстрая — Фикс domain ID.md`
- Pattern: YAML frontmatter (type, phase, name, status, started, completed, related[]) + body sections (goal, decisions, progress)
- Related tracking: bidirectional links to dependent/related streams with reason annotation

**Wikilink:**
- Purpose: Create lightweight cross-references within vault using Obsidian standard syntax
- Format: `[[file name without extension]]` in markdown body
- Scope: Links between memories, sessions, streams; used for navigation in Obsidian graph view
- Parser: `extractWikilinks()` in `parser.ts` finds all `[[...]]` patterns

## Entry Points

**Skill Activation:**
- Trigger: Skill file `SKILL.md` exists at `obsidian-memory-skill/SKILL.md`
- Condition: At session start, glob for `claude-memory/MEMORY.md`
- Responsibilities: 
  - Check `.changed` and sync Obsidian edits
  - Load full memory context
  - Record session file with user interactions
  - Update stream progress when work completes

**Plugin Initialization:**
- Location: `obsidian-claude-memory/src/main.ts` (ClaudeMemoryPlugin.onload)
- Trigger: Obsidian loads plugin, checks if `claude-memory/` directory exists
- Responsibilities:
  - Register three views (DashboardView, TimelineView, SidebarView)
  - Register five commands (Create Memory, Create Stream, Link Streams, Archive Stream, Set Context)
  - Add ribbon icon to open dashboard
  - Start ChangedWriter to monitor file modifications
  - Deactivate if `claude-memory/` not found

**Dashboard View:**
- Location: `obsidian-claude-memory/src/views/DashboardView.ts`
- Triggers: User clicks brain icon or runs "Claude Memory Dashboard" command
- Renders: Three-column layout (streams, recent sessions, memories grouped by type)
- Interactions: Click items to open file in editor

**Commands (five total):**
- **Create Memory:** Opens modal, collects name/type/description, writes to `claude-memory/memories/`, updates index
- **Create Stream:** Opens modal, collects type/phase/name, creates directory or file with template
- **Link Streams:** Opens dropdown modals, adds `related:` entries bidirectionally
- **Archive Stream:** Changes `status: active/paused` → `status: complete`, sets `completed:` date
- **Set Context:** Toggles `priority: high` frontmatter on current file for agent priority reading

## Error Handling

**Strategy:** Graceful degradation with user feedback (Obsidian Notices)

**Patterns:**
- Plugin checks `claude-memory/` exists before loading — deactivates silently if missing
- Commands validate user input in modals (e.g., "Введите название" if name empty)
- File operations use try-catch in plugin with Notice on failure
- Parser handles malformed frontmatter: returns empty meta, extracts body
- Wikilink extraction uses regex matching, skips malformed patterns without crashing
- ChangedWriter debounces writes (500ms) to batch rapid changes
- Sidebar filters handle missing/deleted files gracefully

## Cross-Cutting Concerns

**Logging:** Console.log in plugin (e.g., "Claude Memory: claude-memory/ not found, plugin inactive")

**Validation:** 
- Frontmatter parser validates YAML structure, extracts scalars and arrays
- File category detection via path patterns (memories/, sessions/, streams/, graph/)
- Stream status enum: active, complete, blocked, paused

**Authentication:** Not applicable (local vault, no external auth)

**Localization:** Russian language throughout UI, file names, frontmatter labels (used for user-friendly experience)

**File I/O:**
- Obsidian Vault API for all file operations (create, read, modify)
- ChangedWriter monitors `vault.on('modify')` events
- Parser uses `vault.cachedRead()` for performance
- All paths use forward slashes (Obsidian standard)

---

*Architecture analysis: 2026-04-13*
