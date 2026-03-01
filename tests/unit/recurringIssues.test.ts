import { RecurringIssues } from '../../src/automation/RecurringIssues';
import { RecurringConfig } from '../../src/types';

// Mock RecurringIssues to just test the calculateNextDue method
// (file creation requires Obsidian environment)
describe('RecurringIssues', () => {
	let recurring: RecurringIssues;

	beforeEach(() => {
		// Create with minimal mocks
		recurring = new RecurringIssues(
			{} as any,
			{} as any,
			() => 'Issues'
		);
	});

	describe('calculateNextDue', () => {
		const base = '2025-01-01';

		it('adds 1 day for daily cadence', () => {
			const next = recurring.calculateNextDue('daily', base);
			expect(next).toBe('2025-01-02');
		});

		it('adds 7 days for weekly cadence', () => {
			const next = recurring.calculateNextDue('weekly', base);
			expect(next).toBe('2025-01-08');
		});

		it('adds 14 days for biweekly cadence', () => {
			const next = recurring.calculateNextDue('biweekly', base);
			expect(next).toBe('2025-01-15');
		});

		it('adds 1 month for monthly cadence', () => {
			const next = recurring.calculateNextDue('monthly', base);
			expect(next).toBe('2025-02-01');
		});

		it('handles month boundaries correctly', () => {
			expect(recurring.calculateNextDue('weekly', '2025-01-28')).toBe('2025-02-04');
		});

		it('handles year boundaries correctly', () => {
			expect(recurring.calculateNextDue('monthly', '2024-12-01')).toBe('2025-01-01');
		});
	});

	describe('checkIntervalMs', () => {
		it('is set to 1 hour', () => {
			expect(RecurringIssues.checkIntervalMs).toBe(60 * 60 * 1000);
		});
	});
});
