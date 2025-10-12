import { App, TFile, TFolder, normalizePath } from 'obsidian';
import { Issue, Project, IssueCreateInput, ProjectCreateInput, DEFAULT_STATUS, DEFAULT_PROJECT_STATUS, DEFAULT_LEAD } from '../types';
import { IdGenerator } from './idGenerator';
import { FrontmatterUtils } from './frontmatter';

/**
 * File operations for creating and managing Issue and Project files
 */

export interface FileOperationsSettings {
	issuesFolder: string; // e.g., "Issues"
	projectsFolder: string; // e.g., "Projects"
	sessionsFolder: string; // e.g., "Sessions"
}

export class FileOperations {
	private idGenerator: IdGenerator;
	private frontmatterUtils: FrontmatterUtils;

	constructor(
		private app: App,
		private settings: FileOperationsSettings
	) {
		this.idGenerator = new IdGenerator(app);
		this.frontmatterUtils = new FrontmatterUtils(app);
	}

	/**
	 * Ensure a folder exists, create if it doesn't
	 * @param folderPath Path to folder
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		}
	}

	/**
	 * Generate filename from title
	 * Removes special characters, replaces spaces with hyphens
	 * @param title Title to convert
	 * @returns Safe filename
	 */
	private sanitizeFilename(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	/**
	 * Create an Issue file
	 * @param input Issue creation input
	 * @returns Created TFile
	 */
	async createIssue(input: IssueCreateInput): Promise<TFile> {
		// Ensure Issues folder exists
		await this.ensureFolderExists(this.settings.issuesFolder);

		// Generate ID
		const id = await this.idGenerator.generateUniqueIssueId();

		// Create Issue object with defaults
		const now = new Date().toISOString();
		const issue: Partial<Issue> = {
			type: 'issue',
			id,
			title: input.title,
			status: input.status || DEFAULT_STATUS,
			created: now,
			modified: now,
			priority: input.priority,
			estimate: input.estimate,
			due: input.due,
			labels: input.labels || [],
			description: input.description,
			project: input.project,
			parent: input.parent,
			progress: input.progress || 0,
			assignee: 'me',
			...input
		};

		// Generate filename
		const filename = `${id}.md`;
		const filePath = normalizePath(`${this.settings.issuesFolder}/${filename}`);

		// Generate frontmatter YAML
		const yaml = this.generateIssueFrontmatter(issue as Issue);

		// Generate markdown content
		const content = `---\n${yaml}---\n\n## Description\n\n${issue.description || ''}\n\n## Acceptance Criteria\n\n${issue.acceptanceCriteria?.map(c => `- [ ] ${c}`).join('\n') || '- [ ] '}\n\n## Notes\n\n${issue.notes || ''}`;

		// Create file
		const file = await this.app.vault.create(filePath, content);

		return file;
	}

	/**
	 * Create a Project file
	 * @param input Project creation input
	 * @returns Created TFile
	 */
	async createProject(input: ProjectCreateInput): Promise<TFile> {
		// Ensure Projects folder exists
		await this.ensureFolderExists(this.settings.projectsFolder);

		// Generate ID
		const id = await this.idGenerator.generateUniqueProjectId();

		// Create Project object with defaults
		const now = new Date().toISOString().split('T')[0]; // Date only
		const project: Partial<Project> = {
			type: 'project',
			id,
			title: input.title,
			status: input.status || DEFAULT_PROJECT_STATUS,
			lead: input.lead || DEFAULT_LEAD,
			created: now,
			icon: input.icon || '📁',
			description: input.description,
			labels: input.labels || [],
			progress: 0,
			totalIssues: 0,
			completedIssues: 0,
			...input
		};

		// Generate filename
		const sanitizedTitle = this.sanitizeFilename(project.title!);
		const filename = `${sanitizedTitle}.md`;
		const filePath = normalizePath(`${this.settings.projectsFolder}/${filename}`);

		// Generate frontmatter YAML
		const yaml = this.generateProjectFrontmatter(project as Project);

		// Generate markdown content
		const content = `---\n${yaml}---\n\n## Overview\n\n${project.description || ''}\n\n## Milestones\n\n\n## Issues\n\n\`\`\`dataview\nTABLE WITHOUT ID\n\tfile.link as Issue,\n\tstatus as Status,\n\tpriority as Priority,\n\tdue as Due\nFROM #issue\nWHERE project = "[[${project.title}]]"\nSORT status, priority desc, due\n\`\`\`\n\n## Resources\n\n`;

		// Create file
		const file = await this.app.vault.create(filePath, content);

		return file;
	}

	/**
	 * Delete an Issue or Project file safely
	 * @param file File to delete
	 */
	async deleteFile(file: TFile): Promise<void> {
		await this.app.vault.trash(file, true);
	}

	/**
	 * Generate YAML frontmatter for Issue
	 * @param issue Issue object
	 * @returns YAML string
	 */
	private generateIssueFrontmatter(issue: Issue): string {
		const lines: string[] = [];

		// Required fields
		lines.push(`type: ${issue.type}`);
		lines.push(`id: ${issue.id}`);
		lines.push(`title: "${issue.title.replace(/"/g, '\\"')}"`);
		lines.push(`status: ${issue.status}`);
		lines.push(`created: ${issue.created}`);
		lines.push(`modified: ${issue.modified}`);

		// Optional fields
		if (issue.priority) lines.push(`priority: ${issue.priority}`);
		if (issue.estimate) lines.push(`estimate: ${issue.estimate}`);
		if (issue.due) lines.push(`due: ${issue.due}`);
		if (issue.labels && issue.labels.length > 0) {
			lines.push(`labels:`);
			issue.labels.forEach(label => lines.push(`  - ${label}`));
		}
		if (issue.project) lines.push(`project: "${issue.project}"`);
		if (issue.parent) lines.push(`parent: "${issue.parent}"`);
		if (issue.subIssues && issue.subIssues.length > 0) {
			lines.push(`sub-issues:`);
			issue.subIssues.forEach(sub => lines.push(`  - "${sub}"`));
		}
		if (issue.blockedBy && issue.blockedBy.length > 0) {
			lines.push(`blocked-by:`);
			issue.blockedBy.forEach(blocker => lines.push(`  - "${blocker}"`));
		}
		if (issue.blocks && issue.blocks.length > 0) {
			lines.push(`blocks:`);
			issue.blocks.forEach(blocked => lines.push(`  - "${blocked}"`));
		}
		if (issue.related && issue.related.length > 0) {
			lines.push(`related:`);
			issue.related.forEach(rel => lines.push(`  - "${rel}"`));
		}
		if (issue.progress !== undefined) lines.push(`progress: ${issue.progress}`);
		if (issue.assignee) lines.push(`assignee: ${issue.assignee}`);
		if (issue.template) lines.push(`template: ${issue.template}`);

		return lines.join('\n') + '\n';
	}

	/**
	 * Generate YAML frontmatter for Project
	 * @param project Project object
	 * @returns YAML string
	 */
	private generateProjectFrontmatter(project: Project): string {
		const lines: string[] = [];

		// Required fields
		lines.push(`type: ${project.type}`);
		lines.push(`id: ${project.id}`);
		lines.push(`title: "${project.title.replace(/"/g, '\\"')}"`);
		lines.push(`status: ${project.status}`);
		lines.push(`lead: ${project.lead}`);
		lines.push(`created: ${project.created}`);

		// Optional fields
		if (project.target) lines.push(`target: ${project.target}`);
		if (project.start) lines.push(`start: ${project.start}`);
		if (project.icon) lines.push(`icon: "${project.icon}"`);
		if (project.description) lines.push(`description: "${project.description.replace(/"/g, '\\"')}"`);
		if (project.labels && project.labels.length > 0) {
			lines.push(`labels:`);
			project.labels.forEach(label => lines.push(`  - ${label}`));
		}

		// Progress tracking
		lines.push(`progress: ${project.progress || 0}`);
		lines.push(`total-issues: ${project.totalIssues || 0}`);
		lines.push(`completed-issues: ${project.completedIssues || 0}`);

		// Relationships
		if (project.milestones && project.milestones.length > 0) {
			lines.push(`milestones:`);
			project.milestones.forEach(milestone => lines.push(`  - "${milestone}"`));
		}
		if (project.sessions && project.sessions.length > 0) {
			lines.push(`sessions:`);
			project.sessions.forEach(session => lines.push(`  - "${session}"`));
		}
		if (project.documents && project.documents.length > 0) {
			lines.push(`documents:`);
			project.documents.forEach(doc => lines.push(`  - "${doc}"`));
		}
		if (project.links && project.links.length > 0) {
			lines.push(`links:`);
			project.links.forEach(link => {
				lines.push(`  - url: "${link.url}"`);
				lines.push(`    title: "${link.title.replace(/"/g, '\\"')}"`);
			});
		}

		return lines.join('\n') + '\n';
	}

	/**
	 * Get all Issue files from the vault
	 * @returns Array of Issue TFiles
	 */
	async getAllIssues(): Promise<TFile[]> {
		return await this.frontmatterUtils.getAllIssues();
	}

	/**
	 * Get all Project files from the vault
	 * @returns Array of Project TFiles
	 */
	async getAllProjects(): Promise<TFile[]> {
		return await this.frontmatterUtils.getAllProjects();
	}

	/**
	 * Find Issue by ID
	 * @param id Issue ID to find
	 * @returns TFile if found, null otherwise
	 */
	async findIssueById(id: string): Promise<TFile | null> {
		const issues = await this.getAllIssues();

		for (const issue of issues) {
			const frontmatter = await this.frontmatterUtils.getFrontmatter(issue);
			if (frontmatter && frontmatter.id === id) {
				return issue;
			}
		}

		return null;
	}

	/**
	 * Find Project by ID
	 * @param id Project ID to find
	 * @returns TFile if found, null otherwise
	 */
	async findProjectById(id: string): Promise<TFile | null> {
		const projects = await this.getAllProjects();

		for (const project of projects) {
			const frontmatter = await this.frontmatterUtils.getFrontmatter(project);
			if (frontmatter && frontmatter.id === id) {
				return project;
			}
		}

		return null;
	}
}
