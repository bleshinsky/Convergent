import { Plugin, TFile, Notice } from 'obsidian';
import { ConvergentSettings, DEFAULT_SETTINGS } from './settings';
import { ConvergentSettingTab } from './settings-tab';
import { IssueCommands } from './commands/issue-commands';
import { SwitcherCommands } from './commands/switcher-commands';
import { BatchCommands } from './commands/batch-commands';
import { RelationshipCommands } from './commands/relationship-commands';
import { ProjectCommands } from './commands/ProjectCommands';
import { MSPCommands } from './commands/MSPCommands';
import { DecisionBlockerCommands } from './commands/DecisionBlockerCommands';
import { FrontmatterUtils } from './utils/frontmatter';
import { RelationshipUtils } from './utils/relationships';
import { ViewManager } from './utils/viewManager';
import { KanbanView, KANBAN_VIEW_TYPE } from './views/kanban-view';
import { TableView, TABLE_VIEW_TYPE } from './views/table-view';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/timeline-view';
import { ProgressTracking } from './automation/ProgressTracking';
import { StatusAutomation } from './automation/StatusAutomation';
import { RecurringIssues } from './automation/RecurringIssues';

export default class ConvergentPlugin extends Plugin {
	settings: ConvergentSettings;
	frontmatterUtils: FrontmatterUtils;
	relationshipUtils: RelationshipUtils;
	viewManager: ViewManager;

	// Commands
	issueCommands: IssueCommands;
	switcherCommands: SwitcherCommands;
	batchCommands: BatchCommands;
	relationshipCommands: RelationshipCommands;
	projectCommands: ProjectCommands;
	mspCommands: MSPCommands;
	decisionBlockerCommands: DecisionBlockerCommands;

	// Automation
	progressTracking: ProgressTracking;
	statusAutomation: StatusAutomation;
	recurringIssues: RecurringIssues;

	// Status bar
	private sessionStatusBar: HTMLElement;

	async onload() {
		console.log('Loading Convergent plugin');

		await this.loadSettings();

		// Initialize utilities
		this.frontmatterUtils = new FrontmatterUtils(this.app);
		this.relationshipUtils = new RelationshipUtils(this.app);
		this.viewManager = new ViewManager(this);
		await this.viewManager.load();

		// Initialize automation
		this.progressTracking = new ProgressTracking(this.app, this.frontmatterUtils);
		this.statusAutomation = new StatusAutomation(
			this.app,
			this.frontmatterUtils,
			() => this.settings.enableStatusAutomation
		);
		this.recurringIssues = new RecurringIssues(
			this.app,
			this.frontmatterUtils,
			() => this.settings.issuesFolder
		);

		// Register views
		this.registerView(KANBAN_VIEW_TYPE, (leaf) => new KanbanView(leaf, this));
		this.registerView(TABLE_VIEW_TYPE, (leaf) => new TableView(leaf, this));
		this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this));

		// Initialize command handlers
		this.issueCommands = new IssueCommands(this.app, this, this.frontmatterUtils);
		this.switcherCommands = new SwitcherCommands(this.app, this);
		this.batchCommands = new BatchCommands(this.app, this);
		this.relationshipCommands = new RelationshipCommands(this.app, this, this.relationshipUtils, this.frontmatterUtils);
		this.projectCommands = new ProjectCommands(this.app, this, this.frontmatterUtils);
		this.mspCommands = new MSPCommands(this.app, this, this.frontmatterUtils);
		this.decisionBlockerCommands = new DecisionBlockerCommands(this.app, this, this.frontmatterUtils);

		// Register commands
		this.registerCommands();

		// Register event handlers
		this.registerEventHandlers();

		// Ribbon icons
		this.addRibbonIcon('layout-dashboard', 'Open Kanban board', () => this.activateKanbanView());
		this.addRibbonIcon('table', 'Open issue table', () => this.activateTableView());
		this.addRibbonIcon('calendar', 'Open timeline', () => this.activateTimelineView());

		// Settings tab
		this.addSettingTab(new ConvergentSettingTab(this.app, this));

		// Status bar
		if (this.settings.showStatusBar) {
			this.sessionStatusBar = this.addStatusBarItem();
			this.sessionStatusBar.setText('Convergent');
			this.mspCommands.setStatusBarItem(this.sessionStatusBar);
		}

		// Recurring issues check on load and every hour
		if (this.settings.enableRecurringIssues) {
			this.recurringIssues.checkAndCreate();
			this.registerInterval(
				window.setInterval(
					() => this.recurringIssues.checkAndCreate(),
					RecurringIssues.checkIntervalMs
				)
			);
		}

		console.log('Convergent plugin loaded successfully');
	}

	async onunload() {
		console.log('Unloading Convergent plugin');
		this.progressTracking.destroy();
		this.statusAutomation.destroy();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerCommands() {
		this.issueCommands.registerCommands();
		this.switcherCommands.registerCommands();
		this.relationshipCommands.registerCommands();
		this.projectCommands.registerCommands();
		this.mspCommands.registerCommands();
		this.decisionBlockerCommands.registerCommands();

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

		// Open Timeline view
		this.addCommand({
			id: 'open-timeline',
			name: 'Open timeline',
			callback: () => this.activateTimelineView()
		});

		// Recalculate all project progress
		this.addCommand({
			id: 'recalculate-progress',
			name: 'Recalculate all project progress',
			callback: async () => {
				await this.progressTracking.recalculateAll();
				new Notice('Project progress recalculated');
			}
		});

		console.log('Convergent commands registered');
	}

	registerEventHandlers() {
		this.registerEvent(
			this.app.vault.on('modify', (file: TFile) => {
				if (this.settings.enableProgressTracking) {
					this.progressTracking.onFileModified(file);
				}
				if (this.settings.enableStatusAutomation) {
					this.statusAutomation.onFileModified(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('create', (file: TFile) => {
				console.log('File created:', file.path);
			})
		);

		console.log('Convergent event handlers registered');
	}

	async activateKanbanView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(KANBAN_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: KANBAN_VIEW_TYPE, active: true });
				leaf = rightLeaf;
			}
		}
		if (leaf) workspace.revealLeaf(leaf);
	}

	async activateTableView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(TABLE_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: TABLE_VIEW_TYPE, active: true });
				leaf = rightLeaf;
			}
		}
		if (leaf) workspace.revealLeaf(leaf);
	}

	async activateTimelineView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
				leaf = rightLeaf;
			}
		}
		if (leaf) workspace.revealLeaf(leaf);
	}
}
