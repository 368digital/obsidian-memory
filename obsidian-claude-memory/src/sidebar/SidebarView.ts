import { ItemView, WorkspaceLeaf, TFile, TAbstractFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import { CLAUDE_MEMORY_DIR } from '../types';

export const SIDEBAR_VIEW_TYPE = 'claude-memory-sidebar';

type Filter = 'all' | 'active' | 'archived';

interface LogEntry {
  time: string;
  action: 'create' | 'modify' | 'delete' | 'rename';
  file: string;
  path: string;
}

export class SidebarView extends ItemView {
  private plugin: ClaudeMemoryPlugin;
  private filter: Filter = 'all';
  private logEntries: LogEntry[] = [];
  private logEl: HTMLElement | null = null;
  private maxLogEntries = 50;

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

    const IGNORED_PREFIXES = ['.obsidian/', 'node_modules/', '.git/'];
    const track = (action: LogEntry['action'], file: TAbstractFile) => {
      if (IGNORED_PREFIXES.some(p => file.path.startsWith(p))) return;
      if (file.path.endsWith('/.changed') || file.path === 'claude-memory/.changed') return;
      this.addLogEntry(action, file.path);
    };

    this.registerEvent(this.app.vault.on('modify', (f) => { track('modify', f); this.render(); }));
    this.registerEvent(this.app.vault.on('create', (f) => { track('create', f); this.render(); }));
    this.registerEvent(this.app.vault.on('delete', (f) => { track('delete', f); this.render(); }));
    this.registerEvent(this.app.vault.on('rename', (f) => { track('rename', f); this.render(); }));

    // Listen for external changes detected by ChangedWriter (Claude Code writes)
    // ChangedWriter may not exist yet (sidebar loads before activate()), so retry
    const trySubscribe = () => {
      const cw = this.plugin.changedWriter;
      if (!cw) return false;
      cw.onExternalChange((events) => {
        for (const event of events) {
          if (event.path.endsWith('.changed')) continue;
          this.addLogEntry(event.action, event.path);
        }
        this.render();
      });
      return true;
    };

    if (!trySubscribe()) {
      const retryTimer = window.setInterval(() => {
        if (trySubscribe()) {
          window.clearInterval(retryTimer);
        }
      }, 1000);
      this.register(() => window.clearInterval(retryTimer));
    }
  }

  private addLogEntry(action: LogEntry['action'], path: string) {
    // Deduplicate: skip if same path exists within last 5 seconds (any action)
    const now = new Date();
    const nowMs = now.getTime();
    const duplicate = this.logEntries.find(e =>
      e.path === path && (nowMs - this.parseLogTime(e.time)) < 5000
    );
    if (duplicate) return;

    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const file = path.startsWith(CLAUDE_MEMORY_DIR + '/')
      ? path.replace(CLAUDE_MEMORY_DIR + '/', '').replace('.md', '')
      : path;

    this.logEntries.unshift({ time, action, file, path });
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(0, this.maxLogEntries);
    }
  }

  private parseLogTime(time: string): number {
    const [h, m, s] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, s, 0);
    return d.getTime();
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-sidebar');

    const { memories, sessions, streams, bases } = await loadMemoryIndex(this.app.vault);

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
    counts.setText(`${bases.length} баз · ${memories.length} памяти · ${sessions.length} сессий · ${streams.length} потоков`);

    const filteredStreams = streams.filter((s) => {
      if (this.filter === 'active') return s.status === 'active' || s.status === 'paused';
      if (this.filter === 'archived') return s.status === 'complete';
      return true;
    });

    if (bases.length > 0) {
      this.renderSection(container, 'Базы', bases.map((b) => ({
        name: b.name,
        path: b.path,
        badge: `${b.tags[0] || ''}`,
        badgeClass: 'cm-base-badge',
      })));
    }

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

    this.renderLog(container);
  }

  private renderLog(parent: HTMLElement) {
    const section = parent.createDiv({ cls: 'cm-sidebar-section cm-log-section' });
    const header = section.createDiv({ cls: 'cm-sidebar-section-header' });
    header.createSpan({ text: 'Лог' });
    header.createSpan({ cls: 'cm-count', text: `${this.logEntries.length}` });

    if (this.logEntries.length > 0) {
      const clearBtn = header.createEl('button', { cls: 'cm-log-clear', text: '×' });
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.logEntries = [];
        this.render();
      });
    }

    this.logEl = section.createDiv({ cls: 'cm-log' });

    if (this.logEntries.length === 0) {
      this.logEl.createDiv({ cls: 'cm-log-empty', text: 'Пока нет изменений' });
      return;
    }

    const actionLabels: Record<string, string> = {
      create: 'NEW',
      modify: 'UPD',
      delete: 'DEL',
      rename: 'REN',
    };

    for (const entry of this.logEntries) {
      const row = this.logEl.createDiv({ cls: `cm-log-entry cm-log-${entry.action}` });
      row.createSpan({ cls: 'cm-log-time', text: entry.time });
      row.createSpan({ cls: `cm-badge cm-log-action`, text: actionLabels[entry.action] });
      row.createSpan({ cls: 'cm-log-file', text: entry.file });

      if (entry.action !== 'delete') {
        row.addEventListener('click', () => {
          const file = this.app.vault.getAbstractFileByPath(entry.path);
          if (file && file instanceof TFile) {
            this.app.workspace.getLeaf('tab').openFile(file);
          }
        });
      }
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
