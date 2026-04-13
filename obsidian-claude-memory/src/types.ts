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
  bases: string[];
  continues: string;
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

export interface BaseFile {
  path: string;
  name: string;
  description: string;
  paths: string[];
  tags: string[];
  created: string;
  content: string;
  wikilinks: string[];
}

export type ClaudeMemoryFile = MemoryFile | SessionFile | StreamFile | BaseFile;

export interface MemoryIndex {
  memories: MemoryFile[];
  sessions: SessionFile[];
  streams: StreamFile[];
  bases: BaseFile[];
}

export const CLAUDE_MEMORY_DIR = 'claude-memory';
export const MEMORIES_DIR = 'memories';
export const SESSIONS_DIR = 'sessions';
export const STREAMS_DIR = 'streams';
export const GRAPH_DIR = 'graph';
export const BASES_DIR = 'bases';
export const CHANGED_FILE = '.changed';
export const MEMORY_INDEX = 'MEMORY.md';
