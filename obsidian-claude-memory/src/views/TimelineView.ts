import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import type { SessionFile, StreamFile, BaseFile } from '../types';

export const TIMELINE_VIEW_TYPE = 'claude-memory-timeline';

export class TimelineView extends ItemView {
  private plugin: ClaudeMemoryPlugin;
  private currentStream: string | null = null;
  private currentBase: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeMemoryPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.currentStream ? `Timeline: ${this.currentStream}` : 'Stream Timeline';
  }

  getIcon(): string {
    return 'git-branch';
  }

  async onOpen() {
    await this.render();
  }

  setStream(streamName: string) {
    this.currentStream = streamName;
    this.render();
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-memory-timeline');

    const { sessions, streams, bases } = await loadMemoryIndex(this.app.vault);

    if (!this.currentStream && !this.currentBase) {
      this.renderPicker(container, streams, bases);
      return;
    }

    if (this.currentBase) {
      const base = bases.find((b) => b.name === this.currentBase);
      if (!base) {
        container.createEl('p', { text: `База "${this.currentBase}" не найдена` });
        return;
      }

      const header = container.createDiv({ cls: 'cm-timeline-header' });
      header.createEl('h2', { text: base.name });
      const backBtn = header.createEl('button', { cls: 'cm-filter-btn', text: '← Назад' });
      backBtn.addEventListener('click', () => {
        this.currentBase = null;
        this.render();
      });

      if (base.description) {
        container.createDiv({ cls: 'cm-date', text: base.description });
      }

      const baseSessions = sessions.filter((s) =>
        s.bases.some((b) => b.includes(base.name))
      );

      const timeline = container.createDiv({ cls: 'cm-timeline' });
      timeline.createEl('h3', { text: 'Сессии' });

      for (const session of baseSessions) {
        this.renderTimelineEntry(timeline, session);
      }

      if (baseSessions.length === 0) {
        timeline.createDiv({ cls: 'cm-empty', text: 'Нет сессий для этой базы' });
      }
      return;
    }

    const stream = streams.find((s) => s.name === this.currentStream);
    if (!stream) {
      container.createEl('p', { text: `Поток "${this.currentStream}" не найден` });
      return;
    }

    const header = container.createDiv({ cls: 'cm-timeline-header' });
    header.createEl('h2', { text: stream.name });
    const badge = header.createSpan({ cls: `cm-badge cm-status-${stream.status}` });
    badge.setText(stream.status);
    const backBtn = header.createEl('button', { cls: 'cm-filter-btn', text: '← Назад' });
    backBtn.addEventListener('click', () => {
      this.currentStream = null;
      this.render();
    });

    if (stream.started) {
      header.createDiv({ cls: 'cm-date', text: `${stream.started}${stream.completed ? ' → ' + stream.completed : ' → ...'}` });
    }

    if (stream.related.length > 0) {
      const relSection = container.createDiv({ cls: 'cm-related' });
      relSection.createEl('h3', { text: 'Связанные потоки' });
      for (const rel of stream.related) {
        const item = relSection.createDiv({ cls: 'cm-related-item' });
        item.createSpan({ cls: 'cm-related-name', text: rel.stream.replace(/\[\[|\]\]/g, '') });
        item.createSpan({ cls: 'cm-related-reason', text: rel.reason });
      }
    }

    const streamSessions = sessions.filter((s) =>
      s.streams.some((name) => name === this.currentStream)
    );

    const timeline = container.createDiv({ cls: 'cm-timeline' });
    timeline.createEl('h3', { text: 'Сессии' });

    for (const session of streamSessions) {
      this.renderTimelineEntry(timeline, session);
    }

    if (streamSessions.length === 0) {
      timeline.createDiv({ cls: 'cm-empty', text: 'Нет сессий для этого потока' });
    }
  }

  private renderPicker(container: HTMLElement, streams: StreamFile[], bases: BaseFile[]) {
    if (bases.length > 0) {
      container.createEl('h2', { text: 'Базы' });
      const baseList = container.createDiv({ cls: 'cm-stream-picker' });
      for (const base of bases) {
        const item = baseList.createDiv({ cls: 'cm-item cm-base' });
        item.createSpan({ cls: 'cm-badge cm-base-badge', text: base.tags[0] || 'база' });
        item.createSpan({ cls: 'cm-item-name', text: base.name });
        item.addEventListener('click', () => {
          this.currentBase = base.name;
          this.render();
        });
      }
    }

    container.createEl('h2', { text: 'Потоки' });
    const list = container.createDiv({ cls: 'cm-stream-picker' });
    for (const stream of streams) {
      const item = list.createDiv({ cls: `cm-item cm-stream cm-status-${stream.status}` });
      item.createSpan({ cls: 'cm-badge', text: stream.status });
      item.createSpan({ cls: 'cm-item-name', text: stream.name });
      item.addEventListener('click', () => {
        this.currentStream = stream.name;
        this.render();
      });
    }
  }

  private renderTimelineEntry(timeline: HTMLElement, session: SessionFile) {
    const entry = timeline.createDiv({ cls: 'cm-timeline-entry' });
    entry.createDiv({ cls: 'cm-timeline-dot' });
    const body = entry.createDiv({ cls: 'cm-timeline-body' });
    body.createDiv({ cls: 'cm-date', text: session.date.slice(0, 16).replace('T', ' ') });
    body.createDiv({ cls: 'cm-item-name', text: session.name });

    if (session.bases.length > 0) {
      const tags = body.createDiv({ cls: 'cm-tags' });
      for (const b of session.bases) {
        tags.createSpan({ cls: 'cm-tag', text: b.replace(/\[\[|\]\]/g, '') });
      }
    }

    entry.addEventListener('click', () => {
      const file = this.app.vault.getAbstractFileByPath(session.path);
      if (file) {
        this.app.workspace.getLeaf('tab').openFile(file as any);
      }
    });
  }
}
