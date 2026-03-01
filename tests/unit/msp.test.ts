import { MSPUtils } from '../../src/utils/msp';
import { App, TFile, MockVault, addFileWithFrontmatter } from '../__mocks__/obsidian';

describe('MSPUtils', () => {
	let app: App;
	let frontmatterUtils: any;
	let mspUtils: MSPUtils;

	beforeEach(() => {
		app = new App();
		frontmatterUtils = {
			getFrontmatter: jest.fn(),
			getAllIssues: jest.fn().mockResolvedValue([])
		};
		mspUtils = new MSPUtils(app as any, frontmatterUtils);
	});

	// ─── getAllSessions ───────────────────────────────────────────────────────

	describe('getAllSessions', () => {
		it('returns empty array when vault is empty', async () => {
			frontmatterUtils.getFrontmatter.mockResolvedValue(null);
			expect(await mspUtils.getAllSessions()).toEqual([]);
		});

		it('returns only files with type: session', async () => {
			(app.vault as MockVault)._addFile('Sessions/Session 2025-01-01.md');
			(app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path.includes('Session')) {
					return Promise.resolve({ type: 'session', id: 'S1', date: '2025-01-01', route: [] });
				}
				return Promise.resolve({ type: 'issue', id: 'ISSUE-1' });
			});

			const sessions = await mspUtils.getAllSessions();
			expect(sessions.length).toBe(1);
			expect(sessions[0].frontmatter.type).toBe('session');
		});

		it('returns all session files when multiple exist', async () => {
			(app.vault as MockVault)._addFile('Sessions/Session 2025-01-01.md');
			(app.vault as MockVault)._addFile('Sessions/Session 2025-02-01.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'session', id: 'S1', date: '2025-01-01', route: []
			});

			const sessions = await mspUtils.getAllSessions();
			expect(sessions.length).toBe(2);
		});
	});

	// ─── getLastSession ───────────────────────────────────────────────────────

	describe('getLastSession', () => {
		it('returns null when no sessions exist', async () => {
			frontmatterUtils.getFrontmatter.mockResolvedValue(null);
			expect(await mspUtils.getLastSession()).toBeNull();
		});

		it('returns the single session when only one exists', async () => {
			(app.vault as MockVault)._addFile('Sessions/Session 2025-01-01.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'session', id: 'S1', date: '2025-01-01', route: []
			});

			const result = await mspUtils.getLastSession();
			expect(result).not.toBeNull();
			expect(result!.session.date).toBe('2025-01-01');
		});

		it('returns the most recent session when multiple exist', async () => {
			(app.vault as MockVault)._addFile('Sessions/Session 2025-01-01.md');
			(app.vault as MockVault)._addFile('Sessions/Session 2025-03-15.md');
			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.basename.includes('2025-01-01')) {
					return Promise.resolve({ type: 'session', id: 'S1', date: '2025-01-01', route: [] });
				}
				return Promise.resolve({ type: 'session', id: 'S2', date: '2025-03-15', route: [] });
			});

			const result = await mspUtils.getLastSession();
			expect(result!.session.date).toBe('2025-03-15');
		});
	});

	// ─── getActiveBlockers ────────────────────────────────────────────────────

	describe('getActiveBlockers', () => {
		it('returns empty array when vault has no blockers', async () => {
			frontmatterUtils.getFrontmatter.mockResolvedValue(null);
			expect(await mspUtils.getActiveBlockers()).toEqual([]);
		});

		it('returns only blockers with status: Active', async () => {
			(app.vault as MockVault)._addFile('Blockers/active.md');
			(app.vault as MockVault)._addFile('Blockers/resolved.md');
			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.basename === 'active') {
					return Promise.resolve({ type: 'blocker', title: 'API down', status: 'Active' });
				}
				return Promise.resolve({ type: 'blocker', title: 'Old blocker', status: 'Resolved' });
			});

			const blockers = await mspUtils.getActiveBlockers();
			expect(blockers).toEqual(['API down']);
		});

		it('excludes Resolved blockers', async () => {
			(app.vault as MockVault)._addFile('Blockers/b1.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'blocker', title: 'Old issue', status: 'Resolved'
			});
			expect(await mspUtils.getActiveBlockers()).toHaveLength(0);
		});

		it('excludes Abandoned blockers', async () => {
			(app.vault as MockVault)._addFile('Blockers/b1.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'blocker', title: 'Dropped', status: 'Abandoned'
			});
			expect(await mspUtils.getActiveBlockers()).toHaveLength(0);
		});

		it('uses the file basename when title is missing', async () => {
			(app.vault as MockVault)._addFile('Blockers/my-blocker.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({ type: 'blocker', status: 'Active' });
			const blockers = await mspUtils.getActiveBlockers();
			expect(blockers).toEqual(['my-blocker']);
		});

		it('returns multiple active blockers', async () => {
			(app.vault as MockVault)._addFile('Blockers/b1.md');
			(app.vault as MockVault)._addFile('Blockers/b2.md');
			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) =>
				Promise.resolve({ type: 'blocker', title: file.basename, status: 'Active' })
			);
			const blockers = await mspUtils.getActiveBlockers();
			expect(blockers).toHaveLength(2);
		});
	});

	// ─── getRecentlyCompleted ─────────────────────────────────────────────────

	describe('getRecentlyCompleted', () => {
		it('returns issues marked Done within the cutoff window', async () => {
			const recentDate = new Date();
			recentDate.setDate(recentDate.getDate() - 3);
			const issueFile = new TFile('Issues/ISSUE-1.md');
			frontmatterUtils.getAllIssues.mockResolvedValue([issueFile]);
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue',
				id: 'ISSUE-1',
				title: 'Done task',
				status: 'Done',
				modified: recentDate.toISOString()
			});

			const completed = await mspUtils.getRecentlyCompleted(7);
			expect(completed).toContain('ISSUE-1: Done task');
		});

		it('excludes issues completed before the cutoff', async () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 30);
			const issueFile = new TFile('Issues/ISSUE-1.md');
			frontmatterUtils.getAllIssues.mockResolvedValue([issueFile]);
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue',
				id: 'ISSUE-1',
				title: 'Old done issue',
				status: 'Done',
				modified: oldDate.toISOString()
			});

			expect(await mspUtils.getRecentlyCompleted(7)).toHaveLength(0);
		});

		it('excludes issues that are not Done', async () => {
			const issueFile = new TFile('Issues/ISSUE-1.md');
			frontmatterUtils.getAllIssues.mockResolvedValue([issueFile]);
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue',
				id: 'ISSUE-1',
				title: 'In progress',
				status: 'In Progress',
				modified: new Date().toISOString()
			});

			expect(await mspUtils.getRecentlyCompleted(7)).toHaveLength(0);
		});

		it('formats result as "ID: Title"', async () => {
			const issueFile = new TFile('Issues/ISSUE-42.md');
			frontmatterUtils.getAllIssues.mockResolvedValue([issueFile]);
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue',
				id: 'ISSUE-42',
				title: 'Build pipeline',
				status: 'Done',
				modified: new Date().toISOString()
			});

			const completed = await mspUtils.getRecentlyCompleted(7);
			expect(completed[0]).toBe('ISSUE-42: Build pipeline');
		});
	});

	// ─── buildRecallContext ───────────────────────────────────────────────────

	describe('buildRecallContext', () => {
		it('returns a SessionContext object with all required fields', async () => {
			frontmatterUtils.getFrontmatter.mockResolvedValue(null);
			frontmatterUtils.getAllIssues.mockResolvedValue([]);

			const ctx = await mspUtils.buildRecallContext();
			expect(ctx).toHaveProperty('lastSession');
			expect(ctx).toHaveProperty('lastSessionFile');
			expect(ctx).toHaveProperty('activeBlockers');
			expect(ctx).toHaveProperty('recentlyCompleted');
			expect(ctx).toHaveProperty('progressYesterday');
		});

		it('includes progressYesterday from the last session record', async () => {
			(app.vault as MockVault)._addFile('Sessions/Session 2025-01-01.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'session',
				date: '2025-01-01',
				route: [],
				record: { progressToday: 80 }
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([]);

			const ctx = await mspUtils.buildRecallContext();
			expect(ctx.progressYesterday).toBe(80);
		});

		it('sets progressYesterday to 0 when no last session', async () => {
			frontmatterUtils.getFrontmatter.mockResolvedValue(null);
			frontmatterUtils.getAllIssues.mockResolvedValue([]);

			const ctx = await mspUtils.buildRecallContext();
			expect(ctx.progressYesterday).toBe(0);
		});
	});

	// ─── buildSessionContent ─────────────────────────────────────────────────

	describe('buildSessionContent', () => {
		const baseRecall = {
			lastSession: null,
			lastSessionFile: null,
			activeBlockers: [],
			recentlyCompleted: [],
			progressYesterday: 0
		};

		it('generates valid YAML frontmatter block', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: ['Fix bug'],
				recallContext: baseRecall
			});

			expect(content).toContain('---');
			expect(content).toContain('type: session');
			expect(content).toContain('id: S-1');
			expect(content).toContain('date: 2025-01-15');
			expect(content).toContain('start-time: 09:00');
		});

		it('includes objectives in the route YAML field and as numbered list', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: ['Finish feature X', 'Write documentation'],
				recallContext: baseRecall
			});

			expect(content).toContain('"Finish feature X"');
			expect(content).toContain('1. Finish feature X');
			expect(content).toContain('2. Write documentation');
		});

		it('includes the project wikilink when provided', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: ['Work on project'],
				projectWikilink: '[[My Project]]',
				recallContext: baseRecall
			});

			expect(content).toContain('project: "[[My Project]]"');
		});

		it('omits the project field when no projectWikilink', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: [],
				recallContext: baseRecall
			});

			expect(content).not.toContain('project:');
		});

		it('always includes a Record (End of Session) section', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: [],
				recallContext: baseRecall
			});

			expect(content).toContain('Record (End of Session)');
		});

		it('includes Recall section when last session exists', () => {
			const lastFile = new TFile('Sessions/Session 2025-01-14.md');
			const content = mspUtils.buildSessionContent({
				id: 'S-2',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: [],
				recallContext: {
					lastSession: {
						type: 'session',
						id: 'S-1',
						date: '2025-01-14',
						route: ['Complete task A'],
						recall: {},
						record: {}
					} as any,
					lastSessionFile: lastFile as any,
					activeBlockers: [],
					recentlyCompleted: [],
					progressYesterday: 0
				}
			});

			expect(content).toContain('Recall (Context from Last Session)');
			expect(content).toContain('[[Session 2025-01-14]]');
			expect(content).toContain('Complete task A');
		});

		it('includes active blockers in recall section', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: [],
				recallContext: {
					lastSession: null,
					lastSessionFile: null,
					activeBlockers: ['API rate limit', 'Missing credentials'],
					recentlyCompleted: [],
					progressYesterday: 0
				}
			});

			expect(content).toContain('Active blockers');
			expect(content).toContain('API rate limit');
			expect(content).toContain('Missing credentials');
		});

		it('includes recently completed in recall section', () => {
			const lastFile = new TFile('Sessions/Session 2025-01-14.md');
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: [],
				recallContext: {
					lastSession: {
						type: 'session',
						id: 'S-0',
						date: '2025-01-14',
						route: [],
						recall: {},
						record: {}
					} as any,
					lastSessionFile: lastFile as any,
					activeBlockers: [],
					recentlyCompleted: ['ISSUE-1: Task A', 'ISSUE-2: Task B'],
					progressYesterday: 0
				}
			});

			expect(content).toContain('Recently completed');
			expect(content).toContain('ISSUE-1: Task A');
		});

		it('limits recently completed to 5 items', () => {
			const lastFile = new TFile('Sessions/Session 2025-01-14.md');
			const manyItems = Array.from({ length: 10 }, (_, i) => `ISSUE-${i + 1}: Task`);
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: [],
				recallContext: {
					lastSession: { type: 'session', id: 'S-0', date: '2025-01-14', route: [], recall: {}, record: {} } as any,
					lastSessionFile: lastFile as any,
					activeBlockers: [],
					recentlyCompleted: manyItems,
					progressYesterday: 0
				}
			});

			// ISSUE-6 through ISSUE-10 should not appear
			expect(content).not.toContain('ISSUE-6');
			expect(content).toContain('ISSUE-5');
		});

		it('escapes double quotes in objective strings', () => {
			const content = mspUtils.buildSessionContent({
				id: 'S-1',
				date: '2025-01-15',
				startTime: '09:00',
				objectives: ['Fix "critical" bug'],
				recallContext: baseRecall
			});

			expect(content).toContain('\\"critical\\"');
		});
	});
});
