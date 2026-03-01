import { ProgressTracking } from '../../src/automation/ProgressTracking';
import { App, TFile, MockVault, MockMetadataCache } from '../__mocks__/obsidian';

function makeApp(): App {
	return new App();
}

describe('ProgressTracking', () => {
	let app: App;
	let frontmatterUtils: any;
	let tracker: ProgressTracking;

	beforeEach(() => {
		app = makeApp();
		frontmatterUtils = {
			getFrontmatter: jest.fn(),
			getAllIssues: jest.fn().mockResolvedValue([]),
			getAllProjects: jest.fn().mockResolvedValue([])
		};
		tracker = new ProgressTracking(app as any, frontmatterUtils);
	});

	afterEach(() => {
		tracker.destroy();
	});

	describe('normalizeWikilink (via recalculateProjectProgress)', () => {
		it('handles case-insensitive matching', async () => {
			const projectFile = new TFile('Projects/my-project.md');
			frontmatterUtils.getAllIssues.mockResolvedValue([]);
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'project',
				title: 'My Project'
			});

			// Should not throw even with no issues
			await tracker.recalculateProjectProgress('[[My Project]]');
		});
	});

	describe('onFileModified', () => {
		it('debounces rapid file modifications', () => {
			const file = new TFile('Issues/ISSUE-1.md');
			jest.useFakeTimers();

			tracker.onFileModified(file as any);
			tracker.onFileModified(file as any);
			tracker.onFileModified(file as any);

			// Timer should still be pending
			jest.runAllTimers();

			jest.useRealTimers();
		});
	});

	describe('recalculateAll', () => {
		it('processes all projects', async () => {
			const proj1 = new TFile('Projects/proj1.md');
			const proj2 = new TFile('Projects/proj2.md');

			frontmatterUtils.getAllProjects.mockResolvedValue([proj1, proj2]);
			frontmatterUtils.getAllIssues.mockResolvedValue([]);
			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path.includes('proj1')) return Promise.resolve({ type: 'project', title: 'Proj1' });
				if (file.path.includes('proj2')) return Promise.resolve({ type: 'project', title: 'Proj2' });
				return Promise.resolve(null);
			});

			await tracker.recalculateAll();
			// getAllProjects should have been called
			expect(frontmatterUtils.getAllProjects).toHaveBeenCalled();
		});
	});

	describe('destroy', () => {
		it('clears all timers', () => {
			jest.useFakeTimers();
			const file = new TFile('Issues/ISSUE-1.md');
			tracker.onFileModified(file as any);
			tracker.destroy();
			// Should not throw
			jest.runAllTimers();
			jest.useRealTimers();
		});
	});

	// ─── progress calculation ─────────────────────────────────────────────────

	describe('recalculateProjectProgress — progress math', () => {
		it('calculates 50% when 2 of 4 issues are Done', async () => {
			const projectFile = (app.vault as any)._addFile('Projects/my-project.md');
			const issue1 = (app.vault as any)._addFile('Issues/ISSUE-1.md');
			const issue2 = (app.vault as any)._addFile('Issues/ISSUE-2.md');
			const issue3 = (app.vault as any)._addFile('Issues/ISSUE-3.md');
			const issue4 = (app.vault as any)._addFile('Issues/ISSUE-4.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === projectFile.path) {
					return Promise.resolve({ type: 'project', title: 'my-project' });
				}
				if (file.path === issue1.path || file.path === issue2.path) {
					return Promise.resolve({ type: 'issue', project: '[[my-project]]', status: 'Done' });
				}
				return Promise.resolve({ type: 'issue', project: '[[my-project]]', status: 'In Progress' });
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([issue1, issue2, issue3, issue4]);

			await tracker.recalculateProjectProgress('[[my-project]]');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(projectFile);
			expect(updated?.progress).toBe(50);
			expect(updated?.['total-issues']).toBe(4);
			expect(updated?.['completed-issues']).toBe(2);
		});

		it('calculates 100% when all issues are Done', async () => {
			const projectFile = (app.vault as any)._addFile('Projects/done-proj.md');
			const issue1 = (app.vault as any)._addFile('Issues/ISSUE-1.md');
			const issue2 = (app.vault as any)._addFile('Issues/ISSUE-2.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === projectFile.path) {
					return Promise.resolve({ type: 'project', title: 'done-proj' });
				}
				return Promise.resolve({ type: 'issue', project: '[[done-proj]]', status: 'Done' });
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([issue1, issue2]);

			await tracker.recalculateProjectProgress('[[done-proj]]');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(projectFile);
			expect(updated?.progress).toBe(100);
			expect(updated?.['completed-issues']).toBe(2);
		});

		it('calculates 0% when no issues are Done', async () => {
			const projectFile = (app.vault as any)._addFile('Projects/new-proj.md');
			const issue1 = (app.vault as any)._addFile('Issues/ISSUE-1.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === projectFile.path) {
					return Promise.resolve({ type: 'project', title: 'new-proj' });
				}
				return Promise.resolve({ type: 'issue', project: '[[new-proj]]', status: 'Backlog' });
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([issue1]);

			await tracker.recalculateProjectProgress('[[new-proj]]');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(projectFile);
			expect(updated?.progress).toBe(0);
		});

		it('calculates 0% when project has no linked issues', async () => {
			const projectFile = (app.vault as any)._addFile('Projects/empty-proj.md');

			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'project', title: 'empty-proj'
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([]);

			await tracker.recalculateProjectProgress('[[empty-proj]]');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(projectFile);
			expect(updated?.progress).toBe(0);
			expect(updated?.['total-issues']).toBe(0);
		});

		it('counts Canceled issues as completed for progress', async () => {
			const projectFile = (app.vault as any)._addFile('Projects/mixed-proj.md');
			const done = (app.vault as any)._addFile('Issues/ISSUE-1.md');
			const canceled = (app.vault as any)._addFile('Issues/ISSUE-2.md');
			const inprogress = (app.vault as any)._addFile('Issues/ISSUE-3.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === projectFile.path) {
					return Promise.resolve({ type: 'project', title: 'mixed-proj' });
				}
				if (file.path === done.path) {
					return Promise.resolve({ type: 'issue', project: '[[mixed-proj]]', status: 'Done' });
				}
				if (file.path === canceled.path) {
					return Promise.resolve({ type: 'issue', project: '[[mixed-proj]]', status: 'Canceled' });
				}
				return Promise.resolve({ type: 'issue', project: '[[mixed-proj]]', status: 'In Progress' });
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([done, canceled, inprogress]);

			await tracker.recalculateProjectProgress('[[mixed-proj]]');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(projectFile);
			// 2 out of 3 are terminal (Done + Canceled) → 67%
			expect(updated?.progress).toBe(67);
			expect(updated?.['completed-issues']).toBe(2);
		});

		it('ignores issues not linked to the target project', async () => {
			const projectFile = (app.vault as any)._addFile('Projects/proj-a.md');
			const issueA = (app.vault as any)._addFile('Issues/ISSUE-1.md');
			const issueB = (app.vault as any)._addFile('Issues/ISSUE-2.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === projectFile.path) {
					return Promise.resolve({ type: 'project', title: 'proj-a' });
				}
				if (file.path === issueA.path) {
					return Promise.resolve({ type: 'issue', project: '[[proj-a]]', status: 'Done' });
				}
				return Promise.resolve({ type: 'issue', project: '[[proj-b]]', status: 'Backlog' });
			});
			frontmatterUtils.getAllIssues.mockResolvedValue([issueA, issueB]);

			await tracker.recalculateProjectProgress('[[proj-a]]');

			const updated = (app.metadataCache as MockMetadataCache)._getFrontmatter(projectFile);
			expect(updated?.['total-issues']).toBe(1);
			expect(updated?.['completed-issues']).toBe(1);
		});
	});
});
