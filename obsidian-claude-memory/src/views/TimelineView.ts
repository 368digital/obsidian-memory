import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { loadMemoryIndex } from '../parser';
import type { SessionFile, StreamFile } from '../types';

export const TIMELINE_VIEW_TYPE = 'claude-memory-timeline';

export class TimelineView extends ItemView {
  private plugin: ClaudeMemoryPlugin;
  private currentStream: string | null = null;

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

    const { sessions, streams } = await loadMemoryIndex(this.app.vault);

    if (!this.currentStream) {
      this.renderStreamPicker(container, streams);
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
      const entry = timeline.createDiv({ cls: 'cm-timeline-entry' });
      const dot = entry.createDiv({ cls: 'cm-timeline-dot' });
      const body = entry.createDiv({ cls: 'cm-timeline-body' });

      body.createDiv({ cls: 'cm-date', text: session.date.slice(0, 16).replace('T', ' ') });
      body.createDiv({ cls: 'cm-item-name', text: session.name });

      entry.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(session.path);
        if (file) {
          this.app.workspace.getLeaf('tab').openFile(file as any);
        }
      });
    }

    if (streamSessions.length === 0) {
      timeline.createDiv({ cls: 'cm-empty', text: 'Нет сессий для этого потока' });
    }
  }

  private renderStreamPicker(container: HTMLElement, streams: StreamFile[]) {
    container.createEl('h2', { text: 'Выберите поток' });
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
}
