import { RelationshipUtils } from '../../src/utils/relationships';
import { App, TFile, MockVault, MockMetadataCache, addFileWithFrontmatter } from '../__mocks__/obsidian';

describe('RelationshipUtils', () => {
	let app: App;
	let utils: RelationshipUtils;

	beforeEach(() => {
		app = new App();
		utils = new RelationshipUtils(app as any);
	});

	// ─── parseWikilinks ───────────────────────────────────────────────────────

	describe('parseWikilinks', () => {
		it('extracts a single wikilink from a string', () => {
			expect(utils.parseWikilinks('[[ISSUE-1]]')).toEqual(['ISSUE-1']);
		});

		it('extracts multiple wikilinks from a string', () => {
			expect(utils.parseWikilinks('[[ISSUE-1]] and [[ISSUE-2]]')).toEqual(['ISSUE-1', 'ISSUE-2']);
		});

		it('handles display-text wikilinks [[Link|Display]]', () => {
			expect(utils.parseWikilinks('[[ISSUE-1|My Issue]]')).toEqual(['ISSUE-1']);
		});

		it('returns empty array for strings without wikilinks', () => {
			expect(utils.parseWikilinks('plain text, no links')).toEqual([]);
		});

		it('returns empty array for empty string', () => {
			expect(utils.parseWikilinks('')).toEqual([]);
		});

		it('processes an array of wikilink strings', () => {
			expect(utils.parseWikilinks(['[[ISSUE-1]]', '[[ISSUE-2]]'])).toEqual(['ISSUE-1', 'ISSUE-2']);
		});

		it('filters out array elements without wikilinks', () => {
			expect(utils.parseWikilinks(['[[ISSUE-1]]', 'plain', '[[ISSUE-3]]'])).toEqual([
				'ISSUE-1',
				'ISSUE-3'
			]);
		});

		it('trims whitespace inside brackets', () => {
			expect(utils.parseWikilinks('[[ ISSUE-1 ]]')).toEqual(['ISSUE-1']);
		});
	});

	// ─── fileToWikilink ───────────────────────────────────────────────────────

	describe('fileToWikilink', () => {
		it('converts a TFile to [[basename]] format', () => {
			const file = new TFile('Issues/ISSUE-42.md');
			expect(utils.fileToWikilink(file as any)).toBe('[[ISSUE-42]]');
		});

		it('uses the basename without .md extension', () => {
			const file = new TFile('Projects/My Project.md');
			expect(utils.fileToWikilink(file as any)).toBe('[[My Project]]');
		});
	});

	// ─── filesToWikilinks ─────────────────────────────────────────────────────

	describe('filesToWikilinks', () => {
		it('converts an array of TFiles to wikilink strings', () => {
			const files = [new TFile('Issues/ISSUE-1.md'), new TFile('Issues/ISSUE-2.md')];
			expect(utils.filesToWikilinks(files as any[])).toEqual(['[[ISSUE-1]]', '[[ISSUE-2]]']);
		});

		it('returns empty array for empty input', () => {
			expect(utils.filesToWikilinks([])).toEqual([]);
		});
	});

	// ─── resolveLink ─────────────────────────────────────────────────────────

	describe('resolveLink', () => {
		it('resolves a wikilink text to the matching TFile in the vault', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const resolved = utils.resolveLink('ISSUE-1');
			expect(resolved?.path).toBe('Issues/ISSUE-1.md');
		});

		it('strips [[brackets]] from the input if present', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-5.md', { type: 'issue' });
			const resolved = utils.resolveLink('[[ISSUE-5]]');
			expect(resolved?.path).toBe('Issues/ISSUE-5.md');
		});

		it('returns null for empty link text', () => {
			expect(utils.resolveLink('')).toBeNull();
		});

		it('returns null when the file is not in the vault', () => {
			expect(utils.resolveLink('NON-EXISTENT-FILE')).toBeNull();
		});

		it('performs case-insensitive matching', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-99.md', { type: 'issue' });
			const resolved = utils.resolveLink('issue-99');
			expect(resolved?.path).toBe('Issues/ISSUE-99.md');
		});
	});

	// ─── resolveLinks ─────────────────────────────────────────────────────────

	describe('resolveLinks', () => {
		it('resolves multiple wikilink strings to TFiles', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue' });
			const files = utils.resolveLinks(['[[ISSUE-1]]', '[[ISSUE-2]]']);
			expect(files.length).toBe(2);
		});

		it('filters out null results for unresolvable links', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const files = utils.resolveLinks(['[[ISSUE-1]]', '[[DOES-NOT-EXIST]]']);
			expect(files.length).toBe(1);
			expect(files[0].path).toBe('Issues/ISSUE-1.md');
		});

		it('returns empty array for empty input', () => {
			expect(utils.resolveLinks([])).toEqual([]);
		});
	});

	// ─── getAllIssues ─────────────────────────────────────────────────────────

	describe('getAllIssues', () => {
		it('returns only issue files from the specified folder', async () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue', id: 'ISSUE-1' });
			addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue', id: 'ISSUE-2' });
			addFileWithFrontmatter(app, 'Projects/PROJ-1.md', { type: 'project', id: 'PROJ-1' });

			const issues = await utils.getAllIssues('Issues/');
			expect(issues.length).toBe(2);
			expect(issues.every(f => f.path.startsWith('Issues/'))).toBe(true);
		});

		it('excludes issue files in different folders', async () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			addFileWithFrontmatter(app, 'Archive/ISSUE-2.md', { type: 'issue' });
			const issues = await utils.getAllIssues('Issues/');
			expect(issues.length).toBe(1);
		});

		it('excludes non-issue files inside the issues folder', async () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			addFileWithFrontmatter(app, 'Issues/README.md', { type: 'note' });
			const issues = await utils.getAllIssues('Issues/');
			expect(issues.length).toBe(1);
		});

		it('returns empty array when folder has no issues', async () => {
			addFileWithFrontmatter(app, 'Issues/README.md', { type: 'note' });
			const issues = await utils.getAllIssues('Issues/');
			expect(issues.length).toBe(0);
		});
	});

	// ─── getInverseRelationType ───────────────────────────────────────────────

	describe('getInverseRelationType', () => {
		it('parent → child', () => {
			expect(utils.getInverseRelationType('parent')).toBe('child');
		});
		it('child → parent', () => {
			expect(utils.getInverseRelationType('child')).toBe('parent');
		});
		it('blocks → blocked-by', () => {
			expect(utils.getInverseRelationType('blocks')).toBe('blocked-by');
		});
		it('blocked-by → blocks', () => {
			expect(utils.getInverseRelationType('blocked-by')).toBe('blocks');
		});
		it('related → related (symmetric)', () => {
			expect(utils.getInverseRelationType('related')).toBe('related');
		});
	});

	// ─── isBlocked / getBlockerCount / getChildCount ──────────────────────────

	describe('isBlocked', () => {
		it('returns true when blockedBy has at least one entry', () => {
			const issue: any = { blockedBy: ['[[ISSUE-1]]'] };
			expect(utils.isBlocked(issue)).toBe(true);
		});

		it('returns false when blockedBy is empty', () => {
			expect(utils.isBlocked({ blockedBy: [] } as any)).toBe(false);
		});

		it('returns false when blockedBy is undefined', () => {
			expect(utils.isBlocked({} as any)).toBe(false);
		});
	});

	describe('getBlockerCount', () => {
		it('returns the number of blockers', () => {
			const issue: any = { blockedBy: ['[[ISSUE-1]]', '[[ISSUE-2]]'] };
			expect(utils.getBlockerCount(issue)).toBe(2);
		});

		it('returns 0 when no blockers', () => {
			expect(utils.getBlockerCount({} as any)).toBe(0);
		});
	});

	describe('getChildCount', () => {
		it('returns the number of sub-issues', () => {
			const issue: any = { subIssues: ['[[ISSUE-2]]', '[[ISSUE-3]]', '[[ISSUE-4]]'] };
			expect(utils.getChildCount(issue)).toBe(3);
		});

		it('returns 0 when no children', () => {
			expect(utils.getChildCount({} as any)).toBe(0);
		});
	});

	// ─── formatRelationshipType ───────────────────────────────────────────────

	describe('formatRelationshipType', () => {
		it('formats parent as "Parent Issue"', () => {
			expect(utils.formatRelationshipType('parent')).toBe('Parent Issue');
		});
		it('formats child as "Sub-Issue"', () => {
			expect(utils.formatRelationshipType('child')).toBe('Sub-Issue');
		});
		it('formats blocks as "Blocks"', () => {
			expect(utils.formatRelationshipType('blocks')).toBe('Blocks');
		});
		it('formats blocked-by as "Blocked By"', () => {
			expect(utils.formatRelationshipType('blocked-by')).toBe('Blocked By');
		});
		it('formats related as "Related To"', () => {
			expect(utils.formatRelationshipType('related')).toBe('Related To');
		});
	});

	// ─── getRelationshipIcon ──────────────────────────────────────────────────

	describe('getRelationshipIcon', () => {
		it('returns ↑ for parent', () => {
			expect(utils.getRelationshipIcon('parent')).toBe('↑');
		});
		it('returns ↓ for child', () => {
			expect(utils.getRelationshipIcon('child')).toBe('↓');
		});
		it('returns 🚫 for blocks', () => {
			expect(utils.getRelationshipIcon('blocks')).toBe('🚫');
		});
		it('returns ⛔ for blocked-by', () => {
			expect(utils.getRelationshipIcon('blocked-by')).toBe('⛔');
		});
		it('returns 🔗 for related', () => {
			expect(utils.getRelationshipIcon('related')).toBe('🔗');
		});
	});

	// ─── validateRelationship ────────────────────────────────────────────────

	describe('validateRelationship', () => {
		it('rejects self-links (source === target)', async () => {
			const file = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			expect(await utils.validateRelationship('related', file as any, file as any)).toBe(false);
		});

		it('allows a related link between two different issues', async () => {
			const f1 = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const f2 = addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue' });
			expect(await utils.validateRelationship('related', f1 as any, f2 as any)).toBe(true);
		});

		it('detects parent cycle: A→parent→B, setting B parent to A', async () => {
			// A has parent B; setting B's parent to A would create A↔B cycle
			const fileA = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', {
				type: 'issue',
				parent: '[[ISSUE-2]]'
			});
			const fileB = addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue' });
			// validateRelationship('parent', B, A) → would set B's parent to A → cycle
			expect(await utils.validateRelationship('parent', fileB as any, fileA as any)).toBe(false);
		});
	});

	// ─── detectParentCycle ────────────────────────────────────────────────────

	describe('detectParentCycle', () => {
		it('returns false when no cycle exists', async () => {
			const parent = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const child = addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue' });
			expect(await utils.detectParentCycle(child as any, parent as any)).toBe(false);
		});

		it('detects a direct A→B cycle', async () => {
			// A has parent B; now want to set B's parent to A → cycle
			const fileA = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const fileB = addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', {
				type: 'issue',
				parent: '[[ISSUE-1]]'
			});
			// detectParentCycle(A, B): start at B, B has parent A = target → CYCLE
			expect(await utils.detectParentCycle(fileA as any, fileB as any)).toBe(true);
		});

		it('returns false when there is a linear chain but no cycle', async () => {
			// A → B → C (no cycle)
			const fileA = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const fileB = addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', {
				type: 'issue',
				parent: '[[ISSUE-3]]'
			});
			const fileC = addFileWithFrontmatter(app, 'Issues/ISSUE-3.md', { type: 'issue' });
			// detectParentCycle(A, B): start at B, B has parent C; C has no parent → no cycle
			expect(await utils.detectParentCycle(fileA as any, fileB as any)).toBe(false);
		});
	});

	// ─── hasRelationship ─────────────────────────────────────────────────────

	describe('hasRelationship', () => {
		it('returns true for a matching parent relationship', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const target = new TFile('Issues/ISSUE-1.md');
			const issue: any = { parent: '[[ISSUE-1]]' };
			expect(utils.hasRelationship(issue, 'parent', target as any)).toBe(true);
		});

		it('returns false when parent does not match', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue' });
			const target = new TFile('Issues/ISSUE-1.md');
			const issue: any = { parent: '[[ISSUE-2]]' };
			expect(utils.hasRelationship(issue, 'parent', target as any)).toBe(false);
		});

		it('returns false when parent is undefined', () => {
			const target = new TFile('Issues/ISSUE-1.md');
			expect(utils.hasRelationship({} as any, 'parent', target as any)).toBe(false);
		});

		it('returns true for a matching blocks relationship', () => {
			const target = addFileWithFrontmatter(app, 'Issues/ISSUE-5.md', { type: 'issue' });
			const issue: any = { blocks: ['[[ISSUE-5]]'] };
			expect(utils.hasRelationship(issue, 'blocks', target as any)).toBe(true);
		});

		it('returns true for a matching blocked-by relationship', () => {
			const target = addFileWithFrontmatter(app, 'Issues/ISSUE-7.md', { type: 'issue' });
			const issue: any = { blockedBy: ['[[ISSUE-7]]'] };
			expect(utils.hasRelationship(issue, 'blocked-by', target as any)).toBe(true);
		});

		it('returns true for a matching related relationship', () => {
			const target = addFileWithFrontmatter(app, 'Issues/ISSUE-10.md', { type: 'issue' });
			const issue: any = { related: ['[[ISSUE-10]]'] };
			expect(utils.hasRelationship(issue, 'related', target as any)).toBe(true);
		});

		it('returns true for a matching child relationship', () => {
			const target = addFileWithFrontmatter(app, 'Issues/ISSUE-3.md', { type: 'issue' });
			const issue: any = { subIssues: ['[[ISSUE-3]]', '[[ISSUE-4]]'] };
			expect(utils.hasRelationship(issue, 'child', target as any)).toBe(true);
		});
	});

	// ─── getRelatedFiles ──────────────────────────────────────────────────────

	describe('getRelatedFiles', () => {
		it('returns the parent file for a parent relationship', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });
			const issue: any = { parent: '[[ISSUE-1]]' };
			const files = utils.getRelatedFiles(issue, 'parent');
			expect(files.length).toBe(1);
			expect(files[0].path).toBe('Issues/ISSUE-1.md');
		});

		it('returns empty array when parent is undefined', () => {
			expect(utils.getRelatedFiles({} as any, 'parent')).toEqual([]);
		});

		it('returns child files for a child relationship', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue' });
			addFileWithFrontmatter(app, 'Issues/ISSUE-3.md', { type: 'issue' });
			const issue: any = { subIssues: ['[[ISSUE-2]]', '[[ISSUE-3]]'] };
			const files = utils.getRelatedFiles(issue, 'child');
			expect(files.length).toBe(2);
		});

		it('filters unresolvable wikilinks from the result', () => {
			const issue: any = { subIssues: ['[[NONEXISTENT]]'] };
			expect(utils.getRelatedFiles(issue, 'child')).toEqual([]);
		});

		it('returns blocking files for a blocks relationship', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-20.md', { type: 'issue' });
			const issue: any = { blocks: ['[[ISSUE-20]]'] };
			const files = utils.getRelatedFiles(issue, 'blocks');
			expect(files.length).toBe(1);
		});

		it('returns blocker files for a blocked-by relationship', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-30.md', { type: 'issue' });
			const issue: any = { blockedBy: ['[[ISSUE-30]]'] };
			const files = utils.getRelatedFiles(issue, 'blocked-by');
			expect(files.length).toBe(1);
		});

		it('returns related files for a related relationship', () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-50.md', { type: 'issue' });
			const issue: any = { related: ['[[ISSUE-50]]'] };
			const files = utils.getRelatedFiles(issue, 'related');
			expect(files.length).toBe(1);
		});
	});
});
