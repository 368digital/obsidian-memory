import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/DashboardView';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/TimelineView';
import { SidebarView, SIDEBAR_VIEW_TYPE } from './sidebar/SidebarView';
import { registerCommands } from './commands/commands';
import { ChangedWriter } from './sync/changed-writer';
import { SessionGuardian } from './sync/session-guardian';
import { CLAUDE_MEMORY_DIR } from './types';

export default class ClaudeMemoryPlugin extends Plugin {
  changedWriter: ChangedWriter | null = null;
  sessionGuardian: SessionGuardian | null = null;

  async onload() {
    // Register views early (before vault is ready) so Obsidian can restore saved layouts
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this));
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, this));

    // Register commands early so they're available in command palette
    registerCommands(this);

    // Wait for vault to be fully indexed before checking claude-memory/
    this.app.workspace.onLayoutReady(() => this.activate());
  }

  private async activate() {
    // Now vault is ready — check if claude-memory/ exists
    const memoryDir = this.app.vault.getAbstractFileByPath(CLAUDE_MEMORY_DIR);
    if (!memoryDir) {
      console.log('Claude Memory: claude-memory/ not found, plugin inactive');
      return;
    }

    // Ribbon icon to open dashboard
    this.addRibbonIcon('brain', 'Claude Memory Dashboard', () => {
      this.activateView(DASHBOARD_VIEW_TYPE);
    });

    // Ensure exactly one sidebar exists (deduplicate if layout restored extras)
    const existingLeaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
    if (existingLeaves.length === 0) {
      this.activateView(SIDEBAR_VIEW_TYPE, 'left');
    } else if (existingLeaves.length > 1) {
      for (let i = 1; i < existingLeaves.length; i++) {
        existingLeaves[i].detach();
      }
    }

    // Session guardian: close stale sessions, create stubs
    this.sessionGuardian = new SessionGuardian(this);
    await this.sessionGuardian.onload();

    // Start .changed writer (with session guardian integration)
    this.changedWriter = new ChangedWriter(this);
    await this.changedWriter.start();
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
