import { App, TFile } from 'obsidian';
import { FrontmatterUtils } from './frontmatter';

/**
 * ID generation utilities for Issues and Projects
 * Generates sequential IDs: ISSUE-1, ISSUE-2, PROJ-1, PROJ-2, etc.
 */

export class IdGenerator {
	private frontmatterUtils: FrontmatterUtils;

	constructor(private app: App) {
		this.frontmatterUtils = new FrontmatterUtils(app);
	}

	/**
	 * Generate next Issue ID
	 * Scans vault for highest existing ISSUE-{n} and returns ISSUE-{n+1}
	 * @returns Next sequential Issue ID (e.g., "ISSUE-123")
	 */
	async generateIssueId(): Promise<string> {
		const issues = await this.frontmatterUtils.getAllIssues();
		let maxId = 0;

		for (const issue of issues) {
			const frontmatter = await this.frontmatterUtils.getFrontmatter(issue);
			if (frontmatter && frontmatter.id) {
				const match = frontmatter.id.match(/^ISSUE-(\d+)$/);
				if (match) {
					const num = parseInt(match[1], 10);
					if (num > maxId) {
						maxId = num;
					}
				}
			}
		}

		return `ISSUE-${maxId + 1}`;
	}

	/**
	 * Generate next Project ID
	 * Scans vault for highest existing PROJ-{n} and returns PROJ-{n+1}
	 * @returns Next sequential Project ID (e.g., "PROJ-5")
	 */
	async generateProjectId(): Promise<string> {
		const projects = await this.frontmatterUtils.getAllProjects();
		let maxId = 0;

		for (const project of projects) {
			const frontmatter = await this.frontmatterUtils.getFrontmatter(project);
			if (frontmatter && frontmatter.id) {
				const match = frontmatter.id.match(/^PROJ-(\d+)$/);
				if (match) {
					const num = parseInt(match[1], 10);
					if (num > maxId) {
						maxId = num;
					}
				}
			}
		}

		return `PROJ-${maxId + 1}`;
	}

	/**
	 * Check if an Issue ID already exists in the vault
	 * @param id Issue ID to check
	 * @returns True if ID exists, false otherwise
	 */
	async issueIdExists(id: string): Promise<boolean> {
		const issues = await this.frontmatterUtils.getAllIssues();

		for (const issue of issues) {
			const frontmatter = await this.frontmatterUtils.getFrontmatter(issue);
			if (frontmatter && frontmatter.id === id) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a Project ID already exists in the vault
	 * @param id Project ID to check
	 * @returns True if ID exists, false otherwise
	 */
	async projectIdExists(id: string): Promise<boolean> {
		const projects = await this.frontmatterUtils.getAllProjects();

		for (const project of projects) {
			const frontmatter = await this.frontmatterUtils.getFrontmatter(project);
			if (frontmatter && frontmatter.id === id) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Generate unique Issue ID with collision detection
	 * Retries if collision detected (rare edge case)
	 * @param maxRetries Maximum number of retries
	 * @returns Unique Issue ID
	 */
	async generateUniqueIssueId(maxRetries: number = 10): Promise<string> {
		for (let i = 0; i < maxRetries; i++) {
			const id = await this.generateIssueId();
			const exists = await this.issueIdExists(id);

			if (!exists) {
				return id;
			}

			// Wait a bit before retry (in case of concurrent operations)
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		// Fallback: use timestamp to ensure uniqueness
		const timestamp = Date.now();
		return `ISSUE-${timestamp}`;
	}

	/**
	 * Generate unique Project ID with collision detection
	 * Retries if collision detected (rare edge case)
	 * @param maxRetries Maximum number of retries
	 * @returns Unique Project ID
	 */
	async generateUniqueProjectId(maxRetries: number = 10): Promise<string> {
		for (let i = 0; i < maxRetries; i++) {
			const id = await this.generateProjectId();
			const exists = await this.projectIdExists(id);

			if (!exists) {
				return id;
			}

			// Wait a bit before retry (in case of concurrent operations)
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		// Fallback: use timestamp to ensure uniqueness
		const timestamp = Date.now();
		return `PROJ-${timestamp}`;
	}

	/**
	 * Validate Issue ID format
	 * @param id ID to validate
	 * @returns True if valid format (ISSUE-{number})
	 */
	isValidIssueId(id: string): boolean {
		return /^ISSUE-\d+$/.test(id);
	}

	/**
	 * Validate Project ID format
	 * @param id ID to validate
	 * @returns True if valid format (PROJ-{number})
	 */
	isValidProjectId(id: string): boolean {
		return /^PROJ-\d+$/.test(id);
	}

	/**
	 * Extract numeric part from Issue ID
	 * @param id Issue ID (e.g., "ISSUE-123")
	 * @returns Numeric part (e.g., 123) or null if invalid
	 */
	extractIssueNumber(id: string): number | null {
		const match = id.match(/^ISSUE-(\d+)$/);
		return match ? parseInt(match[1], 10) : null;
	}

	/**
	 * Extract numeric part from Project ID
	 * @param id Project ID (e.g., "PROJ-5")
	 * @returns Numeric part (e.g., 5) or null if invalid
	 */
	extractProjectNumber(id: string): number | null {
		const match = id.match(/^PROJ-(\d+)$/);
		return match ? parseInt(match[1], 10) : null;
	}
}
