# External Integrations

**Analysis Date:** 2026-04-13

## APIs & External Services

**None Detected** - This is a read-only Obsidian plugin that does not make external API calls or connect to remote services.

## Data Storage

**Local Storage:**
- Storage: Obsidian Vault (local file system)
  - Type: Markdown files (.md)
  - Location: `claude-memory/` directory within Obsidian vault
  - Subdirectories: `memories/`, `sessions/`, `streams/`, `graph/`
  - Index file: `claude-memory/MEMORY.md`
  - Change tracking: `.changed` file

**Vault Operations:**
- Client: Obsidian Vault API (`TFile`, `Vault` classes)
- Access methods: `vault.read()`, `vault.modify()`, `vault.create()`, `vault.getMarkdownFiles()`
- Caching: `vault.cachedRead()` for performance

**File Storage:**
- Approach: Local filesystem only (via Obsidian)
- No external cloud storage integration

**Caching:**
- Method: Obsidian's built-in `vault.cachedRead()` for file contents
- No external caching service

## Authentication & Identity

**Auth Provider:**
- None - Plugin operates within Obsidian user's local environment
- No external authentication required
- No API keys or credentials needed

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service integration

**Logs:**
- Method: Browser console (`console.log()`) for debug output
  - Example: "Claude Memory: claude-memory/ not found, plugin inactive"

## CI/CD & Deployment

**Hosting:**
- Obsidian Community Plugins (intended, not yet deployed)
- Local installation via `.obsidian/plugins/` directory

**CI Pipeline:**
- None - No CI/CD configuration detected
- Build: Manual via `npm run build`

## Environment Configuration

**Required env vars:**
- None - Plugin uses only local configuration

**Secrets location:**
- Not applicable - No external credentials or secrets required

## Webhooks & Callbacks

**Incoming:**
- None - Plugin does not expose webhooks

**Outgoing:**
- None - Plugin does not call external webhooks or APIs

## Event Handlers (Internal)

**Vault Events:**
- `vault.on('modify', callback)` - Triggered when files in `claude-memory/` change
  - Used in: `ChangedWriter` class, `SidebarView`
  - Writes: `.changed` tracking file for external tools to detect modifications

- `vault.on('create', callback)` - Triggered when files are created in `claude-memory/`
  - Used in: `SidebarView`
  - Purpose: Update UI with new items

**Workspace Events:**
- `workspace.onLayoutReady(callback)` - Plugin initialization hook
  - Used in: `main.ts` to activate sidebar view

**Command Execution:**
- Internal command registration via `plugin.addCommand()`
- No external command execution

## Data Interfaces

**Memory Files:**
- Format: Markdown with YAML frontmatter
- Fields: `name`, `description`, `type` (user/feedback/project/reference)
- Location: `claude-memory/memories/*.md`

**Session Files:**
- Format: Markdown with YAML frontmatter
- Fields: `date`, `duration`, `streams[]`, `status` (in_progress/completed)
- Location: `claude-memory/sessions/*.md`

**Stream Files:**
- Format: Markdown with YAML frontmatter
- Fields: `type` (gsd-phase/gsd-quick/gsd-workstream), `name`, `status`, `started`, `completed`, `related[]`
- Location: `claude-memory/streams/*.md` or `claude-memory/streams/[directory]/STREAM.md`

## Change Tracking

**Changed File Mechanism:**
- File: `claude-memory/.changed`
- Purpose: Track which files have been modified (for external tools like Claude Code agents)
- Debounce: 500ms to batch rapid changes
- Format: One file path per line
- Used by: `ChangedWriter` class (`src/sync/changed-writer.ts`)

## Local Interoperability

**Wikilink Parsing:**
- Extracts `[[wikilink]]` patterns from markdown content
- Purpose: Build graph of connections between memory items
- Used in: `parser.ts` `extractWikilinks()` function

**File Watching:**
- Watches all files under `claude-memory/` directory
- Excludes: `.changed` file itself to avoid infinite loops
- Debounces writes to prevent multiple rapid updates

---

*Integration audit: 2026-04-13*
