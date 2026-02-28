import { App, TFile } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { Issue, IssueStatus } from '../types';

/**
 * Automatically updates parent issue status when all children are done.
 * Includes loop detection to prevent infinite cascading updates.
 */
export class StatusAutomation {
	private updating: Set<string> = new Set();
	private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
	private readonly DEBOUNCE_MS = 300;

	constructor(
		private app: App,
		private frontmatterUtils: FrontmatterUtils,
		private enabled: () => boolean
	) {}

	/**
	 * Handle a file modification — check if parent should be auto-completed.
	 */
	onFileModified(file: TFile) {
		if (!this.enabled()) return;

		const existing = this.debounceTimers.get(file.path);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(() => {
			this.debounceTimers.delete(file.path);
			this.checkParentCompletion(file).catch(err =>
				console.error('StatusAutomation: error', err)
			);
		}, this.DEBOUNCE_MS);

		this.debounceTimers.set(file.path, timer);
	}

	/**
	 * Check if an issue's parent should be marked Done because all children are Done.
	 */
	private async checkParentCompletion(file: TFile): Promise<void> {
		if (this.updating.has(file.path)) return;

		const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
		if (!frontmatter || frontmatter.type !== 'issue') return;

		const issue = frontmatter as Issue;
		if (!issue.parent) return;

		const parentFile = await this.resolveWikilinkToFile(issue.parent);
		if (!parentFile) return;

		// Loop detection: skip if already processing this file
		if (this.updating.has(parentFile.path)) return;

		await this.tryAutoCompleteParent(parentFile);
	}

	private async tryAutoCompleteParent(parentFile: TFile): Promise<void> {
		if (this.updating.has(parentFile.path)) return;

		const parentFm = await this.frontmatterUtils.getFrontmatter(parentFile);
		if (!parentFm || parentFm.type !== 'issue') return;

		const parent = parentFm as Issue;

		// Skip if parent is already Done/Canceled
		if (parent.status === 'Done' || parent.status === 'Canceled') return;

		// Get all child issues
		const subIssues = parent.subIssues || [];
		if (subIssues.length === 0) return;

		// Check if all children are done
		let allDone = true;
		for (const childLink of subIssues) {
			const childFile = await this.resolveWikilinkToFile(childLink);
			if (!childFile) {
				allDone = false;
				break;
			}
			const childFm = await this.frontmatterUtils.getFrontmatter(childFile);
			if (!childFm || childFm.type !== 'issue') {
				allDone = false;
				break;
			}
			const child = childFm as Issue;
			if (child.status !== 'Done' && child.status !== 'Canceled') {
				allDone = false;
				break;
			}
		}

		if (!allDone) return;

		// Mark parent as Done
		this.updating.add(parentFile.path);
		try {
			await this.frontmatterUtils.updateFrontmatter(parentFile, {
				status: 'Done' as IssueStatus,
				modified: new Date().toISOString()
			});

			// Recursively check grandparent
			const updatedFm = await this.frontmatterUtils.getFrontmatter(parentFile);
			if (updatedFm && (updatedFm as Issue).parent) {
				const grandparentFile = await this.resolveWikilinkToFile((updatedFm as Issue).parent!);
				if (grandparentFile && !this.updating.has(grandparentFile.path)) {
					await this.tryAutoCompleteParent(grandparentFile);
				}
			}
		} finally {
			this.updating.delete(parentFile.path);
		}
	}

	private async resolveWikilinkToFile(wikilink: string): Promise<TFile | null> {
		const name = wikilink.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
		const files = this.app.vault.getFiles();
		return files.find(f =>
			f.basename === name ||
			f.path.endsWith(`/${name}.md`)
		) ?? null;
	}

	destroy() {
		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();
		this.updating.clear();
	}
}
