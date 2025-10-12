import { App, TFile } from 'obsidian';
import { Frontmatter, Issue, Project } from '../types';

export class FrontmatterUtils {
	constructor(private app: App) {}

	/**
	 * Get frontmatter from a file
	 */
	async getFrontmatter(file: TFile): Promise<Frontmatter | null> {
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter as Frontmatter || null;
	}

	/**
	 * Update frontmatter in a file
	 * Automatically adds modified timestamp
	 */
	async updateFrontmatter(file: TFile, updates: Partial<Frontmatter>): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			Object.assign(frontmatter, updates);
			// Always update modified timestamp
			frontmatter.modified = new Date().toISOString();
		});
	}

	/**
	 * Get a specific frontmatter field
	 */
	async getField<T>(file: TFile, field: string): Promise<T | undefined> {
		const frontmatter = await this.getFrontmatter(file);
		return frontmatter?.[field as keyof Frontmatter] as T;
	}

	/**
	 * Set a specific frontmatter field
	 */
	async setField(file: TFile, field: string, value: any): Promise<void> {
		await this.updateFrontmatter(file, { [field]: value } as Partial<Frontmatter>);
	}

	/**
	 * Check if file has a specific frontmatter type
	 */
	async isType(file: TFile, type: string): Promise<boolean> {
		const fileType = await this.getField<string>(file, 'type');
		return fileType === type;
	}

	/**
	 * Check if file is an Issue
	 */
	async isIssue(file: TFile): Promise<boolean> {
		return await this.isType(file, 'issue');
	}

	/**
	 * Check if file is a Project
	 */
	async isProject(file: TFile): Promise<boolean> {
		return await this.isType(file, 'project');
	}

	/**
	 * Get all files of a specific type
	 */
	async getFilesByType(type: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const filtered: TFile[] = [];

		for (const file of files) {
			if (await this.isType(file, type)) {
				filtered.push(file);
			}
		}

		return filtered;
	}

	/**
	 * Get all Issue files
	 */
	async getAllIssues(): Promise<TFile[]> {
		return await this.getFilesByType('issue');
	}

	/**
	 * Get all Project files
	 */
	async getAllProjects(): Promise<TFile[]> {
		return await this.getFilesByType('project');
	}

	/**
	 * Validate Issue frontmatter
	 */
	validateIssueFrontmatter(data: any): boolean {
		if (!data || typeof data !== 'object') {
			return false;
		}

		// Required fields
		if (data.type !== 'issue') return false;
		if (typeof data.id !== 'string' || !data.id.startsWith('ISSUE-')) return false;
		if (typeof data.title !== 'string' || data.title.trim() === '') return false;

		// Valid status values
		const validStatuses = ['Backlog', 'Triage', 'Todo', 'In Progress', 'Done', 'Canceled'];
		if (!validStatuses.includes(data.status)) return false;

		// Valid priority values (if provided)
		if (data.priority) {
			const validPriorities = ['No Priority', 'Low', 'Medium', 'High', 'Urgent'];
			if (!validPriorities.includes(data.priority)) return false;
		}

		// Valid timestamps
		if (typeof data.created !== 'string') return false;
		if (typeof data.modified !== 'string') return false;

		return true;
	}

	/**
	 * Validate Project frontmatter
	 */
	validateProjectFrontmatter(data: any): boolean {
		if (!data || typeof data !== 'object') {
			return false;
		}

		// Required fields
		if (data.type !== 'project') return false;
		if (typeof data.id !== 'string' || !data.id.startsWith('PROJ-')) return false;
		if (typeof data.title !== 'string' || data.title.trim() === '') return false;

		// Valid status values
		const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Canceled'];
		if (!validStatuses.includes(data.status)) return false;

		if (typeof data.lead !== 'string' || data.lead.trim() === '') return false;
		if (typeof data.created !== 'string') return false;

		return true;
	}

	/**
	 * Validate any entity frontmatter
	 */
	validateFrontmatter(data: any, expectedType: 'issue' | 'project'): boolean {
		if (expectedType === 'issue') {
			return this.validateIssueFrontmatter(data);
		} else if (expectedType === 'project') {
			return this.validateProjectFrontmatter(data);
		}
		return false;
	}
}
