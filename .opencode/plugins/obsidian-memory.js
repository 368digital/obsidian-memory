/**
 * Obsidian Memory plugin for Claude Code
 *
 * Registers the obsidian-memory skill directory so Claude Code
 * discovers and auto-activates it when claude-memory/ exists in a project.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ObsidianMemoryPlugin = async ({ client, directory }) => {
  const skillsDir = path.resolve(__dirname, '../../skills');

  return {
    // Inject skills path into config so Claude Code discovers our skills
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    },
  };
};
