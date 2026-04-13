import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import type { MemoryFile, SessionFile, StreamFile, BaseFile } from '../types';

export const DASHBOARD_VIEW_TYPE = 'claude-memory-dashboard';

export class DashboardView extends ItemView {
  private plugin: ClaudeMemoryPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeMemoryPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Claude Memory';
  }

  getIcon(): string {
    return 'brain';
  }

  async onOpen() {
    await this.render();
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-dashboard');

    const { memories, sessions, streams, bases } = await loadMemoryIndex(this.app.vault);

    const header = container.createDiv({ cls: 'cm-dashboard-header' });
    header.createEl('h2', { text: 'Claude Memory' });
    const stats = header.createDiv({ cls: 'cm-stats' });
    stats.createSpan({ text: `${bases.length} баз` });
    stats.createSpan({ text: ` · ${streams.length} потоков` });
    stats.createSpan({ text: ` · ${sessions.length} сессий` });
    stats.createSpan({ text: ` · ${memories.length} записей` });

    const grid = container.createDiv({ cls: 'cm-dashboard-grid' });
    if (bases.length > 0) {
      grid.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
    }

    if (bases.length > 0) {
      this.renderBasesColumn(grid, bases, sessions);
    }
    this.renderStreamsColumn(grid, streams);
    this.renderSessionsColumn(grid, sessions.slice(0, 10));
    this.renderMemoriesColumn(grid, memories);
  }

  private renderStreamsColumn(parent: HTMLElement, streams: StreamFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Потоки' });

    const active = streams.filter((s) => s.status === 'active' || s.status === 'paused');
    const complete = streams.filter((s) => s.status === 'complete');

    for (const stream of [...active, ...complete]) {
      const item = col.createDiv({ cls: `cm-item cm-stream cm-status-${stream.status}` });
      const badge = item.createSpan({ cls: 'cm-badge' });
      badge.setText(stream.status);
      item.createSpan({ cls: 'cm-item-name', text: stream.name });

      item.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(stream.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }

    if (streams.length === 0) {
      col.createDiv({ cls: 'cm-empty', text: 'Нет потоков' });
    }
  }

  private renderSessionsColumn(parent: HTMLElement, sessions: SessionFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Последние сессии' });

    for (const session of sessions) {
      const item = col.createDiv({ cls: 'cm-item cm-session' });
      const date = item.createSpan({ cls: 'cm-date' });
      date.setText(session.date.slice(0, 10));
      item.createSpan({ cls: 'cm-item-name', text: session.name });

      if (session.streams.length > 0) {
        const tags = item.createDiv({ cls: 'cm-tags' });
        for (const s of session.streams) {
          tags.createSpan({ cls: 'cm-tag', text: s });
        }
      }

      item.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(session.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }

    if (sessions.length === 0) {
      col.createDiv({ cls: 'cm-empty', text: 'Нет сессий' });
    }
  }

  private renderBasesColumn(parent: HTMLElement, bases: BaseFile[], sessions: SessionFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Базы' });

    for (const base of bases) {
      const card = col.createDiv({ cls: 'cm-item cm-base' });
      card.createSpan({ cls: 'cm-item-name', text: base.name });
      card.createSpan({ cls: 'cm-item-desc', text: base.description });

      const baseName = base.name;
      const baseSessions = sessions.filter((s) =>
        s.bases.some((b) => b.includes(baseName))
      );
      if (baseSessions.length > 0) {
        const info = card.createDiv({ cls: 'cm-tags' });
        info.createSpan({ cls: 'cm-tag', text: `${baseSessions.length} сессий` });
        const lastSession = baseSessions[0];
        if (lastSession) {
          info.createSpan({ cls: 'cm-tag', text: lastSession.date.slice(0, 10) });
        }
      }

      if (base.tags.length > 0) {
        const tags = card.createDiv({ cls: 'cm-tags' });
        for (const tag of base.tags) {
          tags.createSpan({ cls: 'cm-tag', text: tag });
        }
      }

      card.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(base.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }
  }

  private renderMemoriesColumn(parent: HTMLElement, memories: MemoryFile[]) {
    const col = parent.createDiv({ cls: 'cm-column' });
    col.createEl('h3', { text: 'Память' });

    const groups: Record<string, MemoryFile[]> = {};
    for (const mem of memories) {
      const group = groups[mem.type] || (groups[mem.type] = []);
      group.push(mem);
    }

    const typeLabels: Record<string, string> = {
      user: 'Пользователь',
      feedback: 'Фидбэк',
      project: 'Проект',
      reference: 'Справка',
    };

    for (const [type, items] of Object.entries(groups)) {
      col.createEl('h4', { text: typeLabels[type] || type });
      for (const mem of items) {
        const item = col.createDiv({ cls: 'cm-item cm-memory' });
        item.createSpan({ cls: 'cm-item-name', text: mem.name });
        item.createSpan({ cls: 'cm-item-desc', text: mem.description });

        item.addEventListener('click', () => {
          const file = this.app.vault.getAbstractFileByPath(mem.path);
          if (file) {
            this.app.workspace.getLeaf('tab').openFile(file as any);
          }
        });
      }
    }

    if (memories.length === 0) {
      col.createDiv({ cls: 'cm-empty', text: 'Нет записей' });
    }
  }
}
