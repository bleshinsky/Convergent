import { TFile } from 'obsidian';
import type { Issue } from './Issue';
import type { Project } from './Project';

// Re-export all types from separate files
export type {
	Issue,
	IssueStatus,
	IssuePriority,
	RecurringConfig,
	IssueCreateInput,
	IssueUpdateInput
} from './Issue';

export {
	STATUS_ORDER,
	PRIORITY_ORDER,
	DEFAULT_STATUS,
	DEFAULT_PRIORITY
} from './Issue';

export type {
	Project,
	ProjectStatus,
	ProjectLink,
	ProjectCreateInput,
	ProjectUpdateInput
} from './Project';

export {
	PROJECT_STATUS_ORDER,
	DEFAULT_PROJECT_STATUS,
	DEFAULT_LEAD
} from './Project';

// Core entity types
export type EntityType = 'issue' | 'project' | 'session' | 'decision' | 'blocker';

// Relationship types
export type RelationType =
	| 'parent'
	| 'child'
	| 'blocks'
	| 'blocked-by'
	| 'related';

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
