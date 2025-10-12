import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { Issue, IssueStatus } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

export const KANBAN_VIEW_TYPE = 'convergent-kanban-view';

interface KanbanColumn {
	status: IssueStatus;
	issues: Issue[];
	element: HTMLElement;
}

interface KanbanFilters {
	priority?: 'all' | 'Low' | 'Medium' | 'High' | 'Urgent';
	labels?: string[];
	search?: string;
	showCanceled?: boolean;
}

/**
 * Kanban board view for visualizing and managing issues
 * Provides drag-and-drop functionality and filtering
 */
export class KanbanView extends ItemView {
	plugin: ConvergentPlugin;
	private columns: KanbanColumn[] = [];
	private allIssues: Issue[] = [];
	private filters: KanbanFilters = {
		priority: 'all',
		labels: [],
		search: '',
		showCanceled: false
	};

	constructor(leaf: WorkspaceLeaf, plugin: ConvergentPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return KANBAN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Kanban Board';
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('convergent-kanban');

		// Render header
		this.renderHeader(container);

		// Create board container
		const boardContainer = container.createDiv('kanban-board');

		// Load issues and render board
		await this.loadIssues();
		this.renderBoard();

		console.log('Kanban view opened');
	}

	async onClose() {
		// Cleanup
		console.log('Kanban view closed');
	}

	/**
	 * Render header with title and filters
	 */
	private renderHeader(container: HTMLElement) {
		const header = container.createDiv('kanban-header');

		// Title
		header.createEl('h3', { text: 'Kanban Board' });

		// Filters container (will be populated in Day 4)
		const filtersContainer = header.createDiv('kanban-filters');
		// Placeholder for now
	}

	/**
	 * Load all issues from vault
	 */
	async loadIssues(): Promise<void> {
		const issuesFolder = this.plugin.settings.issuesFolder;
		const files = this.app.vault.getMarkdownFiles();

		this.allIssues = [];

		for (const file of files) {
			// Check if file is in issues folder
			if (!file.path.startsWith(issuesFolder)) continue;

			const frontmatter = await this.plugin.frontmatterUtils.getFrontmatter(file);
			if (!frontmatter || frontmatter.type !== 'issue') continue;

			const issue = frontmatter as Issue;
			issue.file = file;

			this.allIssues.push(issue);
		}

		console.log(`Loaded ${this.allIssues.length} issues for Kanban`);
	}

	/**
	 * Render the entire board with all columns
	 */
	renderBoard(): void {
		const boardContainer = this.containerEl.querySelector('.kanban-board');
		if (!boardContainer) return;

		boardContainer.empty();

		// Define all statuses
		const statuses: IssueStatus[] = [
			'Backlog',
			'Todo',
			'In Progress',
			'In Review',
			'Done',
			'Canceled'
		];

		// Create columns for each status
		this.columns = [];
		statuses.forEach(status => {
			const column = this.renderColumn(status);
			boardContainer.appendChild(column);
		});
	}

