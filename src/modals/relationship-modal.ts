import { App, SuggestModal, TFile } from 'obsidian';
import { Issue, RelationType } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import { RelationshipUtils } from '../utils/relationships';
import ConvergentPlugin from '../main';

/**
 * Modal for selecting an issue to create a relationship with
 * Uses fuzzy search like Quick Switcher
 */
export class RelationshipModal extends SuggestModal<Issue> {
	private relationshipType: RelationType;
	private currentIssue: TFile;
	private onSelect: (issue: Issue) => void;
	private allIssues: Issue[] = [];
	private relationshipUtils: RelationshipUtils;
	private frontmatterUtils: FrontmatterUtils;

	constructor(
		app: App,
		plugin: ConvergentPlugin,
		relationshipType: RelationType,
		currentIssue: TFile,
		onSelect: (issue: Issue) => void
	) {
		super(app);
		this.relationshipType = relationshipType;
		this.currentIssue = currentIssue;
		this.onSelect = onSelect;
		this.relationshipUtils = plugin.relationshipUtils;
		this.frontmatterUtils = plugin.frontmatterUtils;

		// Set modal title based on relationship type
		this.setPlaceholder(this.getPlaceholderText());

		// Load all issues
		this.loadIssues(plugin.settings.issuesFolder);
	}

	private getPlaceholderText(): string {
		const placeholders: Record<RelationType, string> = {
			'parent': 'Select parent issue...',
			'child': 'Select child issue (sub-issue)...',
			'blocks': 'Select issue to block...',
			'blocked-by': 'Select blocking issue...',
			'related': 'Select related issue...'
		};

		return placeholders[this.relationshipType] || 'Select issue...';
	}

	private async loadIssues(issuesFolder: string) {
		const files = await this.relationshipUtils.getAllIssues(issuesFolder);

		for (const file of files) {
			// Skip current issue
			if (file.path === this.currentIssue.path) continue;

			const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
			if (frontmatter && frontmatter.type === 'issue') {
				const issue = frontmatter as Issue;
				issue.file = file;
				this.allIssues.push(issue);
			}
		}
	}

	getSuggestions(query: string): Issue[] {
		const lowerQuery = query.toLowerCase();

		return this.allIssues
			.filter(issue => {
				// Filter by title or ID
				const titleMatch = issue.title.toLowerCase().includes(lowerQuery);
				const idMatch = issue.id?.toLowerCase().includes(lowerQuery);
				return titleMatch || idMatch;
			})
			.sort((a, b) => {
				// Sort by relevance: exact match > starts with > contains
				const aTitle = a.title.toLowerCase();
				const bTitle = b.title.toLowerCase();

				const aExact = aTitle === lowerQuery;
				const bExact = bTitle === lowerQuery;
				if (aExact && !bExact) return -1;
				if (!aExact && bExact) return 1;

				const aStarts = aTitle.startsWith(lowerQuery);
				const bStarts = bTitle.startsWith(lowerQuery);
				if (aStarts && !bStarts) return -1;
				if (!aStarts && bStarts) return 1;

				// Alphabetical
				return aTitle.localeCompare(bTitle);
			})
			.slice(0, 50); // Limit to 50 results for performance
	}

	renderSuggestion(issue: Issue, el: HTMLElement) {
		const container = el.createDiv({ cls: 'relationship-suggestion' });

		// Icon based on relationship type
		const icon = container.createDiv({ cls: 'relationship-icon' });
		icon.setText(this.relationshipUtils.getRelationshipIcon(this.relationshipType));

		// Content
		const content = container.createDiv({ cls: 'relationship-content' });

		// Title
		const title = content.createDiv({ cls: 'relationship-title' });
		title.setText(issue.title);

		// Metadata
		const meta = content.createDiv({ cls: 'relationship-meta' });
		const metaParts: string[] = [];

		if (issue.id) metaParts.push(issue.id);
		if (issue.status) metaParts.push(issue.status);
		if (issue.priority) metaParts.push(issue.priority);

		meta.setText(metaParts.join(' • '));
	}

	async onChooseSuggestion(issue: Issue, evt: MouseEvent | KeyboardEvent) {
		// Validate relationship before accepting
		if (!issue.file) {
			return;
		}

		const valid = await this.relationshipUtils.validateRelationship(
			this.relationshipType,
			this.currentIssue,
			issue.file
		);

		if (!valid) {
			// Show error
			console.error('Invalid relationship:', this.relationshipType, this.currentIssue.path, issue.file.path);
			return;
		}

		// Call callback
		this.onSelect(issue);
	}
}
