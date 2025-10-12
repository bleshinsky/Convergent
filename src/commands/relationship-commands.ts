import { App, TFile, Notice } from 'obsidian';
import { Issue, RelationType } from '../types';
import { RelationshipUtils, RelationshipChange } from '../utils/relationships';
import { FrontmatterUtils } from '../utils/frontmatter';
import { RelationshipModal } from '../modals/relationship-modal';
import ConvergentPlugin from '../main';

/**
 * Commands for managing issue relationships
 * Handles parent/child, blocking, and related issue links
 */
export class RelationshipCommands {
	constructor(
		private app: App,
		private plugin: ConvergentPlugin,
		private relationshipUtils: RelationshipUtils,
		private frontmatterUtils: FrontmatterUtils
	) {}

	/**
	 * Register all relationship commands
	 */
	registerCommands() {
		// Set parent issue
		this.plugin.addCommand({
			id: 'convergent-set-parent',
			name: 'Set parent issue',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'Y' }],
			editorCallback: (editor, view) => {
				if (view.file) {
					this.setParentCommand(view.file);
				}
			}
		});

		// Add child issue
		this.plugin.addCommand({
			id: 'convergent-add-child',
			name: 'Add child issue (sub-issue)',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'U' }],
			editorCallback: (editor, view) => {
				if (view.file) {
					this.addChildCommand(view.file);
				}
			}
		});

		// Add blocker
		this.plugin.addCommand({
			id: 'convergent-add-blocker',
			name: 'Add blocking issue',
			editorCallback: (editor, view) => {
				if (view.file) {
					this.addBlockerCommand(view.file);
				}
			}
		});

		// Add related issue
		this.plugin.addCommand({
			id: 'convergent-add-related',
			name: 'Add related issue',
			editorCallback: (editor, view) => {
				if (view.file) {
					this.addRelatedCommand(view.file);
				}
			}
		});

		console.log('Convergent relationship commands registered');
	}

	/**
	 * Command: Set parent issue
	 */
	private async setParentCommand(file: TFile) {
		// Check if file is an issue
		const issue = await this.frontmatterUtils.getFrontmatter(file);
		if (!issue || issue.type !== 'issue') {
			new Notice('This command only works on issue files');
			return;
		}

		// Open relationship modal
		new RelationshipModal(
			this.app,
			this.plugin,
			'parent',
			file,
			async (parent) => {
				if (parent.file) {
					await this.setParent(file, parent.file);
				}
			}
		).open();
	}

	/**
	 * Command: Add child issue
	 */
	private async addChildCommand(file: TFile) {
		// Check if file is an issue
		const issue = await this.frontmatterUtils.getFrontmatter(file);
		if (!issue || issue.type !== 'issue') {
			new Notice('This command only works on issue files');
			return;
		}

		// Open relationship modal
		new RelationshipModal(
			this.app,
			this.plugin,
			'child',
			file,
			async (child) => {
				if (child.file) {
					await this.addChild(file, child.file);
				}
			}
		).open();
	}

	/**
	 * Command: Add blocker
	 */
	private async addBlockerCommand(file: TFile) {
		// Check if file is an issue
		const issue = await this.frontmatterUtils.getFrontmatter(file);
		if (!issue || issue.type !== 'issue') {
			new Notice('This command only works on issue files');
			return;
		}

		// Open relationship modal
		new RelationshipModal(
			this.app,
			this.plugin,
			'blocked-by',
			file,
			async (blocker) => {
				if (blocker.file) {
					await this.addBlocker(file, blocker.file);
				}
			}
		).open();
	}

	/**
	 * Command: Add related issue
	 */
	private async addRelatedCommand(file: TFile) {
		// Check if file is an issue
		const issue = await this.frontmatterUtils.getFrontmatter(file);
		if (!issue || issue.type !== 'issue') {
			new Notice('This command only works on issue files');
			return;
		}

		// Open relationship modal
		new RelationshipModal(
			this.app,
			this.plugin,
			'related',
			file,
			async (related) => {
				if (related.file) {
					await this.addRelated(file, related.file);
				}
			}
		).open();
	}

	/**
	 * Set parent issue (one-to-one relationship)
	 * @param issue - Issue to set parent on
	 * @param parent - Parent issue (null to remove)
	 */
	async setParent(issue: TFile, parent: TFile | null): Promise<void> {
		// Get current parent
		const issueData = await this.frontmatterUtils.getFrontmatter(issue) as any;
		const currentParentLink = issueData?.parent;
		let currentParent: TFile | null = null;

		if (currentParentLink) {
			const linkText = this.relationshipUtils.parseWikilinks(currentParentLink)[0];
			if (linkText) {
				currentParent = this.relationshipUtils.resolveLink(linkText);
			}
		}

		// Remove from old parent's subIssues if exists
		if (currentParent) {
			await this.removeFromSubIssues(currentParent, issue);
		}

		// Set new parent
		if (parent) {
			// Validate relationship (prevent cycles)
			const valid = await this.relationshipUtils.validateRelationship('parent', issue, parent);
			if (!valid) {
				new Notice('Cannot set parent: would create a cycle');
				return;
			}

			// Update issue frontmatter
			const parentLink = this.relationshipUtils.fileToWikilink(parent);
			await this.frontmatterUtils.updateFrontmatter(issue, {
				parent: parentLink
			} as any);

			// Add to parent's subIssues
			await this.addToSubIssues(parent, issue);

			// Get issue ID for notification
			const issueId = issueData?.id || issue.basename;
			const parentData = await this.frontmatterUtils.getFrontmatter(parent);
			const parentId = parentData?.id || parent.basename;

			new Notice(`Set parent: ${issueId} → ${parentId}`);
		} else {
			// Remove parent
			await this.frontmatterUtils.updateFrontmatter(issue, {
				parent: undefined
			} as any);

			const issueId = issueData?.id || issue.basename;
			new Notice(`Removed parent from ${issueId}`);
		}
	}

	/**
	 * Add child issue (one-to-many relationship)
	 * @param parent - Parent issue
	 * @param child - Child issue to add
	 */
	async addChild(parent: TFile, child: TFile): Promise<void> {
		// Validate relationship (prevent cycles)
		const valid = await this.relationshipUtils.validateRelationship('child', parent, child);
		if (!valid) {
			new Notice('Cannot add child: would create a cycle');
			return;
		}

		// Update child's parent
		const parentLink = this.relationshipUtils.fileToWikilink(parent);

		await this.frontmatterUtils.updateFrontmatter(child, {
			parent: parentLink
		} as any);

		// Add to parent's subIssues
		await this.addToSubIssues(parent, child);

		// Notifications
		const parentData = await this.frontmatterUtils.getFrontmatter(parent);
		const childData = await this.frontmatterUtils.getFrontmatter(child);
		const parentId = parentData?.id || parent.basename;
		const childId = childData?.id || child.basename;

		new Notice(`Added sub-issue: ${parentId} ↓ ${childId}`);
	}

	/**
	 * Remove child issue
	 * @param parent - Parent issue
	 * @param child - Child issue to remove
	 */
	async removeChild(parent: TFile, child: TFile): Promise<void> {
		// Update child's parent to undefined
		await this.frontmatterUtils.updateFrontmatter(child, {
			parent: undefined
		} as any);

		// Remove from parent's subIssues
		await this.removeFromSubIssues(parent, child);

		// Notifications
		const parentData = await this.frontmatterUtils.getFrontmatter(parent);
		const childData = await this.frontmatterUtils.getFrontmatter(child);
		const parentId = parentData?.id || parent.basename;
		const childId = childData?.id || child.basename;

		new Notice(`Removed sub-issue: ${childId} from ${parentId}`);
	}

	/**
	 * Add blocker (many-to-many relationship)
	 * @param blockedIssue - Issue that is blocked
	 * @param blockerIssue - Issue that blocks
	 */
	async addBlocker(blockedIssue: TFile, blockerIssue: TFile): Promise<void> {
		// Get current relationships
		const blockedData = await this.frontmatterUtils.getFrontmatter(blockedIssue) as any;
		const blockerData = await this.frontmatterUtils.getFrontmatter(blockerIssue) as any;

		// Check if already linked
		if (blockedData['blocked-by']) {
			const existing = this.relationshipUtils.resolveLinks(blockedData['blocked-by'] as any);
			if (existing.some(f => f.path === blockerIssue.path)) {
				new Notice('This blocking relationship already exists');
				return;
			}
		}

		// Add to blocked-by array
		const blockedByLinks = blockedData['blocked-by'] ? [...blockedData['blocked-by']] : [];
		blockedByLinks.push(this.relationshipUtils.fileToWikilink(blockerIssue));

		await this.frontmatterUtils.updateFrontmatter(blockedIssue, {
			'blocked-by': blockedByLinks
		} as any);

		// Add to blocks array
		const blocksLinks = blockerData.blocks ? [...blockerData.blocks] : [];
		blocksLinks.push(this.relationshipUtils.fileToWikilink(blockedIssue));

		await this.frontmatterUtils.updateFrontmatter(blockerIssue, {
			'blocks': blocksLinks
		} as any);

		// Notifications
		const blockedId = blockedData.id || blockedIssue.basename;
		const blockerId = blockerData.id || blockerIssue.basename;

		new Notice(`${blockedId} is now blocked by ${blockerId}`);
	}

	/**
	 * Remove blocker
	 * @param blockedIssue - Issue that is blocked
	 * @param blockerIssue - Issue that blocks
	 */
	async removeBlocker(blockedIssue: TFile, blockerIssue: TFile): Promise<void> {
		// Get current relationships
		const blockedData = await this.frontmatterUtils.getFrontmatter(blockedIssue) as any;
		const blockerData = await this.frontmatterUtils.getFrontmatter(blockerIssue) as any;

		// Remove from blocked-by array
		if (blockedData['blocked-by']) {
			const blockedByLinks = (blockedData['blocked-by'] as any[]).filter((link: string) => {
				const linkText = this.relationshipUtils.parseWikilinks(link)[0];
				const file = this.relationshipUtils.resolveLink(linkText);
				return file?.path !== blockerIssue.path;
			});

			await this.frontmatterUtils.updateFrontmatter(blockedIssue, {
				'blocked-by': blockedByLinks.length > 0 ? blockedByLinks : undefined
			} as any);
		}

		// Remove from blocks array
		if (blockerData.blocks) {
			const blocksLinks = (blockerData.blocks as any[]).filter((link: string) => {
				const linkText = this.relationshipUtils.parseWikilinks(link)[0];
				const file = this.relationshipUtils.resolveLink(linkText);
				return file?.path !== blockedIssue.path;
			});

			await this.frontmatterUtils.updateFrontmatter(blockerIssue, {
				'blocks': blocksLinks.length > 0 ? blocksLinks : undefined
			} as any);
		}

		// Notifications
		const blockedId = blockedData.id || blockedIssue.basename;
		const blockerId = blockerData.id || blockerIssue.basename;

		new Notice(`Removed blocker: ${blockerId} from ${blockedId}`);
	}

	/**
	 * Add related issue (many-to-many, non-directional)
	 * @param issue1 - First issue
	 * @param issue2 - Second issue
	 */
	async addRelated(issue1: TFile, issue2: TFile): Promise<void> {
		// Get current relationships
		const data1 = await this.frontmatterUtils.getFrontmatter(issue1) as any;
		const data2 = await this.frontmatterUtils.getFrontmatter(issue2) as any;

		// Check if already linked
		if (data1.related) {
			const existing = this.relationshipUtils.resolveLinks(data1.related as any);
			if (existing.some(f => f.path === issue2.path)) {
				new Notice('These issues are already related');
				return;
			}
		}

		// Add to issue1's related array
		const related1 = data1.related ? [...data1.related] : [];
		related1.push(this.relationshipUtils.fileToWikilink(issue2));

		await this.frontmatterUtils.updateFrontmatter(issue1, {
			'related': related1
		} as any);

		// Add to issue2's related array (bidirectional)
		const related2 = data2.related ? [...data2.related] : [];
		related2.push(this.relationshipUtils.fileToWikilink(issue1));

		await this.frontmatterUtils.updateFrontmatter(issue2, {
			'related': related2
		} as any);

		// Notifications
		const id1 = data1.id || issue1.basename;
		const id2 = data2.id || issue2.basename;

		new Notice(`Linked related issues: ${id1} ↔ ${id2}`);
	}

	/**
	 * Remove related issue
	 * @param issue1 - First issue
	 * @param issue2 - Second issue
	 */
	async removeRelated(issue1: TFile, issue2: TFile): Promise<void> {
		// Get current relationships
		const data1 = await this.frontmatterUtils.getFrontmatter(issue1) as any;
		const data2 = await this.frontmatterUtils.getFrontmatter(issue2) as any;

		// Remove from issue1's related array
		if (data1.related) {
			const related1 = (data1.related as any[]).filter((link: string) => {
				const linkText = this.relationshipUtils.parseWikilinks(link)[0];
				const file = this.relationshipUtils.resolveLink(linkText);
				return file?.path !== issue2.path;
			});

			await this.frontmatterUtils.updateFrontmatter(issue1, {
				'related': related1.length > 0 ? related1 : undefined
			} as any);
		}

		// Remove from issue2's related array
		if (data2.related) {
			const related2 = (data2.related as any[]).filter((link: string) => {
				const linkText = this.relationshipUtils.parseWikilinks(link)[0];
				const file = this.relationshipUtils.resolveLink(linkText);
				return file?.path !== issue1.path;
			});

			await this.frontmatterUtils.updateFrontmatter(issue2, {
				'related': related2.length > 0 ? related2 : undefined
			} as any);
		}

		// Notifications
		const id1 = data1.id || issue1.basename;
		const id2 = data2.id || issue2.basename;

		new Notice(`Removed relationship: ${id1} ↔ ${id2}`);
	}

	/**
	 * Helper: Add issue to parent's subIssues array
	 */
	private async addToSubIssues(parent: TFile, child: TFile): Promise<void> {
		const parentData = await this.frontmatterUtils.getFrontmatter(parent) as any;
		const subIssues = parentData['sub-issues'] ? [...parentData['sub-issues']] : [];

		// Check if already exists
		const existing = this.relationshipUtils.resolveLinks(subIssues as any);
		if (existing.some(f => f.path === child.path)) {
			return; // Already exists
		}

		// Add wikilink
		subIssues.push(this.relationshipUtils.fileToWikilink(child));

		await this.frontmatterUtils.updateFrontmatter(parent, {
			'sub-issues': subIssues
		} as any);
	}

	/**
	 * Helper: Remove issue from parent's subIssues array
	 */
	private async removeFromSubIssues(parent: TFile, child: TFile): Promise<void> {
		const parentData = await this.frontmatterUtils.getFrontmatter(parent) as any;
		if (!parentData['sub-issues']) return;

		// Filter out the child
		const subIssues = (parentData['sub-issues'] as any[]).filter((link: string) => {
			const linkText = this.relationshipUtils.parseWikilinks(link)[0];
			const file = this.relationshipUtils.resolveLink(linkText);
			return file?.path !== child.path;
		});

		await this.frontmatterUtils.updateFrontmatter(parent, {
			'sub-issues': subIssues.length > 0 ? subIssues : undefined
		} as any);
	}
}
