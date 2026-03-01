import { App, Notice, TFile, normalizePath } from 'obsidian';
import { Project, ProjectStatus, DEFAULT_PROJECT_STATUS, DEFAULT_LEAD } from '../types';
import { ProjectCreateModal } from '../modals/ProjectCreateModal';
import { FrontmatterUtils } from '../utils/frontmatter';
import { IdGenerator } from '../utils/idGenerator';
import ConvergentPlugin from '../main';

export class ProjectCommands {
	private idGenerator: IdGenerator;

	constructor(
		private app: App,
		private plugin: ConvergentPlugin,
		private frontmatterUtils: FrontmatterUtils
	) {
		this.idGenerator = new IdGenerator(app);
	}

	registerCommands() {
		// Create project - Cmd/Ctrl+Shift+N
		this.plugin.addCommand({
			id: 'create-project',
			name: 'Create project',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'n' }],
			callback: () => this.createProject()
		});

		// Open project from current issue
		this.plugin.addCommand({
			id: 'open-project',
			name: 'Open linked project',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						this.openLinkedProject(activeFile);
					}
					return true;
				}
				return false;
			}
		});
	}

	async createProject() {
		new ProjectCreateModal(this.app, this.plugin, async (data) => {
			try {
				const file = await this.createProjectFile(data);
				new Notice(`Project created: ${data.title}`);
				await this.app.workspace.getLeaf().openFile(file);
			} catch (error) {
				console.error('Error creating project:', error);
				new Notice('Failed to create project');
			}
		}).open();
	}

	private async createProjectFile(data: {
		title: string;
		status: ProjectStatus;
		icon: string;
		description: string;
		start: string;
		target: string;
	}): Promise<TFile> {
		const folder = this.plugin.settings.projectsFolder;
		await this.ensureFolderExists(folder);

		const id = await this.idGenerator.generateUniqueProjectId();
		const now = new Date().toISOString().split('T')[0];

		const project: Partial<Project> = {
			type: 'project',
			id,
			title: data.title,
			status: data.status || DEFAULT_PROJECT_STATUS,
			lead: DEFAULT_LEAD,
			created: now,
			icon: data.icon || '📁',
			description: data.description || undefined,
			start: data.start || undefined,
			target: data.target || undefined,
			progress: 0,
			totalIssues: 0,
			completedIssues: 0
		};

		const yaml = this.projectToYaml(project as Project);
		const dataviewBlock = `\`\`\`dataview\nTABLE WITHOUT ID\n\tfile.link as Issue,\n\tstatus as Status,\n\tpriority as Priority,\n\tdue as Due\nFROM "${folder}"\nWHERE type = "issue" AND project = "[[${data.title}]]"\nSORT status, priority desc, due\n\`\`\``;

		const content = `---\n${yaml}---\n\n## Overview\n\n${data.description || ''}\n\n## Milestones\n\n\n## Issues\n\n${dataviewBlock}\n\n## Resources\n\n`;

		const sanitized = this.sanitizeFilename(data.title);
		const filePath = normalizePath(`${folder}/${sanitized}.md`);
		return await this.app.vault.create(filePath, content);
	}

	private projectToYaml(project: Project): string {
		const lines: string[] = [];
		lines.push(`type: ${project.type}`);
		lines.push(`id: ${project.id}`);
		lines.push(`title: "${project.title.replace(/"/g, '\\"')}"`);
		lines.push(`status: ${project.status}`);
		lines.push(`lead: ${project.lead}`);
		lines.push(`created: ${project.created}`);
		if (project.icon) lines.push(`icon: "${project.icon}"`);
		if (project.description) lines.push(`description: "${project.description.replace(/"/g, '\\"')}"`);
		if (project.start) lines.push(`start: ${project.start}`);
		if (project.target) lines.push(`target: ${project.target}`);
		lines.push(`progress: 0`);
		lines.push(`total-issues: 0`);
		lines.push(`completed-issues: 0`);
		return lines.join('\n') + '\n';
	}

	private sanitizeFilename(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.substring(0, 60);
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async openLinkedProject(file: TFile) {
		const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
		if (!frontmatter || frontmatter.type !== 'issue') {
			new Notice('Current file is not an issue');
			return;
		}

		const issue = frontmatter as { project?: string };
		if (!issue.project) {
			new Notice('Issue is not linked to a project');
			return;
		}

		// Extract wikilink name
		const match = issue.project.match(/\[\[(.+?)\]\]/);
		if (!match) {
			new Notice('Invalid project link format');
			return;
		}

		const projectName = match[1];
		const projectFile = this.app.vault.getFiles().find(f =>
			f.basename === projectName || f.path.endsWith(`/${projectName}.md`)
		);

		if (!projectFile) {
			new Notice(`Project not found: ${projectName}`);
			return;
		}

		await this.app.workspace.getLeaf().openFile(projectFile);
	}
}
