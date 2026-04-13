# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- Classes and Views: PascalCase with file extensions
  - Example: `DashboardView.ts`, `ChangedWriter.ts`, `SidebarView.ts`
- Functions and utilities: camelCase
  - Example: `parseFrontmatter`, `extractWikilinks`, `loadMemoryIndex`
- Constants: UPPER_SNAKE_CASE
  - Example: `CLAUDE_MEMORY_DIR`, `DASHBOARD_VIEW_TYPE`, `MEMORIES_DIR`

**Functions:**
- Exported functions: camelCase, descriptive names indicating action/purpose
  - Examples: `registerCommands()`, `parseMemoryFile()`, `archiveCurrentStream()`
  - Async functions prefixed with verb: `loadMemoryIndex()`, `onOpen()`
- Private methods: camelCase with `private` access modifier
  - Examples: `renderStreamsColumn()`, `scheduleWrite()`, `writeChangedFile()`
- Callback functions: follow handler naming pattern
  - Examples: `onOpen()`, `onClose()`, `onClick()`

**Variables:**
- Local variables: camelCase
  - Examples: `container`, `filteredStreams`, `pendingPaths`
- Configuration objects: camelCase
  - Examples: `typePrefix`, `typeLabels`, `groups`
- Collections: plural camelCase
  - Examples: `memories`, `sessions`, `streams`, `wikilinks`

**Types:**
- Interface names: PascalCase with descriptive suffix
  - Examples: `MemoryFile`, `SessionFile`, `StreamFile`
- Union type literals: lowercase with hyphens
  - Examples: `'gsd-phase' | 'gsd-quick' | 'gsd-workstream'`
- Status values: lowercase with hyphens
  - Examples: `'active' | 'complete' | 'paused' | 'blocked'`

## Code Style

**Formatting:**
- Target: ES2018 with ESNext module format
- tsconfig settings: `strictNullChecks: true`, `noImplicitAny: true`
- 2-space indentation (inferred from esbuild output)
- Inline source maps in development, disabled in production

**Linting:**
- No explicit ESLint config detected
- TypeScript compiler handles static analysis via tsconfig strict mode settings
- Build uses esbuild with tree-shaking enabled

**Access Modifiers:**
- Private class properties marked with `private` keyword
- Protected for inherited methods in Obsidian plugin classes
- Explicit about field visibility in constructors

## Import Organization

**Order:**
1. Third-party libraries (obsidian framework imports)
2. Local type imports (`import type ...`)
3. Local module imports

**Path Style:**
- Relative paths with `./` prefix for same-level and subdirectory imports
  - Example: `import { DashboardView } from './views/DashboardView'`
  - Example: `import type ClaudeMemoryPlugin from '../main'`
- Imports from 'obsidian' package without path alias

**Type Imports:**
- Use `import type` for type-only imports to reduce bundle size
  - Example: `import type ClaudeMemoryPlugin from '../main'`
  - Example: `import type { MemoryFile, SessionFile, StreamFile } from '../types'`
- Regular imports for values and classes

**Barrel Files:**
- Not used; direct imports from individual files

## Error Handling

**Patterns:**
- Guard clauses at function entry for invalid states
  - Example: `if (!memoryDir) { return; }` in `main.ts`
  - Example: `if (!(file instanceof TFile)) return;`
- Explicit type guards with `instanceof` checks
  - Example: `if (file && file instanceof TFile)` before operations
- Validation before operations with early returns
  - Example: `if (!name) { new Notice('...'); return; }`
- Null/undefined checks via optional chaining where appropriate
  - Example: `this.changedWriter?.stop()`

**User Feedback:**
- Use Obsidian's `Notice` class for user messages
  - Example: `new Notice('Claude Memory: claude-memory/ not found')`
  - Example: `new Notice('Введена запись: ${fileName}')`

## Logging

**Framework:** console (browser console via Obsidian)

**Patterns:**
- Use `console.log()` for informational messages
  - Example: `console.log('Claude Memory: claude-memory/ not found, plugin inactive')`
- Minimal logging in production code
- No error logs detected - errors handled via Notice or early returns

## Comments

**When to Comment:**
- Regex patterns explaining matching logic: comments not observed in codebase
- Complex frontmatter parsing logic: documented via function names and types
- Non-obvious state transitions: rely on clear variable names

**JSDoc/TSDoc:**
- Not systematically used in current codebase
- Type signatures provide documentation via TypeScript
- Function names are self-documenting (e.g., `extractWikilinks`, `parseMemoryFile`)

## Function Design

**Size:** Functions range 1-30 lines typically
- Parsing functions: ~20-30 lines
- Render methods: ~40-80 lines with complex UI logic
- Utility functions: 5-15 lines

**Parameters:**
- Functions accept 1-3 parameters
- Complex configurations use object parameters
  - Example: Settings object with `cls`, `text` properties in Obsidian UI methods
- Type annotations required for all parameters

**Return Values:**
- Explicit return types always specified
- Return types using union types for multiple categories
  - Example: `'memory' | 'session' | 'stream' | 'graph' | 'index' | 'unknown'`
- Async functions return typed Promises
  - Example: `async function loadMemoryIndex(vault: Vault): Promise<{...}>`

## Module Design

**Exports:**
- Default export for plugin class: `export default class ClaudeMemoryPlugin`
- Named exports for utilities and views
  - Example: `export function parseMemoryFile(...)`
  - Example: `export class DashboardView extends ItemView`
  - Example: `export const DASHBOARD_VIEW_TYPE = 'claude-memory-dashboard'`

**Module Responsibilities:**
- `src/main.ts`: Plugin entry point and lifecycle management
- `src/types.ts`: All type definitions and constants
- `src/parser.ts`: Frontmatter parsing and file indexing
- `src/commands/commands.ts`: Modal-based command implementations
- `src/views/`: Obsidian view implementations (render methods)
- `src/sidebar/`: Sidebar view specific rendering
- `src/sync/`: File system change tracking

**File Organization:**
- Related functionality grouped by feature (commands, views, sidebar, sync)
- Shared types centralized in `types.ts`
- Parsing utilities in `parser.ts`

---

*Convention analysis: 2026-04-13*
