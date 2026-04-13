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

### Step 2.5: Read bases and ask for selection
- Glob `claude-memory/bases/*.md`
- Read all base files (usually few — 2-10 files)
- Present bases list to user and ask: "К какой базе относится эта работа?"
  - Show numbered list with base names and descriptions
  - User can select one or multiple, or say "Новая база"
- If "Новая база": ask for name and description, create the base file
- Read chronology of selected bases — this is the current state context
- Determine `continues`: find the last session in the selected base(s), suggest it

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
