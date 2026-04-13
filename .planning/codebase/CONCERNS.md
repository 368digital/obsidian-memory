# Codebase Concerns

**Analysis Date:** 2026-04-13

## Tech Debt

**Unsafe file type casting in views:**
- Issue: Multiple locations use `file as any` to suppress TypeScript type checking when opening files
- Files: `src/views/DashboardView.ts` (lines 69, 99, 136), `src/views/TimelineView.ts` (line 93)
- Impact: Type safety is bypassed; if a file is not actually a TFile, the code will fail at runtime without warning
- Fix approach: Check if file is instanceof TFile before calling openFile, or properly type the return value from getAbstractFileByPath

**Regex-based frontmatter mutations in commands:**
- Issue: Stream linking uses fragile regex patterns to modify YAML frontmatter
- Files: `src/commands/commands.ts` lines 241-247
- Impact: Brittle edits to frontmatter can produce malformed YAML if content structure varies slightly
- Fix approach: Parse frontmatter into structured data, modify object, serialize back to YAML

**No error handling for vault operations:**
- Issue: All file reads, writes, and creates lack try-catch blocks
- Files: `src/commands/commands.ts`, `src/sync/changed-writer.ts`, `src/views/*.ts`
- Impact: Plugin will crash if vault operations fail (insufficient permissions, concurrent modifications, disk issues)
- Fix approach: Wrap all vault operations in try-catch, provide user feedback via Notice on failure

**Parser assumes well-formed frontmatter:**
- Issue: Frontmatter parser in `src/parser.ts` uses custom regex matching instead of robust YAML parsing
- Files: `src/parser.ts` lines 12-67
- Impact: Edge cases like quotes in values, colons in content, multi-line strings will break parsing
- Fix approach: Use a YAML parsing library (e.g., js-yaml) instead of custom regex

**No validation of parsed metadata:**
- Issue: Type assertions assume frontmatter contains expected fields without validation
- Files: `src/parser.ts` lines 84-124
- Impact: Missing or malformed metadata silently defaults to empty/invalid values; downstream code fails unexpectedly
- Fix approach: Validate parsed metadata against schema before returning, throw or log errors for invalid data

## Known Bugs

**Dashboard doesn't refresh on external file changes:**
- Symptoms: Editing file in text editor (not through plugin) doesn't update dashboard display
- Files: `src/views/DashboardView.ts`, `src/views/TimelineView.ts`
- Trigger: Edit a memory/session/stream file directly in Obsidian and switch back to dashboard
- Workaround: Manually re-open dashboard or reload Obsidian

**Link Streams modal can add duplicate relations:**
- Symptoms: Running "Link Streams" multiple times with same parameters creates duplicate entries in `related:` array
- Files: `src/commands/commands.ts` lines 235-249
- Trigger: Open Link Streams modal, select same pair of streams, click Link twice
- Workaround: Manually remove duplicate entries from frontmatter before re-linking

**Archive Stream replaces earliest match instead of latest:**
- Symptoms: If status field appears multiple times in file, only first occurrence is replaced
- Files: `src/commands/commands.ts` line 273
- Trigger: Manual file edits that duplicate frontmatter, then archive command
- Workaround: Keep frontmatter clean; don't manually edit status field

**Priority toggle inserts without frontmatter boundary check:**
- Symptoms: `setContextPriority` replaces first `---\n` which might not be closing frontmatter delimiter
- Files: `src/commands/commands.ts` line 295
- Trigger: File with content containing `---` outside frontmatter
- Workaround: Avoid `---` in markdown content body

## Security Considerations

**No input sanitization for frontmatter generation:**
- Risk: User input from modal dialogs is directly interpolated into YAML without escaping
- Files: `src/commands/commands.ts` lines 92, 160, 240
- Current mitigation: Obsidian vault is typically local; low network exposure
- Recommendations: Escape quotes and special chars in user input before YAML generation; validate all modal inputs

**Unvalidated wikilinks in memory files:**
- Risk: If wikilink syntax is manually typed as user input, could reference arbitrary files
- Files: `src/commands/commands.ts` line 240
- Current mitigation: User-facing links stay within claude-memory/ directory
- Recommendations: Validate that linked streams actually exist before saving

**Vault file operations without permission checks:**
- Risk: Plugin assumes write access to vault; no graceful handling if vault is read-only or permissions change
- Files: `src/commands/commands.ts` (all create/modify), `src/sync/changed-writer.ts`
- Current mitigation: Plugin silently fails; user must reload
- Recommendations: Check vault write permissions on load; inform user of any permission issues

## Performance Bottlenecks

**Full memory index reload on every view render:**
- Problem: DashboardView, TimelineView, and SidebarView all call `loadMemoryIndex()` which reads all markdown files in claude-memory/
- Files: `src/views/DashboardView.ts` line 37, `src/views/TimelineView.ts` line 43, `src/sidebar/SidebarView.ts` line 55
- Cause: No caching of parsed data; re-parsing all files on every render including after minor changes
- Improvement path: Cache index with invalidation on file modification events; lazy-load only displayed data

**Parser processes entire file content for wikilinks extraction:**
- Problem: `extractWikilinks()` regex scans all file content even when only metadata matters
- Files: `src/parser.ts` lines 70-73, called from parseMemoryFile/parseSessionFile/parseStreamFile
- Cause: Wikilinks extracted in body AND frontmatter; body content often not needed
- Improvement path: Separate metadata extraction from content extraction; only scan body if needed

