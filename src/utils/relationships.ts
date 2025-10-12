import { App, TFile } from 'obsidian';
import { Issue, RelationType } from '../types';

/**
 * Relationship change descriptor for bidirectional updates
 */
export interface RelationshipChange {
	type: RelationType;
	source: TFile;
	target: TFile;
	action: 'add' | 'remove';
}

/**
 * Utility class for managing issue relationships
 * Handles wikilink parsing, validation, and relationship operations
 */
export class RelationshipUtils {
	constructor(private app: App) {}

	/**
	 * Parse wikilinks from a string
	 * Extracts all [[WikiLink]] patterns
	 * @param content - String containing wikilinks
	 * @returns Array of link texts (without brackets)
	 */
	parseWikilinks(content: string | string[]): string[] {
		if (Array.isArray(content)) {
			// If already an array of wikilinks, parse each one
			return content.flatMap(link => this.parseWikilinks(link));
		}

		if (!content) return [];

		// Match [[WikiLink]] or [[WikiLink|Display Text]]
		const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
		const matches: string[] = [];
		let match;

		while ((match = wikilinkRegex.exec(content)) !== null) {
			matches.push(match[1].trim());
		}

		return matches;
	}

	/**
	 * Resolve a wikilink text to a TFile
	 * @param linkText - The text inside [[brackets]]
	 * @returns TFile if found, null otherwise
	 */
	resolveLink(linkText: string): TFile | null {
		if (!linkText) return null;

		// Remove any [[brackets]] if present
		const cleanLink = linkText.replace(/^\[\[|\]\]$/g, '').trim();

		// Try exact match first
		const file = this.app.metadataCache.getFirstLinkpathDest(cleanLink, '');

		return file;
	}

	/**
	 * Resolve multiple wikilinks to TFiles
	 * @param links - Array of wikilink strings
	 * @returns Array of resolved TFiles (nulls filtered out)
	 */
	resolveLinks(links: string[]): TFile[] {
		if (!links || links.length === 0) return [];

		return links
			.map(link => this.resolveLink(link))
			.filter((file): file is TFile => file !== null);
	}

	/**
	 * Convert TFile to wikilink format
	 * @param file - File to convert
	 * @returns Wikilink string like "[[Issue-123]]"
	 */
	fileToWikilink(file: TFile): string {
		// Use file basename without extension
		const basename = file.basename;
		return `[[${basename}]]`;
	}

	/**
	 * Convert array of TFiles to wikilink array
	 * @param files - Files to convert
	 * @returns Array of wikilink strings
	 */
	filesToWikilinks(files: TFile[]): string[] {
		if (!files || files.length === 0) return [];
		return files.map(file => this.fileToWikilink(file));
	}

	/**
	 * Get all issues in the vault
	 * @param issuesFolder - Folder path to search (e.g., "Issues/")
	 * @returns Array of issue files
	 */
	async getAllIssues(issuesFolder: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const issueFiles: TFile[] = [];

		for (const file of files) {
			if (!file.path.startsWith(issuesFolder)) continue;

			// Check if file has type: issue in frontmatter
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.type === 'issue') {
				issueFiles.push(file);
			}
		}

