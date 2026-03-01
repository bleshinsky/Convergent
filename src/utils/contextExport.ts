import { App, TFile } from 'obsidian';
import { FrontmatterUtils } from './frontmatter';
import { MSPUtils } from './msp';
import { Issue, MSPSession } from '../types';

const TARGET_TOKENS = 1000;
const CHARS_PER_TOKEN = 4;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;

/**
 * Exports session and project context for AI consumption.
 * Formats a compact summary targeting <1000 tokens.
 */
export class ContextExport {
	constructor(
		private app: App,
		private frontmatterUtils: FrontmatterUtils,
		private mspUtils: MSPUtils
	) {}

	/**
	 * Generate context string for clipboard export.
	 * @param activeSessionFile The current session's TFile (if any).
	 */
	async generateContext(activeSessionFile: TFile | null): Promise<string> {
		const sections: string[] = [];

		// 1. Active session
		if (activeSessionFile) {
			const fm = await this.frontmatterUtils.getFrontmatter(activeSessionFile);
			if (fm?.type === 'session') {
				const session = fm as MSPSession;
				sections.push(this.formatActiveSession(session));
			}
		}

		// 2. In Progress issues (highest priority)
		const inProgressIssues = await this.getIssuesByStatus('In Progress');
		if (inProgressIssues.length > 0) {
			sections.push(this.formatIssueList('IN PROGRESS', inProgressIssues));
		}

		// 3. Active blockers
		const blockers = await this.mspUtils.getActiveBlockers();
		if (blockers.length > 0) {
			sections.push(`BLOCKERS:\n${blockers.map(b => `- ⚠️ ${b}`).join('\n')}`);
		}

		// 4. Recent completions
		const completed = await this.mspUtils.getRecentlyCompleted(3);
		if (completed.length > 0) {
			sections.push(`RECENTLY DONE (3d):\n${completed.slice(0, 5).map(i => `- ✅ ${i}`).join('\n')}`);
		}

		// 5. Todo issues (up to budget)
		const todoIssues = await this.getIssuesByStatus('Todo');
		if (todoIssues.length > 0) {
			sections.push(this.formatIssueList('TODO', todoIssues.slice(0, 10)));
		}

		// 6. Memories (marked issues)
		const memories = await this.getMemoryIssues();
		if (memories.length > 0) {
			sections.push(this.formatIssueList('MEMORIES', memories));
		}

		const raw = sections.join('\n\n');
		return this.truncateToTokenBudget(raw);
	}

	private formatActiveSession(session: MSPSession): string {
		const lines = ['SESSION:'];
		if (session.date) lines.push(`Date: ${session.date}`);
		if (session.route && session.route.length > 0) {
			lines.push('Objectives:');
			session.route.forEach(obj => lines.push(`  - ${obj}`));
		}
		return lines.join('\n');
	}

	private formatIssueList(label: string, issues: Array<{id: string; title: string; priority?: string; due?: string}>): string {
		const lines = [`${label}:`];
		issues.forEach(issue => {
			let line = `- [${issue.id}] ${issue.title}`;
			if (issue.priority && issue.priority !== 'No Priority') line += ` (${issue.priority})`;
			if (issue.due) {
				const daysUntilDue = this.daysUntil(issue.due);
				if (daysUntilDue !== null) {
					if (daysUntilDue < 0) line += ` ⚠️ OVERDUE`;
					else if (daysUntilDue <= 7) line += ` due in ${daysUntilDue}d`;
				}
			}
			lines.push(line);
		});
		return lines.join('\n');
	}

	private async getIssuesByStatus(status: string): Promise<Array<{id: string; title: string; priority?: string; due?: string}>> {
		const files = await this.frontmatterUtils.getAllIssues();
		const results = [];

		for (const file of files) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (!fm || fm.type !== 'issue') continue;
			const issue = fm as Issue;
			if (issue.status === status) {
				results.push({
					id: issue.id,
					title: issue.title,
					priority: issue.priority,
					due: issue.due
				});
			}
		}

		// Sort by priority (Urgent first), then by due date
		const priorityOrder: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3, 'No Priority': 4 };
		results.sort((a, b) => {
			const pa = priorityOrder[a.priority || 'No Priority'] ?? 4;
			const pb = priorityOrder[b.priority || 'No Priority'] ?? 4;
			if (pa !== pb) return pa - pb;
			if (a.due && b.due) return a.due.localeCompare(b.due);
			if (a.due) return -1;
			if (b.due) return 1;
			return 0;
		});

		return results;
	}

	private async getMemoryIssues(): Promise<Array<{id: string; title: string; priority?: string; due?: string}>> {
		const files = await this.frontmatterUtils.getAllIssues();
		const results = [];

		for (const file of files) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (!fm || fm.type !== 'issue') continue;
			const issue = fm as Issue & { memory?: boolean };
			if (issue.memory) {
				results.push({
					id: issue.id,
					title: issue.title,
					priority: issue.priority,
					due: issue.due
				});
			}
		}

		return results;
	}

	private truncateToTokenBudget(text: string): string {
		if (text.length <= TARGET_CHARS) return text;

		// Truncate at a line boundary near the token limit
		const truncated = text.substring(0, TARGET_CHARS);
		const lastNewline = truncated.lastIndexOf('\n');
		const result = lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated;
		return result + '\n\n[Context truncated to fit token budget]';
	}

	private daysUntil(dateStr: string): number | null {
		try {
			const due = new Date(dateStr);
			const now = new Date();
			const diffMs = due.getTime() - now.getTime();
			return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		} catch {
			return null;
		}
	}

	/**
	 * Mark an issue as a memory (persistent context item).
	 */
	async markAsMemory(file: TFile): Promise<void> {
		const fm = await this.frontmatterUtils.getFrontmatter(file);
		if (!fm || fm.type !== 'issue') return;
		const current = (fm as Issue & { memory?: boolean }).memory;
		await this.frontmatterUtils.updateFrontmatter(file, { memory: !current } as Issue);
	}
}
