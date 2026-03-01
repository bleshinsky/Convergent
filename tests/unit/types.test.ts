import {
	STATUS_ORDER,
	PRIORITY_ORDER,
	DEFAULT_STATUS,
	DEFAULT_PRIORITY
} from '../../src/types/Issue';

import {
	PROJECT_STATUS_ORDER,
	DEFAULT_PROJECT_STATUS,
	DEFAULT_LEAD
} from '../../src/types/Project';

describe('Issue type constants', () => {
	describe('STATUS_ORDER', () => {
		it('Backlog=0, Triage=1, Todo=2, In Progress=3, Done=4, Canceled=5', () => {
			expect(STATUS_ORDER['Backlog']).toBe(0);
			expect(STATUS_ORDER['Triage']).toBe(1);
			expect(STATUS_ORDER['Todo']).toBe(2);
			expect(STATUS_ORDER['In Progress']).toBe(3);
			expect(STATUS_ORDER['Done']).toBe(4);
			expect(STATUS_ORDER['Canceled']).toBe(5);
		});

		it('covers all 6 valid statuses', () => {
			const expected = ['Backlog', 'Triage', 'Todo', 'In Progress', 'Done', 'Canceled'];
			expected.forEach(s => expect(STATUS_ORDER).toHaveProperty(s));
			expect(Object.keys(STATUS_ORDER)).toHaveLength(6);
		});

		it('sorts statuses in correct workflow order', () => {
			const statuses = ['Done', 'Backlog', 'In Progress', 'Triage', 'Canceled', 'Todo'];
			const sorted = [...statuses].sort(
				(a, b) => STATUS_ORDER[a as keyof typeof STATUS_ORDER] - STATUS_ORDER[b as keyof typeof STATUS_ORDER]
			);
			expect(sorted).toEqual(['Backlog', 'Triage', 'Todo', 'In Progress', 'Done', 'Canceled']);
		});

		it('preserves "In Review" removal (old status must not exist)', () => {
			expect(STATUS_ORDER).not.toHaveProperty('In Review');
		});
	});

	describe('PRIORITY_ORDER', () => {
		it('No Priority=0, Low=1, Medium=2, High=3, Urgent=4', () => {
			expect(PRIORITY_ORDER['No Priority']).toBe(0);
			expect(PRIORITY_ORDER['Low']).toBe(1);
			expect(PRIORITY_ORDER['Medium']).toBe(2);
			expect(PRIORITY_ORDER['High']).toBe(3);
			expect(PRIORITY_ORDER['Urgent']).toBe(4);
		});

		it('covers all 5 valid priorities', () => {
			const expected = ['No Priority', 'Low', 'Medium', 'High', 'Urgent'];
			expected.forEach(p => expect(PRIORITY_ORDER).toHaveProperty(p));
			expect(Object.keys(PRIORITY_ORDER)).toHaveLength(5);
		});

		it('sorts priorities in correct urgency order', () => {
			const priorities = ['High', 'No Priority', 'Urgent', 'Low', 'Medium'];
			const sorted = [...priorities].sort(
				(a, b) => PRIORITY_ORDER[a as keyof typeof PRIORITY_ORDER] - PRIORITY_ORDER[b as keyof typeof PRIORITY_ORDER]
			);
			expect(sorted).toEqual(['No Priority', 'Low', 'Medium', 'High', 'Urgent']);
		});
	});

	describe('DEFAULT_STATUS', () => {
		it('is Todo', () => {
			expect(DEFAULT_STATUS).toBe('Todo');
		});

		it('is a valid status in STATUS_ORDER', () => {
			expect(STATUS_ORDER).toHaveProperty(DEFAULT_STATUS);
		});
	});

	describe('DEFAULT_PRIORITY', () => {
		it('is No Priority', () => {
			expect(DEFAULT_PRIORITY).toBe('No Priority');
		});

		it('is a valid priority in PRIORITY_ORDER', () => {
			expect(PRIORITY_ORDER).toHaveProperty(DEFAULT_PRIORITY);
		});
	});
});

describe('Project type constants', () => {
	describe('PROJECT_STATUS_ORDER', () => {
		it('Planning=0, In Progress=1, On Hold=2, Completed=3, Canceled=4', () => {
			expect(PROJECT_STATUS_ORDER['Planning']).toBe(0);
			expect(PROJECT_STATUS_ORDER['In Progress']).toBe(1);
			expect(PROJECT_STATUS_ORDER['On Hold']).toBe(2);
			expect(PROJECT_STATUS_ORDER['Completed']).toBe(3);
			expect(PROJECT_STATUS_ORDER['Canceled']).toBe(4);
		});

		it('covers all 5 valid project statuses', () => {
			const expected = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Canceled'];
			expected.forEach(s => expect(PROJECT_STATUS_ORDER).toHaveProperty(s));
			expect(Object.keys(PROJECT_STATUS_ORDER)).toHaveLength(5);
		});

		it('sorts project statuses in correct order', () => {
			const statuses = ['Completed', 'Planning', 'In Progress', 'Canceled', 'On Hold'];
			const sorted = [...statuses].sort(
				(a, b) =>
					PROJECT_STATUS_ORDER[a as keyof typeof PROJECT_STATUS_ORDER] -
					PROJECT_STATUS_ORDER[b as keyof typeof PROJECT_STATUS_ORDER]
			);
			expect(sorted).toEqual(['Planning', 'In Progress', 'On Hold', 'Completed', 'Canceled']);
		});
	});

	describe('DEFAULT_PROJECT_STATUS', () => {
		it('is Planning', () => {
			expect(DEFAULT_PROJECT_STATUS).toBe('Planning');
		});

		it('is a valid status in PROJECT_STATUS_ORDER', () => {
			expect(PROJECT_STATUS_ORDER).toHaveProperty(DEFAULT_PROJECT_STATUS);
		});
	});

	describe('DEFAULT_LEAD', () => {
		it('is "me" (solo developer convention)', () => {
			expect(DEFAULT_LEAD).toBe('me');
		});
	});
});
