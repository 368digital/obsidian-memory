var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ClaudeMemoryPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/views/DashboardView.ts
var import_obsidian = require("obsidian");

// src/types.ts
var CLAUDE_MEMORY_DIR = "claude-memory";
var MEMORIES_DIR = "memories";
var SESSIONS_DIR = "sessions";
var STREAMS_DIR = "streams";
var BASES_DIR = "bases";
var CHANGED_FILE = ".changed";
var MEMORY_INDEX = "MEMORY.md";

// src/parser.ts
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  const lines = match[1].split("\n");
  let currentKey = "";
  let currentArray = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") && currentKey) {
      if (!currentArray) {
        currentArray = [];
        meta[currentKey] = currentArray;
      }
      const val = trimmed.slice(2).trim();
      if (val.includes(": ")) {
        const obj = {};
        const parts = val.split(/,\s*/);
        for (const part of parts) {
          const colonIdx = part.indexOf(": ");
          if (colonIdx > 0) {
            const k = part.slice(0, colonIdx).trim();
            const v = part.slice(colonIdx + 2).trim().replace(/^["']|["']$/g, "");
            obj[k] = v;
          }
        }
        currentArray.push(obj);
      } else {
        currentArray.push(val.replace(/^["']|["']$/g, ""));
      }
      continue;
    }
    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      currentArray = null;
      const val = kvMatch[2].trim();
      if (val === "" || val === "[]") {
        meta[currentKey] = val === "[]" ? [] : "";
      } else if (val.startsWith("[") && val.endsWith("]")) {
        meta[currentKey] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else {
        meta[currentKey] = val.replace(/^["']|["']$/g, "");
      }
    }
  }
  return { meta, body: match[2] };
}
function extractWikilinks(content) {
  const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
  return [...matches].map((m) => m[1]);
}
function getFileCategory(path) {
  if (path.endsWith("MEMORY.md")) return "index";
  if (path.includes(`${MEMORIES_DIR}/`)) return "memory";
  if (path.includes(`${SESSIONS_DIR}/`)) return "session";
  if (path.includes(`${STREAMS_DIR}/`)) return "stream";
  if (path.includes(`${BASES_DIR}/`)) return "base";
  if (path.includes("graph/")) return "graph";
  return "unknown";
}
function parseMemoryFile(path, content) {
  var _a;
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: meta.name || ((_a = path.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "",
    description: meta.description || "",
    type: meta.type || "project",
    content: body,
    wikilinks: extractWikilinks(content)
  };
}
function parseSessionFile(path, content) {
  var _a;
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: ((_a = path.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "",
    date: meta.date || "",
    duration: meta.duration || "",
    streams: meta.streams || [],
    bases: meta.bases || [],
    continues: meta.continues || "",
    status: meta.status || "completed",
    content: body,
    wikilinks: extractWikilinks(content)
  };
}
function parseStreamFile(path, content) {
  var _a;
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: meta.name || ((_a = path.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "",
    type: meta.type || "gsd-phase",
    phase: meta.phase,
    status: meta.status || "active",
    started: meta.started || "",
    completed: meta.completed,
    related: meta.related || [],
    content: body,
    wikilinks: extractWikilinks(content)
  };
}
function parseBaseFile(path, content) {
  var _a;
  const { meta, body } = parseFrontmatter(content);
  return {
    path,
    name: meta.name || ((_a = path.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "",
    description: meta.description || "",
    paths: meta.paths || [],
    tags: meta.tags || [],
    created: meta.created || "",
    content: body,
    wikilinks: extractWikilinks(content)
  };
}
async function loadMemoryIndex(vault) {
  const memories = [];
  const sessions = [];
  const streams = [];
  const bases = [];
  const files = vault.getMarkdownFiles().filter((f) => f.path.startsWith(CLAUDE_MEMORY_DIR + "/"));
  for (const file of files) {
    const content = await vault.cachedRead(file);
    const category = getFileCategory(file.path);
    switch (category) {
      case "memory":
        memories.push(parseMemoryFile(file.path, content));
        break;
      case "session":
        sessions.push(parseSessionFile(file.path, content));
        break;
      case "stream":
        streams.push(parseStreamFile(file.path, content));
        break;
      case "base":
        bases.push(parseBaseFile(file.path, content));
        break;
    }
  }
  sessions.sort((a, b) => b.date.localeCompare(a.date));
  return { memories, sessions, streams, bases };
}

// src/views/DashboardView.ts
var DASHBOARD_VIEW_TYPE = "claude-memory-dashboard";
var DashboardView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return DASHBOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "Claude Memory";
  }
  getIcon() {
    return "brain";
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("claude-memory-dashboard");
    const { memories, sessions, streams, bases } = await loadMemoryIndex(this.app.vault);
    const header = container.createDiv({ cls: "cm-dashboard-header" });
    header.createEl("h2", { text: "Claude Memory" });
    const stats = header.createDiv({ cls: "cm-stats" });
    stats.createSpan({ text: `${bases.length} \u0431\u0430\u0437` });
    stats.createSpan({ text: ` \xB7 ${streams.length} \u043F\u043E\u0442\u043E\u043A\u043E\u0432` });
    stats.createSpan({ text: ` \xB7 ${sessions.length} \u0441\u0435\u0441\u0441\u0438\u0439` });
    stats.createSpan({ text: ` \xB7 ${memories.length} \u0437\u0430\u043F\u0438\u0441\u0435\u0439` });
    const grid = container.createDiv({ cls: "cm-dashboard-grid" });
    if (bases.length > 0) {
      grid.style.gridTemplateColumns = "1fr 1fr 1fr 1fr";
    }
    if (bases.length > 0) {
      this.renderBasesColumn(grid, bases, sessions);
    }
    this.renderStreamsColumn(grid, streams);
    this.renderSessionsColumn(grid, sessions.slice(0, 10));
    this.renderMemoriesColumn(grid, memories);
  }
  renderStreamsColumn(parent, streams) {
    const col = parent.createDiv({ cls: "cm-column" });
    col.createEl("h3", { text: "\u041F\u043E\u0442\u043E\u043A\u0438" });
    const active = streams.filter((s) => s.status === "active" || s.status === "paused");
    const complete = streams.filter((s) => s.status === "complete");
    for (const stream of [...active, ...complete]) {
      const item = col.createDiv({ cls: `cm-item cm-stream cm-status-${stream.status}` });
      const badge = item.createSpan({ cls: "cm-badge" });
      badge.setText(stream.status);
      item.createSpan({ cls: "cm-item-name", text: stream.name });
      item.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(stream.path);
        if (file) {
          this.app.workspace.getLeaf("tab").openFile(file);
        }
      });
    }
    if (streams.length === 0) {
      col.createDiv({ cls: "cm-empty", text: "\u041D\u0435\u0442 \u043F\u043E\u0442\u043E\u043A\u043E\u0432" });
    }
  }
  renderSessionsColumn(parent, sessions) {
    const col = parent.createDiv({ cls: "cm-column" });
    col.createEl("h3", { text: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0441\u0435\u0441\u0441\u0438\u0438" });
    for (const session of sessions) {
      const item = col.createDiv({ cls: "cm-item cm-session" });
      const date = item.createSpan({ cls: "cm-date" });
      date.setText(session.date.slice(0, 10));
      item.createSpan({ cls: "cm-item-name", text: session.name });
      if (session.streams.length > 0) {
        const tags = item.createDiv({ cls: "cm-tags" });
        for (const s of session.streams) {
          tags.createSpan({ cls: "cm-tag", text: s });
        }
      }
      item.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(session.path);
        if (file) {
          this.app.workspace.getLeaf("tab").openFile(file);
        }
      });
    }
    if (sessions.length === 0) {
      col.createDiv({ cls: "cm-empty", text: "\u041D\u0435\u0442 \u0441\u0435\u0441\u0441\u0438\u0439" });
    }
  }
  renderBasesColumn(parent, bases, sessions) {
    const col = parent.createDiv({ cls: "cm-column" });
    col.createEl("h3", { text: "\u0411\u0430\u0437\u044B" });
    for (const base of bases) {
      const card = col.createDiv({ cls: "cm-item cm-base" });
      card.createSpan({ cls: "cm-item-name", text: base.name });
      card.createSpan({ cls: "cm-item-desc", text: base.description });
      const baseName = base.name;
      const baseSessions = sessions.filter(
        (s) => s.bases.some((b) => b.includes(baseName))
      );
      if (baseSessions.length > 0) {
        const info = card.createDiv({ cls: "cm-tags" });
        info.createSpan({ cls: "cm-tag", text: `${baseSessions.length} \u0441\u0435\u0441\u0441\u0438\u0439` });
        const lastSession = baseSessions[0];
        if (lastSession) {
          info.createSpan({ cls: "cm-tag", text: lastSession.date.slice(0, 10) });
        }
      }
      if (base.tags.length > 0) {
        const tags = card.createDiv({ cls: "cm-tags" });
        for (const tag of base.tags) {
          tags.createSpan({ cls: "cm-tag", text: tag });
        }
      }
      card.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(base.path);
        if (file) {
          this.app.workspace.getLeaf("tab").openFile(file);
        }
      });
    }
  }
  renderMemoriesColumn(parent, memories) {
    const col = parent.createDiv({ cls: "cm-column" });
    col.createEl("h3", { text: "\u041F\u0430\u043C\u044F\u0442\u044C" });
    const groups = {};
    for (const mem of memories) {
      const group = groups[mem.type] || (groups[mem.type] = []);
      group.push(mem);
    }
    const typeLabels = {
      user: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C",
      feedback: "\u0424\u0438\u0434\u0431\u044D\u043A",
      project: "\u041F\u0440\u043E\u0435\u043A\u0442",
      reference: "\u0421\u043F\u0440\u0430\u0432\u043A\u0430"
    };
    for (const [type, items] of Object.entries(groups)) {
      col.createEl("h4", { text: typeLabels[type] || type });
      for (const mem of items) {
        const item = col.createDiv({ cls: "cm-item cm-memory" });
        item.createSpan({ cls: "cm-item-name", text: mem.name });
        item.createSpan({ cls: "cm-item-desc", text: mem.description });
        item.addEventListener("click", () => {
          const file = this.app.vault.getAbstractFileByPath(mem.path);
          if (file) {
            this.app.workspace.getLeaf("tab").openFile(file);
          }
        });
      }
    }
    if (memories.length === 0) {
      col.createDiv({ cls: "cm-empty", text: "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439" });
    }
  }
};

// src/views/TimelineView.ts
var import_obsidian2 = require("obsidian");
var TIMELINE_VIEW_TYPE = "claude-memory-timeline";
var TimelineView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.currentStream = null;
    this.currentBase = null;
    this.plugin = plugin;
  }
  getViewType() {
    return TIMELINE_VIEW_TYPE;
  }
  getDisplayText() {
    return this.currentStream ? `Timeline: ${this.currentStream}` : "Stream Timeline";
  }
  getIcon() {
    return "git-branch";
  }
  async onOpen() {
    await this.render();
  }
  setStream(streamName) {
    this.currentStream = streamName;
    this.render();
  }
  async render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("claude-memory-timeline");
    const { sessions, streams, bases } = await loadMemoryIndex(this.app.vault);
    if (!this.currentStream && !this.currentBase) {
      this.renderPicker(container, streams, bases);
      return;
    }
    if (this.currentBase) {
      const base = bases.find((b) => b.name === this.currentBase);
      if (!base) {
        container.createEl("p", { text: `\u0411\u0430\u0437\u0430 "${this.currentBase}" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430` });
        return;
      }
      const header2 = container.createDiv({ cls: "cm-timeline-header" });
      header2.createEl("h2", { text: base.name });
      const backBtn2 = header2.createEl("button", { cls: "cm-filter-btn", text: "\u2190 \u041D\u0430\u0437\u0430\u0434" });
      backBtn2.addEventListener("click", () => {
        this.currentBase = null;
        this.render();
      });
      if (base.description) {
        container.createDiv({ cls: "cm-date", text: base.description });
      }
      const baseSessions = sessions.filter(
        (s) => s.bases.some((b) => b.includes(base.name))
      );
      const timeline2 = container.createDiv({ cls: "cm-timeline" });
      timeline2.createEl("h3", { text: "\u0421\u0435\u0441\u0441\u0438\u0438" });
      for (const session of baseSessions) {
        this.renderTimelineEntry(timeline2, session);
      }
      if (baseSessions.length === 0) {
        timeline2.createDiv({ cls: "cm-empty", text: "\u041D\u0435\u0442 \u0441\u0435\u0441\u0441\u0438\u0439 \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u0431\u0430\u0437\u044B" });
      }
      return;
    }
    const stream = streams.find((s) => s.name === this.currentStream);
    if (!stream) {
      container.createEl("p", { text: `\u041F\u043E\u0442\u043E\u043A "${this.currentStream}" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D` });
      return;
    }
    const header = container.createDiv({ cls: "cm-timeline-header" });
    header.createEl("h2", { text: stream.name });
    const badge = header.createSpan({ cls: `cm-badge cm-status-${stream.status}` });
    badge.setText(stream.status);
    const backBtn = header.createEl("button", { cls: "cm-filter-btn", text: "\u2190 \u041D\u0430\u0437\u0430\u0434" });
    backBtn.addEventListener("click", () => {
      this.currentStream = null;
      this.render();
    });
    if (stream.started) {
      header.createDiv({ cls: "cm-date", text: `${stream.started}${stream.completed ? " \u2192 " + stream.completed : " \u2192 ..."}` });
    }
    if (stream.related.length > 0) {
      const relSection = container.createDiv({ cls: "cm-related" });
      relSection.createEl("h3", { text: "\u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u0442\u043E\u043A\u0438" });
      for (const rel of stream.related) {
        const item = relSection.createDiv({ cls: "cm-related-item" });
        item.createSpan({ cls: "cm-related-name", text: rel.stream.replace(/\[\[|\]\]/g, "") });
        item.createSpan({ cls: "cm-related-reason", text: rel.reason });
      }
    }
    const streamSessions = sessions.filter(
      (s) => s.streams.some((name) => name === this.currentStream)
    );
    const timeline = container.createDiv({ cls: "cm-timeline" });
    timeline.createEl("h3", { text: "\u0421\u0435\u0441\u0441\u0438\u0438" });
    for (const session of streamSessions) {
      this.renderTimelineEntry(timeline, session);
    }
    if (streamSessions.length === 0) {
      timeline.createDiv({ cls: "cm-empty", text: "\u041D\u0435\u0442 \u0441\u0435\u0441\u0441\u0438\u0439 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u043E\u0442\u043E\u043A\u0430" });
    }
  }
  renderPicker(container, streams, bases) {
    if (bases.length > 0) {
      container.createEl("h2", { text: "\u0411\u0430\u0437\u044B" });
      const baseList = container.createDiv({ cls: "cm-stream-picker" });
      for (const base of bases) {
        const item = baseList.createDiv({ cls: "cm-item cm-base" });
        item.createSpan({ cls: "cm-badge cm-base-badge", text: base.tags[0] || "\u0431\u0430\u0437\u0430" });
        item.createSpan({ cls: "cm-item-name", text: base.name });
        item.addEventListener("click", () => {
          this.currentBase = base.name;
          this.render();
        });
      }
    }
    container.createEl("h2", { text: "\u041F\u043E\u0442\u043E\u043A\u0438" });
    const list = container.createDiv({ cls: "cm-stream-picker" });
    for (const stream of streams) {
      const item = list.createDiv({ cls: `cm-item cm-stream cm-status-${stream.status}` });
      item.createSpan({ cls: "cm-badge", text: stream.status });
      item.createSpan({ cls: "cm-item-name", text: stream.name });
      item.addEventListener("click", () => {
        this.currentStream = stream.name;
        this.render();
      });
    }
  }
  renderTimelineEntry(timeline, session) {
    const entry = timeline.createDiv({ cls: "cm-timeline-entry" });
    entry.createDiv({ cls: "cm-timeline-dot" });
    const body = entry.createDiv({ cls: "cm-timeline-body" });
    body.createDiv({ cls: "cm-date", text: session.date.slice(0, 16).replace("T", " ") });
    body.createDiv({ cls: "cm-item-name", text: session.name });
    if (session.bases.length > 0) {
      const tags = body.createDiv({ cls: "cm-tags" });
      for (const b of session.bases) {
        tags.createSpan({ cls: "cm-tag", text: b.replace(/\[\[|\]\]/g, "") });
      }
    }
    entry.addEventListener("click", () => {
      const file = this.app.vault.getAbstractFileByPath(session.path);
      if (file) {
        this.app.workspace.getLeaf("tab").openFile(file);
      }
    });
  }
};