		return issueFiles;
	}

	/**
	 * Validate a relationship between two issues
	 * Prevents invalid relationships like cycles in parent/child
	 * @param type - Type of relationship
	 * @param source - Source issue file
	 * @param target - Target issue file
	 * @returns true if valid, false if invalid
	 */
	async validateRelationship(
		type: RelationType,
		source: TFile,
		target: TFile
	): Promise<boolean> {
		// Cannot link to self
		if (source.path === target.path) {
			return false;
		}

		// For parent relationships, check for cycles
		if (type === 'parent') {
			const hasCycle = await this.detectParentCycle(source, target);
			if (hasCycle) {
				return false;
			}
		}

		// For child relationships, check for cycles
		if (type === 'child') {
			const hasCycle = await this.detectParentCycle(target, source);
			if (hasCycle) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Detect if setting parent would create a cycle
	 * Example: A → B → C → A (invalid)
	 * @param issue - Issue to set parent on
	 * @param parent - Proposed parent
	 * @returns true if cycle detected, false otherwise
	 */
	async detectParentCycle(issue: TFile, parent: TFile): Promise<boolean> {
		const visited = new Set<string>();
		return this.detectCycleRecursive(parent, issue.path, visited);
	}

	/**
	 * Recursive cycle detection helper
	 * @param current - Current file being checked
	 * @param target - Target path we're looking for
	 * @param visited - Set of visited paths
	 * @returns true if cycle found
	 */
	private async detectCycleRecursive(
		current: TFile,
		target: string,
		visited: Set<string>
	): Promise<boolean> {
		// If we've visited this node, stop (no cycle through this path)
		if (visited.has(current.path)) {
			return false;
		}

		// Mark as visited
		visited.add(current.path);

		// Get parent of current issue
		const cache = this.app.metadataCache.getFileCache(current);
		const parentLink = cache?.frontmatter?.parent;

		if (!parentLink) {
			// No parent, no cycle
			return false;
		}

		// Parse parent link
		const parentText = this.parseWikilinks(parentLink)[0];
		if (!parentText) return false;

		const parentFile = this.resolveLink(parentText);
		if (!parentFile) return false;

		// If parent is the target, we found a cycle
		if (parentFile.path === target) {
			return true;
		}

		// Recursively check parent's parent
		return this.detectCycleRecursive(parentFile, target, visited);
	}

	/**
	 * Get the inverse relationship type
	 * Used for bidirectional updates
	 * @param type - Original relationship type
	 * @returns Inverse relationship type
	 */
	getInverseRelationType(type: RelationType): RelationType {
		const inverseMap: Record<RelationType, RelationType> = {
			'parent': 'child',
			'child': 'parent',
			'blocks': 'blocked-by',
			'blocked-by': 'blocks',
			'related': 'related'
		};

		return inverseMap[type];
	}

	/**
	 * Check if an issue has a specific relationship
	 * @param issue - Issue to check
	 * @param type - Relationship type
	 * @param target - Target file to check for
	 * @returns true if relationship exists
	 */
	hasRelationship(issue: Issue, type: RelationType, target: TFile): boolean {
		switch (type) {
			case 'parent':
				return issue.parent?.path === target.path;

			case 'child':
				return issue.subIssues?.some(child => child.path === target.path) || false;

			case 'blocks':
				return issue.blocks?.some(blocked => blocked.path === target.path) || false;

			case 'blocked-by':
				return issue.blockedBy?.some(blocker => blocker.path === target.path) || false;

			case 'related':
				return issue.related?.some(rel => rel.path === target.path) || false;

			default:
				return false;
		}
	}

	/**
	 * Get all related files for an issue
	 * @param issue - Issue to get relationships for
	 * @param type - Type of relationship
	 * @returns Array of related TFiles
	 */
	getRelatedFiles(issue: Issue, type: RelationType): TFile[] {
		switch (type) {
			case 'parent':
				return issue.parent ? [issue.parent] : [];

			case 'child':
				return issue.subIssues || [];

			case 'blocks':
				return issue.blocks || [];

			case 'blocked-by':
				return issue.blockedBy || [];

			case 'related':
				return issue.related || [];

			default:
				return [];
		}
	}

	/**
	 * Check if an issue is blocked
	 * @param issue - Issue to check
	 * @returns true if issue has blockers
	 */
	isBlocked(issue: Issue): boolean {
		return (issue.blockedBy?.length || 0) > 0;
	}

	/**
	 * Get blocker count for an issue
	 * @param issue - Issue to check
	 * @returns Number of blocking issues
	 */
	getBlockerCount(issue: Issue): number {
		return issue.blockedBy?.length || 0;
	}

	/**
	 * Get child count for an issue
	 * @param issue - Issue to check
	 * @returns Number of child issues
	 */
	getChildCount(issue: Issue): number {
		return issue.subIssues?.length || 0;
	}

	/**
	 * Format relationship for display
	 * @param type - Relationship type
	 * @returns Display string
	 */
	formatRelationshipType(type: RelationType): string {
		const labels: Record<RelationType, string> = {
			'parent': 'Parent Issue',
			'child': 'Sub-Issue',
			'blocks': 'Blocks',
			'blocked-by': 'Blocked By',
			'related': 'Related To'
		};

		return labels[type] || type;
	}

	/**
	 * Get icon for relationship type
	 * @param type - Relationship type
	 * @returns Icon string
	 */
	getRelationshipIcon(type: RelationType): string {
		const icons: Record<RelationType, string> = {
			'parent': '↑',
			'child': '↓',
			'blocks': '🚫',
			'blocked-by': '⛔',
			'related': '🔗'
		};

		return icons[type] || '';
	}
}
