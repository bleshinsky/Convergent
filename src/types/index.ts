import { TFile } from 'obsidian';

// Core entity types
export type EntityType = 'issue' | 'project' | 'session' | 'decision' | 'blocker';

// Relationship types
export type RelationType =
	| 'parent'
	| 'child'
	| 'blocks'
	| 'blocked-by'
	| 'related';

// Issue types
export type IssueStatus =
	| 'Backlog'
	| 'Todo'
	| 'In Progress'
	| 'In Review'
	| 'Done'
	| 'Canceled';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Issue {
	// Core
	type: 'issue';
	id: string;
	title: string;
	status: IssueStatus;
	created: string;
	modified: string;

	// Optional
	priority?: IssuePriority;
	estimate?: number;
	due?: string;
	labels?: string[];

	// Relationships
	project?: TFile;
	parent?: TFile;
	subIssues?: TFile[];
	blockedBy?: TFile[];
	blocks?: TFile[];
	related?: TFile[];

	// MSP
	session?: TFile;
	decisions?: TFile[];
	progress?: number;

	// Recurring
	recurring?: {
		enabled: boolean;
		cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
		nextDue: string;
	};

	// Content
	description?: string;
	acceptanceCriteria?: string[];

	// File reference
	file?: TFile;
}

// Project types
export type ProjectStatus =
	| 'Planning'
	| 'In Progress'
	| 'On Hold'
	| 'Completed'
	| 'Canceled';

export interface Project {
	type: 'project';
	id: string;
	title: string;
	status: ProjectStatus;
	lead: string;
	created: string;
	target?: string;
	icon?: string;

	start?: string;
	description?: string;
	labels?: string[];

	progress?: number;
	totalIssues?: number;
	completedIssues?: number;

	milestones?: TFile[];
	sessions?: TFile[];
	documents?: TFile[];
	links?: { url: string; title: string }[];

	file?: TFile;
}

// MSP Session types
export interface MSPSession {
	type: 'session';
	id: string;
	date: string;
	startTime: string;
	endTime?: string;
	duration?: number;

	// R³ Protocol
	route: string[];           // Objectives
	recall: {
		lastSession?: TFile;
		lastBlocker?: TFile;
		progressYesterday?: number;
	};
	record: {
		progressToday?: number;
		completed?: TFile[];
		inProgress?: TFile[];
	};

	// Context
	decisions?: TFile[];
	blockers?: TFile[];
	project?: TFile;
	issues?: TFile[];

	// AI Export
	aiContext?: string;

	file?: TFile;
}

// Decision types
export type DecisionStatus = 'Proposed' | 'Accepted' | 'Rejected' | 'Superseded';

export interface Decision {
	type: 'decision';
	id: string;
	title: string;
	date: string;
	status: DecisionStatus;

	session?: TFile;
	project?: TFile;
	relatedIssues?: TFile[];

	rationale?: string;
	alternatives?: string[];
	consequences?: string[];
	tags?: string[];

	file?: TFile;
}

// Blocker types
export type BlockerStatus = 'Active' | 'Resolved' | 'Abandoned';

export interface Blocker {
	type: 'blocker';
	id: string;
	title: string;
	date: string;
	status: BlockerStatus;

	session?: TFile;
	issue?: TFile;
	project?: TFile;

	description?: string;
	impact?: 'Low' | 'Medium' | 'High';
	workaround?: string;

	resolvedDate?: string;
	resolution?: string;

	tags?: string[];

	file?: TFile;
}

// Frontmatter type (union of all entity frontmatter)
export type Frontmatter =
	| Issue
	| Project
	| MSPSession
	| Decision
	| Blocker;
