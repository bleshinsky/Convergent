import { App, Modal, TFile, setIcon } from 'obsidian';
import { Issue, IssueStatus, IssuePriority } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

interface IssueResult {
	file: TFile;
	issue: Issue;
	score: number;
}

export class QuickSwitcherModal extends Modal {
	private searchInput: HTMLInputElement;
	private resultsContainer: HTMLElement;
	private actionsContainer: HTMLElement;
	private frontmatterUtils: FrontmatterUtils;
	private allIssues: IssueResult[] = [];
	private filteredIssues: IssueResult[] = [];
	private selectedIndex = 0;

	// Multi-select
	private multiSelectMode = false;
	private selectedFiles: Set<TFile> = new Set();

	// Filters
	private statusFilter: IssueStatus | 'all' = 'all';
	private priorityFilter: IssuePriority | 'all' = 'all';
	private showRecent = false;

	constructor(app: App, private plugin: ConvergentPlugin) {
		super(app);
		this.frontmatterUtils = plugin.frontmatterUtils;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('convergent-quick-switcher');

		// Header
		const header = contentEl.createDiv('quick-switcher-header');
		header.createEl('h3', { text: 'Quick Switcher' });

		// Multi-select toggle button
		const multiSelectBtn = header.createEl('button', {
			text: '☑ Multi-Select',
			cls: 'multi-select-toggle-btn'
		});
		multiSelectBtn.addEventListener('click', () => {
			this.toggleMultiSelectMode();
			multiSelectBtn.toggleClass('active', this.multiSelectMode);
		});

		// Search input
		const searchContainer = contentEl.createDiv('quick-switcher-search');
		this.searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search issues...',
			cls: 'quick-switcher-input'
		});

		// Filter buttons
		const filterContainer = contentEl.createDiv('quick-switcher-filters');

		// Status filter
		this.createFilterButton(filterContainer, 'Status', this.statusFilter, (value) => {
			this.statusFilter = value as IssueStatus | 'all';
			this.filterIssues();
		}, ['all', 'Backlog', 'Triage', 'Todo', 'In Progress', 'Done', 'Canceled']);

		// Priority filter
		this.createFilterButton(filterContainer, 'Priority', this.priorityFilter, (value) => {
			this.priorityFilter = value as IssuePriority | 'all';
			this.filterIssues();
		}, ['all', 'No Priority', 'Low', 'Medium', 'High', 'Urgent']);

		// Recent toggle
		const recentBtn = filterContainer.createEl('button', {
			text: '⏱️ Recent',
			cls: 'quick-switcher-filter-btn'
		});
		recentBtn.addEventListener('click', () => {
			this.showRecent = !this.showRecent;
			recentBtn.toggleClass('active', this.showRecent);
			this.filterIssues();
		});

		// Results container
		this.resultsContainer = contentEl.createDiv('quick-switcher-results');

		// Batch actions container (hidden by default)
		this.actionsContainer = contentEl.createDiv('quick-switcher-actions');
		this.actionsContainer.hide();

		// Load all issues
		await this.loadIssues();

		// Set up event handlers
		this.searchInput.addEventListener('input', () => this.filterIssues());

		// Listen for keyboard events on the entire modal (works regardless of focus)
		contentEl.addEventListener('keydown', (e) => this.handleKeydown(e));

		// Auto-focus search
		setTimeout(() => this.searchInput.focus(), 10);

		// Initial display (show recent or all)
		this.showRecent = true;
		recentBtn.addClass('active'); // Highlight button since Recent is ON by default
		this.filterIssues();
	}

	private createFilterButton(
		container: HTMLElement,
		label: string,
		currentValue: string,
		onChange: (value: string) => void,
		options: string[]
	) {
		let currentIndex = options.indexOf(currentValue);

		const btn = container.createEl('button', {
			text: `${label}: ${currentValue}`,
			cls: 'quick-switcher-filter-btn'
		});

		btn.addEventListener('click', () => {
			currentIndex = (currentIndex + 1) % options.length;
			const nextValue = options[currentIndex];
			onChange(nextValue);
			btn.setText(`${label}: ${nextValue}`);
		});
	}

	private async loadIssues() {
		const issuesFolder = this.plugin.settings.issuesFolder;
		const files = this.app.vault.getMarkdownFiles();

		this.allIssues = [];

		for (const file of files) {
			// Check if file is in issues folder
			if (!file.path.startsWith(issuesFolder)) continue;

			const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
			if (!frontmatter || frontmatter.type !== 'issue') continue;

			const issue = frontmatter as Issue;
			issue.file = file;

			this.allIssues.push({
				file,
				issue,
				score: 0
			});
		}
	}

	private filterIssues() {
		const query = this.searchInput.value.toLowerCase();
		this.filteredIssues = [];

		for (const result of this.allIssues) {
			const issue = result.issue;

			// Apply status filter
			if (this.statusFilter !== 'all' && issue.status !== this.statusFilter) {
				continue;
			}

			// Apply priority filter
			if (this.priorityFilter !== 'all' && issue.priority !== this.priorityFilter) {
				continue;
			}

			// Calculate fuzzy match score
			const score = this.fuzzyMatch(issue.title, query);
			if (query && score === 0) continue; // No match

			this.filteredIssues.push({
				...result,
				score
			});
		}

		// Sort by score (higher is better), then by modified date
		this.filteredIssues.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;

			// Recent issues first
			const aModified = new Date(a.issue.modified || 0).getTime();
			const bModified = new Date(b.issue.modified || 0).getTime();
			return bModified - aModified;
		});

		// If showing recent, limit to 10 most recent
		if (this.showRecent && !query) {
			this.filteredIssues = this.filteredIssues.slice(0, 10);
		}

		// Reset selection
		this.selectedIndex = 0;

		// Render results
		this.renderResults();
	}

	private fuzzyMatch(text: string, query: string): number {
		if (!query) return 1; // Empty query matches everything with base score

		text = text.toLowerCase();
		query = query.toLowerCase();

		let score = 0;
		let textIndex = 0;
		let queryIndex = 0;
		let lastMatchIndex = -1;

		while (textIndex < text.length && queryIndex < query.length) {
			if (text[textIndex] === query[queryIndex]) {
				// Bonus for consecutive matches
				if (lastMatchIndex === textIndex - 1) {
					score += 5;
				} else {
					score += 1;
				}

				// Bonus for match at word boundary
				if (textIndex === 0 || text[textIndex - 1] === ' ' || text[textIndex - 1] === '-') {
					score += 3;
				}

				lastMatchIndex = textIndex;
				queryIndex++;
			}
			textIndex++;
		}

		// All query characters must be matched
		if (queryIndex !== query.length) return 0;

		return score;
	}

	private renderResults() {
		this.resultsContainer.empty();

		if (this.filteredIssues.length === 0) {
			this.resultsContainer.createEl('div', {
				text: 'No issues found',
				cls: 'quick-switcher-empty'
			});
			return;
		}

		this.filteredIssues.forEach((result, index) => {
			const item = this.resultsContainer.createDiv('quick-switcher-item');

			if (index === this.selectedIndex) {
				item.addClass('selected');
			}

			// Checkbox (only in multi-select mode)
			if (this.multiSelectMode) {
				const checkbox = item.createDiv('issue-checkbox');
				const isSelected = this.selectedFiles.has(result.file);
				checkbox.setText(isSelected ? '☑' : '☐');
				checkbox.addClass(isSelected ? 'checked' : 'unchecked');

				// Add visual highlight to selected items
				if (isSelected) {
					item.addClass('multi-selected');
				}
			}

			// Status indicator
			const statusIndicator = item.createDiv('issue-status-indicator');
			statusIndicator.addClass(`status-${result.issue.status.toLowerCase().replace(' ', '-')}`);
			statusIndicator.setText(this.getStatusIcon(result.issue.status));

			// Content
			const content = item.createDiv('issue-content');

			// Title
			const title = content.createDiv('issue-title');
			title.setText(result.issue.title);

			// Metadata
			const meta = content.createDiv('issue-meta');
			const metaParts: string[] = [];

			if (result.issue.id) metaParts.push(result.issue.id);
			if (result.issue.priority) metaParts.push(`${this.getPriorityIcon(result.issue.priority)} ${result.issue.priority}`);

			// Relationship metadata (NEW in Week 3)
			const relationshipUtils = this.plugin.relationshipUtils;

			// Show parent indicator
			if (result.issue.parent) {
				const parentLink = relationshipUtils.parseWikilinks(result.issue.parent as any)[0];
				if (parentLink) {
					metaParts.push('↑ Parent');
				}
			}

			// Show children count
			const childCount = relationshipUtils.getChildCount(result.issue);
			if (childCount > 0) {
				metaParts.push(`↓ ${childCount} child${childCount > 1 ? 'ren' : ''}`);
			}

			// Show blocked status
			if (relationshipUtils.isBlocked(result.issue)) {
				const blockerCount = relationshipUtils.getBlockerCount(result.issue);
				metaParts.push(`🚫 Blocked by ${blockerCount}`);
			}

			if (result.issue.labels?.length) metaParts.push(result.issue.labels.join(', '));

			meta.setText(metaParts.join(' • '));

			// Click handler
			item.addEventListener('click', () => {
				if (this.multiSelectMode) {
					this.toggleSelection(result.file);
				} else {
					this.selectIssue(result);
				}
			});
		});
	}

	private getStatusIcon(status: IssueStatus): string {
		const icons: Record<IssueStatus, string> = {
			'Backlog': '○',
			'Triage': '⚡',
			'Todo': '◯',
			'In Progress': '◐',
			'Done': '●',
			'Canceled': '✕'
		};
		return icons[status] || '○';
	}

	private getPriorityIcon(priority: IssuePriority): string {
		const icons: Record<IssuePriority, string> = {
			'No Priority': '○',
			'Low': '⬇',
			'Medium': '→',
			'High': '⬆',
			'Urgent': '🔥'
		};
		return icons[priority] || '→';
	}

	private handleKeydown(e: KeyboardEvent) {
		// Handle Ctrl+A first (before other keys) when in multi-select mode
		if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
			if (this.multiSelectMode) {
				console.log('Ctrl+A pressed in multi-select mode');
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				this.selectAll();
				return;
			}
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredIssues.length - 1);
			this.renderResults();
			this.scrollToSelected();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
			this.renderResults();
			this.scrollToSelected();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (this.filteredIssues.length > 0) {
				if (this.multiSelectMode) {
					this.toggleSelection(this.filteredIssues[this.selectedIndex].file);
				} else {
					this.selectIssue(this.filteredIssues[this.selectedIndex]);
				}
			}
		} else if (e.key === ' ' && this.multiSelectMode) {
			e.preventDefault();
			if (this.filteredIssues.length > 0) {
				this.toggleSelection(this.filteredIssues[this.selectedIndex].file);
			}
		} else if (e.key === 'Escape') {
			this.close();
		}
	}

	private scrollToSelected() {
		const items = this.resultsContainer.querySelectorAll('.quick-switcher-item');
		const selectedItem = items[this.selectedIndex] as HTMLElement;
		if (selectedItem) {
			selectedItem.scrollIntoView({ block: 'nearest' });
		}
	}

	private async selectIssue(result: IssueResult) {
		// Open the file
		await this.app.workspace.getLeaf().openFile(result.file);
		this.close();
	}

	private toggleMultiSelectMode() {
		this.multiSelectMode = !this.multiSelectMode;

		if (!this.multiSelectMode) {
			// Clear selections when exiting multi-select mode
			this.selectedFiles.clear();
			this.actionsContainer.hide();
		}

		this.renderResults();
	}

	private toggleSelection(file: TFile) {
		if (this.selectedFiles.has(file)) {
			this.selectedFiles.delete(file);
		} else {
			this.selectedFiles.add(file);
		}

		this.renderResults();
		this.renderBatchActions();

		// Refocus search input so arrow keys continue to work
		this.searchInput.focus();
	}

	private selectAll() {
		this.filteredIssues.forEach(result => {
			this.selectedFiles.add(result.file);
		});

		this.renderResults();
		this.renderBatchActions();

		// Refocus search input so arrow keys continue to work
		this.searchInput.focus();
	}

	private renderBatchActions() {
		this.actionsContainer.empty();

		if (this.selectedFiles.size === 0) {
			this.actionsContainer.hide();
			return;
		}

		this.actionsContainer.show();

		// Selection count
		const count = this.actionsContainer.createEl('span', {
			text: `${this.selectedFiles.size} selected`,
			cls: 'selection-count'
		});

		// Clear selection button
		const clearBtn = this.actionsContainer.createEl('button', {
			text: 'Clear',
			cls: 'batch-action-btn'
		});
		clearBtn.addEventListener('click', () => {
			this.selectedFiles.clear();
			this.renderResults();
			this.renderBatchActions();
			// Refocus search input so arrow keys continue to work
			this.searchInput.focus();
		});

		// Batch status change button
		const statusBtn = this.actionsContainer.createEl('button', {
			text: 'Change Status',
			cls: 'batch-action-btn batch-action-primary'
		});
		statusBtn.addEventListener('click', async () => {
			await this.plugin.batchCommands.batchChangeStatus(Array.from(this.selectedFiles));
			// Wait for metadata cache to update
			await new Promise(resolve => setTimeout(resolve, 100));
			// Reload issues after status change
			await this.loadIssues();
			this.filterIssues();
		});

		// Batch priority change button
		const priorityBtn = this.actionsContainer.createEl('button', {
			text: 'Change Priority',
			cls: 'batch-action-btn batch-action-primary'
		});
		priorityBtn.addEventListener('click', async () => {
			await this.plugin.batchCommands.batchChangePriority(Array.from(this.selectedFiles));
			// Wait for metadata cache to update
			await new Promise(resolve => setTimeout(resolve, 100));
			// Reload issues after priority change
			await this.loadIssues();
			this.filterIssues();
		});

		// Batch delete button
		const deleteBtn = this.actionsContainer.createEl('button', {
			text: 'Delete',
			cls: 'batch-action-btn batch-action-danger'
		});
		deleteBtn.addEventListener('click', async () => {
			await this.plugin.batchCommands.batchDelete(Array.from(this.selectedFiles));
			// Reload issues after delete
			await this.loadIssues();
			this.selectedFiles.clear();
			this.filterIssues();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
