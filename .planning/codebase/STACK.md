# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript 5.8.0 - Main plugin development language

**Supporting:**
- JavaScript (ESM) - Configuration and build scripts

## Runtime

**Environment:**
- Node.js (implied by esbuild/npm usage)

**Target Runtime:**
- Obsidian Desktop/Web via CommonJS bundling
- ES2018 target for compatibility

**Package Manager:**
- npm (via package-lock.json)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Obsidian API (latest) - Plugin framework and Vault/App interfaces
  - Provides: Plugin base class, WorkspaceLeaf, ItemView, Modal, Settings, EventRef
  - Used in: `src/main.ts`, all view files, command handlers

**Build/Dev:**
- esbuild 0.25.0 - Bundling and minification
  - Config: `esbuild.config.mjs`
  - Format: CommonJS output
  - Features: Tree shaking, inline source maps (dev mode)
- TypeScript 5.8.0 - Type checking and transpilation
  - Config: `tsconfig.json`
  - Runs via npm script: `tsc -noEmit -skipLibCheck`

## Key Dependencies

**Critical:**
- obsidian (latest) - Only production dependency
  - Core imports: `Plugin`, `WorkspaceLeaf`, `ItemView`, `Modal`, `TFile`, `Vault`, `Notice`, `Setting`, `App`, `EventRef`
  - Used for: Plugin lifecycle, views, modals, vault operations, event handling

**Dev Only:**
- @types/node ^22.0.0 - Node type definitions
- esbuild ^0.25.0 - Module bundler
- typescript ^5.8.0 - TypeScript compiler

## External Modules (Bundled)

The esbuild config marks these as external and assumes they're provided by Obsidian runtime:

**CodeMirror integration:**
- @codemirror/autocomplete
- @codemirror/collab
- @codemirror/commands
- @codemirror/language
- @codemirror/lint
- @codemirror/search
- @codemirror/state
- @codemirror/view

**Lezer parser:**
- @lezer/common
- @lezer/highlight
- @lezer/lr

**Electron:**
- electron (Obsidian desktop environment)

## Configuration

**TypeScript Configuration:**
- Config file: `tsconfig.json`
- Target: ES2018
- Module: ESNext
- Strict null checks: enabled
- Inline source maps: enabled
- Source: `src/**/*.ts`

**Build Configuration:**
- Entry point: `src/main.ts`
- Output: `main.js` (CommonJS)
- Source maps: inline (dev), none (production)
- Watch mode: enabled for `npm run dev`
- Production mode: `npm run build`

**Bundler Setup:**
- Format: CommonJS (required for Obsidian)
- Target: es2018
- Tree shaking: enabled
- External modules: CodeMirror, Lezer, electron, obsidian

## Platform Requirements

**Development:**
- Node.js (version unspecified, likely 16+)
- npm (comes with Node.js)
- Obsidian installation for local plugin dev

**Production:**
- Obsidian >= 1.4.0 (minAppVersion in manifest.json)
- No external services required
- Local file system access via Obsidian Vault API

## Plugin Metadata

**Plugin Information:**
- ID: obsidian-claude-memory
- Name: Claude Memory
- Version: 0.1.0
- Minimum Obsidian: 1.4.0
- Desktop-only: false (works on web too)
- Author: trishevae

## Build Outputs

**Main:**
- `main.js` - Bundled plugin (generated)

**Source Maps:**
- Inline in dev mode for debugging
- Excluded in production

---

*Stack analysis: 2026-04-13*
