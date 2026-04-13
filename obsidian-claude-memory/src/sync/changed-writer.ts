import { TFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, CHANGED_FILE } from '../types';

const POLL_INTERVAL = 2000; // check every 2 seconds

export class ChangedWriter {
  private plugin: ClaudeMemoryPlugin;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private knownFiles: Map<string, number> = new Map(); // path -> mtime

  constructor(plugin: ClaudeMemoryPlugin) {
    this.plugin = plugin;
  }

  async start() {
    // Snapshot current state using adapter (filesystem-level)
    await this.snapshotCurrentState(CLAUDE_MEMORY_DIR);

    // Poll for external FS changes that Obsidian vault events miss
    this.pollTimer = setInterval(() => this.pollForChanges(), POLL_INTERVAL);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async snapshotCurrentState(dir: string) {
    const adapter = this.plugin.app.vault.adapter;
    const exists = await adapter.exists(dir);
    if (!exists) return;

    const listing = await adapter.list(dir);

    for (const filePath of listing.files) {
      const stat = await adapter.stat(filePath);
      if (stat) {
        this.knownFiles.set(filePath, stat.mtime);
      }
    }

    for (const folderPath of listing.folders) {
      await this.snapshotCurrentState(folderPath);
    }
  }

  private async pollForChanges() {
    const adapter = this.plugin.app.vault.adapter;
    const exists = await adapter.exists(CLAUDE_MEMORY_DIR);
    if (!exists) return;

    const currentFiles = new Map<string, number>();
    await this.collectFilesFromAdapter(CLAUDE_MEMORY_DIR, currentFiles);

    const changedPaths: string[] = [];

    for (const [path, mtime] of currentFiles) {
      if (path.endsWith(CHANGED_FILE)) continue;

      const knownMtime = this.knownFiles.get(path);
      if (knownMtime === undefined || knownMtime < mtime) {
        changedPaths.push(path);
      }
    }

    if (changedPaths.length > 0) {
      // Update known state
      for (const [path, mtime] of currentFiles) {
        this.knownFiles.set(path, mtime);
      }

      // Trigger session guardian
      const guardian = this.plugin.sessionGuardian;
      if (guardian) {
        await guardian.ensureTodaySession();
      }

      // Write .changed file
      await this.writeChangedFile(changedPaths);
    }
  }

  private async collectFilesFromAdapter(dir: string, map: Map<string, number>) {
    const adapter = this.plugin.app.vault.adapter;
    const listing = await adapter.list(dir);

    for (const filePath of listing.files) {
      const stat = await adapter.stat(filePath);
      if (stat) {
        map.set(filePath, stat.mtime);
      }
    }

    for (const folderPath of listing.folders) {
      await this.collectFilesFromAdapter(folderPath, map);
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
