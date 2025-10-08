import { App, PluginSettingTab, Setting } from 'obsidian';
import ConvergentPlugin from './main';

export class ConvergentSettingTab extends PluginSettingTab {
	plugin: ConvergentPlugin;

	constructor(app: App, plugin: ConvergentPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Convergent Settings' });

		// Folder Locations Section
		containerEl.createEl('h3', { text: 'Folder Locations' });

		new Setting(containerEl)
			.setName('Issues folder')
			.setDesc('Where to store issue files')
			.addText(text => text
				.setPlaceholder('Issues')
				.setValue(this.plugin.settings.issuesFolder)
				.onChange(async (value) => {
					this.plugin.settings.issuesFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Projects folder')
			.setDesc('Where to store project files')
			.addText(text => text
				.setPlaceholder('Projects')
				.setValue(this.plugin.settings.projectsFolder)
				.onChange(async (value) => {
					this.plugin.settings.projectsFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sessions folder')
			.setDesc('Where to store MSP session files')
			.addText(text => text
				.setPlaceholder('Sessions')
				.setValue(this.plugin.settings.sessionsFolder)
				.onChange(async (value) => {
					this.plugin.settings.sessionsFolder = value;
					await this.plugin.saveSettings();
				}));

		// Issue Defaults Section
		containerEl.createEl('h3', { text: 'Issue Defaults' });

		new Setting(containerEl)
			.setName('Default status')
			.setDesc('Default status for new issues')
			.addDropdown(dropdown => dropdown
				.addOption('Backlog', 'Backlog')
				.addOption('Todo', 'Todo')
				.addOption('In Progress', 'In Progress')
				.setValue(this.plugin.settings.defaultStatus)
				.onChange(async (value) => {
					this.plugin.settings.defaultStatus = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default priority')
			.setDesc('Default priority for new issues')
			.addDropdown(dropdown => dropdown
				.addOption('Low', 'Low')
				.addOption('Medium', 'Medium')
				.addOption('High', 'High')
				.addOption('Urgent', 'Urgent')
				.setValue(this.plugin.settings.defaultPriority)
				.onChange(async (value) => {
					this.plugin.settings.defaultPriority = value;
					await this.plugin.saveSettings();
				}));

		// MSP Settings Section
		containerEl.createEl('h3', { text: 'MSP (Session Tracking)' });

		new Setting(containerEl)
			.setName('Enable MSP')
			.setDesc('Enable session tracking and context engineering')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMSP)
				.onChange(async (value) => {
					this.plugin.settings.enableMSP = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-start sessions')
			.setDesc('Automatically start a session when Obsidian opens')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoStartSession)
				.onChange(async (value) => {
					this.plugin.settings.autoStartSession = value;
					await this.plugin.saveSettings();
				}));

		// MCP Integration Section
		containerEl.createEl('h3', { text: 'MCP Integration (Optional)' });

		new Setting(containerEl)
			.setName('Enable MCP')
			.setDesc('Enable Model Context Protocol integration')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMCP)
				.onChange(async (value) => {
					this.plugin.settings.enableMCP = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('MCP server URL')
			.setDesc('URL of your MCP server')
			.addText(text => text
				.setPlaceholder('http://localhost:3000')
				.setValue(this.plugin.settings.mcpServerUrl)
				.onChange(async (value) => {
					this.plugin.settings.mcpServerUrl = value;
					await this.plugin.saveSettings();
				}));

		// UI Preferences Section
		containerEl.createEl('h3', { text: 'UI Preferences' });

		new Setting(containerEl)
			.setName('Show status bar')
			.setDesc('Show Convergent status in the status bar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value) => {
					this.plugin.settings.showStatusBar = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Keyboard shortcuts')
			.setDesc('Enable keyboard shortcuts for quick actions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.keyboardShortcutsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.keyboardShortcutsEnabled = value;
					await this.plugin.saveSettings();
				}));
	}
}
