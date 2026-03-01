import { App, TFile, MockVault, MockMetadataCache, addFileWithFrontmatter } from '../__mocks__/obsidian';
import { FrontmatterUtils } from '../../src/utils/frontmatter';

function makeApp() {
	return new App();
}

describe('FrontmatterUtils', () => {
	let app: App;
	let utils: FrontmatterUtils;

	beforeEach(() => {
		app = makeApp();
		utils = new FrontmatterUtils(app as any);
	});

	// ─── validateIssueFrontmatter ─────────────────────────────────────────────

	describe('validateIssueFrontmatter', () => {
		const validIssue = {
			type: 'issue',
			id: 'ISSUE-1',
			title: 'Test Issue',
			status: 'Todo',
			created: '2025-01-01T00:00:00.000Z',
			modified: '2025-01-01T00:00:00.000Z'
		};

		it('accepts valid issue frontmatter', () => {
			expect(utils.validateIssueFrontmatter(validIssue)).toBe(true);
		});

		it('rejects wrong type', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, type: 'project' })).toBe(false);
		});

		it('rejects missing id', () => {
			const { id, ...rest } = validIssue;
			expect(utils.validateIssueFrontmatter(rest)).toBe(false);
		});

		it('rejects invalid id format', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, id: 'ISS-1' })).toBe(false);
		});

		it('rejects empty title', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, title: '' })).toBe(false);
		});

		it('rejects whitespace-only title', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, title: '   ' })).toBe(false);
		});

		it('rejects invalid status', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, status: 'In Review' })).toBe(false);
		});

		it('accepts all 6 valid statuses', () => {
			const validStatuses = ['Backlog', 'Triage', 'Todo', 'In Progress', 'Done', 'Canceled'];
			validStatuses.forEach(status => {
				expect(utils.validateIssueFrontmatter({ ...validIssue, status })).toBe(true);
			});
		});

		it('accepts all 5 valid priorities', () => {
			const validPriorities = ['No Priority', 'Low', 'Medium', 'High', 'Urgent'];
			validPriorities.forEach(priority => {
				expect(utils.validateIssueFrontmatter({ ...validIssue, priority })).toBe(true);
			});
		});

		it('rejects invalid priority', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, priority: 'Critical' })).toBe(false);
		});

		it('rejects null input', () => {
			expect(utils.validateIssueFrontmatter(null)).toBe(false);
		});

		it('rejects non-object input', () => {
			expect(utils.validateIssueFrontmatter('string')).toBe(false);
			expect(utils.validateIssueFrontmatter(42)).toBe(false);
		});

		it('rejects missing created timestamp', () => {
			const { created, ...rest } = validIssue;
			expect(utils.validateIssueFrontmatter(rest)).toBe(false);
		});

		it('rejects missing modified timestamp', () => {
			const { modified, ...rest } = validIssue;
			expect(utils.validateIssueFrontmatter(rest)).toBe(false);
		});
	});

	// ─── validateProjectFrontmatter ───────────────────────────────────────────

	describe('validateProjectFrontmatter', () => {
		const validProject = {
			type: 'project',
			id: 'PROJ-1',
			title: 'Test Project',
			status: 'Planning',
			lead: 'me',
			created: '2025-01-01'
		};

		it('accepts valid project frontmatter', () => {
			expect(utils.validateProjectFrontmatter(validProject)).toBe(true);
		});

		it('rejects wrong type', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, type: 'issue' })).toBe(false);
		});

		it('rejects invalid id format', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, id: 'PROJECT-1' })).toBe(false);
		});

		it('accepts all 5 valid project statuses', () => {
			const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Canceled'];
			validStatuses.forEach(status => {
				expect(utils.validateProjectFrontmatter({ ...validProject, status })).toBe(true);
			});
		});

		it('rejects invalid status', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, status: 'Unknown' })).toBe(false);
		});

		it('rejects empty lead', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, lead: '' })).toBe(false);
		});

		it('rejects whitespace-only lead', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, lead: '   ' })).toBe(false);
		});

		it('rejects null input', () => {
			expect(utils.validateProjectFrontmatter(null)).toBe(false);
		});
	});

	// ─── validateFrontmatter (dispatcher) ─────────────────────────────────────

	describe('validateFrontmatter', () => {
		it('dispatches to issue validation', () => {
			const data = {
				type: 'issue', id: 'ISSUE-1', title: 'T', status: 'Todo',
				created: '2025-01-01', modified: '2025-01-01'
			};
			expect(utils.validateFrontmatter(data, 'issue')).toBe(true);
		});

		it('dispatches to project validation', () => {
			const data = {
				type: 'project', id: 'PROJ-1', title: 'P', status: 'Planning',
				lead: 'me', created: '2025-01-01'
			};
			expect(utils.validateFrontmatter(data, 'project')).toBe(true);
		});
	});

	// ─── isType / isIssue / isProject ────────────────────────────────────────

	describe('isType', () => {
		it('returns true when frontmatter type matches', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'issue' });
			expect(await utils.isType(file as any, 'issue')).toBe(true);
		});

		it('returns false when type does not match', async () => {
			const file = new TFile('Projects/My-Project.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'project' });
			expect(await utils.isType(file as any, 'issue')).toBe(false);
		});

		it('returns false when no frontmatter', async () => {
			const file = new TFile('Notes/random.md');
			expect(await utils.isType(file as any, 'issue')).toBe(false);
		});
	});

	describe('isIssue', () => {
		it('returns true for issue files', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'issue' });
			expect(await utils.isIssue(file as any)).toBe(true);
		});

		it('returns false for project files', async () => {
			const file = new TFile('Projects/P.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'project' });
			expect(await utils.isIssue(file as any)).toBe(false);
		});
	});

	describe('isProject', () => {
		it('returns true for project files', async () => {
			const file = new TFile('Projects/P.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'project' });
			expect(await utils.isProject(file as any)).toBe(true);
		});
	});

	// ─── getFrontmatter ───────────────────────────────────────────────────────

	describe('getFrontmatter', () => {
		it('returns null when no cache entry exists', async () => {
			const file = new TFile('notes/no-frontmatter.md');
			expect(await utils.getFrontmatter(file as any)).toBeNull();
		});

		it('returns the full frontmatter object when cache exists', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			const fm = { type: 'issue', id: 'ISSUE-1', title: 'Test' };
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, fm);
			expect(await utils.getFrontmatter(file as any)).toEqual(fm);
		});
	});

	// ─── getField ────────────────────────────────────────────────────────────

	describe('getField', () => {
		it('returns the value of a specific field', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, {
				type: 'issue', id: 'ISSUE-1', status: 'In Progress'
			});

			const status = await utils.getField<string>(file as any, 'status');
			expect(status).toBe('In Progress');
		});

		it('returns undefined when the field does not exist', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'issue' });

			const missing = await utils.getField<string>(file as any, 'nonexistent');
			expect(missing).toBeUndefined();
		});
	});

	// ─── updateFrontmatter ────────────────────────────────────────────────────

	describe('updateFrontmatter', () => {
		it('persists field updates to the metadata cache', async () => {
			const file = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', {
				type: 'issue', id: 'ISSUE-1', status: 'Backlog'
			});

			await utils.updateFrontmatter(file as any, { status: 'In Progress' } as any);

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(file);
			expect(updated?.status).toBe('In Progress');
		});

		it('adds a modified timestamp on every update', async () => {
			const file = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', {
				type: 'issue', id: 'ISSUE-1', status: 'Todo'
			});

			await utils.updateFrontmatter(file as any, { status: 'Done' } as any);

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(file);
			expect(typeof updated?.modified).toBe('string');
		});

		it('merges updates with existing frontmatter (does not overwrite unrelated fields)', async () => {
			const file = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', {
				type: 'issue', id: 'ISSUE-1', title: 'Original Title', status: 'Backlog'
			});

			await utils.updateFrontmatter(file as any, { status: 'Done' } as any);

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(file);
			expect(updated?.title).toBe('Original Title');
			expect(updated?.id).toBe('ISSUE-1');
		});
	});

	// ─── setField ────────────────────────────────────────────────────────────

	describe('setField', () => {
		it('sets a single field value', async () => {
			const file = addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', {
				type: 'issue', id: 'ISSUE-1', priority: 'Low'
			});

			await utils.setField(file as any, 'priority', 'Urgent');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(file);
			expect(updated?.priority).toBe('Urgent');
		});
	});

	// ─── getAllIssues / getAllProjects ─────────────────────────────────────────

	describe('getAllIssues', () => {
		it('returns all files with type: issue', async () => {
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue', id: 'ISSUE-1' });
			addFileWithFrontmatter(app, 'Issues/ISSUE-2.md', { type: 'issue', id: 'ISSUE-2' });
			addFileWithFrontmatter(app, 'Projects/PROJ-1.md', { type: 'project', id: 'PROJ-1' });

			const issues = await utils.getAllIssues();
			expect(issues.length).toBe(2);
			expect(issues.every(f => f.path.startsWith('Issues/'))).toBe(true);
		});

		it('returns empty array when no issues exist', async () => {
			addFileWithFrontmatter(app, 'Projects/PROJ-1.md', { type: 'project' });
			const issues = await utils.getAllIssues();
			expect(issues).toHaveLength(0);
		});

		it('excludes files without frontmatter', async () => {
			(app.vault as MockVault)._addFile('Issues/no-frontmatter.md');
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });

			const issues = await utils.getAllIssues();
			expect(issues.length).toBe(1);
		});
	});

	describe('getAllProjects', () => {
		it('returns all files with type: project', async () => {
			addFileWithFrontmatter(app, 'Projects/Alpha.md', { type: 'project', id: 'PROJ-1' });
			addFileWithFrontmatter(app, 'Projects/Beta.md', { type: 'project', id: 'PROJ-2' });
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });

			const projects = await utils.getAllProjects();
			expect(projects.length).toBe(2);
		});

		it('returns empty array when no projects exist', async () => {
			expect(await utils.getAllProjects()).toHaveLength(0);
		});
	});

	// ─── getFilesByType ───────────────────────────────────────────────────────

	describe('getFilesByType', () => {
		it('returns files matching the specified type', async () => {
			addFileWithFrontmatter(app, 'Sessions/S1.md', { type: 'session' });
			addFileWithFrontmatter(app, 'Issues/ISSUE-1.md', { type: 'issue' });

			const sessions = await utils.getFilesByType('session');
			expect(sessions.length).toBe(1);
			expect(sessions[0].basename).toBe('S1');
		});

		it('returns empty array when no files match', async () => {
			const blockers = await utils.getFilesByType('blocker');
			expect(blockers).toHaveLength(0);
		});
	});
});