	/**
	 * Render a single column for a status
	 */
	private renderColumn(status: IssueStatus): HTMLElement {
		const column = document.createElement('div');
		column.className = 'kanban-column';
		column.dataset.status = status;

		// Make column a drop target
		// Drag over - allow drop
		column.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
			column.addClass('drag-over');
		});

		// Drag leave - remove highlight
		column.addEventListener('dragleave', (e) => {
			// Only remove if leaving the column itself, not a child
			if (e.target === column) {
				column.removeClass('drag-over');
			}
		});

		// Drop - handle the drop
		column.addEventListener('drop', async (e) => {
			e.preventDefault();
			column.removeClass('drag-over');

			if (e.dataTransfer) {
				const filePath = e.dataTransfer.getData('text/plain');
				await this.handleDrop(filePath, status);
			}
		});

		// Filter issues for this status
		const columnIssues = this.allIssues.filter(issue => {
			// Apply status filter
			if (issue.status !== status) return false;

			// Hide canceled if filter is off
			if (!this.filters.showCanceled && status === 'Canceled') return false;

			return true;
		});

		// Render column header
		this.renderColumnHeader(column, status, columnIssues);

		// Render column body with cards
		const body = column.createDiv('kanban-column-body');

		if (columnIssues.length === 0) {
			// Empty state
			const empty = body.createDiv('kanban-empty-state');
			empty.createDiv({ cls: 'kanban-empty-icon', text: '📋' });
			empty.createDiv({ cls: 'kanban-empty-text', text: 'No issues' });
			empty.createDiv({ cls: 'kanban-empty-hint', text: 'Drag here or click + to add' });
		} else {
			// Render cards
			columnIssues.forEach(issue => {
				const card = this.renderCard(issue);
				body.appendChild(card);
			});
		}

		// Store column data
		this.columns.push({
			status,
			issues: columnIssues,
			element: column
		});

		return column;
	}

	/**
	 * Render column header with status name, icon, and count
	 */
	private renderColumnHeader(column: HTMLElement, status: IssueStatus, issues: Issue[]) {
		const header = column.createDiv('kanban-column-header');

		// Status icon
		const icon = header.createDiv('kanban-status-icon');
		icon.setText(this.getStatusIcon(status));

		// Status name
		const name = header.createDiv('kanban-status-name');
		name.setText(status);

		// Issue count
		const count = header.createDiv('kanban-issue-count');
		count.setText(issues.length.toString());

		// Add issue button
		const addBtn = header.createDiv('kanban-add-btn');
		addBtn.innerHTML = '+';
		addBtn.setAttribute('title', 'Create issue in this column');
		addBtn.addEventListener('click', () => {
			this.createIssueInColumn(status);
		});
	}

	/**
	 * Render a single issue card
	 */
	private renderCard(issue: Issue): HTMLElement {
		const card = document.createElement('div');
		card.className = 'kanban-card';
		card.dataset.issueId = issue.id || '';
		card.dataset.issuePath = issue.file?.path || '';

		// Make card draggable
		card.draggable = true;

		// Drag start handler
		card.addEventListener('dragstart', (e) => {
			if (e.dataTransfer && issue.file) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', issue.file.path);
				card.addClass('dragging');
			}
		});

		// Drag end handler
		card.addEventListener('dragend', (e) => {
			card.removeClass('dragging');
		});

		// Card header with priority and ID
		const cardHeader = card.createDiv('kanban-card-header');

		// Priority icon
		if (issue.priority) {
			const priorityIcon = cardHeader.createDiv('kanban-card-priority');
			priorityIcon.addClass(`priority-${issue.priority.toLowerCase()}`);
			priorityIcon.setText(this.getPriorityIcon(issue.priority));
		}

		// Issue ID
		const id = cardHeader.createDiv('kanban-card-id');
		id.setText(issue.id || '');

		// Card title
		const title = card.createDiv('kanban-card-title');
		title.setText(issue.title);

		// Click handler - open issue
		card.addEventListener('click', async (e) => {
			if (!e.defaultPrevented && issue.file) {
				await this.app.workspace.getLeaf().openFile(issue.file);
			}
		});

		return card;
	}

	/**
	 * Get icon for status
	 */
	private getStatusIcon(status: IssueStatus): string {
		const icons: Record<IssueStatus, string> = {
			'Backlog': '○',
			'Todo': '◯',
			'In Progress': '◐',
			'In Review': '◑',
			'Done': '●',
			'Canceled': '✕'
		};
		return icons[status] || '○';
	}

	/**
	 * Get icon for priority
	 */
	private getPriorityIcon(priority: string): string {
		const icons: Record<string, string> = {
			'Low': '⬇',
			'Medium': '→',
			'High': '⬆',
			'Urgent': '🔥'
		};
		return icons[priority] || '→';
	}

	/**
	 * Create a new issue
	 * For Day 1, this just opens the create issue modal
	 * In Day 2+, we can pre-set the status based on the column
	 */
	private async createIssueInColumn(status: IssueStatus) {
		// Open create issue modal
		// Note: The modal will default to the status in settings
		// User can then drag the created issue to the correct column
		await this.plugin.issueCommands.createIssue();

		// Refresh board after a delay to pick up new issues
		setTimeout(async () => {
			await this.loadIssues();
			this.renderBoard();
		}, 1000);
	}

	/**
	 * Handle drop event - update issue status
	 */
	private async handleDrop(filePath: string, newStatus: IssueStatus): Promise<void> {
		try {
			// Get file
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				console.error('Dropped item is not a file');
				return;
			}

			// Get issue frontmatter
			const frontmatter = await this.plugin.frontmatterUtils.getFrontmatter(file);
			if (!frontmatter || frontmatter.type !== 'issue') {
				console.error('Dropped file is not an issue');
				return;
			}

			const issue = frontmatter as Issue;
			const oldStatus = issue.status;

			// Check if status actually changed
			if (oldStatus === newStatus) {
				console.log('Status unchanged, no update needed');
				return;
			}

			// Update frontmatter
			await this.plugin.frontmatterUtils.updateFrontmatter(file, {
				status: newStatus,
				modified: new Date().toISOString()
			});

			// Show success notice
			new Notice(`Moved ${issue.id || file.basename} from ${oldStatus} to ${newStatus}`);

			// Refresh board to show changes
			await this.loadIssues();
			this.renderBoard();

			console.log(`Successfully moved issue from ${oldStatus} to ${newStatus}`);
		} catch (error) {
			console.error('Error handling drop:', error);
			new Notice('Failed to update issue status');
		}
	}

	/**
	 * Refresh the board (reload issues and re-render)
	 */
	async refreshBoard(): Promise<void> {
		await this.loadIssues();
		this.renderBoard();
		new Notice('Board refreshed');
	}
}
