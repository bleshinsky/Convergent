import { App, MockVault, MockMetadataCache } from '../__mocks__/obsidian';
import { IdGenerator } from '../../src/utils/idGenerator';

function makeApp() {
	return new App();
}

describe('IdGenerator', () => {
	let app: App;
	let generator: IdGenerator;

	beforeEach(() => {
		app = makeApp();
		generator = new IdGenerator(app as any);
	});

	// ─── isValidIssueId ───────────────────────────────────────────────────────

	describe('isValidIssueId', () => {
		it('accepts valid ISSUE-n format', () => {
			expect(generator.isValidIssueId('ISSUE-1')).toBe(true);
			expect(generator.isValidIssueId('ISSUE-100')).toBe(true);
			expect(generator.isValidIssueId('ISSUE-9999')).toBe(true);
		});

		it('rejects invalid formats', () => {
			expect(generator.isValidIssueId('ISS-1')).toBe(false);
			expect(generator.isValidIssueId('ISSUE-')).toBe(false);
			expect(generator.isValidIssueId('issue-1')).toBe(false);
			expect(generator.isValidIssueId('1')).toBe(false);
			expect(generator.isValidIssueId('')).toBe(false);
			expect(generator.isValidIssueId('ISSUE-1a')).toBe(false);
		});
	});

	// ─── isValidProjectId ─────────────────────────────────────────────────────

	describe('isValidProjectId', () => {
		it('accepts valid PROJ-n format', () => {
			expect(generator.isValidProjectId('PROJ-1')).toBe(true);
			expect(generator.isValidProjectId('PROJ-500')).toBe(true);
		});

		it('rejects invalid formats', () => {
			expect(generator.isValidProjectId('PROJECT-1')).toBe(false);
			expect(generator.isValidProjectId('PROJ-')).toBe(false);
			expect(generator.isValidProjectId('')).toBe(false);
			expect(generator.isValidProjectId('proj-1')).toBe(false);
		});
	});

	// ─── extractIssueNumber ───────────────────────────────────────────────────

	describe('extractIssueNumber', () => {
		it('extracts the numeric part', () => {
			expect(generator.extractIssueNumber('ISSUE-42')).toBe(42);
			expect(generator.extractIssueNumber('ISSUE-1')).toBe(1);
			expect(generator.extractIssueNumber('ISSUE-9999')).toBe(9999);
		});

		it('returns null for invalid id', () => {
			expect(generator.extractIssueNumber('ISS-42')).toBeNull();
			expect(generator.extractIssueNumber('')).toBeNull();
			expect(generator.extractIssueNumber('ISSUE-')).toBeNull();
		});
	});

	// ─── extractProjectNumber ─────────────────────────────────────────────────

	describe('extractProjectNumber', () => {
		it('extracts the numeric part', () => {
			expect(generator.extractProjectNumber('PROJ-5')).toBe(5);
			expect(generator.extractProjectNumber('PROJ-100')).toBe(100);
		});

		it('returns null for invalid id', () => {
			expect(generator.extractProjectNumber('PROJECT-5')).toBeNull();
			expect(generator.extractProjectNumber('')).toBeNull();
		});
	});

	// ─── generateIssueId ─────────────────────────────────────────────────────

	describe('generateIssueId', () => {
		it('returns ISSUE-1 when vault has no issues', async () => {
			const id = await generator.generateIssueId();
			expect(id).toBe('ISSUE-1');
		});

		it('returns max+1 when issues already exist in the vault', async () => {
			const f1 = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const f3 = (app.vault as MockVault)._addFile('Issues/ISSUE-3.md');
			const f5 = (app.vault as MockVault)._addFile('Issues/ISSUE-5.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f1, { type: 'issue', id: 'ISSUE-1' });
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f3, { type: 'issue', id: 'ISSUE-3' });
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f5, { type: 'issue', id: 'ISSUE-5' });

			const id = await generator.generateIssueId();
			expect(id).toBe('ISSUE-6');
		});

		it('handles gaps in the sequence (always uses max+1 not next-gap)', async () => {
			// Existing: ISSUE-1 and ISSUE-10 (gap: 2–9)
			const f1 = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const f10 = (app.vault as MockVault)._addFile('Issues/ISSUE-10.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f1, { type: 'issue', id: 'ISSUE-1' });
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f10, { type: 'issue', id: 'ISSUE-10' });

			const id = await generator.generateIssueId();
			expect(id).toBe('ISSUE-11');
		});

		it('ignores project files when scanning for max issue id', async () => {
			const fp = (app.vault as MockVault)._addFile('Projects/PROJ-1.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(fp, { type: 'project', id: 'PROJ-1' });

			// Should still return ISSUE-1, not be confused by project ids
			const id = await generator.generateIssueId();
			expect(id).toBe('ISSUE-1');
		});
	});

	// ─── generateProjectId ────────────────────────────────────────────────────

	describe('generateProjectId', () => {
		it('returns PROJ-1 when no projects exist', async () => {
			const id = await generator.generateProjectId();
			expect(id).toBe('PROJ-1');
		});

		it('returns max+1 when projects already exist', async () => {
			const f1 = (app.vault as MockVault)._addFile('Projects/Proj1.md');
			const f2 = (app.vault as MockVault)._addFile('Projects/Proj2.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f1, { type: 'project', id: 'PROJ-1' });
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f2, { type: 'project', id: 'PROJ-2' });

			const id = await generator.generateProjectId();
			expect(id).toBe('PROJ-3');
		});
	});

	// ─── issueIdExists ────────────────────────────────────────────────────────

	describe('issueIdExists', () => {
		it('returns true when an issue with that id exists in the vault', async () => {
			const f = (app.vault as MockVault)._addFile('Issues/ISSUE-42.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f, { type: 'issue', id: 'ISSUE-42' });

			expect(await generator.issueIdExists('ISSUE-42')).toBe(true);
		});

		it('returns false when no issue has that id', async () => {
			expect(await generator.issueIdExists('ISSUE-999')).toBe(false);
		});

		it('returns false when a project (not issue) has a similar id', async () => {
			const f = (app.vault as MockVault)._addFile('Projects/Proj.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f, { type: 'project', id: 'PROJ-1' });

			expect(await generator.issueIdExists('PROJ-1')).toBe(false);
		});
	});

	// ─── projectIdExists ──────────────────────────────────────────────────────

	describe('projectIdExists', () => {
		it('returns true when a project with that id exists', async () => {
			const f = (app.vault as MockVault)._addFile('Projects/MyProj.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(f, { type: 'project', id: 'PROJ-7' });

			expect(await generator.projectIdExists('PROJ-7')).toBe(true);
		});

		it('returns false when no project has that id', async () => {
			expect(await generator.projectIdExists('PROJ-999')).toBe(false);
		});
	});

	// ─── generateUniqueIssueId ────────────────────────────────────────────────

	describe('generateUniqueIssueId', () => {
		it('generates a valid ISSUE-n id on an empty vault', async () => {
			const id = await generator.generateUniqueIssueId();
			expect(generator.isValidIssueId(id)).toBe(true);
		});

		it('returns ISSUE-1 on an empty vault', async () => {
			expect(await generator.generateUniqueIssueId()).toBe('ISSUE-1');
		});
	});

	// ─── generateUniqueProjectId ──────────────────────────────────────────────

	describe('generateUniqueProjectId', () => {
		it('generates a valid PROJ-n id on an empty vault', async () => {
			const id = await generator.generateUniqueProjectId();
			expect(generator.isValidProjectId(id)).toBe(true);
		});

		it('returns PROJ-1 on an empty vault', async () => {
			expect(await generator.generateUniqueProjectId()).toBe('PROJ-1');
		});
	});
});