// src/sidebar/SidebarView.ts
var import_obsidian3 = require("obsidian");
var SIDEBAR_VIEW_TYPE = "claude-memory-sidebar";
var SidebarView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.filter = "all";
    this.logEntries = [];
    this.logEl = null;
    this.maxLogEntries = 50;
    this.plugin = plugin;
  }
  getViewType() {
    return SIDEBAR_VIEW_TYPE;
  }
  getDisplayText() {
    return "Claude Memory";
  }
  getIcon() {
    return "brain";
  }
  async onOpen() {
    await this.render();
    const IGNORED_PREFIXES = [".obsidian/", "node_modules/", ".git/"];
    const track = (action, file) => {
      if (IGNORED_PREFIXES.some((p) => file.path.startsWith(p))) return;
      if (file.path.endsWith("/.changed") || file.path === "claude-memory/.changed") return;
      this.addLogEntry(action, file.path);
    };
    this.registerEvent(this.app.vault.on("modify", (f) => {
      track("modify", f);
      this.render();
    }));
    this.registerEvent(this.app.vault.on("create", (f) => {
      track("create", f);
      this.render();
    }));
    this.registerEvent(this.app.vault.on("delete", (f) => {
      track("delete", f);
      this.render();
    }));
    this.registerEvent(this.app.vault.on("rename", (f) => {
      track("rename", f);
      this.render();
    }));
    const trySubscribe = () => {
      const cw = this.plugin.changedWriter;
      if (!cw) return false;
      cw.onExternalChange((events) => {
        for (const event of events) {
          if (event.path.endsWith(".changed")) continue;
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
      }, 1e3);
      this.register(() => window.clearInterval(retryTimer));
    }
  }
  addLogEntry(action, path) {
    const now = /* @__PURE__ */ new Date();
    const nowMs = now.getTime();
    const duplicate = this.logEntries.find(
      (e) => e.path === path && nowMs - this.parseLogTime(e.time) < 5e3
    );
    if (duplicate) return;
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const file = path.startsWith(CLAUDE_MEMORY_DIR + "/") ? path.replace(CLAUDE_MEMORY_DIR + "/", "").replace(".md", "") : path;
    this.logEntries.unshift({ time, action, file, path });
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(0, this.maxLogEntries);
    }
  }
  parseLogTime(time) {
    const [h, m, s] = time.split(":").map(Number);
    const d = /* @__PURE__ */ new Date();
    d.setHours(h, m, s, 0);
    return d.getTime();
  }
  async render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("claude-memory-sidebar");
    const { memories, sessions, streams, bases } = await loadMemoryIndex(this.app.vault);
    const filterBar = container.createDiv({ cls: "cm-filter-bar" });
    for (const f of ["all", "active", "archived"]) {
      const btn = filterBar.createEl("button", {
        cls: `cm-filter-btn ${this.filter === f ? "cm-active" : ""}`,
        text: f === "all" ? "\u0412\u0441\u0435" : f === "active" ? "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435" : "\u0410\u0440\u0445\u0438\u0432"
      });
      btn.addEventListener("click", () => {
        this.filter = f;
        this.render();
      });
    }
    const counts = container.createDiv({ cls: "cm-sidebar-counts" });
    counts.setText(`${bases.length} \u0431\u0430\u0437 \xB7 ${memories.length} \u043F\u0430\u043C\u044F\u0442\u0438 \xB7 ${sessions.length} \u0441\u0435\u0441\u0441\u0438\u0439 \xB7 ${streams.length} \u043F\u043E\u0442\u043E\u043A\u043E\u0432`);
    const filteredStreams = streams.filter((s) => {
      if (this.filter === "active") return s.status === "active" || s.status === "paused";
      if (this.filter === "archived") return s.status === "complete";
      return true;
    });
    if (bases.length > 0) {
      this.renderSection(container, "\u0411\u0430\u0437\u044B", bases.map((b) => ({
        name: b.name,
        path: b.path,
        badge: `${b.tags[0] || ""}`,
        badgeClass: "cm-base-badge"
      })));
    }
    if (filteredStreams.length > 0) {
      this.renderSection(container, "\u041F\u043E\u0442\u043E\u043A\u0438", filteredStreams.map((s) => ({
        name: s.name,
        path: s.path,
        badge: s.status,
        badgeClass: `cm-status-${s.status}`
      })));
    }
    if (this.filter !== "archived") {
      this.renderSection(container, "\u0421\u0435\u0441\u0441\u0438\u0438", sessions.slice(0, 10).map((s) => ({
        name: s.name,
        path: s.path,
        badge: s.date.slice(0, 10),
        badgeClass: "cm-date-badge"
      })));
    }
    if (this.filter !== "archived") {
      this.renderSection(container, "\u041F\u0430\u043C\u044F\u0442\u044C", memories.map((m) => ({
        name: m.name,
        path: m.path,
        badge: m.type,
        badgeClass: `cm-type-${m.type}`
      })));
    }
    this.renderLog(container);
  }
  renderLog(parent) {
    const section = parent.createDiv({ cls: "cm-sidebar-section cm-log-section" });
    const header = section.createDiv({ cls: "cm-sidebar-section-header" });
    header.createSpan({ text: "\u041B\u043E\u0433" });
    header.createSpan({ cls: "cm-count", text: `${this.logEntries.length}` });
    if (this.logEntries.length > 0) {
      const clearBtn = header.createEl("button", { cls: "cm-log-clear", text: "\xD7" });
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.logEntries = [];
        this.render();
      });
    }
    this.logEl = section.createDiv({ cls: "cm-log" });
    if (this.logEntries.length === 0) {
      this.logEl.createDiv({ cls: "cm-log-empty", text: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439" });
      return;
    }
    const actionLabels = {
      create: "NEW",
      modify: "UPD",
      delete: "DEL",
      rename: "REN"
    };
    for (const entry of this.logEntries) {
      const row = this.logEl.createDiv({ cls: `cm-log-entry cm-log-${entry.action}` });
      row.createSpan({ cls: "cm-log-time", text: entry.time });
      row.createSpan({ cls: `cm-badge cm-log-action`, text: actionLabels[entry.action] });
      row.createSpan({ cls: "cm-log-file", text: entry.file });
      if (entry.action !== "delete") {
        row.addEventListener("click", () => {
          const file = this.app.vault.getAbstractFileByPath(entry.path);
          if (file && file instanceof import_obsidian3.TFile) {
            this.app.workspace.getLeaf("tab").openFile(file);
          }
        });
      }
    }
  }
  renderSection(parent, title, items) {
    const section = parent.createDiv({ cls: "cm-sidebar-section" });
    const header = section.createDiv({ cls: "cm-sidebar-section-header" });
    header.createSpan({ text: title });
    header.createSpan({ cls: "cm-count", text: `${items.length}` });
    for (const item of items) {
      const row = section.createDiv({ cls: "cm-sidebar-item" });
      row.createSpan({ cls: `cm-badge ${item.badgeClass}`, text: item.badge });
      row.createSpan({ cls: "cm-item-name", text: item.name });
      row.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (file && file instanceof import_obsidian3.TFile) {
          this.app.workspace.getLeaf("tab").openFile(file);
        }
      });
    }
  }
};

