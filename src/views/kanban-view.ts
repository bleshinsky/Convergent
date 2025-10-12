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
	private searchDebounceTimer: number | null = null;
	private refreshTimer: number | null = null;

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

		// Register keyboard shortcuts
		this.registerKeyboardShortcuts();

		// Register auto-refresh on file changes
		this.registerAutoRefresh();

		// Render header
		this.renderHeader(container);

		// Create board container
		const boardContainer = container.createDiv('kanban-board');

		// Load issues and render board
		await this.loadIssues();
		this.renderBoard();

		console.log('Kanban view opened');
	}

	/**
	 * Register keyboard shortcuts for this view
	 */
	private registerKeyboardShortcuts() {
		if (!this.scope) return;

		// Cmd/Ctrl+F - Focus search
		this.scope.register(['Mod'], 'f', (evt) => {
			evt.preventDefault();
			const searchInput = this.containerEl.querySelector('.kanban-search-input') as HTMLInputElement;
			if (searchInput) {
				searchInput.focus();
				searchInput.select();
			}
			return false;
		});

		// Cmd/Ctrl+R - Refresh board
		this.scope.register(['Mod'], 'r', (evt) => {
			evt.preventDefault();
			this.refreshBoard();
			return false;
		});

		// Cmd/Ctrl+Shift+C - Clear filters
		this.scope.register(['Mod', 'Shift'], 'c', (evt) => {
			evt.preventDefault();
			this.clearFilters();
			return false;
		});
	}

	/**
	 * Register auto-refresh on file changes
	 */
	private registerAutoRefresh() {
		// Watch for file modifications in issues folder
		this.registerEvent(
			this.app.vault.on('modify', (file: TFile) => {
				// Check if modified file is in issues folder
				if (file.path.startsWith(this.plugin.settings.issuesFolder)) {
					// Debounced refresh
					this.scheduleRefresh();
				}
			})
		);

		// Watch for file deletion
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file.path.startsWith(this.plugin.settings.issuesFolder)) {
					this.scheduleRefresh();
				}
			})
		);

		// Watch for file creation
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file.path.startsWith(this.plugin.settings.issuesFolder)) {
					this.scheduleRefresh();
				}
			})
		);
	}

	/**
	 * Clear all filters
	 */
	private clearFilters() {
		this.filters = {
			priority: 'all',
			labels: [],
			search: '',
			showCanceled: false
		};
		const filtersContainer = this.containerEl.querySelector('.kanban-filters');
		if (filtersContainer) {
			this.renderFilters(filtersContainer as HTMLElement);
		}
		this.applyFilters();
		new Notice('Filters cleared');
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

		// Filters container
		const filtersContainer = header.createDiv('kanban-filters');
		this.renderFilters(filtersContainer);
	}

	/**
	 * Render filter controls
	 */
	private renderFilters(container: HTMLElement) {
		container.empty();

		// Search input
		const searchContainer = container.createDiv('kanban-filter-search');
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search issues...',
			cls: 'kanban-search-input'
		});
		searchInput.value = this.filters.search || '';
		searchInput.addEventListener('input', (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.handleSearchInput(value);
		});

		// Priority filter
		const priorityContainer = container.createDiv('kanban-filter-priority');
		priorityContainer.createSpan({ text: 'Priority: ', cls: 'kanban-filter-label' });

		const prioritySelect = priorityContainer.createEl('select', { cls: 'kanban-filter-select' });
		const priorities = ['all', 'Low', 'Medium', 'High', 'Urgent'];
		priorities.forEach(p => {
			const option = prioritySelect.createEl('option', { value: p, text: p === 'all' ? 'All' : p });
			if (this.filters.priority === p) option.selected = true;
		});
		prioritySelect.addEventListener('change', (e) => {
			this.filters.priority = (e.target as HTMLSelectElement).value as 'all' | 'Low' | 'Medium' | 'High' | 'Urgent';
			this.applyFilters();
		});

		// Show canceled toggle
		const canceledContainer = container.createDiv('kanban-filter-canceled');
		const canceledCheckbox = canceledContainer.createEl('input', {
			type: 'checkbox',
			cls: 'kanban-filter-checkbox'
		});
		canceledCheckbox.checked = this.filters.showCanceled || false;
		canceledCheckbox.addEventListener('change', (e) => {
			this.filters.showCanceled = (e.target as HTMLInputElement).checked;
			this.applyFilters();
		});
		canceledContainer.createSpan({ text: ' Show Canceled', cls: 'kanban-filter-label' });

		// Clear filters button
		const clearBtn = container.createEl('button', {
			text: 'Clear',
			cls: 'kanban-filter-clear'
		});
		clearBtn.addEventListener('click', () => {
			this.filters = {
				priority: 'all',
				labels: [],
				search: '',
				showCanceled: false
			};
			this.renderFilters(container);
			this.applyFilters();
		});
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

		// Get filtered issues for this status
		const filteredIssues = this.getFilteredIssues();
		const columnIssues = filteredIssues.filter(issue => issue.status === status);

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

		// Metadata section
		const meta = card.createDiv('kanban-card-meta');

		// Relationship indicators
		const hasRelationships = this.addRelationshipIndicators(meta, issue);

		// Labels
		if (issue.labels && issue.labels.length > 0) {
			const labelsContainer = card.createDiv('kanban-card-labels');
			const maxLabels = 3;
			const visibleLabels = issue.labels.slice(0, maxLabels);

			visibleLabels.forEach(label => {
				labelsContainer.createSpan({ cls: 'kanban-label', text: label });
			});

			if (issue.labels.length > maxLabels) {
				labelsContainer.createSpan({
					cls: 'kanban-label-more',
					text: `+${issue.labels.length - maxLabels}`
				});
			}
		}

		// Due date (if exists and upcoming)
		if (issue.due) {
			this.addDueDateIndicator(card, issue.due);
		}

		// Click handler - open issue
		card.addEventListener('click', async (e) => {
			if (!e.defaultPrevented && issue.file) {
				await this.app.workspace.getLeaf().openFile(issue.file);
			}
		});

		return card;
	}

	/**
	 * Add relationship indicators to card metadata
	 */
	private addRelationshipIndicators(meta: HTMLElement, issue: Issue): boolean {
		let hasRelationships = false;

		// Parent indicator
		if (issue.parent) {
			meta.createSpan({ cls: 'kanban-meta-item', text: '↑', title: 'Has parent' });
			hasRelationships = true;
		}

		// Sub-issues (children) indicator
		if (issue.subIssues && issue.subIssues.length > 0) {
			const childCount = issue.subIssues.length;
			meta.createSpan({
				cls: 'kanban-meta-item',
				text: `↓${childCount}`,
				title: `${childCount} sub-issue${childCount > 1 ? 's' : ''}`
			});
			hasRelationships = true;
		}

		// Blocked indicator
		if (issue.blockedBy && issue.blockedBy.length > 0) {
			meta.createSpan({
				cls: 'kanban-meta-item blocked',
				text: '🚫',
				title: 'Blocked'
			});
			hasRelationships = true;
		}

		// Related count (if any)
		if (issue.related && issue.related.length > 0) {
			meta.createSpan({
				cls: 'kanban-meta-item',
				text: `🔗${issue.related.length}`,
				title: `${issue.related.length} related issue${issue.related.length > 1 ? 's' : ''}`
			});
			hasRelationships = true;
		}

		return hasRelationships;
	}

	/**
	 * Add due date indicator if upcoming
	 */
	private addDueDateIndicator(card: HTMLElement, dueDate: string): void {
		try {
			const due = new Date(dueDate);
			const now = new Date();
			const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

			// Only show if within 7 days
			if (daysUntil <= 7 && daysUntil >= 0) {
				const dueEl = card.createDiv('kanban-card-due');
				dueEl.addClass(daysUntil <= 2 ? 'due-urgent' : 'due-soon');
				dueEl.setText(`📅 ${daysUntil}d`);
			} else if (daysUntil < 0) {
				// Overdue
				const dueEl = card.createDiv('kanban-card-due');
				dueEl.addClass('due-overdue');
				dueEl.setText(`📅 Overdue`);
			}
		} catch (error) {
			console.error('Invalid due date format:', dueDate, error);
		}
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
	 * Apply filters to issues and re-render board
	 */
	private applyFilters(): void {
		this.renderBoard();
	}

	/**
	 * Get filtered issues based on current filters
	 */
	private getFilteredIssues(): Issue[] {
		return this.allIssues.filter(issue => {
			// Priority filter
			if (this.filters.priority && this.filters.priority !== 'all') {
				if (issue.priority !== this.filters.priority) return false;
			}

			// Search filter (title and ID)
			if (this.filters.search && this.filters.search.trim().length > 0) {
				const query = this.filters.search.toLowerCase();
				const titleMatch = issue.title.toLowerCase().includes(query);
				const idMatch = issue.id?.toLowerCase().includes(query);
				if (!titleMatch && !idMatch) return false;
			}

			// Show canceled filter
			if (!this.filters.showCanceled && issue.status === 'Canceled') {
				return false;
			}

			// Labels filter (if implemented)
			if (this.filters.labels && this.filters.labels.length > 0) {
				if (!issue.labels || !this.filters.labels.some(l => issue.labels?.includes(l))) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Handle search input with debouncing
	 */
	private handleSearchInput(value: string) {
		if (this.searchDebounceTimer) {
			window.clearTimeout(this.searchDebounceTimer);
		}

		this.searchDebounceTimer = window.setTimeout(() => {
			this.filters.search = value;
			this.applyFilters();
		}, 300);
	}

	/**
	 * Schedule a debounced refresh
	 */
	private scheduleRefresh() {
		if (this.refreshTimer) {
			window.clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = window.setTimeout(async () => {
			await this.loadIssues();
			this.renderBoard();
			console.log('Board auto-refreshed');
		}, 500);
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
