import { StatusAutomation } from '../../src/automation/StatusAutomation';
import { App, TFile, MockVault } from '../__mocks__/obsidian';

/** Flush async microtask queue N times to let promise chains settle */
async function flushAsync(iterations = 30): Promise<void> {
	for (let i = 0; i < iterations; i++) {
		await Promise.resolve();
	}
}

describe('StatusAutomation', () => {
	let app: App;
	let frontmatterUtils: any;
	let automation: StatusAutomation;
	let enabled: boolean;

	beforeEach(() => {
		app = new App();
		frontmatterUtils = {
			getFrontmatter: jest.fn(),
			updateFrontmatter: jest.fn().mockResolvedValue(undefined)
		};
		enabled = true;
		automation = new StatusAutomation(app as any, frontmatterUtils, () => enabled);
		jest.useFakeTimers();
	});

	afterEach(() => {
		automation.destroy();
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	// ─── enabled guard ────────────────────────────────────────────────────────

	describe('enabled guard', () => {
		it('skips processing when disabled', () => {
			enabled = false;
			const file = new TFile('Issues/ISSUE-1.md');
			automation.onFileModified(file as any);
			jest.runAllTimers();
			expect(frontmatterUtils.getFrontmatter).not.toHaveBeenCalled();
		});

		it('processes normally when enabled', async () => {
			const file = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', status: 'Done'
				// no parent → exits early after getFrontmatter
			});

			automation.onFileModified(file as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.getFrontmatter).toHaveBeenCalled();
		});
	});

	// ─── debouncing ───────────────────────────────────────────────────────────

	describe('debouncing', () => {
		it('fires only once even when called multiple times rapidly', async () => {
			const file = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', status: 'Done'
			});

			automation.onFileModified(file as any);
			automation.onFileModified(file as any);
			automation.onFileModified(file as any);

			expect(frontmatterUtils.getFrontmatter).not.toHaveBeenCalled();
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.getFrontmatter).toHaveBeenCalledTimes(1);
		});
	});

	// ─── non-issue files ──────────────────────────────────────────────────────

	describe('non-issue files', () => {
		it('skips project files (type !== issue)', async () => {
			const file = (app.vault as MockVault)._addFile('Projects/PROJ-1.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'project', id: 'PROJ-1'
			});

			automation.onFileModified(file as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});

		it('skips files with null frontmatter', async () => {
			const file = (app.vault as MockVault)._addFile('Notes/random.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue(null);

			automation.onFileModified(file as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});
	});

	// ─── issues without parent ────────────────────────────────────────────────

	describe('issues without a parent', () => {
		it('skips issues with no parent field', async () => {
			const file = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			frontmatterUtils.getFrontmatter.mockResolvedValue({
				type: 'issue', id: 'ISSUE-1', status: 'Done'
				// no parent
			});

			automation.onFileModified(file as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});
	});

	// ─── parent already terminal ──────────────────────────────────────────────

	describe('parent already in terminal state', () => {
		it('skips when parent is already Done', async () => {
			const parentFile = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const childFile = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === childFile.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'Done', subIssues: ['[[ISSUE-2]]']
				});
			});

			automation.onFileModified(childFile as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});

		it('skips when parent is already Canceled', async () => {
			const parentFile = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const childFile = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === childFile.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'Canceled', subIssues: ['[[ISSUE-2]]']
				});
			});

			automation.onFileModified(childFile as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});
	});

	// ─── parent has no sub-issues ─────────────────────────────────────────────

	describe('parent with no sub-issues', () => {
		it('skips when parent has empty subIssues array', async () => {
			const parentFile = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const childFile = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === childFile.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'In Progress', subIssues: []
				});
			});

			automation.onFileModified(childFile as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});
	});

	// ─── parent completion ────────────────────────────────────────────────────

	describe('parent auto-completion', () => {
		it('marks parent Done when the only child is Done', async () => {
			const parentFile = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const childFile = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === childFile.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				// Parent: In Progress, single child that is Done
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'In Progress', subIssues: ['[[ISSUE-2]]']
				});
			});

			automation.onFileModified(childFile as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).toHaveBeenCalledWith(
				parentFile,
				expect.objectContaining({ status: 'Done' })
			);
		});

		it('marks parent Done when all children are Done or Canceled (mixed)', async () => {
			const parentFile = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const child1 = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');
			const child2 = (app.vault as MockVault)._addFile('Issues/ISSUE-3.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === child1.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				if (file.path === child2.path) {
					return Promise.resolve({ type: 'issue', id: 'ISSUE-3', status: 'Canceled' });
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'In Progress',
					subIssues: ['[[ISSUE-2]]', '[[ISSUE-3]]']
				});
			});

			automation.onFileModified(child1 as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).toHaveBeenCalledWith(
				parentFile,
				expect.objectContaining({ status: 'Done' })
			);
		});

		it('does NOT mark parent Done when some children are still In Progress', async () => {
			(app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const child1 = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');
			const child2 = (app.vault as MockVault)._addFile('Issues/ISSUE-3.md');

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === child1.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				if (file.path === child2.path) {
					return Promise.resolve({ type: 'issue', id: 'ISSUE-3', status: 'In Progress' });
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'In Progress',
					subIssues: ['[[ISSUE-2]]', '[[ISSUE-3]]']
				});
			});

			automation.onFileModified(child1 as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});

		it('does NOT mark parent Done when a child link cannot be resolved', async () => {
			(app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const child1 = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');
			// ISSUE-3 is NOT in the vault

			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === child1.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'In Progress',
					subIssues: ['[[ISSUE-2]]', '[[ISSUE-3]]'] // ISSUE-3 missing from vault
				});
			});

			automation.onFileModified(child1 as any);
			jest.runAllTimers();
			await flushAsync();

			expect(frontmatterUtils.updateFrontmatter).not.toHaveBeenCalled();
		});
	});

	// ─── loop detection ───────────────────────────────────────────────────────

	describe('loop detection', () => {
		it('does not process the same parent twice (updating set prevents re-entry)', async () => {
			const parentFile = (app.vault as MockVault)._addFile('Issues/ISSUE-1.md');
			const childFile = (app.vault as MockVault)._addFile('Issues/ISSUE-2.md');

			let updateCount = 0;
			frontmatterUtils.getFrontmatter.mockImplementation((file: TFile) => {
				if (file.path === childFile.path) {
					return Promise.resolve({
						type: 'issue', id: 'ISSUE-2', status: 'Done', parent: '[[ISSUE-1]]'
					});
				}
				return Promise.resolve({
					type: 'issue', id: 'ISSUE-1', status: 'In Progress', subIssues: ['[[ISSUE-2]]']
				});
			});
			frontmatterUtils.updateFrontmatter.mockImplementation(() => {
				updateCount++;
				return Promise.resolve();
			});

			automation.onFileModified(childFile as any);
			jest.runAllTimers();
			await flushAsync();

			// Should update exactly once, not get stuck in a loop
			expect(updateCount).toBe(1);
		});
	});

	// ─── destroy ──────────────────────────────────────────────────────────────

	describe('destroy', () => {
		it('clears all pending timers without errors', () => {
			const file = new TFile('Issues/ISSUE-1.md');
			automation.onFileModified(file as any);
			automation.destroy();
			// running timers after destroy should not trigger callbacks
			expect(() => jest.runAllTimers()).not.toThrow();
		});

		it('can be called multiple times safely', () => {
			automation.destroy();
			expect(() => automation.destroy()).not.toThrow();
		});
	});
});
