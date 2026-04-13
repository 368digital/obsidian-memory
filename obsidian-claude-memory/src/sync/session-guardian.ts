import { TFile, TFolder } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, SESSIONS_DIR } from '../types';

const SESSIONS_PATH = `${CLAUDE_MEMORY_DIR}/${SESSIONS_DIR}`;

export class SessionGuardian {
  private plugin: ClaudeMemoryPlugin;

  constructor(plugin: ClaudeMemoryPlugin) {
    this.plugin = plugin;
  }

  async onload() {
    await this.closeStaleInProgressSessions();
  }

  /**
   * Find all sessions with status: in_progress from previous days
   * and mark them as status: incomplete
   */
  private async closeStaleInProgressSessions() {
    const sessionsFolder = this.plugin.app.vault.getAbstractFileByPath(SESSIONS_PATH);
    if (!sessionsFolder || !(sessionsFolder instanceof TFolder)) return;

    const today = this.todayPrefix();

    for (const child of sessionsFolder.children) {
      if (!(child instanceof TFile) || !child.name.endsWith('.md')) continue;
      if (child.name.startsWith(today)) continue; // skip today's sessions

      const content = await this.plugin.app.vault.read(child);
      if (!content.includes('status: in_progress')) continue;

      const updated = content.replace('status: in_progress', 'status: incomplete');
      await this.plugin.app.vault.modify(child, updated);
    }
  }

  /**
   * Check if a session file exists for today.
   * Called by ChangedWriter when files change in claude-memory/.
   * If no session exists, create a stub.
   */
  async ensureTodaySession() {
    const sessionsFolder = this.plugin.app.vault.getAbstractFileByPath(SESSIONS_PATH);
    if (!sessionsFolder || !(sessionsFolder instanceof TFolder)) return;

    const today = this.todayPrefix();
    const hasToday = sessionsFolder.children.some(
      (f) => f instanceof TFile && f.name.startsWith(today)
    );

    if (!hasToday) {
      await this.createStubSession(today);
    }
  }

  private async createStubSession(today: string) {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `${today} ${hhmm} — Новая сессия.md`;
    const path = `${SESSIONS_PATH}/${filename}`;

    // Don't create if already exists
    if (this.plugin.app.vault.getAbstractFileByPath(path)) return;

    const content = [
      '---',
      `date: ${today}`,
      'duration: ',
      'streams: []',
      'status: in_progress',
      '---',
      '',
      `# Сессия ${today} ${hhmm.replace('-', ':')} — Новая сессия`,
      '',
      '## Контекст',
      '(stub создан плагином Obsidian — заполнить при старте сессии Claude Code)',
      '',
      '## Ключевые решения',
      '',
      '## Что сделано',
      '',
      '## Файлы затронуты',
      '',
      '## Git commits',
      '',
      '## Проблемы',
      '',
      '## Следующие шаги',
      '',
    ].join('\n');

    await this.plugin.app.vault.create(path, content);
  }

  private todayPrefix(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
