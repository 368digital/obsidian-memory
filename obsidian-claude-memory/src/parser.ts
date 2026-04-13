import { TFile, Vault } from 'obsidian';
import {
  MemoryFile,
  SessionFile,
  StreamFile,
  CLAUDE_MEMORY_DIR,
  MEMORIES_DIR,
  SESSIONS_DIR,
  STREAMS_DIR,
} from './types';

export function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, unknown> = {};
  const lines = match[1].split('\n');

  let currentKey = '';
  let currentArray: unknown[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') && currentKey) {
      if (!currentArray) {
        currentArray = [];
        meta[currentKey] = currentArray;
      }
      const val = trimmed.slice(2).trim();
      if (val.includes(': ')) {
        const obj: Record<string, string> = {};
        const parts = val.split(/,\s*/);
        for (const part of parts) {
          const colonIdx = part.indexOf(': ');
          if (colonIdx > 0) {
            const k = part.slice(0, colonIdx).trim();
            const v = part.slice(colonIdx + 2).trim().replace(/^["']|["']$/g, '');
            obj[k] = v;
          }
        }
        currentArray.push(obj);
      } else {
        currentArray.push(val.replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      currentArray = null;
      const val = kvMatch[2].trim();
      if (val === '' || val === '[]') {
        meta[currentKey] = val === '[]' ? [] : '';
      } else if (val.startsWith('[') && val.endsWith(']')) {
        meta[currentKey] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        meta[currentKey] = val.replace(/^["']|["']$/g, '');
      }
    }
  }

  return { meta, body: match[2] };
}

export function extractWikilinks(content: string): string[] {
  const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
  return [...matches].map((m) => m[1]);
}

export function getFileCategory(path: string): 'memory' | 'session' | 'stream' | 'graph' | 'index' | 'unknown' {
  if (path.endsWith('MEMORY.md')) return 'index';
  if (path.includes(`${MEMORIES_DIR}/`)) return 'memory';
  if (path.includes(`${SESSIONS_DIR}/`)) return 'session';
  if (path.includes(`${STREAMS_DIR}/`)) return 'stream';
  if (path.includes('graph/')) return 'graph';
  return 'unknown';
}

export function parseMemoryFile(path: string, content: string): MemoryFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: (meta.name as string) || path.split('/').pop()?.replace('.md', '') || '',
    description: (meta.description as string) || '',
    type: (meta.type as MemoryFile['type']) || 'project',
    content: body,
    wikilinks: extractWikilinks(content),
  };
}

export function parseSessionFile(path: string, content: string): SessionFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: path.split('/').pop()?.replace('.md', '') || '',
    date: (meta.date as string) || '',
    duration: (meta.duration as string) || '',
    streams: (meta.streams as string[]) || [],
    status: (meta.status as SessionFile['status']) || 'completed',
    content: body,
    wikilinks: extractWikilinks(content),
  };
}

export function parseStreamFile(path: string, content: string): StreamFile {
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: (meta.name as string) || path.split('/').pop()?.replace('.md', '') || '',
    type: (meta.type as StreamFile['type']) || 'gsd-phase',
    phase: meta.phase as string | undefined,
    status: (meta.status as StreamFile['status']) || 'active',
    started: (meta.started as string) || '',
    completed: meta.completed as string | undefined,
    related: (meta.related as StreamFile['related']) || [],
    content: body,
    wikilinks: extractWikilinks(content),
  };
}

export async function loadMemoryIndex(vault: Vault): Promise<{
  memories: MemoryFile[];
  sessions: SessionFile[];
  streams: StreamFile[];
}> {
  const memories: MemoryFile[] = [];
  const sessions: SessionFile[] = [];
  const streams: StreamFile[] = [];

  const files = vault.getMarkdownFiles().filter((f) => f.path.startsWith(CLAUDE_MEMORY_DIR + '/'));

  for (const file of files) {
    const content = await vault.cachedRead(file);
    const category = getFileCategory(file.path);

    switch (category) {
      case 'memory':
        memories.push(parseMemoryFile(file.path, content));
        break;
      case 'session':
        sessions.push(parseSessionFile(file.path, content));
        break;
      case 'stream':
        streams.push(parseStreamFile(file.path, content));
        break;
    }
  }

  sessions.sort((a, b) => b.date.localeCompare(a.date));

  return { memories, sessions, streams };
}
