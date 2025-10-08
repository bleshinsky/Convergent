import { Plugin, TFile, Notice } from 'obsidian';
import { ConvergentSettings, DEFAULT_SETTINGS } from './settings';
import { ConvergentSettingTab } from './settings-tab';
import { IssueCommands } from './commands/issue-commands';
import { FrontmatterUtils } from './utils/frontmatter';

export default class ConvergentPlugin extends Plugin {
	settings: ConvergentSettings;
	frontmatterUtils: FrontmatterUtils;
	issueCommands: IssueCommands;

	async onload() {
		console.log('Loading Convergent plugin');

		// Load settings
		await this.loadSettings();

		// Initialize utilities
		this.frontmatterUtils = new FrontmatterUtils(this.app);

		// Initialize command handlers
		this.issueCommands = new IssueCommands(this.app, this, this.frontmatterUtils);

		// Register commands
		this.registerCommands();

		// Register event handlers
		this.registerEventHandlers();

		// Add settings tab
		this.addSettingTab(new ConvergentSettingTab(this.app, this));

		// Add status bar item
		const statusBarItem = this.addStatusBarItem();
		statusBarItem.setText('Convergent ready');

		console.log('Convergent plugin loaded successfully');
	}

	async onunload() {
		console.log('Unloading Convergent plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerCommands() {
		// Register issue commands (create, update, delete, etc.)
		this.issueCommands.registerCommands();

		// Open Kanban view
		this.addCommand({
			id: 'open-kanban',
			name: 'Open Kanban board',
			callback: () => {
				new Notice('Kanban view - Coming in Week 4!');
			}
		});

		// Start session (MSP)
		this.addCommand({
			id: 'start-session',
			name: 'Start session',
			callback: () => {
				new Notice('Session tracking - Coming in Week 7!');
			}
		});

		console.log('Convergent commands registered');
	}

	registerEventHandlers() {
		// File creation handler
		this.registerEvent(
			this.app.vault.on('create', (file: TFile) => {
				console.log('File created:', file.path);
				// Will handle auto-tagging, template application, etc.
			})
		);

		// File modification handler
		this.registerEvent(
			this.app.vault.on('modify', (file: TFile) => {
				// Will handle status automation, progress tracking, etc.
			})
		);

		console.log('Convergent event handlers registered');
	}
}
