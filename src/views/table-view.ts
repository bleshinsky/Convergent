import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import ConvergentPlugin from '../main';
import { Issue, IssueStatus, IssuePriority } from '../types';

export const TABLE_VIEW_TYPE = 'convergent-table-view';

interface TableColumn {
	key: string;
	label: string;
	width: string;
	visible: boolean;
	sortable: boolean;
}

interface SortConfig {
	column: string;
	direction: 'asc' | 'desc';
	level: number;
}

export class TableView extends ItemView {
	plugin: ConvergentPlugin;
	private issues: Issue[] = [];
	private sortedIssues: Issue[] = [];
	private sortConfig: SortConfig[] = [];
	private columns: TableColumn[] = [
		{ key: 'id', label: 'ID', width: '80px', visible: true, sortable: true },
		{ key: 'title', label: 'Title', width: 'auto', visible: true, sortable: true },
		{ key: 'status', label: 'Status', width: '120px', visible: true, sortable: true },
		{ key: 'priority', label: 'Priority', width: '100px', visible: true, sortable: true },
		{ key: 'labels', label: 'Labels', width: '150px', visible: true, sortable: false },
		{ key: 'due', label: 'Due Date', width: '120px', visible: true, sortable: true },
		{ key: 'modified', label: 'Updated', width: '120px', visible: true, sortable: true }
	];

	constructor(leaf: WorkspaceLeaf, plugin: ConvergentPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TABLE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Issue Table';
	}

	getIcon(): string {
		return 'table';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('convergent-table-view');

		// Load issues
		await this.loadIssues();

		// Render table
		this.renderTable();
	}

	async onClose(): Promise<void> {
		// Cleanup
	}

