import { TFile } from 'obsidian';

/**
 * Issue status following Linear's workflow
 */
export type IssueStatus =
	| 'Backlog'
	| 'Triage'
	| 'Todo'
	| 'In Progress'
	| 'Done'
	| 'Canceled';

/**
 * Issue priority levels
 */
export type IssuePriority =
	| 'No Priority'
	| 'Low'
	| 'Medium'
	| 'High'
	| 'Urgent';

/**
 * Recurring issue configuration
 */
export interface RecurringConfig {
	enabled: boolean;
	cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
	nextDue: string; // ISO date string
}

/**
 * Complete Issue entity
 * Stored as Markdown file with YAML frontmatter
 * File location: vault/Issues/ISSUE-{id}.md
 */
export interface Issue {
	// Core properties (required)
	type: 'issue';
	id: string; // e.g., "ISSUE-123"
	title: string;
	status: IssueStatus;
	created: string; // ISO datetime string
	modified: string; // ISO datetime string

	// Optional properties
	priority?: IssuePriority;
	estimate?: number; // Points or hours
	due?: string; // ISO date string
	labels?: string[];
	description?: string;

	// Relationships (wikilinks to other files)
	project?: string; // Wikilink: "[[Project - Name]]"
	parent?: string; // Wikilink: "[[ISSUE-100]]"
	subIssues?: string[]; // Wikilinks: ["[[ISSUE-124]]", "[[ISSUE-125]]"]
	blockedBy?: string[]; // Wikilinks: ["[[ISSUE-120]]"]
	blocks?: string[]; // Wikilinks: ["[[ISSUE-130]]"]
	related?: string[]; // Wikilinks: ["[[ISSUE-105]]"]

	// Progress tracking
	progress?: number; // 0-100 percentage

	// Recurring configuration
	recurring?: RecurringConfig;

	// Metadata
	template?: string; // Template used (bug-report, feature-request, task)
	assignee?: string; // Always "me" for solo developer

	// Content sections (not in frontmatter, in markdown body)
	acceptanceCriteria?: string[];
	notes?: string;

	// Session tracking (MSP)
	session?: string; // Wikilink: "[[Session 2025-10-08]]"
	decisions?: string[]; // Wikilinks to decisions
}

/**
 * Partial issue for creation (only required fields)
 */
export type IssueCreateInput = Pick<Issue, 'title' | 'status'> & Partial<Issue>;

/**
 * Issue update input (any field except type and id)
 */
export type IssueUpdateInput = Partial<Omit<Issue, 'type' | 'id'>>;

/**
 * Status workflow order for sorting
 */
export const STATUS_ORDER: Record<IssueStatus, number> = {
	'Backlog': 0,
	'Triage': 1,
	'Todo': 2,
	'In Progress': 3,
	'Done': 4,
	'Canceled': 5
};

/**
 * Priority urgency order for sorting
 */
export const PRIORITY_ORDER: Record<IssuePriority, number> = {
	'No Priority': 0,
	'Low': 1,
	'Medium': 2,
	'High': 3,
	'Urgent': 4
};

/**
 * Default status for new issues
 */
export const DEFAULT_STATUS: IssueStatus = 'Todo';

/**
 * Default priority for new issues
 */
export const DEFAULT_PRIORITY: IssuePriority = 'No Priority';
