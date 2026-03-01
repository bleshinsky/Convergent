import { App, TFile, normalizePath } from 'obsidian';
import { FrontmatterUtils } from './frontmatter';
import { MSPSession, Issue } from '../types';

export interface SessionContext {
	lastSession: MSPSession | null;
	lastSessionFile: TFile | null;
	activeBlockers: string[];
	recentlyCompleted: string[];
	progressYesterday: number;
}

/**
 * MSP utility functions: session lifecycle management and recall context generation.
 */
export class MSPUtils {
	constructor(
		private app: App,
		private frontmatterUtils: FrontmatterUtils
	) {}

	/**
	 * Get the most recent session file (sorted by date).
	 */
	async getLastSession(): Promise<{ session: MSPSession; file: TFile } | null> {
		const sessions = await this.getAllSessions();
		if (sessions.length === 0) return null;

		// Sort by date descending
		sessions.sort((a, b) => {
			const aDate = a.frontmatter.date || a.file.stat.mtime;
			const bDate = b.frontmatter.date || b.file.stat.mtime;
			return bDate > aDate ? 1 : -1;
		});

		return {
			session: sessions[0].frontmatter,
			file: sessions[0].file
		};
	}

	/**
	 * Get all session files.
	 */
	async getAllSessions(): Promise<{ frontmatter: MSPSession; file: TFile }[]> {
		const files = this.app.vault.getFiles();
		const results: { frontmatter: MSPSession; file: TFile }[] = [];

		for (const file of files) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (fm && fm.type === 'session') {
				results.push({ frontmatter: fm as MSPSession, file });
			}
		}

		return results;
	}

	/**
	 * Get the active blockers (Blocker files with status: Active).
	 */
	async getActiveBlockers(): Promise<string[]> {
		const files = this.app.vault.getFiles();
		const blockers: string[] = [];

		for (const file of files) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (fm && fm.type === 'blocker' && (fm as { status?: string }).status === 'Active') {
				blockers.push((fm as { title?: string }).title || file.basename);
			}
		}

		return blockers;
	}

	/**
	 * Get recently completed issues (Done in the last 7 days).
	 */
	async getRecentlyCompleted(days = 7): Promise<string[]> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);
		const cutoffStr = cutoff.toISOString();

		const issues = await this.frontmatterUtils.getAllIssues();
		const completed: string[] = [];

		for (const file of issues) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (!fm || fm.type !== 'issue') continue;
			const issue = fm as Issue;
			if (issue.status === 'Done' && issue.modified >= cutoffStr) {
				completed.push(`${issue.id}: ${issue.title}`);
			}
		}

		return completed;
	}

	/**
	 * Build full recall context for a new session start.
	 */
	async buildRecallContext(): Promise<SessionContext> {
		const lastSession = await this.getLastSession();
		const activeBlockers = await this.getActiveBlockers();
		const recentlyCompleted = await this.getRecentlyCompleted(7);

		const lastFm = lastSession?.session || null;
		const progressYesterday = lastFm?.record?.progressToday || 0;

		return {
			lastSession: lastFm,
			lastSessionFile: lastSession?.file || null,
			activeBlockers,
			recentlyCompleted,
			progressYesterday
		};
	}

	/**
	 * Create session file content.
	 */
	buildSessionContent(data: {
		id: string;
		date: string;
		startTime: string;
		objectives: string[];
		projectWikilink?: string;
		recallContext: SessionContext;
	}): string {
		const { id, date, startTime, objectives, projectWikilink, recallContext } = data;

		const lines: string[] = [];
		lines.push(`---`);
		lines.push(`type: session`);
		lines.push(`id: ${id}`);
		lines.push(`date: ${date}`);
		lines.push(`start-time: ${startTime}`);
		if (projectWikilink) lines.push(`project: "${projectWikilink}"`);
		lines.push(`route:`);
		objectives.forEach(obj => lines.push(`  - "${obj.replace(/"/g, '\\"')}"`));
		lines.push(`---`);
		lines.push(``);
		lines.push(`# Session ${date}`);
		lines.push(``);
		lines.push(`## Route (Objectives)`);
		lines.push(``);
		objectives.forEach((obj, i) => lines.push(`${i + 1}. ${obj}`));
		lines.push(``);

		if (recallContext.lastSession || recallContext.activeBlockers.length > 0) {
			lines.push(`## Recall (Context from Last Session)`);
			lines.push(``);
			if (recallContext.lastSessionFile) {
				lines.push(`**Last session:** [[${recallContext.lastSessionFile.basename}]]`);
				lines.push(``);
			}
			if (recallContext.lastSession?.route && recallContext.lastSession.route.length > 0) {
				lines.push(`**Previous objectives:**`);
				recallContext.lastSession.route.forEach(obj => lines.push(`- ${obj}`));
				lines.push(``);
			}
			if (recallContext.recentlyCompleted.length > 0) {
				lines.push(`**Recently completed (7 days):**`);
				recallContext.recentlyCompleted.slice(0, 5).forEach(i => lines.push(`- ${i}`));
				lines.push(``);
			}
			if (recallContext.activeBlockers.length > 0) {
				lines.push(`**Active blockers:**`);
				recallContext.activeBlockers.forEach(b => lines.push(`- ⚠️ ${b}`));
				lines.push(``);
			}
		}

		lines.push(`## Record (End of Session)`);
		lines.push(``);
		lines.push(`*Complete when ending session.*`);
		lines.push(``);

		return lines.join('\n');
	}
}
