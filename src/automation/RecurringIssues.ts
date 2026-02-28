import { App, TFile, normalizePath, Notice } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { Issue, RecurringConfig, IssueStatus } from '../types';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

/**
 * Automatically creates new issues from recurring templates.
 * Runs on a background interval via plugin.registerInterval().
 */
export class RecurringIssues {
	constructor(
		private app: App,
		private frontmatterUtils: FrontmatterUtils,
		private issuesFolder: () => string
	) {}

	/**
	 * Check all recurring issues and create new ones if due.
	 * Call this on plugin load and register with plugin.registerInterval().
	 */
	async checkAndCreate(): Promise<void> {
		const issues = await this.frontmatterUtils.getAllIssues();
		const today = new Date().toISOString().split('T')[0];

		for (const file of issues) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (!fm || fm.type !== 'issue') continue;
			const issue = fm as Issue;

			if (!issue.recurring?.enabled) continue;
			if (!issue.recurring.nextDue) continue;

			// Check if nextDue is today or in the past
			if (issue.recurring.nextDue > today) continue;

			await this.createRecurringInstance(file, issue);
		}
	}

	/**
	 * Create a new issue from a recurring template.
	 */
	private async createRecurringInstance(templateFile: TFile, issue: Issue): Promise<void> {
		try {
			const folder = this.issuesFolder();
			await this.ensureFolderExists(folder);

			const now = new Date().toISOString();
			const today = now.split('T')[0];

			// Generate filename
			const baseName = templateFile.basename.replace(/-recurring$/, '');
			const fileName = `${baseName}-${today}`;
			const filePath = normalizePath(`${folder}/${fileName}.md`);

			// Check if already created today
			if (this.app.vault.getAbstractFileByPath(filePath)) {
				return; // Already created
			}

			// Build new issue frontmatter (copy of template, reset status)
			const yaml = this.buildFrontmatter({
				...issue,
				status: 'Todo' as IssueStatus,
				created: now,
				modified: now,
				due: today,
				recurring: undefined, // New instances are not recurring
				template: templateFile.basename
			});

			const content = `---\n${yaml}---\n\n## Description\n\n${issue.description || ''}\n\n## Acceptance Criteria\n\n- [ ] \n\n## Notes\n\n`;
			await this.app.vault.create(filePath, content);

			// Update nextDue on template
			const nextDue = this.calculateNextDue(issue.recurring!.cadence, today);
			await this.frontmatterUtils.updateFrontmatter(templateFile, {
				'recurring': {
					enabled: true,
					cadence: issue.recurring!.cadence,
					nextDue
				}
			});

			new Notice(`Recurring issue created: ${issue.title} (${today})`);
		} catch (err) {
			console.error('RecurringIssues: failed to create instance', err);
		}
	}

	/**
	 * Calculate the next due date based on cadence.
	 */
	calculateNextDue(cadence: RecurringConfig['cadence'], fromDate: string): string {
		const date = new Date(fromDate);

		switch (cadence) {
			case 'daily':
				date.setDate(date.getDate() + 1);
				break;
			case 'weekly':
				date.setDate(date.getDate() + 7);
				break;
			case 'biweekly':
				date.setDate(date.getDate() + 14);
				break;
			case 'monthly':
				date.setMonth(date.getMonth() + 1);
				break;
		}

		return date.toISOString().split('T')[0];
	}

	private buildFrontmatter(issue: Partial<Issue>): string {
		const lines: string[] = [];
		if (issue.type) lines.push(`type: ${issue.type}`);
		if (issue.id) lines.push(`id: ${issue.id}-${Date.now()}`);
		if (issue.title) lines.push(`title: "${issue.title.replace(/"/g, '\\"')}"`);
		if (issue.status) lines.push(`status: ${issue.status}`);
		if (issue.created) lines.push(`created: ${issue.created}`);
		if (issue.modified) lines.push(`modified: ${issue.modified}`);
		if (issue.priority) lines.push(`priority: ${issue.priority}`);
		if (issue.due) lines.push(`due: ${issue.due}`);
		if (issue.labels?.length) {
			lines.push(`labels:`);
			issue.labels.forEach(l => lines.push(`  - ${l}`));
		}
		if (issue.project) lines.push(`project: "${issue.project}"`);
		if (issue.template) lines.push(`template: ${issue.template}`);
		lines.push(`assignee: me`);
		return lines.join('\n') + '\n';
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	/**
	 * Returns the check interval in milliseconds (for registerInterval).
	 */
	static get checkIntervalMs(): number {
		return CHECK_INTERVAL_MS;
	}
}
