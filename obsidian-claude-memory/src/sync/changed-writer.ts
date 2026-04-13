import { TFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, SESSIONS_DIR, CHANGED_FILE } from '../types';

const POLL_INTERVAL = 2000; // check every 2 seconds
const IGNORED_DIRS = ['.obsidian', 'node_modules', '.git'];
const SESSIONS_PATH = `${CLAUDE_MEMORY_DIR}/${SESSIONS_DIR}`;

export interface ChangeEvent {
  path: string;
  action: 'create' | 'modify' | 'delete';
}

export type ChangeListener = (events: ChangeEvent[]) => void;

export class ChangedWriter {
  private plugin: ClaudeMemoryPlugin;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private knownFiles: Map<string, number> = new Map(); // path -> mtime
  private listeners: ChangeListener[] = [];

  constructor(plugin: ClaudeMemoryPlugin) {
    this.plugin = plugin;
  }

  onExternalChange(listener: ChangeListener) {
    this.listeners.push(listener);
    console.log('[ChangedWriter] listener registered, total:', this.listeners.length);
  }

  async start() {
    // Snapshot entire vault state (excluding ignored dirs)
    await this.snapshotCurrentState('');
    console.log('[ChangedWriter] started, tracking', this.knownFiles.size, 'files');

    // Poll for external FS changes that Obsidian vault events miss
    this.pollTimer = setInterval(() => this.pollForChanges(), POLL_INTERVAL);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private isIgnored(path: string): boolean {
    return IGNORED_DIRS.some(d => path === d || path.startsWith(d + '/'));
  }

  private async snapshotCurrentState(dir: string) {
    const adapter = this.plugin.app.vault.adapter;
    if (dir && !await adapter.exists(dir)) return;

    const listing = await adapter.list(dir);

    for (const filePath of listing.files) {
      if (this.isIgnored(filePath)) continue;
      const stat = await adapter.stat(filePath);
      if (stat) {
        this.knownFiles.set(filePath, stat.mtime);
      }
    }

    for (const folderPath of listing.folders) {
      if (this.isIgnored(folderPath)) continue;
      await this.snapshotCurrentState(folderPath);
    }
  }

  private async pollForChanges() {
    try {
      const currentFiles = new Map<string, number>();
      await this.collectFilesFromAdapter('', currentFiles);

      const events: ChangeEvent[] = [];

      // Detect new and modified files
      for (const [path, mtime] of currentFiles) {
        if (path.endsWith(CHANGED_FILE)) continue;

        const knownMtime = this.knownFiles.get(path);
        if (knownMtime === undefined) {
          events.push({ path, action: 'create' });
        } else if (knownMtime < mtime) {
          events.push({ path, action: 'modify' });
        }
      }

      // Detect deleted files
      for (const [path] of this.knownFiles) {
        if (path.endsWith(CHANGED_FILE)) continue;
        if (!currentFiles.has(path)) {
          events.push({ path, action: 'delete' });
        }
      }

      if (events.length > 0) {
        console.log('[ChangedWriter] detected', events.length, 'changes:', events.map(e => `${e.action}:${e.path}`));

        // Update known state: add/update current, remove deleted
        this.knownFiles.clear();
        for (const [path, mtime] of currentFiles) {
          this.knownFiles.set(path, mtime);
        }

        // Trigger session guardian
        const guardian = this.plugin.sessionGuardian;
        if (guardian) {
          await guardian.ensureTodaySession();
        }

        // Notify listeners (sidebar log)
        for (const listener of this.listeners) {
          listener(events);
        }

        // Append project file changes to active session
        await this.appendToActiveSession(events);

        // Write .changed file (only for non-delete events)
        const changedPaths = events.filter(e => e.action !== 'delete').map(e => e.path);
        if (changedPaths.length > 0) {
          await this.writeChangedFile(changedPaths);
        }
      }
    } catch (err) {
      console.error('[ChangedWriter] poll error:', err);
    }
  }

  private async collectFilesFromAdapter(dir: string, map: Map<string, number>) {
    const adapter = this.plugin.app.vault.adapter;
    if (dir && !await adapter.exists(dir)) return;
    const listing = await adapter.list(dir);

    for (const filePath of listing.files) {
      if (this.isIgnored(filePath)) continue;
      const stat = await adapter.stat(filePath);
      if (stat) {
        map.set(filePath, stat.mtime);
      }
    }

    for (const folderPath of listing.folders) {
      if (this.isIgnored(folderPath)) continue;
      await this.collectFilesFromAdapter(folderPath, map);
    }
  }

  private async appendToActiveSession(events: ChangeEvent[]) {
    // Only track project files (outside claude-memory/)
    const projectEvents = events.filter(e => !e.path.startsWith(CLAUDE_MEMORY_DIR + '/') && !e.path.startsWith(CLAUDE_MEMORY_DIR));
    if (projectEvents.length === 0) return;

    try {
      const adapter = this.plugin.app.vault.adapter;
      const sessionsExist = await adapter.exists(SESSIONS_PATH);
      if (!sessionsExist) return;

      const listing = await adapter.list(SESSIONS_PATH);
      // Find in_progress session (newest first)
      let activeSessionPath: string | null = null;
      for (const filePath of listing.files.sort().reverse()) {
        if (!filePath.endsWith('.md')) continue;
        const content = await adapter.read(filePath);
        if (content.includes('status: in_progress')) {
          activeSessionPath = filePath;
          break;
        }
      }

      if (!activeSessionPath) return;

      const content = await adapter.read(activeSessionPath);
      const actionLabels: Record<string, string> = { create: 'NEW', modify: 'UPD', delete: 'DEL' };

      // Build new entries with [[wikilinks]]
      const newEntries = projectEvents.map(e => {
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return `- \`${actionLabels[e.action]}\` [[${e.path}]] (${time})`;
      });

      // Check if section exists, append or create
      if (content.includes('## Затронутые файлы')) {
        // Append to existing section — find the section and add before next ## or end
        const sectionIdx = content.indexOf('## Затронутые файлы');
        const afterSection = content.indexOf('\n## ', sectionIdx + 1);
        const insertPos = afterSection !== -1 ? afterSection : content.length;
        const updated = content.slice(0, insertPos).trimEnd() + '\n' + newEntries.join('\n') + '\n' + (afterSection !== -1 ? '\n' + content.slice(afterSection) : '');
        await adapter.write(activeSessionPath, updated);
      } else {
        // Add section at the end
        const updated = content.trimEnd() + '\n\n## Затронутые файлы\n\n' + newEntries.join('\n') + '\n';
        await adapter.write(activeSessionPath, updated);
      }

      console.log('[ChangedWriter] appended', projectEvents.length, 'file changes to session:', activeSessionPath);
    } catch (err) {
      console.error('[ChangedWriter] failed to append to session:', err);
    }
  }

  private async writeChangedFile(paths: string[]) {
    const changedPath = `${CLAUDE_MEMORY_DIR}/${CHANGED_FILE}`;
    const adapter = this.plugin.app.vault.adapter;

    const exists = await adapter.exists(changedPath);
    if (exists) {
      const current = await adapter.read(changedPath);
      const merged = new Set([
        ...current.trim().split('\n').filter(Boolean),
        ...paths,
      ]);
      await adapter.write(changedPath, [...merged].join('\n') + '\n');
    } else {
      await adapter.write(changedPath, paths.join('\n') + '\n');
    }
  }
}
