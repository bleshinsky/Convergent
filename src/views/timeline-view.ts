import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { Issue } from '../types';
import ConvergentPlugin from '../main';

export const TIMELINE_VIEW_TYPE = 'convergent-timeline-view';

interface TimelineIssue {
	file: TFile;
	id: string;
	title: string;
	status: string;
	priority?: string;
	due?: string;
	start?: string;
	labels?: string[];
}

type ZoomLevel = 'week' | 'month' | 'quarter';

export class TimelineView extends ItemView {
	private plugin: ConvergentPlugin;
	private frontmatterUtils: FrontmatterUtils;
	private issues: TimelineIssue[] = [];
	private zoomLevel: ZoomLevel = 'month';
	private viewStartDate: Date = new Date();
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ConvergentPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.frontmatterUtils = new FrontmatterUtils(plugin.app);
	}

	getViewType(): string { return TIMELINE_VIEW_TYPE; }
	getDisplayText(): string { return 'Timeline'; }
	getIcon(): string { return 'calendar'; }

	async onOpen() {
		await this.loadIssues();
		this.render();

		// Auto-refresh
		this.registerEvent(
			this.app.vault.on('modify', () => this.scheduleRefresh())
		);
		this.registerEvent(
			this.app.vault.on('create', () => this.scheduleRefresh())
		);
		this.registerEvent(
			this.app.vault.on('delete', () => this.scheduleRefresh())
		);
	}

	async onClose() {
		if (this.refreshTimer) clearTimeout(this.refreshTimer);
	}

	private scheduleRefresh() {
		if (this.refreshTimer) clearTimeout(this.refreshTimer);
		this.refreshTimer = setTimeout(async () => {
			await this.loadIssues();
			this.render();
		}, 500);
	}

	private async loadIssues() {
		const files = await this.frontmatterUtils.getAllIssues();
		const results: TimelineIssue[] = [];

		for (const file of files) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (!fm || fm.type !== 'issue') continue;
			const issue = fm as Issue;
			if (!issue.due && !issue.created) continue; // Skip issues with no dates

			results.push({
				file,
				id: issue.id,
				title: issue.title,
				status: issue.status,
				priority: issue.priority,
				due: issue.due,
				start: issue.created?.split('T')[0],
				labels: issue.labels
			});
		}

		// Sort by due date
		results.sort((a, b) => {
			const aDate = a.due || a.start || '9999';
			const bDate = b.due || b.start || '9999';
			return aDate.localeCompare(bDate);
		});

		this.issues = results;
	}

	private render() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('convergent-timeline');

		// Header
		const header = containerEl.createDiv('convergent-timeline-header');
		header.createEl('h2', { text: 'Timeline' });

		// Controls
		const controls = header.createDiv('convergent-timeline-controls');

		// Zoom controls
		const zoomContainer = controls.createDiv('convergent-timeline-zoom');
		(['week', 'month', 'quarter'] as ZoomLevel[]).forEach(level => {
			const btn = zoomContainer.createEl('button', {
				text: level.charAt(0).toUpperCase() + level.slice(1),
				cls: this.zoomLevel === level ? 'convergent-zoom-btn active' : 'convergent-zoom-btn'
			});
			btn.addEventListener('click', () => {
				this.zoomLevel = level;
				this.render();
			});
		});

		// Navigation
		const navContainer = controls.createDiv('convergent-timeline-nav');
		const prevBtn = navContainer.createEl('button', { text: '← Prev', cls: 'convergent-nav-btn' });
		prevBtn.addEventListener('click', () => this.navigate(-1));

		navContainer.createEl('span', {
			text: this.getDateRangeLabel(),
			cls: 'convergent-date-range'
		});

		const nextBtn = navContainer.createEl('button', { text: 'Next →', cls: 'convergent-nav-btn' });
		nextBtn.addEventListener('click', () => this.navigate(1));

		const todayBtn = navContainer.createEl('button', { text: 'Today', cls: 'convergent-nav-btn mod-cta' });
		todayBtn.addEventListener('click', () => {
			this.viewStartDate = new Date();
			this.render();
		});

		// Timeline content
		const timelineContainer = containerEl.createDiv('convergent-timeline-container');

		if (this.issues.length === 0) {
			const empty = timelineContainer.createDiv('convergent-timeline-empty');
			empty.createEl('p', { text: 'No issues with due dates found.' });
			empty.createEl('p', { text: 'Add due dates to issues to see them on the timeline.' });
			return;
		}

		const { startDate, endDate, totalDays, columns } = this.getDateRange();

		// Date header row
		const dateHeader = timelineContainer.createDiv('convergent-timeline-date-header');
		dateHeader.createDiv('convergent-timeline-label-cell'); // Empty label cell
		const dateRow = dateHeader.createDiv('convergent-timeline-dates');
		this.renderDateHeaders(dateRow, startDate, endDate, columns);

		// Issue rows
		const issuesContainer = timelineContainer.createDiv('convergent-timeline-issues');
		const filteredIssues = this.getVisibleIssues(startDate, endDate);

		if (filteredIssues.length === 0) {
			issuesContainer.createEl('p', {
				text: 'No issues in this date range.',
				cls: 'convergent-timeline-no-issues'
			});
		}

		filteredIssues.forEach(issue => {
			this.renderIssueRow(issuesContainer, issue, startDate, totalDays);
		});

		// Today indicator
		const today = new Date();
		if (today >= startDate && today <= endDate) {
			const todayOffset = this.daysBetween(startDate, today);
			const pct = (todayOffset / totalDays) * 100;
			const todayLine = timelineContainer.createDiv('convergent-timeline-today-line');
			todayLine.style.left = `calc(200px + ${pct}% * (100% - 200px) / 100)`;
		}
	}

	private renderDateHeaders(container: HTMLElement, startDate: Date, endDate: Date, columns: Date[]) {
		columns.forEach((col, idx) => {
			const cell = container.createDiv('convergent-timeline-date-cell');
			cell.setText(this.formatDateLabel(col));
			const pct = (idx / columns.length) * 100;
			cell.style.left = `${pct}%`;
		});
	}

	private renderIssueRow(container: HTMLElement, issue: TimelineIssue, startDate: Date, totalDays: number) {
		const row = container.createDiv('convergent-timeline-row');

		// Label cell
		const labelCell = row.createDiv('convergent-timeline-label');
		const statusIcon = this.getStatusIcon(issue.status);
		labelCell.createSpan({ text: statusIcon + ' ', cls: 'convergent-timeline-status-icon' });
		const titleEl = labelCell.createEl('a', {
			text: issue.title,
			cls: 'convergent-timeline-title'
		});
		titleEl.addEventListener('click', () => {
			this.app.workspace.getLeaf().openFile(issue.file);
		});

		// Bar cell
		const barCell = row.createDiv('convergent-timeline-bar-cell');

		const dueDate = issue.due ? new Date(issue.due) : null;
		const startDate2 = issue.start ? new Date(issue.start) : (dueDate ? new Date(dueDate.getTime() - 7 * 86400000) : null);

		if (!dueDate && !startDate2) return;

		const barStart = startDate2 && startDate2 >= startDate ? startDate2 : startDate;
		const barEnd = dueDate && dueDate <= new Date(startDate.getTime() + totalDays * 86400000) ? dueDate : new Date(startDate.getTime() + totalDays * 86400000);

		const startOffset = this.daysBetween(startDate, barStart);
		const barWidth = this.daysBetween(barStart, barEnd) + 1;

		const leftPct = (startOffset / totalDays) * 100;
		const widthPct = (barWidth / totalDays) * 100;

		const bar = barCell.createDiv('convergent-timeline-bar');
		bar.style.left = `${Math.max(0, leftPct)}%`;
		bar.style.width = `${Math.min(100 - leftPct, widthPct)}%`;
		bar.addClass(`convergent-timeline-bar-${issue.status.toLowerCase().replace(/\s+/g, '-')}`);

		if (dueDate) {
			const isOverdue = dueDate < new Date() && issue.status !== 'Done' && issue.status !== 'Canceled';
			if (isOverdue) bar.addClass('convergent-timeline-bar-overdue');

			const isDueSoon = !isOverdue && this.daysBetween(new Date(), dueDate) <= 7;
			if (isDueSoon) bar.addClass('convergent-timeline-bar-due-soon');
		}

		if (issue.priority) {
			bar.setAttribute('title', `${issue.title} | Priority: ${issue.priority}${dueDate ? ' | Due: ' + issue.due : ''}`);
		}

		// Priority badge
		if (issue.priority && issue.priority !== 'No Priority') {
			const badge = bar.createSpan('convergent-timeline-priority');
			badge.setText(this.getPriorityIcon(issue.priority));
		}
	}

	private getVisibleIssues(startDate: Date, endDate: Date): TimelineIssue[] {
		return this.issues.filter(issue => {
			const dueDate = issue.due ? new Date(issue.due) : null;
			const startD = issue.start ? new Date(issue.start) : null;

			if (dueDate && dueDate >= startDate && dueDate <= endDate) return true;
			if (startD && startD >= startDate && startD <= endDate) return true;
			if (startD && dueDate && startD <= startDate && dueDate >= endDate) return true;

			return false;
		});
	}

	private getDateRange(): { startDate: Date; endDate: Date; totalDays: number; columns: Date[] } {
		const startDate = new Date(this.viewStartDate);
		startDate.setHours(0, 0, 0, 0);

		let totalDays: number;
		const columns: Date[] = [];

		if (this.zoomLevel === 'week') {
			// Show 2 weeks
			const monday = new Date(startDate);
			monday.setDate(monday.getDate() - monday.getDay() + 1);
			startDate.setTime(monday.getTime());
			totalDays = 14;
			for (let i = 0; i < 14; i++) {
				const d = new Date(startDate);
				d.setDate(d.getDate() + i);
				columns.push(d);
			}
		} else if (this.zoomLevel === 'month') {
			// Show 2 months
			startDate.setDate(1);
			totalDays = 60;
			const current = new Date(startDate);
			while (columns.length < 9) {
				columns.push(new Date(current));
				current.setDate(current.getDate() + 7);
			}
		} else {
			// Quarter - show 3 months
			startDate.setMonth(Math.floor(startDate.getMonth() / 3) * 3, 1);
			totalDays = 91;
			for (let m = 0; m < 3; m++) {
				const d = new Date(startDate);
				d.setMonth(d.getMonth() + m);
				columns.push(d);
			}
		}

		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + totalDays);

		return { startDate, endDate, totalDays, columns };
	}

	private navigate(direction: -1 | 1) {
		if (this.zoomLevel === 'week') {
			this.viewStartDate.setDate(this.viewStartDate.getDate() + direction * 14);
		} else if (this.zoomLevel === 'month') {
			this.viewStartDate.setMonth(this.viewStartDate.getMonth() + direction * 2);
		} else {
			this.viewStartDate.setMonth(this.viewStartDate.getMonth() + direction * 3);
		}
		this.render();
	}

	private getDateRangeLabel(): string {
		const { startDate, endDate } = this.getDateRange();
		const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
		return `${startDate.toLocaleDateString(undefined, options)} – ${endDate.toLocaleDateString(undefined, options)}`;
	}

	private formatDateLabel(date: Date): string {
		if (this.zoomLevel === 'week') {
			return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
		} else if (this.zoomLevel === 'month') {
			return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		} else {
			return date.toLocaleDateString(undefined, { month: 'long' });
		}
	}

	private daysBetween(a: Date, b: Date): number {
		return Math.round((b.getTime() - a.getTime()) / 86400000);
	}

	private getStatusIcon(status: string): string {
		const icons: Record<string, string> = {
			'Backlog': '○', 'Triage': '⚡', 'Todo': '◯',
			'In Progress': '◐', 'Done': '●', 'Canceled': '✕'
		};
		return icons[status] || '○';
	}

	private getPriorityIcon(priority: string): string {
		const icons: Record<string, string> = {
			'Urgent': '🔥', 'High': '⬆', 'Medium': '→', 'Low': '⬇'
		};
		return icons[priority] || '';
	}
}
