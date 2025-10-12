import { Plugin, TFile, Notice } from 'obsidian';
import { ConvergentSettings, DEFAULT_SETTINGS } from './settings';
import { ConvergentSettingTab } from './settings-tab';
import { IssueCommands } from './commands/issue-commands';
import { SwitcherCommands } from './commands/switcher-commands';
import { BatchCommands } from './commands/batch-commands';
import { RelationshipCommands } from './commands/relationship-commands';
import { FrontmatterUtils } from './utils/frontmatter';
import { RelationshipUtils } from './utils/relationships';
import { KanbanView, KANBAN_VIEW_TYPE } from './views/kanban-view';
import { TableView, TABLE_VIEW_TYPE } from './views/table-view';

export default class ConvergentPlugin extends Plugin {
	settings: ConvergentSettings;
	frontmatterUtils: FrontmatterUtils;
	relationshipUtils: RelationshipUtils;
	issueCommands: IssueCommands;
	switcherCommands: SwitcherCommands;
	batchCommands: BatchCommands;
	relationshipCommands: RelationshipCommands;

	async onload() {
		console.log('Loading Convergent plugin');

		// Load settings
		await this.loadSettings();

		// Initialize utilities
		this.frontmatterUtils = new FrontmatterUtils(this.app);
		this.relationshipUtils = new RelationshipUtils(this.app);

		// Register views
		this.registerView(
			KANBAN_VIEW_TYPE,
			(leaf) => new KanbanView(leaf, this)
		);
		this.registerView(
			TABLE_VIEW_TYPE,
			(leaf) => new TableView(leaf, this)
		);

		// Initialize command handlers
		this.issueCommands = new IssueCommands(this.app, this, this.frontmatterUtils);
		this.switcherCommands = new SwitcherCommands(this.app, this);
		this.batchCommands = new BatchCommands(this.app, this);
		this.relationshipCommands = new RelationshipCommands(this.app, this, this.relationshipUtils, this.frontmatterUtils);

		// Register commands
		this.registerCommands();

		// Register event handlers
		this.registerEventHandlers();

		// Add ribbon icons
		this.addRibbonIcon('layout-dashboard', 'Open Kanban Board', () => {
			this.activateKanbanView();
		});
		this.addRibbonIcon('table', 'Open Issue Table', () => {
			this.activateTableView();
		});

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

		// Register switcher commands (quick switcher)
		this.switcherCommands.registerCommands();

		// Register relationship commands (parent/child, blocking, related)
		this.relationshipCommands.registerCommands();

		// Open Kanban view
		this.addCommand({
			id: 'open-kanban-board',
			name: 'Open Kanban board',
			callback: () => this.activateKanbanView()
		});

		// Open Table view
		this.addCommand({
			id: 'open-issue-table',
			name: 'Open issue table',
			callback: () => this.activateTableView()
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

	async activateKanbanView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(KANBAN_VIEW_TYPE)[0];

		if (!leaf) {
			// Open in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: KANBAN_VIEW_TYPE,
					active: true
				});
				leaf = rightLeaf;
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async activateTableView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(TABLE_VIEW_TYPE)[0];

		if (!leaf) {
			// Open in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: TABLE_VIEW_TYPE,
					active: true
				});
				leaf = rightLeaf;
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
