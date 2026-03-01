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
		});
	});

	describe('isValidProjectId', () => {
		it('accepts valid PROJ-n format', () => {
			expect(generator.isValidProjectId('PROJ-1')).toBe(true);
			expect(generator.isValidProjectId('PROJ-500')).toBe(true);
		});

		it('rejects invalid formats', () => {
			expect(generator.isValidProjectId('PROJECT-1')).toBe(false);
			expect(generator.isValidProjectId('PROJ-')).toBe(false);
			expect(generator.isValidProjectId('')).toBe(false);
		});
	});

	describe('extractIssueNumber', () => {
		it('extracts the numeric part', () => {
			expect(generator.extractIssueNumber('ISSUE-42')).toBe(42);
			expect(generator.extractIssueNumber('ISSUE-1')).toBe(1);
		});

		it('returns null for invalid id', () => {
			expect(generator.extractIssueNumber('ISS-42')).toBeNull();
			expect(generator.extractIssueNumber('')).toBeNull();
		});
	});

	describe('extractProjectNumber', () => {
		it('extracts the numeric part', () => {
			expect(generator.extractProjectNumber('PROJ-5')).toBe(5);
		});

		it('returns null for invalid id', () => {
			expect(generator.extractProjectNumber('PROJECT-5')).toBeNull();
		});
	});

	describe('generateUniqueIssueId', () => {
		it('generates a valid ISSUE-n id', async () => {
			const id = await generator.generateUniqueIssueId();
			expect(generator.isValidIssueId(id)).toBe(true);
		});
	});

	describe('generateUniqueProjectId', () => {
		it('generates a valid PROJ-n id', async () => {
			const id = await generator.generateUniqueProjectId();
			expect(generator.isValidProjectId(id)).toBe(true);
		});
	});
});
