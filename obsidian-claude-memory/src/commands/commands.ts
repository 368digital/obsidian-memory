import { Notice, Modal, App, Setting, TFile } from 'obsidian';
import type ClaudeMemoryPlugin from '../main';
import { CLAUDE_MEMORY_DIR, MEMORIES_DIR, STREAMS_DIR, BASES_DIR, MEMORY_INDEX } from '../types';
import { loadMemoryIndex } from '../parser';

export function registerCommands(plugin: ClaudeMemoryPlugin) {
  plugin.addCommand({
    id: 'create-memory',
    name: 'Create Memory',
    callback: () => new CreateMemoryModal(plugin.app, plugin).open(),
  });

  plugin.addCommand({
    id: 'create-stream',
    name: 'Create Stream',
    callback: () => new CreateStreamModal(plugin.app, plugin).open(),
  });

  plugin.addCommand({
    id: 'link-streams',
    name: 'Link Streams',
    callback: () => new LinkStreamsModal(plugin.app, plugin).open(),
  });

  plugin.addCommand({
    id: 'create-base',
    name: 'Create Base',
    callback: () => new CreateBaseModal(plugin.app, plugin).open(),
  });

  plugin.addCommand({
    id: 'archive-stream',
    name: 'Archive Stream',
    callback: () => archiveCurrentStream(plugin),
  });

  plugin.addCommand({
    id: 'set-context',
    name: 'Set Context (prioritize for agent)',
    callback: () => setContextPriority(plugin),
  });
}

class CreateMemoryModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Создать запись памяти' });

    let name = '';
    let type: string = 'project';
    let description = '';

    new Setting(contentEl).setName('Тип').addDropdown((dd) =>
      dd
        .addOption('user', 'Пользователь')
        .addOption('feedback', 'Фидбэк')
        .addOption('project', 'Проект')
        .addOption('reference', 'Справка')
        .setValue(type)
        .onChange((v) => (type = v))
    );

    new Setting(contentEl).setName('Название').addText((t) =>
      t.setPlaceholder('Описательное название').onChange((v) => (name = v))
    );

    new Setting(contentEl).setName('Описание').addText((t) =>
      t.setPlaceholder('Краткое описание (одна строка)').onChange((v) => (description = v))
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText('Создать')
        .setCta()
        .onClick(async () => {
          if (!name) {
            new Notice('Введите название');
            return;
          }

          const typePrefix: Record<string, string> = {
            user: '',
            feedback: 'Фидбэк — ',
            project: 'Проект — ',
            reference: 'Справка — ',
          };

          const fileName = `${typePrefix[type]}${name}.md`;
          const filePath = `${CLAUDE_MEMORY_DIR}/${MEMORIES_DIR}/${fileName}`;

          const content = `---\nname: ${name}\ndescription: ${description}\ntype: ${type}\n---\n\n`;

          await this.app.vault.create(filePath, content);

          const indexPath = `${CLAUDE_MEMORY_DIR}/${MEMORY_INDEX}`;
          const indexFile = this.app.vault.getAbstractFileByPath(indexPath);
          if (indexFile && indexFile instanceof TFile) {
            const indexContent = await this.app.vault.read(indexFile);
            const wikiName = fileName.replace('.md', '');
            const newLine = `- [[${wikiName}]] — ${description}`;
            await this.app.vault.modify(indexFile, indexContent + '\n' + newLine);
          }

          new Notice(`Создана запись: ${fileName}`);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class CreateStreamModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Создать поток' });

    let name = '';
    let type: string = 'gsd-phase';
    let phase = '';

    new Setting(contentEl).setName('Тип').addDropdown((dd) =>
      dd
        .addOption('gsd-phase', 'Фаза')
        .addOption('gsd-quick', 'Быстрая задача')
        .addOption('gsd-workstream', 'Поток работы')
        .setValue(type)
        .onChange((v) => (type = v))
    );

    new Setting(contentEl).setName('Номер фазы').setDesc('Только для фаз').addText((t) =>
      t.setPlaceholder('04').onChange((v) => (phase = v))
    );

    new Setting(contentEl).setName('Название').addText((t) =>
      t.setPlaceholder('Описание потока').onChange((v) => (name = v))
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText('Создать')
        .setCta()
        .onClick(async () => {
          if (!name) {
            new Notice('Введите название');
            return;
          }

          const today = new Date().toISOString().slice(0, 10);
          const frontmatter = `---\ntype: ${type}\n${phase ? `phase: "${phase}"\n` : ''}name: ${name}\nstatus: active\nstarted: ${today}\nrelated: []\n---\n\n`;

          if (type === 'gsd-quick') {
            const fileName = `Быстрая — ${name}.md`;
            const filePath = `${CLAUDE_MEMORY_DIR}/${STREAMS_DIR}/${fileName}`;
            const content = frontmatter + `# Быстрая — ${name}\n\n## Цель\n\n\n## Прогресс\n\n- [ ] \n`;
            await this.app.vault.create(filePath, content);
            new Notice(`Создан поток: ${fileName}`);
          } else {
            const dirPrefix = type === 'gsd-phase' ? `Фаза ${phase} — ` : 'Поток — ';
            const dirName = `${dirPrefix}${name}`;
            const dirPath = `${CLAUDE_MEMORY_DIR}/${STREAMS_DIR}/${dirName}`;

            const streamContent = frontmatter + `# ${dirName}\n\n## Цель\n\n`;
            await this.app.vault.create(`${dirPath}/STREAM.md`, streamContent);
            await this.app.vault.create(`${dirPath}/Решения.md`, `# Решения\n\n`);
            await this.app.vault.create(`${dirPath}/Прогресс.md`, `# Прогресс\n\n- [ ] \n`);
            new Notice(`Создан поток: ${dirName}/`);
          }

          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class CreateBaseModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Создать базу' });

    let name = '';
    let description = '';
    let paths = '';
    let tags = '';

    new Setting(contentEl).setName('Название').addText((t) =>
      t.setPlaceholder('Плагин Obsidian').onChange((v) => (name = v))
    );

    new Setting(contentEl).setName('Описание').addTextArea((t) =>
      t.setPlaceholder('Что это за направление работы').onChange((v) => (description = v))
    );

    new Setting(contentEl).setName('Пути').setDesc('Через запятую').addText((t) =>
      t.setPlaceholder('src/sync/, src/main.ts').onChange((v) => (paths = v))
    );

    new Setting(contentEl).setName('Теги').setDesc('Через запятую').addText((t) =>
      t.setPlaceholder('obsidian, plugin').onChange((v) => (tags = v))
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText('Создать')
        .setCta()
        .onClick(async () => {
          if (!name) {
            new Notice('Введите название');
            return;
          }

          const today = new Date().toISOString().slice(0, 10);
          const pathsList = paths ? paths.split(',').map((p) => p.trim()).filter(Boolean) : [];
          const tagsList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

          const pathsYaml = pathsList.length > 0
            ? `paths:\n${pathsList.map((p) => `  - ${p}`).join('\n')}`
            : 'paths: []';
          const tagsYaml = tagsList.length > 0
            ? `tags: [${tagsList.join(', ')}]`
            : 'tags: []';

          const content = [
            '---',
            `name: ${name}`,
            `description: ${description}`,
            pathsYaml,
            tagsYaml,
            `created: ${today}`,
            '---',
            '',
            '## Описание',
            description,
            '',
            '## Ключевые компоненты',
            '',
            '',
            '## Хронология',
            '',
          ].join('\n');

          const filePath = `${CLAUDE_MEMORY_DIR}/${BASES_DIR}/${name}.md`;
          await this.app.vault.create(filePath, content);
          new Notice(`Создана база: ${name}`);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LinkStreamsModal extends Modal {
  private plugin: ClaudeMemoryPlugin;

  constructor(app: App, plugin: ClaudeMemoryPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Связать потоки' });

    const { streams } = await loadMemoryIndex(this.app.vault);
    const streamNames = streams.map((s) => s.name);

    let from = '';
    let to = '';
    let reason = '';

    new Setting(contentEl).setName('Из потока').addDropdown((dd) => {
      dd.addOption('', '— выберите —');
      for (const name of streamNames) dd.addOption(name, name);
      dd.onChange((v) => (from = v));
    });

    new Setting(contentEl).setName('В поток').addDropdown((dd) => {
      dd.addOption('', '— выберите —');
      for (const name of streamNames) dd.addOption(name, name);
      dd.onChange((v) => (to = v));
    });

    new Setting(contentEl).setName('Причина связи').addText((t) =>
      t.setPlaceholder('Почему связаны').onChange((v) => (reason = v))
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText('Связать')
        .setCta()
        .onClick(async () => {
          if (!from || !to || !reason) {
            new Notice('Заполните все поля');
            return;
          }

          const fromStream = streams.find((s) => s.name === from);
          if (fromStream) {
            const file = this.app.vault.getAbstractFileByPath(fromStream.path);
            if (file && file instanceof TFile) {
              const content = await this.app.vault.read(file);
              const newRelated = `  - stream: "[[${to}]]"\n    reason: "${reason}"`;
              const updated = content.replace(
                /related:\s*\[\]/,
                `related:\n${newRelated}`
              ).replace(
                /(related:\n(?:  - .*\n    .*\n)*)/,
                `$1${newRelated}\n`
              );
              await this.app.vault.modify(file, updated);
            }
          }

          new Notice(`Связь добавлена: ${from} → ${to}`);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

async function archiveCurrentStream(plugin: ClaudeMemoryPlugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.includes(STREAMS_DIR)) {
    new Notice('Откройте файл потока для архивации');
    return;
  }

  const content = await plugin.app.vault.read(activeFile);
  const today = new Date().toISOString().slice(0, 10);
  const updated = content
    .replace(/status:\s*active/, 'status: complete')
    .replace(/status:\s*paused/, 'status: complete')
    .replace(/(started:.*\n)/, `$1completed: ${today}\n`);

  await plugin.app.vault.modify(activeFile, updated);
  new Notice('Поток помечен как завершённый');
}

async function setContextPriority(plugin: ClaudeMemoryPlugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.startsWith(CLAUDE_MEMORY_DIR)) {
    new Notice('Откройте файл из claude-memory/');
    return;
  }

  const content = await plugin.app.vault.read(activeFile);

  if (content.includes('priority: high')) {
    const updated = content.replace(/priority:\s*high\n?/, '');
    await plugin.app.vault.modify(activeFile, updated);
    new Notice('Приоритет снят');
  } else {
    const updated = content.replace(/---\n/, '---\npriority: high\n');
    await plugin.app.vault.modify(activeFile, updated);
    new Notice('Файл помечен как приоритетный — агент прочитает его первым');
  }
}
