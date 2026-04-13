# obsidian-memory

> This project is entirely built with [Claude Code](https://claude.ai/claude-code) — from architecture and plugin code to skill instructions and documentation.

Project memory system for Claude Code with Obsidian visualization.

Claude Code keeps detailed records of every work session, decisions, and work directions — Obsidian displays it all as a connected graph with navigation, dashboard, and timeline.

## Quick Start

**Prerequisites:** [Claude Code](https://claude.ai/claude-code) + [Obsidian](https://obsidian.md) installed.

1. **Install the skill** (once, globally):
   ```bash
   git clone https://github.com/368digital/obsidian-memory.git
   cp -r obsidian-memory/skills/obsidian-memory ~/.claude/skills/obsidian-memory-skill
   ```

2. **Initialize in any project** (run in Claude Code):
   ```
   /obs-mem init
   ```
   This will:
   - Ask your preferred language (English / Russian)
   - Create `claude-memory/` directory structure
   - Download and install the Obsidian plugin automatically
   - Ask about your project and create work bases
   - Configure CLAUDE.md and session hooks

3. **Open the project folder in Obsidian** — the vault is ready, plugin is active.

That's it. No manual plugin installation, no vault setup. Everything is handled by `/obs-mem init`.

## Components

**Claude Code Skill** — a set of instructions Claude follows automatically: creates a session file for each conversation, records decisions and progress, updates the memory index. The skill activates automatically when the project has a `claude-memory/` directory.

**Obsidian Plugin** — visualizes `claude-memory/` contents inside Obsidian: sidebar with bases, sessions, and memories; dashboard with statistics; timeline with filtering; real-time file change log for the entire project.

## How It Works

### Sessions

Every conversation with Claude is a separate session. At start, Claude creates a file in `claude-memory/sessions/`, records key decisions, touched files (as `[[wikilinks]]`), and commits during work. At the end — adds next steps and marks the session as completed.

Sessions are linked to each other via the `continues` field — the chain of continuations is visible in the Obsidian graph.

### Bases

Bases are work directions in the project. For example, "Backend API" or "Frontend UI". Each base is a file in `claude-memory/bases/` with a description, tags, and chronology.

At session start, Claude asks which base the work belongs to. The session is linked to the base via wikilinks. In the timeline, you can filter sessions by base to see the full history of one direction.

### Memory

Memory records are facts important to remember between sessions: who the user is, what decisions were made, what feedback was given. Stored in `claude-memory/memories/`, indexed in `MEMORY.md`.

### Streams

Streams track units of work: project phases, quick tasks, work directions. Stored in `claude-memory/streams/` with progress and decisions.

### Project-wide File Tracking

The plugin tracks ALL file changes across the entire project (not just `claude-memory/`). Every modified file is:
- Shown in the sidebar log with NEW/UPD/DEL labels
- Auto-appended to the active session with `[[wikilinks]]`
- Connected in the Obsidian graph to the session that touched it

### Sync

When you edit files in Obsidian, the plugin writes the changed file path to `claude-memory/.changed`. On the next Claude start, it reads this file and picks up your edits.

### Graph

All connections between files use `[[wikilinks]]`. Obsidian automatically builds the graph: sessions linked to bases, bases to sessions, project files to sessions, memory referencing decisions.

## What You See in Obsidian

### Sidebar (brain icon in the top panel)

List of all claude-memory elements:
- **Bases** — work directions with tags
- **Streams** — active, paused, completed
- **Sessions** — last 10
- **Memory** — all records with types
- **Log** — real-time file changes across the entire project (NEW/UPD/DEL/REN with timestamps)

Filters: All / Active / Archived.

### Dashboard (brain icon in the bottom panel)

Overview panel with statistics and cards:
- Count of bases, sessions, memories, streams
- Columns of bases, streams, sessions, memories with clickable cards

### Timeline

Chronology by bases and streams. Select a base or stream — see all related sessions in chronological order.

### Change Log

At the bottom of the sidebar — a live log of all project file changes. Shows time, action type, and file name. Click opens the file.

## Session Recording Reliability

Three levels guarantee sessions are always recorded:

| Level | Mechanism | Catches |
|-------|-----------|---------|
| CLAUDE.md | Instructions loaded every session | Claude forgot the skill |
| Hooks | SessionStart + PostToolUse + Stop in `.claude/settings.json` | Claude ignores CLAUDE.md |
| Plugin | SessionGuardian creates stubs, closes stale sessions | Console closed unexpectedly |

## Obsidian Commands (Ctrl+P)

| Command | Description |
|---------|-------------|
| Claude Memory: Create Memory | Create a memory record |
| Claude Memory: Create Stream | Create a stream (phase/task/direction) |
| Claude Memory: Create Base | Create a new base |
| Claude Memory: Link Streams | Link two streams |
| Claude Memory: Archive Stream | Mark a stream as completed |
| Claude Memory: Set Context | Prioritize a file for the agent |

## Claude Code Commands

### /obs-mem init

Initialize obsidian-memory in the current project:
- Asks language preference (English / Russian)
- Creates `claude-memory/` directory structure
- Asks about project and creates initial bases
- Migrates existing memory from Claude's standard system
- Sets up `.obsidian/` as a vault
- Adds instructions to CLAUDE.md
- Configures SessionStart, PostToolUse, and Stop hooks

### /obs-mem base

Show current session bases and list all available bases.

### /obs-mem base {Name}

Add a base to the current session. If not found — offers to create one.

### /obs-mem base new

Create a new base: name, description, paths, tags.

### /obs-mem base remove {Name}

Remove a base from the current session (base file is not deleted).

### /obs-mem refresh

Re-read all claude-memory data and update context.

### /obs-mem update

Update obsidian-memory to the latest version from GitHub. Downloads skill and plugin files, shows changelog.

If an update is available, a hint appears in the Claude Code status line:
```
obsidian-memory 0.3.0 available (current: 0.2.0) → /obs-mem update
```

## File Structure

```
claude-memory/
├── MEMORY.md           — memory index
├── .lang               — language preference (en/ru)
├── memories/           — memory records (user, feedback, project, reference)
├── sessions/           — session files
├── streams/            — work streams (phases, tasks)
├── bases/              — bases (work directions)
├── graph/              — auto-generated cross-references
├── assets/             — images
└── .changed            — signal file for sync
```

## Installation

See [Quick Start](#quick-start) above. The plugin is installed automatically by `/obs-mem init` — no manual setup needed.

For manual plugin builds (development):
```bash
cd obsidian-claude-memory
npm install && npm run build
cp main.js manifest.json styles.css /path/to/project/.obsidian/plugins/obsidian-claude-memory/
```

## Development

```bash
cd obsidian-claude-memory
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

MIT
