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

		it('sorts In Progress issues by priority (Urgent before High before Medium)', async () => {
			const f1 = new TFile('Issues/ISSUE-1.md');
			const f2 = new TFile('Issues/ISSUE-2.md');
			const f3 = new TFile('Issues/ISSUE-3.md');
			utils.getAllIssues.mockResolvedValue([f1, f2, f3]);
			utils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === f1.path) {
					return Promise.resolve({ type: 'issue', id: 'ISSUE-1', title: 'High task', status: 'In Progress', priority: 'High' });
				}
				if (file.path === f2.path) {
					return Promise.resolve({ type: 'issue', id: 'ISSUE-2', title: 'Urgent task', status: 'In Progress', priority: 'Urgent' });
				}
				return Promise.resolve({ type: 'issue', id: 'ISSUE-3', title: 'Medium task', status: 'In Progress', priority: 'Medium' });
			});

			const ctx = await exporter.generateContext(null);
			const urgentPos = ctx.indexOf('ISSUE-2');
			const highPos = ctx.indexOf('ISSUE-1');
			const mediumPos = ctx.indexOf('ISSUE-3');
			expect(urgentPos).toBeLessThan(highPos);
			expect(highPos).toBeLessThan(mediumPos);
		});

		it('includes memory-flagged issues in the MEMORIES section', async () => {
			const f = new TFile('Issues/ISSUE-1.md');
			utils.getAllIssues.mockResolvedValue([f]);
			utils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', title: 'Important reference', status: 'Todo', memory: true
			});

			const ctx = await exporter.generateContext(null);
			expect(ctx).toContain('MEMORIES');
			expect(ctx).toContain('ISSUE-1');
		});

		it('does not show MEMORIES section when no memory-flagged issues', async () => {
			const f = new TFile('Issues/ISSUE-1.md');
			utils.getAllIssues.mockResolvedValue([f]);
			utils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', title: 'Normal issue', status: 'Todo'
			});

			const ctx = await exporter.generateContext(null);
			expect(ctx).not.toContain('MEMORIES');
		});

		it('shows OVERDUE warning for past due dates', async () => {
			const f = new TFile('Issues/ISSUE-1.md');
			utils.getAllIssues.mockResolvedValue([f]);
			utils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', title: 'Overdue task',
				status: 'In Progress', due: '2020-01-01'
			});

			const ctx = await exporter.generateContext(null);
			expect(ctx).toContain('OVERDUE');
		});

		it('shows "due in Nd" for issues due within 7 days', async () => {
			const f = new TFile('Issues/ISSUE-1.md');
			const soonDate = new Date();
			soonDate.setDate(soonDate.getDate() + 3);
			const dueStr = soonDate.toISOString().slice(0, 10);

			utils.getAllIssues.mockResolvedValue([f]);
			utils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', title: 'Due soon', status: 'In Progress', due: dueStr
			});

			const ctx = await exporter.generateContext(null);
			expect(ctx).toMatch(/due in \d+d/);
		});

		it('does not show priority label for "No Priority" issues', async () => {
			const f = new TFile('Issues/ISSUE-1.md');
			utils.getAllIssues.mockResolvedValue([f]);
			utils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', title: 'Unprioritized', status: 'In Progress', priority: 'No Priority'
			});

			const ctx = await exporter.generateContext(null);
			expect(ctx).not.toContain('(No Priority)');
		});

		it('shows priority label for prioritized issues', async () => {
			const f = new TFile('Issues/ISSUE-1.md');
			utils.getAllIssues.mockResolvedValue([f]);
			utils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', title: 'Critical thing', status: 'In Progress', priority: 'Urgent'
			});

			const ctx = await exporter.generateContext(null);
			expect(ctx).toContain('(Urgent)');
		});
	});
});
