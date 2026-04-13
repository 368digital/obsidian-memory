# Obsidian Memory

Persistent project context for Claude Code via Obsidian vault.

## The Problem

- Claude Code loses context when the session ends
- GSD workflows run multiple parallel streams — connections between them aren't preserved
- You have to re-explain everything to the agent each time

## The Solution

An Obsidian vault in every project. The agent writes everything to `claude-memory/`. On new sessions, context is automatically restored. Obsidian provides a UI for navigation, graph visualization, and active management.

## Components

### 1. Skill — `obsidian-memory-skill/`

Claude Code skill — a set of markdown instructions that control agent behavior:

- **SKILL.md** — main file: activation, file format, naming, wikilinks
- **session-capture.md** — how to record sessions (conversations with the user)
- **stream-tracking.md** — how to track work streams (GSD phases, quick tasks)
- **context-restore.md** — how to restore context at new session start
- **init.md** — initialize `claude-memory/` in a project with migration of existing memories
- **update.md** — auto-update skill and plugin from GitHub

### 2. Plugin — `obsidian-claude-memory/`

Obsidian plugin (TypeScript) for visualization and management:

- **Memory Dashboard** — three columns: streams, sessions, memories
- **Stream Timeline** — vertical timeline for a specific stream
- **Sidebar** — file tree with filters (all / active / archived)
- **5 commands** — Create Memory, Create Stream, Link Streams, Archive Stream, Set Context
- **Realtime sync** — edits in Obsidian are picked up by the agent via `.changed` file
- **Session Guardian** — closes stale sessions, creates stub files automatically

## Installation

### Claude Code Plugin (recommended)

One command installs both the skill and everything else:

```bash
claude /install-plugin 368digital/obsidian-memory
```

The skill will be registered automatically and available in all projects.

### Manual Installation

```bash
# Clone
git clone https://github.com/368digital/obsidian-memory.git
cd obsidian-memory

# Copy skill to Claude Code
cp -r skills/obsidian-memory ~/.claude/skills/obsidian-memory-skill
```

### Obsidian Plugin

The Obsidian plugin is installed per-project:

```bash
# Build the plugin
cd obsidian-claude-memory
npm install
npm run build

# Copy to project vault
mkdir -p /path/to/project/.obsidian/plugins/obsidian-claude-memory
cp main.js manifest.json styles.css /path/to/project/.obsidian/plugins/obsidian-claude-memory/
```

Then in Obsidian: Settings → Community plugins → enable "Claude Memory".

## Usage

### Initialization

In Claude Code, say: **"init obsidian-memory"**

The skill will create:
- `claude-memory/` — directory structure (memories, sessions, streams, graph)
- `MEMORY.md` — index file
- `CLAUDE.md` — session tracking instructions
- `.claude/settings.json` — SessionStart + Stop hooks
- Migrate existing memories from `~/.claude/projects/.../memory/`

### Vault Structure

```
my-project/
├── .obsidian/plugins/obsidian-claude-memory/   ← plugin
├── claude-memory/                               ← data
│   ├── MEMORY.md                                ← index
│   ├── memories/                                ← persistent memories
│   │   ├── User Role.md
│   │   ├── Feedback — Always Use GSD.md
│   │   └── Project — Architecture and Deploy.md
│   ├── sessions/                                ← conversations
│   │   └── 2026-04-13 14-30 — Fix Domain.md
│   ├── streams/                                 ← work streams
│   │   ├── Phase 04 — Cascades/
│   │   │   ├── STREAM.md
│   │   │   ├── Decisions.md
│   │   │   └── Progress.md
│   │   └── Quick — Fix Domain ID.md
│   └── graph/                                   ← cross-references
│       └── Cross References.md
└── src/
```

### File Naming

| Type | Format | Example |
|------|--------|---------|
| Memory (user) | `{Description}.md` | `User Role.md` |
| Memory (feedback) | `Feedback — {Description}.md` | `Feedback — Always Use GSD.md` |
| Memory (project) | `Project — {Description}.md` | `Project — Architecture.md` |
| Memory (reference) | `Reference — {Description}.md` | `Reference — API Docs.md` |
| Session | `{YYYY-MM-DD HH-mm} — {Description}.md` | `2026-04-13 14-30 — Fix Domain.md` |
| Stream (phase) | `Phase {NN} — {Name}/` | `Phase 04 — Cascades/` |
| Stream (quick) | `Quick — {Description}.md` | `Quick — Fix Domain ID.md` |

### Wikilinks

All files are linked via `[[wikilinks]]` — the Obsidian standard:

```markdown
Continuing work on [[Phase 04 — Cascades]].
Bug fix from [[Quick — Fix Domain ID]].
See also [[User Role]].
```

### Obsidian Commands (Command Palette)

| Command | Description |
|---------|-------------|
| Claude Memory: Create Memory | Create a memory file with frontmatter |
| Claude Memory: Create Stream | Create a new work stream |
| Claude Memory: Link Streams | Link two streams with a reason |
| Claude Memory: Archive Stream | Mark a stream as completed |
| Claude Memory: Set Context | Mark a file as priority for the agent |

## How It Works

### Writing (Claude Code → Obsidian)

1. **Session start** — skill creates a session file in `claude-memory/sessions/`
2. **During work** — records decisions, changed files, progress
3. **Session end** — generates summary and next steps
4. **Memories** — written to `claude-memory/memories/` instead of `~/.claude/`

### Reading (Obsidian → Claude Code)

1. When a file is saved in Obsidian, the plugin writes `claude-memory/.changed`
2. The skill checks `.changed` before each response
3. If found — re-reads modified files and deletes `.changed`

### Context Restoration

On new sessions, the skill automatically:
1. Reads `MEMORY.md` — the index of everything
2. Reads the last 3-5 sessions
3. Reads active streams
4. Reads all memories

The agent starts with full context, no questions asked.

### Session Reliability

Three layers ensure sessions are always recorded:

| Layer | Mechanism | Catches |
|-------|-----------|---------|
| `CLAUDE.md` | Instructions loaded every session | Claude forgetting the skill |
| Hooks | SessionStart + Stop in `.claude/settings.json` | Claude ignoring CLAUDE.md |
| Plugin | SessionGuardian creates stubs, closes stale sessions | Console closed abruptly |

### Auto-Update

The status line checks GitHub for new releases every hour. When an update is available:

```
obsidian-memory 0.3.0 available (current: 0.2.0) → /update-obsidian-memory
```

Run `/update-obsidian-memory` to download and install the latest version.

## Development

### Plugin

```bash
cd obsidian-claude-memory
npm install
npm run dev    # watch mode
npm run build  # production build
```

### Plugin Structure

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
    ├── changed-writer.ts    ← .changed signal writer
    └── session-guardian.ts  ← Stale session cleanup + stub creation
```

## License

MIT