	async loadIssues(): Promise<void> {
		this.issues = [];
		const issuesFolder = this.plugin.settings.issuesFolder;

		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			if (!file.path.startsWith(issuesFolder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;
			if (fm.type !== 'issue') continue;

			const issue: Issue = {
				type: 'issue',
				id: fm.id || '',
				title: fm.title || file.basename,
				status: fm.status || 'Backlog',
				created: fm.created || '',
				modified: fm.modified || '',
				priority: fm.priority,
				estimate: fm.estimate,
				due: fm.due,
				labels: Array.isArray(fm.labels) ? fm.labels : [],
				project: fm.project,
				parent: fm.parent,
				subIssues: Array.isArray(fm['sub-issues']) ? fm['sub-issues'] : [],
				blockedBy: Array.isArray(fm['blocked-by']) ? fm['blocked-by'] : [],
				blocks: Array.isArray(fm.blocks) ? fm.blocks : [],
				related: Array.isArray(fm.related) ? fm.related : []
			};

			issue.file = file;

			this.issues.push(issue);
		}

		console.log(`Loaded ${this.issues.length} issues for table view`);
	}

	renderTable(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// Header
		const header = container.createDiv('convergent-table-header');

		// Left side - title and count
		const headerLeft = header.createDiv('convergent-table-header-left');
		headerLeft.createEl('h4', { text: 'Issues' });
		headerLeft.createEl('span', {
			text: `${this.issues.length} issues`,
			cls: 'convergent-table-count'
		});

		// Right side - column settings
		const headerRight = header.createDiv('convergent-table-header-right');
		this.renderColumnSettings(headerRight);

		// Sort issues
		this.sortedIssues = this.sortIssues([...this.issues]);

		// Table container (scrollable)
		const tableContainer = container.createDiv('convergent-table-container');
		const table = tableContainer.createEl('table', { cls: 'convergent-table' });

		// Table header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');

		for (const column of this.columns) {
			if (!column.visible) continue;

			const th = headerRow.createEl('th', {
				attr: {
					'data-column': column.key,
					style: column.width !== 'auto' ? `width: ${column.width}` : ''
				},
				cls: column.sortable ? 'convergent-table-sortable' : ''
			});

			const headerContent = th.createDiv('convergent-table-header-content');

			// Column label with icon
			const label = headerContent.createSpan({ cls: 'convergent-table-column-label' });

			// Add icon for specific columns
			if (column.key === 'status') {
				label.createSpan({ cls: 'convergent-table-column-icon', text: '◐' });
			} else if (column.key === 'priority') {
				label.createSpan({ cls: 'convergent-table-column-icon', text: '⬆' });
			}

			label.createSpan({ text: column.label });

			// Add sort indicator if this column is sorted
			const sortIndex = this.sortConfig.findIndex(s => s.column === column.key);
			if (sortIndex !== -1) {
				const sort = this.sortConfig[sortIndex];
				const indicator = headerContent.createSpan({ cls: 'convergent-table-sort-indicator' });

				// Direction arrow
				indicator.createSpan({
					cls: 'convergent-table-sort-arrow',
					text: sort.direction === 'asc' ? '↑' : '↓'
				});

				// Level badge if multi-level sort
				if (this.sortConfig.length > 1) {
					indicator.createSpan({
						cls: 'convergent-table-sort-level',
						text: (sortIndex + 1).toString()
					});
				}
			}

			// Add click handler for sortable columns
			if (column.sortable) {
				th.addEventListener('click', (e) => {
					this.handleColumnSort(column.key, e.shiftKey);
				});
			}
		}

		// Table body
		const tbody = table.createEl('tbody');

		if (this.sortedIssues.length === 0) {
			const emptyRow = tbody.createEl('tr', { cls: 'convergent-table-empty' });
			const emptyCell = emptyRow.createEl('td', {
				attr: { colspan: this.columns.filter(c => c.visible).length.toString() },
				text: 'No issues found'
			});
			return;
		}

		// Render each issue as a row
		for (const issue of this.sortedIssues) {
			this.renderRow(tbody, issue);
		}
	}

	/**
	 * Render column settings dropdown
	 */
	private renderColumnSettings(container: HTMLElement): void {
		const settingsBtn = container.createEl('button', {
			cls: 'convergent-table-settings-btn',
			text: '⚙️ Columns'
		});

		const dropdown = container.createDiv('convergent-table-settings-dropdown');
		dropdown.style.display = 'none';

		// Column checkboxes
		const columnsSection = dropdown.createDiv('convergent-table-settings-section');
		columnsSection.createEl('h5', { text: 'Visible Columns' });

		for (const column of this.columns) {
			const row = columnsSection.createDiv('convergent-table-settings-row');

			const checkbox = row.createEl('input', { type: 'checkbox' });
			checkbox.checked = column.visible;
			checkbox.addEventListener('change', (e) => {
				column.visible = (e.target as HTMLInputElement).checked;
				this.renderTable();
			});

			row.createSpan({ text: column.label });
		}

		// Show/Hide all buttons
		const buttonsRow = columnsSection.createDiv('convergent-table-settings-buttons');

		const showAllBtn = buttonsRow.createEl('button', {
			text: 'Show All',
			cls: 'convergent-table-settings-action-btn'
		});
		showAllBtn.addEventListener('click', () => {
			this.columns.forEach(c => c.visible = true);
			this.renderTable();
		});

		const hideAllBtn = buttonsRow.createEl('button', {
			text: 'Hide All',
			cls: 'convergent-table-settings-action-btn'
		});
		hideAllBtn.addEventListener('click', () => {
			// Don't allow hiding all columns
			if (this.columns.filter(c => c.visible).length > 1) {
				this.columns.forEach(c => c.visible = false);
				// Keep at least ID column visible
				this.columns[0].visible = true;
				this.renderTable();
			} else {
				new Notice('At least one column must be visible');
			}
		});

		// Clear sorts button
		if (this.sortConfig.length > 0) {
			const sortSection = dropdown.createDiv('convergent-table-settings-section');
			const clearSortBtn = sortSection.createEl('button', {
				text: '↺ Clear Sorts',
				cls: 'convergent-table-settings-action-btn convergent-table-clear-sort-btn'
			});
			clearSortBtn.addEventListener('click', () => {
				this.sortConfig = [];
				this.renderTable();
			});
		}

		// Toggle dropdown visibility
		settingsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isVisible = dropdown.style.display !== 'none';
			dropdown.style.display = isVisible ? 'none' : 'block';
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!container.contains(e.target as Node)) {
				dropdown.style.display = 'none';
			}
		});
	}

	private renderRow(tbody: HTMLElement, issue: Issue): void {
		const row = tbody.createEl('tr', {
			cls: 'convergent-table-row',
			attr: { 'data-issue-id': issue.id }
		});

		// Make row clickable to open issue
		row.addEventListener('click', async (e) => {
			const target = e.target as HTMLElement;
			// Don't trigger if clicking on a link or button
			if (target.tagName === 'A' || target.closest('a')) return;

			if (issue.file) {
				await this.app.workspace.getLeaf(false).openFile(issue.file);
			}
		});

		// Render each column
		for (const column of this.columns) {
			if (!column.visible) continue;

			const cell = row.createEl('td', {
				cls: `convergent-table-cell convergent-table-cell-${column.key}`
			});

			this.renderCell(cell, issue, column.key);
		}
	}

	private renderCell(cell: HTMLElement, issue: Issue, columnKey: string): void {
		switch (columnKey) {
			case 'id':
				cell.setText(issue.id);
				cell.addClass('convergent-table-cell-id');
				break;

			case 'title':
				const titleSpan = cell.createSpan({
					text: issue.title,
					cls: 'convergent-table-cell-title'
				});
				break;

			case 'status':
				const statusBadge = cell.createDiv({ cls: 'convergent-table-status' });
				const statusIcon = this.getStatusIcon(issue.status);
				statusBadge.createSpan({ cls: 'convergent-table-status-icon', text: statusIcon });
				statusBadge.createSpan({ cls: 'convergent-table-status-text', text: issue.status });
				statusBadge.addClass(`convergent-table-status-${issue.status.toLowerCase().replace(/\s+/g, '-')}`);
				break;

			case 'priority':
				if (issue.priority) {
					const priorityBadge = cell.createDiv({ cls: 'convergent-table-priority' });
					const priorityIcon = this.getPriorityIcon(issue.priority);
					priorityBadge.createSpan({ cls: 'convergent-table-priority-icon', text: priorityIcon });
					priorityBadge.createSpan({ cls: 'convergent-table-priority-text', text: issue.priority });
					priorityBadge.addClass(`convergent-table-priority-${issue.priority.toLowerCase()}`);
				} else {
					cell.setText('—');
				}
				break;

			case 'labels':
				if (issue.labels && issue.labels.length > 0) {
					const labelsContainer = cell.createDiv({ cls: 'convergent-table-labels' });
					// Show first 3 labels
					const visibleLabels = issue.labels.slice(0, 3);
					for (const label of visibleLabels) {
						labelsContainer.createSpan({
							cls: 'convergent-table-label',
							text: label
						});
					}
					// Show overflow count
					if (issue.labels.length > 3) {
						labelsContainer.createSpan({
							cls: 'convergent-table-label-overflow',
							text: `+${issue.labels.length - 3}`
						});
					}
				} else {
					cell.setText('—');
				}
				break;

			case 'due':
				if (issue.due) {
					const dueDate = new Date(issue.due);
					const now = new Date();
					const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

					const dueSpan = cell.createSpan({
						cls: 'convergent-table-due',
						text: this.formatDate(issue.due)
					});

					// Add urgency classes
					if (daysUntil < 0) {
						dueSpan.addClass('convergent-table-due-overdue');
					} else if (daysUntil <= 2) {
						dueSpan.addClass('convergent-table-due-urgent');
					} else if (daysUntil <= 7) {
						dueSpan.addClass('convergent-table-due-soon');
					}
				} else {
					cell.setText('—');
				}
				break;

			case 'modified':
				if (issue.modified) {
					cell.setText(this.formatRelativeTime(issue.modified));
					cell.addClass('convergent-table-cell-time');
				} else {
					cell.setText('—');
				}
				break;
		}
	}

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

	private getPriorityIcon(priority: IssuePriority): string {
		const icons: Record<IssuePriority, string> = {
			'Urgent': '🔥',
			'High': '⬆',
			'Medium': '→',
			'Low': '⬇'
		};
		return icons[priority] || '→';
	}

	private formatDate(dateString: string): string {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	private formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
		return `${Math.floor(diffDays / 365)}y ago`;
	}

	/**
	 * Handle column header click for sorting
	 */
	private handleColumnSort(columnKey: string, shiftKey: boolean): void {
		if (!shiftKey) {
			// Single column sort - clear existing sorts
			const existingSort = this.sortConfig.find(s => s.column === columnKey);

			if (existingSort) {
				// Toggle direction
				if (existingSort.direction === 'asc') {
					existingSort.direction = 'desc';
				} else {
					// Remove sort
					this.sortConfig = [];
				}
			} else {
				// New sort (ascending)
				this.sortConfig = [{
					column: columnKey,
					direction: 'asc',
					level: 1
				}];
			}
		} else {
			// Multi-level sort - add/modify/remove from sort config
			const existingIndex = this.sortConfig.findIndex(s => s.column === columnKey);

			if (existingIndex !== -1) {
				// Toggle existing sort direction
				const existingSort = this.sortConfig[existingIndex];
				if (existingSort.direction === 'asc') {
					existingSort.direction = 'desc';
				} else {
					// Remove this sort level
					this.sortConfig.splice(existingIndex, 1);
					// Re-number levels
					this.sortConfig.forEach((s, i) => s.level = i + 1);
				}
			} else {
				// Add new sort level (max 3 levels)
				if (this.sortConfig.length < 3) {
					this.sortConfig.push({
						column: columnKey,
						direction: 'asc',
						level: this.sortConfig.length + 1
					});
				} else {
					new Notice('Maximum 3 sort levels reached');
					return;
				}
			}
		}

		// Re-render table with new sort
		this.renderTable();
	}

	/**
	 * Sort issues based on current sort configuration
	 */
	private sortIssues(issues: Issue[]): Issue[] {
		if (this.sortConfig.length === 0) {
			return issues;
		}

		return issues.sort((a, b) => {
			// Apply each sort level in order
			for (const sort of this.sortConfig) {
				const comparison = this.compareIssues(a, b, sort.column, sort.direction);
				if (comparison !== 0) {
					return comparison;
				}
				// If equal, continue to next sort level
			}
			return 0;
		});
	}

	/**
	 * Compare two issues by a specific column
	 */
	private compareIssues(a: Issue, b: Issue, columnKey: string, direction: 'asc' | 'desc'): number {
		let comparison = 0;

		switch (columnKey) {
			case 'id':
			case 'title':
				// Text comparison (case-insensitive)
				const aVal = (a[columnKey as keyof Issue] as string || '').toLowerCase();
				const bVal = (b[columnKey as keyof Issue] as string || '').toLowerCase();
				comparison = aVal.localeCompare(bVal);
				break;

			case 'status':
				// Status order: Backlog → Todo → In Progress → In Review → Done → Canceled
				const statusOrder: Record<IssueStatus, number> = {
					'Backlog': 0,
					'Todo': 1,
					'In Progress': 2,
					'In Review': 3,
					'Done': 4,
					'Canceled': 5
				};
				comparison = statusOrder[a.status] - statusOrder[b.status];
				break;

			case 'priority':
				// Priority order: Urgent → High → Medium → Low → None
				const priorityOrder: Record<string, number> = {
					'Urgent': 0,
					'High': 1,
					'Medium': 2,
					'Low': 3,
					'': 4  // No priority
				};
				const aPriority = a.priority || '';
				const bPriority = b.priority || '';
				comparison = priorityOrder[aPriority] - priorityOrder[bPriority];
				break;

			case 'due':
			case 'created':
			case 'modified':
				// Date comparison
				const aDate = a[columnKey as keyof Issue] as string || '';
				const bDate = b[columnKey as keyof Issue] as string || '';

				if (!aDate && !bDate) comparison = 0;
				else if (!aDate) comparison = 1;  // No date sorts to end
				else if (!bDate) comparison = -1;
				else {
					const aTime = new Date(aDate).getTime();
					const bTime = new Date(bDate).getTime();
					comparison = aTime - bTime;
				}
				break;

			default:
				comparison = 0;
		}

		// Apply direction
		return direction === 'asc' ? comparison : -comparison;
	}
}
