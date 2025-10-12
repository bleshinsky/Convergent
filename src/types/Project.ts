import { TFile } from 'obsidian';

/**
 * Project status
 */
export type ProjectStatus =
	| 'Planning'
	| 'In Progress'
	| 'On Hold'
	| 'Completed'
	| 'Canceled';

/**
 * External link for project resources
 */
export interface ProjectLink {
	url: string;
	title: string;
}

/**
 * Complete Project entity
 * Stored as Markdown file with YAML frontmatter
 * File location: vault/Projects/{ProjectName}.md
 */
export interface Project {
	// Core properties (required)
	type: 'project';
	id: string; // e.g., "PROJ-5"
	title: string;
	status: ProjectStatus;
	lead: string; // Always "me" for solo developer
	created: string; // ISO date string

	// Optional properties
	target?: string; // Target completion date (ISO date string)
	start?: string; // Start date (ISO date string)
	icon?: string; // Emoji or icon name (e.g., "🎨")
	description?: string;
	labels?: string[];

	// Progress tracking (auto-calculated)
	progress?: number; // 0-100 percentage
	totalIssues?: number; // Total linked issues
	completedIssues?: number; // Issues with status: Done

	// Relationships (wikilinks)
	milestones?: string[]; // Wikilinks to milestone files
	sessions?: string[]; // Wikilinks to MSP session files
	documents?: string[]; // Wikilinks to documentation files

	// External resources
	links?: ProjectLink[];

	// Runtime properties (not stored in frontmatter)
	file?: TFile; // The Obsidian TFile object for this project
}

/**
 * Partial project for creation (only required fields)
 */
export type ProjectCreateInput = Pick<Project, 'title' | 'status' | 'lead'> & Partial<Project>;

/**
 * Project update input (any field except type and id)
 */
export type ProjectUpdateInput = Partial<Omit<Project, 'type' | 'id'>>;

/**
 * Project status order for sorting
 */
export const PROJECT_STATUS_ORDER: Record<ProjectStatus, number> = {
	'Planning': 0,
	'In Progress': 1,
	'On Hold': 2,
	'Completed': 3,
	'Canceled': 4
};

/**
 * Default status for new projects
 */
export const DEFAULT_PROJECT_STATUS: ProjectStatus = 'Planning';

/**
 * Default lead (always "me" for solo developer)
 */
export const DEFAULT_LEAD = 'me';
