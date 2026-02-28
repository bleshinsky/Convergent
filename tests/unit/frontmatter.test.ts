import { App, TFile, MockMetadataCache } from '../__mocks__/obsidian';
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

		it('rejects invalid status', () => {
			expect(utils.validateIssueFrontmatter({ ...validIssue, status: 'In Review' })).toBe(false);
		});

		it('accepts all valid statuses', () => {
			const validStatuses = ['Backlog', 'Triage', 'Todo', 'In Progress', 'Done', 'Canceled'];
			validStatuses.forEach(status => {
				expect(utils.validateIssueFrontmatter({ ...validIssue, status })).toBe(true);
			});
		});

		it('accepts all valid priorities', () => {
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
	});

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

		it('rejects all valid project statuses', () => {
			const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Canceled'];
			validStatuses.forEach(status => {
				expect(utils.validateProjectFrontmatter({ ...validProject, status })).toBe(true);
			});
		});

		it('rejects invalid status', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, status: 'Unknown' })).toBe(false);
		});

		it('rejects missing lead', () => {
			expect(utils.validateProjectFrontmatter({ ...validProject, lead: '' })).toBe(false);
		});
	});

	describe('isType', () => {
		it('returns true when frontmatter type matches', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'issue' });
			const result = await utils.isType(file as any, 'issue');
			expect(result).toBe(true);
		});

		it('returns false when type does not match', async () => {
			const file = new TFile('Projects/My-Project.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, { type: 'project' });
			const result = await utils.isType(file as any, 'issue');
			expect(result).toBe(false);
		});
	});

	describe('getFrontmatter', () => {
		it('returns null when no cache exists', async () => {
			const file = new TFile('notes/no-frontmatter.md');
			const result = await utils.getFrontmatter(file as any);
			expect(result).toBeNull();
		});

		it('returns frontmatter when cache exists', async () => {
			const file = new TFile('Issues/ISSUE-1.md');
			const fm = { type: 'issue', id: 'ISSUE-1', title: 'Test' };
			(app.metadataCache as MockMetadataCache)._setFrontmatter(file, fm);
			const result = await utils.getFrontmatter(file as any);
			expect(result).toEqual(fm);
		});
	});
});
