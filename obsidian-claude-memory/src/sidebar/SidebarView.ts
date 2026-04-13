import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import { CLAUDE_MEMORY_DIR } from '../types';

export const SIDEBAR_VIEW_TYPE = 'claude-memory-sidebar';

type Filter = 'all' | 'active' | 'archived';

export class SidebarView extends ItemView {
  private plugin: ClaudeMemoryPlugin;
  private filter: Filter = 'all';

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeMemoryPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SIDEBAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Claude Memory';
  }

  getIcon(): string {
    return 'brain';
  }

  async onOpen() {
    await this.render();

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.path.startsWith(CLAUDE_MEMORY_DIR)) {
          this.render();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (file.path.startsWith(CLAUDE_MEMORY_DIR)) {
          this.render();
        }
      })
    );
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-sidebar');

    const { memories, sessions, streams } = await loadMemoryIndex(this.app.vault);

    const filterBar = container.createDiv({ cls: 'cm-filter-bar' });
    for (const f of ['all', 'active', 'archived'] as Filter[]) {
      const btn = filterBar.createEl('button', {
        cls: `cm-filter-btn ${this.filter === f ? 'cm-active' : ''}`,
        text: f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Архив',
      });
      btn.addEventListener('click', () => {
        this.filter = f;
        this.render();
      });
    }

    const counts = container.createDiv({ cls: 'cm-sidebar-counts' });
    counts.setText(`${memories.length} памяти · ${sessions.length} сессий · ${streams.length} потоков`);

    const filteredStreams = streams.filter((s) => {
      if (this.filter === 'active') return s.status === 'active' || s.status === 'paused';
      if (this.filter === 'archived') return s.status === 'complete';
      return true;
    });

    if (filteredStreams.length > 0) {
      this.renderSection(container, 'Потоки', filteredStreams.map((s) => ({
        name: s.name,
        path: s.path,
        badge: s.status,
        badgeClass: `cm-status-${s.status}`,
      })));
    }

    if (this.filter !== 'archived') {
      this.renderSection(container, 'Сессии', sessions.slice(0, 10).map((s) => ({
        name: s.name,
        path: s.path,
        badge: s.date.slice(0, 10),
        badgeClass: 'cm-date-badge',
      })));
    }

    if (this.filter !== 'archived') {
      this.renderSection(container, 'Память', memories.map((m) => ({
        name: m.name,
        path: m.path,
        badge: m.type,
        badgeClass: `cm-type-${m.type}`,
      })));
    }
  }

  private renderSection(
    parent: HTMLElement,
    title: string,
    items: Array<{ name: string; path: string; badge: string; badgeClass: string }>
  ) {
    const section = parent.createDiv({ cls: 'cm-sidebar-section' });
    const header = section.createDiv({ cls: 'cm-sidebar-section-header' });
    header.createSpan({ text: title });
    header.createSpan({ cls: 'cm-count', text: `${items.length}` });

    for (const item of items) {
      const row = section.createDiv({ cls: 'cm-sidebar-item' });
      row.createSpan({ cls: `cm-badge ${item.badgeClass}`, text: item.badge });
      row.createSpan({ cls: 'cm-item-name', text: item.name });

      row.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (file && file instanceof TFile) {
          this.app.workspace.getLeaf('tab').openFile(file);
        }
      });
    }
  }
}