**Changed writer merges entire file into memory:**
- Problem: ChangedWriter reads entire `.changed` file, merges with pending paths, writes full file back
- Files: `src/sync/changed-writer.ts` lines 50-55
- Cause: No streaming or append-only semantics; each change rewrites entire tracking file
- Improvement path: Use append-only log or Obsidian's native event system for change tracking

**No lazy loading in dashboard columns:**
- Problem: DashboardView renders all memories, all sessions, all streams upfront
- Files: `src/views/DashboardView.ts` lines 46-50
- Cause: Three-column grid displays full lists; sessions limited to 10 but memories and streams are all shown
- Improvement path: Pagination or virtual scrolling; load more on scroll

## Fragile Areas

**LinkStreamsModal text replacement for related array:**
- Files: `src/commands/commands.ts` lines 241-247
- Why fragile: Regex assumes specific YAML structure; if user has edited related array manually or formatted differently, replacement patterns fail silently
- Safe modification: Parse YAML, add relation to array, serialize back; validate syntax before writing
- Test coverage: No test for malformed existing related array; no test for nested structure variants

**Frontmatter parser custom regex:**
- Files: `src/parser.ts` lines 12-67
- Why fragile: Handles YAML-like syntax but not actual YAML; edge cases like quoted strings with colons, escaped quotes, multi-line values break parsing
- Safe modification: Before changes, establish test cases for all frontmatter variants in existing memory files
- Test coverage: No tests visible; likely only tested with clean manually-created files

**getAbstractFileByPath null checks:**
- Files: `src/views/DashboardView.ts` lines 67-71, 97-101, 134-138
- Why fragile: File path might become invalid if vault structure changes or files are deleted between index load and click
- Safe modification: Add null guard; show error notice instead of failing
- Test coverage: No simulated file deletion test

**Archive command regex assumption:**
- Files: `src/commands/commands.ts` lines 272-275
- Why fragile: Assumes status appears after started field; if frontmatter reordered or duplicated, behavior is wrong
- Safe modification: Parse entire frontmatter first, update status field in map, serialize
- Test coverage: Only tested with auto-generated files; not tested with manually edited frontmatter

## Scaling Limits

**Memory index loads all files for every view render:**
- Current capacity: Vault with ~100 memory files loads fully each render
- Limit: As vault grows beyond 500 files, view rendering will visibly lag
- Scaling path: Implement lazy loading; cache parsed index; use Obsidian's metadataCache API instead of manual parsing

**Parser regex operations scale linearly:**
- Current capacity: Supports up to ~50 KB of content per file without noticeable delay
- Limit: Large session files (>100 KB) with complex nested arrays will be slow to parse
- Scaling path: Switch to proper YAML parser; consider separate storage for binary metadata

**Plugin UI renders all streams in picker:**
- Current capacity: Timeline stream picker renders ~20 streams comfortably
- Limit: Beyond 100 active/archived streams, UI becomes slow to filter and interact with
- Scaling path: Implement dropdown search or tree view instead of full list

## Dependencies at Risk

**Obsidian API version pinning:**
- Risk: manifest.json specifies minAppVersion 1.4.0 but no maxAppVersion; newer Obsidian breaking changes could break plugin
- Impact: Plugin may stop working with newer Obsidian releases
- Migration plan: Add CI tests against multiple Obsidian versions; subscribe to breaking change announcements; consider API wrapper

**No production build verification:**
- Risk: Package.json has `"build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"` but skipLibCheck hides type errors
- Impact: Runtime type errors in production build if dependencies' types are wrong
- Migration plan: Remove skipLibCheck; establish pre-release test checklist; test actual plugin in Obsidian

## Missing Critical Features

**No conflict handling for concurrent edits:**
- Problem: If user edits memory file outside of plugin while plugin writes, merge conflict not detected
- Blocks: Reliability in multi-device scenarios; safe collaborative editing

**No rollback or undo for vault modifications:**
- Problem: Commands (archive, set context, link) modify files without tracking changes history
- Blocks: Users cannot revert accidental command execution without manual git/undo

**No validation of stream/memory paths in references:**
- Problem: Wikilinks to non-existent streams/memories silently fail to update related arrays
- Blocks: Referential integrity of cross-references

**No export/import of memory vault:**
- Problem: All memory stored in local `.claude-memory/` directory; no backup or migration facility
- Blocks: Portability to new projects or team sharing

## Test Coverage Gaps

**Frontmatter parsing:**
- What's not tested: Edge cases in YAML parsing (escaped quotes, colons in values, multi-line strings)
- Files: `src/parser.ts`
- Risk: Malformed frontmatter from various sources (manual edits, script generation) could break indexing
- Priority: High

**File operations error paths:**
- What's not tested: Behavior when files are deleted, read-only, or vault is locked
- Files: `src/views/*.ts`, `src/commands/commands.ts`, `src/sync/changed-writer.ts`
- Risk: Plugin crashes or hangs without user feedback
- Priority: High

**Modal input validation:**
- What's not tested: Special characters, very long strings, empty fields in modal dialogs
- Files: `src/commands/commands.ts` (all Modal classes)
- Risk: User input can produce invalid YAML or file paths
- Priority: Medium

**Concurrent view rendering:**
- What's not tested: Multiple views rendering simultaneously or rapid refresh cycles
- Files: `src/views/*.ts`, `src/sidebar/SidebarView.ts`
- Risk: Race conditions in index loading; UI showing stale data
- Priority: Medium

**Wikilink extraction:**
- What's not tested: Various wikilink formats (with aliases, with anchors, malformed)
- Files: `src/parser.ts` line 70-73
- Risk: Cross-references not properly detected if format varies
- Priority: Low

---

*Concerns audit: 2026-04-13*
