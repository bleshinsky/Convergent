import { App, TFile } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { Issue, Project } from '../types';

/**
 * Automatically tracks and updates project progress based on linked issues.
 * Triggered on file modify events with a debounce to avoid excessive updates.
 */
export class ProgressTracking {
	private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
	private readonly DEBOUNCE_MS = 500;

	constructor(
		private app: App,
		private frontmatterUtils: FrontmatterUtils
	) {}

	/**
	 * Handle a file modification event — debounced project progress update.
	 */
	onFileModified(file: TFile) {
		// Clear existing timer for this file
		const existing = this.debounceTimers.get(file.path);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(() => {
			this.debounceTimers.delete(file.path);
			this.updateProgressForFile(file).catch(err =>
				console.error('ProgressTracking: error updating progress', err)
			);
		}, this.DEBOUNCE_MS);

		this.debounceTimers.set(file.path, timer);
	}

	/**
	 * When an issue file changes, find its linked project and recalculate.
	 */
	private async updateProgressForFile(file: TFile) {
		const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
		if (!frontmatter) return;

		if (frontmatter.type === 'issue') {
			const issue = frontmatter as Issue;
			if (issue.project) {
				await this.recalculateProjectProgress(issue.project);
			}
		} else if (frontmatter.type === 'project') {
			const project = frontmatter as Project;
			await this.recalculateProjectProgress(`[[${project.title}]]`);
		}
	}

	/**
	 * Recalculate progress for a project identified by its wikilink string.
	 * e.g. projectWikilink = "[[My Project]]"
	 */
	async recalculateProjectProgress(projectWikilink: string): Promise<void> {
		// Find the project file
		const projectFile = await this.resolveWikilinkToFile(projectWikilink);
		if (!projectFile) return;

		const projectFm = await this.frontmatterUtils.getFrontmatter(projectFile);
		if (!projectFm || projectFm.type !== 'project') return;

		// Find all issues linked to this project
		const allIssues = await this.frontmatterUtils.getAllIssues();
		let total = 0;
		let completed = 0;

		for (const issueFile of allIssues) {
			const fm = await this.frontmatterUtils.getFrontmatter(issueFile);
			if (!fm || fm.type !== 'issue') continue;
			const issue = fm as Issue;
			if (!issue.project) continue;

			// Normalize both sides for comparison
			const issueProject = this.normalizeWikilink(issue.project);
			const targetProject = this.normalizeWikilink(projectWikilink);

			if (issueProject === targetProject) {
				total++;
				if (issue.status === 'Done' || issue.status === 'Canceled') {
					completed++;
				}
			}
		}

		const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

		// Update project frontmatter (use processFrontMatter directly for YAML kebab-case keys)
		await this.app.fileManager.processFrontMatter(projectFile, (fm: Record<string, unknown>) => {
			fm.progress = progress;
			fm['total-issues'] = total;
			fm['completed-issues'] = completed;
			fm.modified = new Date().toISOString();
		});
	}

	/**
	 * Manually trigger recalculation for all projects.
	 */
	async recalculateAll(): Promise<void> {
		const allProjects = await this.frontmatterUtils.getAllProjects();
		for (const projectFile of allProjects) {
			const fm = await this.frontmatterUtils.getFrontmatter(projectFile);
			if (!fm || fm.type !== 'project') continue;
			const project = fm as Project;
			await this.recalculateProjectProgress(`[[${project.title}]]`);
		}
	}

	private normalizeWikilink(link: string): string {
		return link.replace(/^\[\[/, '').replace(/\]\]$/, '').trim().toLowerCase();
	}

	private async resolveWikilinkToFile(wikilink: string): Promise<TFile | null> {
		const name = this.normalizeWikilink(wikilink);
		const files = this.app.vault.getFiles();
		return files.find(f =>
			f.basename.toLowerCase() === name ||
			f.path.toLowerCase().endsWith(`/${name}.md`)
		) ?? null;
	}

	/**
	 * Clean up pending timers on unload.
	 */
	destroy() {
		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();
	}
}
