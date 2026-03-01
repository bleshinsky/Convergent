import { ContextExport } from '../../src/utils/contextExport';
import { App, TFile, MockMetadataCache } from '../__mocks__/obsidian';

function makeApp(): App {
	return new App();
}

describe('ContextExport', () => {
	let app: App;
	let utils: any;
	let mspUtils: any;
	let exporter: ContextExport;

	beforeEach(() => {
		app = makeApp();
		utils = {
			getFrontmatter: jest.fn(),
			getAllIssues: jest.fn().mockResolvedValue([])
		};
		mspUtils = {
			getActiveBlockers: jest.fn().mockResolvedValue([]),
			getRecentlyCompleted: jest.fn().mockResolvedValue([])
		};
		exporter = new ContextExport(app as any, utils, mspUtils);
	});

	describe('generateContext', () => {
		it('generates empty context when no issues', async () => {
			const ctx = await exporter.generateContext(null);
			expect(typeof ctx).toBe('string');
			// Should still have some structure
		});

		it('includes active session objectives when session is provided', async () => {
			const sessionFile = new TFile('Sessions/Session 2025-01-01.md');
			(app.metadataCache as MockMetadataCache)._setFrontmatter(sessionFile, {
				type: 'session',
				date: '2025-01-01',
				route: ['Finish feature X', 'Write tests']
			});
			// Override frontmatterUtils.getFrontmatter for session
			utils.getFrontmatter.mockResolvedValue({
				type: 'session',
				date: '2025-01-01',
				route: ['Finish feature X', 'Write tests']
			});

			const ctx = await exporter.generateContext(sessionFile as any);
			expect(ctx).toContain('SESSION');
			expect(ctx).toContain('Finish feature X');
		});

		it('includes active blockers', async () => {
			mspUtils.getActiveBlockers.mockResolvedValue(['API rate limits hit', 'Missing credentials']);

			const ctx = await exporter.generateContext(null);
			expect(ctx).toContain('BLOCKERS');
			expect(ctx).toContain('API rate limits hit');
		});

		it('includes recently completed issues', async () => {
			mspUtils.getRecentlyCompleted.mockResolvedValue(['ISSUE-1: Complete dashboard', 'ISSUE-2: Fix bug']);

			const ctx = await exporter.generateContext(null);
			expect(ctx).toContain('RECENTLY DONE');
			expect(ctx).toContain('ISSUE-1');
		});

		it('truncates to token budget', async () => {
			// Create a very long list of blockers
			const blockers = Array.from({ length: 500 }, (_, i) => `Blocker ${i}: This is a very long description that takes up lots of space in the context output`);
			mspUtils.getActiveBlockers.mockResolvedValue(blockers);

			const ctx = await exporter.generateContext(null);
			// ~1000 tokens * 4 chars/token = ~4000 chars
			expect(ctx.length).toBeLessThan(5000);
		});

		it('includes in-progress issues', async () => {
			const mockIssue = { type: 'issue', id: 'ISSUE-42', title: 'Build the thing', status: 'In Progress', priority: 'High' };
			const issueFile = new TFile('Issues/ISSUE-42.md');
			utils.getAllIssues.mockResolvedValue([issueFile]);
			utils.getFrontmatter.mockResolvedValue(mockIssue);

			const ctx = await exporter.generateContext(null);
			expect(ctx).toContain('IN PROGRESS');
			expect(ctx).toContain('ISSUE-42');
			expect(ctx).toContain('Build the thing');
		});
	});
});