// src/commands/commands.ts
var import_obsidian4 = require("obsidian");
function registerCommands(plugin) {
  plugin.addCommand({
    id: "create-memory",
    name: "Create Memory",
    callback: () => new CreateMemoryModal(plugin.app, plugin).open()
  });
  plugin.addCommand({
    id: "create-stream",
    name: "Create Stream",
    callback: () => new CreateStreamModal(plugin.app, plugin).open()
  });
  plugin.addCommand({
    id: "link-streams",
    name: "Link Streams",
    callback: () => new LinkStreamsModal(plugin.app, plugin).open()
  });
  plugin.addCommand({
    id: "create-base",
    name: "Create Base",
    callback: () => new CreateBaseModal(plugin.app, plugin).open()
  });
  plugin.addCommand({
    id: "archive-stream",
    name: "Archive Stream",
    callback: () => archiveCurrentStream(plugin)
  });
  plugin.addCommand({
    id: "set-context",
    name: "Set Context (prioritize for agent)",
    callback: () => setContextPriority(plugin)
  });
}
var CreateMemoryModal = class extends import_obsidian4.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043F\u0430\u043C\u044F\u0442\u0438" });
    let name = "";
    let type = "project";
    let description = "";
    new import_obsidian4.Setting(contentEl).setName("\u0422\u0438\u043F").addDropdown(
      (dd) => dd.addOption("user", "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C").addOption("feedback", "\u0424\u0438\u0434\u0431\u044D\u043A").addOption("project", "\u041F\u0440\u043E\u0435\u043A\u0442").addOption("reference", "\u0421\u043F\u0440\u0430\u0432\u043A\u0430").setValue(type).onChange((v) => type = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435").addText(
      (t) => t.setPlaceholder("\u041E\u043F\u0438\u0441\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435").onChange((v) => name = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435").addText(
      (t) => t.setPlaceholder("\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043E\u0434\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430)").onChange((v) => description = v)
    );
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("\u0421\u043E\u0437\u0434\u0430\u0442\u044C").setCta().onClick(async () => {
        if (!name) {
          new import_obsidian4.Notice("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435");
          return;
        }
        const typePrefix = {
          user: "",
          feedback: "\u0424\u0438\u0434\u0431\u044D\u043A \u2014 ",
          project: "\u041F\u0440\u043E\u0435\u043A\u0442 \u2014 ",
          reference: "\u0421\u043F\u0440\u0430\u0432\u043A\u0430 \u2014 "
        };
        const fileName = `${typePrefix[type]}${name}.md`;
        const filePath = `${CLAUDE_MEMORY_DIR}/${MEMORIES_DIR}/${fileName}`;
        const content = `---
name: ${name}
description: ${description}
type: ${type}
---

`;
        await this.app.vault.create(filePath, content);
        const indexPath = `${CLAUDE_MEMORY_DIR}/${MEMORY_INDEX}`;
        const indexFile = this.app.vault.getAbstractFileByPath(indexPath);
        if (indexFile && indexFile instanceof import_obsidian4.TFile) {
          const indexContent = await this.app.vault.read(indexFile);
          const wikiName = fileName.replace(".md", "");
          const newLine = `- [[${wikiName}]] \u2014 ${description}`;
          await this.app.vault.modify(indexFile, indexContent + "\n" + newLine);
        }
        new import_obsidian4.Notice(`\u0421\u043E\u0437\u0434\u0430\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C: ${fileName}`);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CreateStreamModal = class extends import_obsidian4.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0442\u043E\u043A" });
    let name = "";
    let type = "gsd-phase";
    let phase = "";
    new import_obsidian4.Setting(contentEl).setName("\u0422\u0438\u043F").addDropdown(
      (dd) => dd.addOption("gsd-phase", "\u0424\u0430\u0437\u0430").addOption("gsd-quick", "\u0411\u044B\u0441\u0442\u0440\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430").addOption("gsd-workstream", "\u041F\u043E\u0442\u043E\u043A \u0440\u0430\u0431\u043E\u0442\u044B").setValue(type).onChange((v) => type = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u041D\u043E\u043C\u0435\u0440 \u0444\u0430\u0437\u044B").setDesc("\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0444\u0430\u0437").addText(
      (t) => t.setPlaceholder("04").onChange((v) => phase = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435").addText(
      (t) => t.setPlaceholder("\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u043E\u0442\u043E\u043A\u0430").onChange((v) => name = v)
    );
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("\u0421\u043E\u0437\u0434\u0430\u0442\u044C").setCta().onClick(async () => {
        if (!name) {
          new import_obsidian4.Notice("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435");
          return;
        }
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const frontmatter = `---
type: ${type}
${phase ? `phase: "${phase}"
` : ""}name: ${name}
status: active
started: ${today}
related: []
---

`;
        if (type === "gsd-quick") {
          const fileName = `\u0411\u044B\u0441\u0442\u0440\u0430\u044F \u2014 ${name}.md`;
          const filePath = `${CLAUDE_MEMORY_DIR}/${STREAMS_DIR}/${fileName}`;
          const content = frontmatter + `# \u0411\u044B\u0441\u0442\u0440\u0430\u044F \u2014 ${name}

## \u0426\u0435\u043B\u044C


## \u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441

- [ ] 
`;
          await this.app.vault.create(filePath, content);
          new import_obsidian4.Notice(`\u0421\u043E\u0437\u0434\u0430\u043D \u043F\u043E\u0442\u043E\u043A: ${fileName}`);
        } else {
          const dirPrefix = type === "gsd-phase" ? `\u0424\u0430\u0437\u0430 ${phase} \u2014 ` : "\u041F\u043E\u0442\u043E\u043A \u2014 ";
          const dirName = `${dirPrefix}${name}`;
          const dirPath = `${CLAUDE_MEMORY_DIR}/${STREAMS_DIR}/${dirName}`;
          const streamContent = frontmatter + `# ${dirName}

## \u0426\u0435\u043B\u044C

`;
          await this.app.vault.create(`${dirPath}/STREAM.md`, streamContent);
          await this.app.vault.create(`${dirPath}/\u0420\u0435\u0448\u0435\u043D\u0438\u044F.md`, `# \u0420\u0435\u0448\u0435\u043D\u0438\u044F

`);
          await this.app.vault.create(`${dirPath}/\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441.md`, `# \u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441

- [ ] 
`);
          new import_obsidian4.Notice(`\u0421\u043E\u0437\u0434\u0430\u043D \u043F\u043E\u0442\u043E\u043A: ${dirName}/`);
        }
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CreateBaseModal = class extends import_obsidian4.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0431\u0430\u0437\u0443" });
    let name = "";
    let description = "";
    let paths = "";
    let tags = "";
    new import_obsidian4.Setting(contentEl).setName("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435").addText(
      (t) => t.setPlaceholder("\u041F\u043B\u0430\u0433\u0438\u043D Obsidian").onChange((v) => name = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435").addTextArea(
      (t) => t.setPlaceholder("\u0427\u0442\u043E \u044D\u0442\u043E \u0437\u0430 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u044B").onChange((v) => description = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u041F\u0443\u0442\u0438").setDesc("\u0427\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E").addText(
      (t) => t.setPlaceholder("src/sync/, src/main.ts").onChange((v) => paths = v)
    );
    new import_obsidian4.Setting(contentEl).setName("\u0422\u0435\u0433\u0438").setDesc("\u0427\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E").addText(
      (t) => t.setPlaceholder("obsidian, plugin").onChange((v) => tags = v)
    );
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("\u0421\u043E\u0437\u0434\u0430\u0442\u044C").setCta().onClick(async () => {
        if (!name) {
          new import_obsidian4.Notice("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435");
          return;
        }
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const pathsList = paths ? paths.split(",").map((p) => p.trim()).filter(Boolean) : [];
        const tagsList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        const pathsYaml = pathsList.length > 0 ? `paths:
${pathsList.map((p) => `  - ${p}`).join("\n")}` : "paths: []";
        const tagsYaml = tagsList.length > 0 ? `tags: [${tagsList.join(", ")}]` : "tags: []";
        const content = [
          "---",
          `name: ${name}`,
          `description: ${description}`,
          pathsYaml,
          tagsYaml,
          `created: ${today}`,
          "---",
          "",
          "## \u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
          description,
          "",
          "## \u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B",
          "",
          "",
          "## \u0425\u0440\u043E\u043D\u043E\u043B\u043E\u0433\u0438\u044F",
          ""
        ].join("\n");
        const filePath = `${CLAUDE_MEMORY_DIR}/${BASES_DIR}/${name}.md`;
        await this.app.vault.create(filePath, content);
        new import_obsidian4.Notice(`\u0421\u043E\u0437\u0434\u0430\u043D\u0430 \u0431\u0430\u0437\u0430: ${name}`);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var LinkStreamsModal = class extends import_obsidian4.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \u043F\u043E\u0442\u043E\u043A\u0438" });
    const { streams } = await loadMemoryIndex(this.app.vault);
    const streamNames = streams.map((s) => s.name);
    let from = "";
    let to = "";
    let reason = "";
    new import_obsidian4.Setting(contentEl).setName("\u0418\u0437 \u043F\u043E\u0442\u043E\u043A\u0430").addDropdown((dd) => {
      dd.addOption("", "\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u2014");
      for (const name of streamNames) dd.addOption(name, name);
      dd.onChange((v) => from = v);
    });
    new import_obsidian4.Setting(contentEl).setName("\u0412 \u043F\u043E\u0442\u043E\u043A").addDropdown((dd) => {
      dd.addOption("", "\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u2014");
      for (const name of streamNames) dd.addOption(name, name);
      dd.onChange((v) => to = v);
    });
    new import_obsidian4.Setting(contentEl).setName("\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0441\u0432\u044F\u0437\u0438").addText(
      (t) => t.setPlaceholder("\u041F\u043E\u0447\u0435\u043C\u0443 \u0441\u0432\u044F\u0437\u0430\u043D\u044B").onChange((v) => reason = v)
    );
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("\u0421\u0432\u044F\u0437\u0430\u0442\u044C").setCta().onClick(async () => {
        if (!from || !to || !reason) {
          new import_obsidian4.Notice("\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u043E\u043B\u044F");
          return;
        }
        const fromStream = streams.find((s) => s.name === from);
        if (fromStream) {
          const file = this.app.vault.getAbstractFileByPath(fromStream.path);
          if (file && file instanceof import_obsidian4.TFile) {
            const content = await this.app.vault.read(file);
            const newRelated = `  - stream: "[[${to}]]"
    reason: "${reason}"`;
            const updated = content.replace(
              /related:\s*\[\]/,
              `related:
${newRelated}`
            ).replace(
              /(related:\n(?:  - .*\n    .*\n)*)/,
              `$1${newRelated}
`
            );
            await this.app.vault.modify(file, updated);
          }
        }
        new import_obsidian4.Notice(`\u0421\u0432\u044F\u0437\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430: ${from} \u2192 ${to}`);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
async function archiveCurrentStream(plugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.includes(STREAMS_DIR)) {
    new import_obsidian4.Notice("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0444\u0430\u0439\u043B \u043F\u043E\u0442\u043E\u043A\u0430 \u0434\u043B\u044F \u0430\u0440\u0445\u0438\u0432\u0430\u0446\u0438\u0438");
    return;
  }
  const content = await plugin.app.vault.read(activeFile);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const updated = content.replace(/status:\s*active/, "status: complete").replace(/status:\s*paused/, "status: complete").replace(/(started:.*\n)/, `$1completed: ${today}
`);
  await plugin.app.vault.modify(activeFile, updated);
  new import_obsidian4.Notice("\u041F\u043E\u0442\u043E\u043A \u043F\u043E\u043C\u0435\u0447\u0435\u043D \u043A\u0430\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0439");
}
async function setContextPriority(plugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.startsWith(CLAUDE_MEMORY_DIR)) {
    new import_obsidian4.Notice("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0444\u0430\u0439\u043B \u0438\u0437 claude-memory/");
    return;
  }
  const content = await plugin.app.vault.read(activeFile);
  if (content.includes("priority: high")) {
    const updated = content.replace(/priority:\s*high\n?/, "");
    await plugin.app.vault.modify(activeFile, updated);
    new import_obsidian4.Notice("\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u0441\u043D\u044F\u0442");
  } else {
    const updated = content.replace(/---\n/, "---\npriority: high\n");
    await plugin.app.vault.modify(activeFile, updated);
    new import_obsidian4.Notice("\u0424\u0430\u0439\u043B \u043F\u043E\u043C\u0435\u0447\u0435\u043D \u043A\u0430\u043A \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u044B\u0439 \u2014 \u0430\u0433\u0435\u043D\u0442 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0435\u0442 \u0435\u0433\u043E \u043F\u0435\u0440\u0432\u044B\u043C");
  }
}

// src/sync/changed-writer.ts
var POLL_INTERVAL = 2e3;
var IGNORED_DIRS = [".obsidian", "node_modules", ".git"];
var SESSIONS_PATH = `${CLAUDE_MEMORY_DIR}/${SESSIONS_DIR}`;
var ChangedWriter = class {
  constructor(plugin) {
    this.pollTimer = null;
    this.knownFiles = /* @__PURE__ */ new Map();
    // path -> mtime
    this.listeners = [];
    this.plugin = plugin;
  }
  onExternalChange(listener) {
    this.listeners.push(listener);
    console.log("[ChangedWriter] listener registered, total:", this.listeners.length);
  }
  async start() {
    await this.snapshotCurrentState("");
    console.log("[ChangedWriter] started, tracking", this.knownFiles.size, "files");
    this.pollTimer = setInterval(() => this.pollForChanges(), POLL_INTERVAL);
  }
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
  isIgnored(path) {
    return IGNORED_DIRS.some((d) => path === d || path.startsWith(d + "/"));
  }
  async snapshotCurrentState(dir) {
    const adapter = this.plugin.app.vault.adapter;
    if (dir && !await adapter.exists(dir)) return;
    const listing = await adapter.list(dir);
    for (const filePath of listing.files) {
      if (this.isIgnored(filePath)) continue;
      const stat = await adapter.stat(filePath);
      if (stat) {
        this.knownFiles.set(filePath, stat.mtime);
      }
    }
    for (const folderPath of listing.folders) {
      if (this.isIgnored(folderPath)) continue;
      await this.snapshotCurrentState(folderPath);
    }
  }
  async pollForChanges() {
    try {
      const currentFiles = /* @__PURE__ */ new Map();
      await this.collectFilesFromAdapter("", currentFiles);
      const events = [];
      for (const [path, mtime] of currentFiles) {
        if (path.endsWith(CHANGED_FILE)) continue;
        const knownMtime = this.knownFiles.get(path);
        if (knownMtime === void 0) {
          events.push({ path, action: "create" });
        } else if (knownMtime < mtime) {
          events.push({ path, action: "modify" });
        }
      }
      for (const [path] of this.knownFiles) {
        if (path.endsWith(CHANGED_FILE)) continue;
        if (!currentFiles.has(path)) {
          events.push({ path, action: "delete" });
        }
      }
      if (events.length > 0) {
        console.log("[ChangedWriter] detected", events.length, "changes:", events.map((e) => `${e.action}:${e.path}`));
        this.knownFiles.clear();
        for (const [path, mtime] of currentFiles) {
          this.knownFiles.set(path, mtime);
        }
        const guardian = this.plugin.sessionGuardian;
        if (guardian) {
          await guardian.ensureTodaySession();
        }
        for (const listener of this.listeners) {
          listener(events);
        }
        await this.appendToActiveSession(events);
        const changedPaths = events.filter((e) => e.action !== "delete").map((e) => e.path);
        if (changedPaths.length > 0) {
          await this.writeChangedFile(changedPaths);
        }
      }
    } catch (err) {
      console.error("[ChangedWriter] poll error:", err);
    }
  }
  async collectFilesFromAdapter(dir, map) {
    const adapter = this.plugin.app.vault.adapter;
    if (dir && !await adapter.exists(dir)) return;
    const listing = await adapter.list(dir);
    for (const filePath of listing.files) {
      if (this.isIgnored(filePath)) continue;
      const stat = await adapter.stat(filePath);
      if (stat) {
        map.set(filePath, stat.mtime);
      }
    }
    for (const folderPath of listing.folders) {
      if (this.isIgnored(folderPath)) continue;
      await this.collectFilesFromAdapter(folderPath, map);
    }
  }
  async appendToActiveSession(events) {
    const projectEvents = events.filter((e) => !e.path.startsWith(CLAUDE_MEMORY_DIR + "/") && !e.path.startsWith(CLAUDE_MEMORY_DIR));
    if (projectEvents.length === 0) return;
    try {
      const adapter = this.plugin.app.vault.adapter;
      const sessionsExist = await adapter.exists(SESSIONS_PATH);
      if (!sessionsExist) return;
      const listing = await adapter.list(SESSIONS_PATH);
      let activeSessionPath = null;
      for (const filePath of listing.files.sort().reverse()) {
        if (!filePath.endsWith(".md")) continue;
        const content2 = await adapter.read(filePath);
        if (content2.includes("status: in_progress")) {
          activeSessionPath = filePath;
          break;
        }
      }
      if (!activeSessionPath) return;
      const content = await adapter.read(activeSessionPath);
      const actionLabels = { create: "NEW", modify: "UPD", delete: "DEL" };
      const newEntries = projectEvents.map((e) => {
        const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        return `- \`${actionLabels[e.action]}\` [[${e.path}]] (${time})`;
      });
      if (content.includes("## \u0417\u0430\u0442\u0440\u043E\u043D\u0443\u0442\u044B\u0435 \u0444\u0430\u0439\u043B\u044B")) {
        const sectionIdx = content.indexOf("## \u0417\u0430\u0442\u0440\u043E\u043D\u0443\u0442\u044B\u0435 \u0444\u0430\u0439\u043B\u044B");
        const afterSection = content.indexOf("\n## ", sectionIdx + 1);
        const insertPos = afterSection !== -1 ? afterSection : content.length;
        const updated = content.slice(0, insertPos).trimEnd() + "\n" + newEntries.join("\n") + "\n" + (afterSection !== -1 ? "\n" + content.slice(afterSection) : "");
        await adapter.write(activeSessionPath, updated);
      } else {
        const updated = content.trimEnd() + "\n\n## \u0417\u0430\u0442\u0440\u043E\u043D\u0443\u0442\u044B\u0435 \u0444\u0430\u0439\u043B\u044B\n\n" + newEntries.join("\n") + "\n";
        await adapter.write(activeSessionPath, updated);
      }
      console.log("[ChangedWriter] appended", projectEvents.length, "file changes to session:", activeSessionPath);
    } catch (err) {
      console.error("[ChangedWriter] failed to append to session:", err);
    }
  }
  async writeChangedFile(paths) {
    const changedPath = `${CLAUDE_MEMORY_DIR}/${CHANGED_FILE}`;
    const adapter = this.plugin.app.vault.adapter;
    const exists = await adapter.exists(changedPath);
    if (exists) {
      const current = await adapter.read(changedPath);
      const merged = /* @__PURE__ */ new Set([
        ...current.trim().split("\n").filter(Boolean),
        ...paths
      ]);
      await adapter.write(changedPath, [...merged].join("\n") + "\n");
    } else {
      await adapter.write(changedPath, paths.join("\n") + "\n");
    }
  }
};

// src/sync/session-guardian.ts
var import_obsidian5 = require("obsidian");
var SESSIONS_PATH2 = `${CLAUDE_MEMORY_DIR}/${SESSIONS_DIR}`;
var SessionGuardian = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async onload() {
    await this.closeStaleInProgressSessions();
  }
  /**
   * Find all sessions with status: in_progress from previous days
   * and mark them as status: incomplete
   */
  async closeStaleInProgressSessions() {
    const sessionsFolder = this.plugin.app.vault.getAbstractFileByPath(SESSIONS_PATH2);
    if (!sessionsFolder || !(sessionsFolder instanceof import_obsidian5.TFolder)) return;
    const today = this.todayPrefix();
    for (const child of sessionsFolder.children) {
      if (!(child instanceof import_obsidian5.TFile) || !child.name.endsWith(".md")) continue;
      if (child.name.startsWith(today)) continue;
      const content = await this.plugin.app.vault.read(child);
      if (!content.includes("status: in_progress")) continue;
      const updated = content.replace("status: in_progress", "status: incomplete");
      await this.plugin.app.vault.modify(child, updated);
    }
  }
  /**
   * Check if a session file exists for today.
   * Called by ChangedWriter when files change in claude-memory/.
   * If no session exists, create a stub.
   */
  async ensureTodaySession() {
    const sessionsFolder = this.plugin.app.vault.getAbstractFileByPath(SESSIONS_PATH2);
    if (!sessionsFolder || !(sessionsFolder instanceof import_obsidian5.TFolder)) return;
    const today = this.todayPrefix();
    const hasToday = sessionsFolder.children.some(
      (f) => f instanceof import_obsidian5.TFile && f.name.startsWith(today)
    );
    if (!hasToday) {
      await this.createStubSession(today);
    }
  }
  async createStubSession(today) {
    const now = /* @__PURE__ */ new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `${today} ${hhmm} \u2014 \u041D\u043E\u0432\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F.md`;
    const path = `${SESSIONS_PATH2}/${filename}`;
    if (this.plugin.app.vault.getAbstractFileByPath(path)) return;
    const content = [
      "---",
      `date: ${today}`,
      "duration: ",
      "streams: []",
      "status: in_progress",
      "---",
      "",
      `# \u0421\u0435\u0441\u0441\u0438\u044F ${today} ${hhmm.replace("-", ":")} \u2014 \u041D\u043E\u0432\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F`,
      "",
      "## \u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442",
      "(stub \u0441\u043E\u0437\u0434\u0430\u043D \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u043C Obsidian \u2014 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043F\u0440\u0438 \u0441\u0442\u0430\u0440\u0442\u0435 \u0441\u0435\u0441\u0441\u0438\u0438 Claude Code)",
      "",
      "## \u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F",
      "",
      "## \u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u043D\u043E",
      "",
      "## \u0424\u0430\u0439\u043B\u044B \u0437\u0430\u0442\u0440\u043E\u043D\u0443\u0442\u044B",
      "",
      "## Git commits",
      "",
      "## \u041F\u0440\u043E\u0431\u043B\u0435\u043C\u044B",
      "",
      "## \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u0448\u0430\u0433\u0438",
      ""
    ].join("\n");
    await this.plugin.app.vault.create(path, content);
  }
  todayPrefix() {
    const now = /* @__PURE__ */ new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
};

// src/main.ts
var ClaudeMemoryPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.changedWriter = null;
    this.sessionGuardian = null;
  }
  async onload() {
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this));
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, this));
    registerCommands(this);
    this.app.workspace.onLayoutReady(() => this.activate());
  }
  async activate() {
    const memoryDir = this.app.vault.getAbstractFileByPath(CLAUDE_MEMORY_DIR);
    if (!memoryDir) {
      console.log("Claude Memory: claude-memory/ not found, plugin inactive");
      return;
    }
    this.addRibbonIcon("brain", "Claude Memory Dashboard", () => {
      this.activateView(DASHBOARD_VIEW_TYPE);
    });
    const existingLeaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
    if (existingLeaves.length === 0) {
      this.activateView(SIDEBAR_VIEW_TYPE, "left");
    } else if (existingLeaves.length > 1) {
      for (let i = 1; i < existingLeaves.length; i++) {
        existingLeaves[i].detach();
      }
    }
    this.sessionGuardian = new SessionGuardian(this);
    await this.sessionGuardian.onload();
    this.changedWriter = new ChangedWriter(this);
    await this.changedWriter.start();
  }
  onunload() {
    var _a;
    (_a = this.changedWriter) == null ? void 0 : _a.stop();
  }
  async activateView(viewType, side) {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(viewType);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      if (side) {
        leaf = workspace.getLeftLeaf(false);
      } else {
        leaf = workspace.getLeaf("tab");
      }
      if (leaf) {
        await leaf.setViewState({ type: viewType, active: true });
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
};
