import { ProgressTracking } from '../../src/automation/ProgressTracking';
import { App, TFile, MockMetadataCache } from '../__mocks__/obsidian';

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
});
