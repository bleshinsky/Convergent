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
	private frontmatterUtils: FrontmatterUtils;
	private allIssues: IssueResult[] = [];
	private filteredIssues: IssueResult[] = [];
	private selectedIndex = 0;

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
		}, ['all', 'Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled']);

		// Priority filter
		this.createFilterButton(filterContainer, 'Priority', this.priorityFilter, (value) => {
			this.priorityFilter = value as IssuePriority | 'all';
			this.filterIssues();
		}, ['all', 'Low', 'Medium', 'High', 'Urgent']);

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

		// Load all issues
		await this.loadIssues();

		// Set up event handlers
		this.searchInput.addEventListener('input', () => this.filterIssues());
		this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));

		// Auto-focus search
		setTimeout(() => this.searchInput.focus(), 10);

		// Initial display (show recent or all)
		this.showRecent = true;
		this.filterIssues();
	}

	private createFilterButton(
		container: HTMLElement,
		label: string,
		currentValue: string,
		onChange: (value: string) => void,
		options: string[]
	) {
		const btn = container.createEl('button', {
			text: `${label}: ${currentValue}`,
			cls: 'quick-switcher-filter-btn'
		});

		btn.addEventListener('click', () => {
			const currentIndex = options.indexOf(currentValue);
			const nextIndex = (currentIndex + 1) % options.length;
			const nextValue = options[nextIndex];
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
			if (result.issue.labels?.length) metaParts.push(result.issue.labels.join(', '));

			meta.setText(metaParts.join(' • '));

			// Click handler
			item.addEventListener('click', () => {
				this.selectIssue(result);
			});
		});
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
			'Low': '⬇',
			'Medium': '→',
			'High': '⬆',
			'Urgent': '🔥'
		};
		return icons[priority] || '→';
	}

	private handleKeydown(e: KeyboardEvent) {
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
				this.selectIssue(this.filteredIssues[this.selectedIndex]);
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

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
