import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/DashboardView';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/TimelineView';
import { SidebarView, SIDEBAR_VIEW_TYPE } from './sidebar/SidebarView';
import { registerCommands } from './commands/commands';
import { ChangedWriter } from './sync/changed-writer';
import { SessionGuardian } from './sync/session-guardian';
import { CLAUDE_MEMORY_DIR } from './types';

export default class ClaudeMemoryPlugin extends Plugin {
  private changedWriter: ChangedWriter | null = null;
  sessionGuardian: SessionGuardian | null = null;

  async onload() {
    // Only activate if claude-memory/ exists
    const memoryDir = this.app.vault.getAbstractFileByPath(CLAUDE_MEMORY_DIR);
    if (!memoryDir) {
      console.log('Claude Memory: claude-memory/ not found, plugin inactive');
      return;
    }

    // Register views
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this));
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, this));

    // Register commands
    registerCommands(this);

    // Add ribbon icon to open dashboard
    this.addRibbonIcon('brain', 'Claude Memory Dashboard', () => {
      this.activateView(DASHBOARD_VIEW_TYPE);
    });

    // Set up sidebar
    this.app.workspace.onLayoutReady(() => {
      this.activateView(SIDEBAR_VIEW_TYPE, 'left');
    });

    // Session guardian: close stale sessions, create stubs
    this.sessionGuardian = new SessionGuardian(this);
    await this.sessionGuardian.onload();

    // Start .changed writer (with session guardian integration)
    this.changedWriter = new ChangedWriter(this);
    this.changedWriter.start();
  }

  onunload() {
    this.changedWriter?.stop();
  }

  async activateView(viewType: string, side?: 'left' | 'right') {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(viewType);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      if (side) {
        leaf = workspace.getLeftLeaf(false);
      } else {
        leaf = workspace.getLeaf('tab');
      }
      if (leaf) {
        await leaf.setViewState({ type: viewType, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
