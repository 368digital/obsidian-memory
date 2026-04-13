import { TFile, EventRef } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, CHANGED_FILE } from '../types';

export class ChangedWriter {
  private plugin: ClaudeMemoryPlugin;
  private eventRef: EventRef | null = null;
  private pendingPaths: Set<string> = new Set();
  private writeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(plugin: ClaudeMemoryPlugin) {
    this.plugin = plugin;
  }

  start() {
    this.eventRef = this.plugin.app.vault.on('modify', (file) => {
      if (!(file instanceof TFile)) return;
      if (!file.path.startsWith(CLAUDE_MEMORY_DIR + '/')) return;
      if (file.path.endsWith(CHANGED_FILE)) return;

      this.pendingPaths.add(file.path);
      this.scheduleWrite();
    });

    this.plugin.registerEvent(this.eventRef);
  }

  stop() {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    this.pendingPaths.clear();
  }

  private scheduleWrite() {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    this.writeTimeout = setTimeout(() => this.writeChangedFile(), 500);
  }

  private async writeChangedFile() {
    if (this.pendingPaths.size === 0) return;

    const changedPath = `${CLAUDE_MEMORY_DIR}/${CHANGED_FILE}`;
    const content = [...this.pendingPaths].join('\n') + '\n';

    const existing = this.plugin.app.vault.getAbstractFileByPath(changedPath);
    if (existing && existing instanceof TFile) {
      const current = await this.plugin.app.vault.read(existing);
      const merged = new Set([
        ...current.trim().split('\n').filter(Boolean),
        ...this.pendingPaths,
      ]);
      await this.plugin.app.vault.modify(existing, [...merged].join('\n') + '\n');
    } else {
      await this.plugin.app.vault.create(changedPath, content);
    }

    this.pendingPaths.clear();
  }
}
