import { App, Notice, TFile, TFolder } from 'obsidian';
import { Issue, IssueStatus, IssuePriority } from '../types';
import { IssueModal } from '../modals/issue-modal';
import { StatusModal } from '../modals/status-modal';
import { PriorityModal } from '../modals/priority-modal';
import { PropertiesModal } from '../modals/properties-modal';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

export class IssueCommands {
	constructor(
		private app: App,
		private plugin: ConvergentPlugin,
		private frontmatterUtils: FrontmatterUtils
	) {}

	/**
	 * Register all issue-related commands
	 */
	registerCommands() {
		// Create issue - Cmd/Ctrl+Shift+I
		this.plugin.addCommand({
			id: 'create-issue',
			name: 'Create issue',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'i' }],
			callback: () => this.createIssue()
		});

		// Change status - Cmd/Ctrl+Shift+S
		this.plugin.addCommand({
			id: 'change-status',
			name: 'Change status',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 's' }],
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						this.changeStatus(activeFile);
					}
					return true;
				}
				return false;
			}
		});

		// Change priority - Cmd/Ctrl+Shift+P
		this.plugin.addCommand({
			id: 'change-priority',
			name: 'Change priority',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'p' }],
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						this.changePriority(activeFile);
					}
					return true;
				}
				return false;
			}
		});

		// Edit properties - Cmd/Ctrl+Shift+E
		this.plugin.addCommand({
			id: 'edit-properties',
			name: 'Edit properties',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'e' }],
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						this.editProperties(activeFile);
					}
					return true;
				}
				return false;
			}
		});
	}

	/**
	 * Create a new issue
	 */
	async createIssue() {
		new IssueModal(this.app, this.plugin, async (data) => {
			try {
				const file = await this.createIssueFile(data);
				new Notice(`Issue created: ${data.title}`);

				// Open the created file
				await this.app.workspace.getLeaf().openFile(file);
			} catch (error) {
				console.error('Error creating issue:', error);
				new Notice('Failed to create issue');
			}
		}).open();
	}

	/**
	 * Create issue file with frontmatter
	 */
	private async createIssueFile(data: {
		title: string;
		status: IssueStatus;
		priority: IssuePriority;
		project?: TFile;
		description: string;
	}): Promise<TFile> {
		// Ensure issues folder exists
		const issuesFolder = this.plugin.settings.issuesFolder;
		await this.ensureFolderExists(issuesFolder);

		// Generate unique filename
		const fileName = this.generateFileName(data.title);
		const filePath = `${issuesFolder}/${fileName}.md`;

		// Generate unique ID
		const id = this.generateId();

		// Create frontmatter
		const now = new Date().toISOString();
		const frontmatter: Partial<Issue> = {
			type: 'issue',
			id,
			title: data.title,
			status: data.status,
			priority: data.priority,
			created: now,
			modified: now
		};

		// Add optional fields
		if (data.project) {
			// Convert TFile to wikilink
			frontmatter.project = `[[${data.project.basename}]]`;
		}

		// Build file content
		const content = this.buildIssueContent(frontmatter, data.description);

		// Create file
		const file = await this.app.vault.create(filePath, content);

		return file;
	}

	/**
	 * Build issue file content with frontmatter
	 */
	private buildIssueContent(frontmatter: Partial<Issue>, description: string): string {
		const yaml = this.frontmatterToYaml(frontmatter);

		let content = '---\n';
		content += yaml;
		content += '---\n\n';

		// Add description if provided
		if (description.trim()) {
			content += '## Description\n\n';
			content += description + '\n\n';
		}

		// Add template sections
		content += '## Acceptance Criteria\n\n';
		content += '- [ ] \n\n';
		content += '## Notes\n\n';

		return content;
	}

	/**
	 * Convert frontmatter object to YAML string
	 */
	private frontmatterToYaml(frontmatter: Partial<Issue>): string {
		let yaml = '';

		for (const [key, value] of Object.entries(frontmatter)) {
			if (value === undefined || value === null) continue;

			// Handle different value types
			if (typeof value === 'string') {
				// Escape strings with special characters
				if (value.includes(':') || value.includes('#') || value.includes('\n')) {
					yaml += `${key}: "${value.replace(/"/g, '\\"')}"\n`;
				} else {
					yaml += `${key}: ${value}\n`;
				}
			} else if (Array.isArray(value)) {
				yaml += `${key}:\n`;
				value.forEach(item => {
					yaml += `  - ${item}\n`;
				});
			} else if (typeof value === 'object') {
				yaml += `${key}: ${JSON.stringify(value)}\n`;
			} else {
				yaml += `${key}: ${value}\n`;
			}
		}

		return yaml;
	}

	/**
	 * Ensure folder exists, create if not
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	/**
	 * Generate filename from title
	 */
	private generateFileName(title: string): string {
		// Convert to kebab-case and remove special characters
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.substring(0, 50); // Limit length
	}

	/**
	 * Generate unique ID for issue
	 */
	private generateId(): string {
		return `ISS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
	}

	/**
	 * Change status of current issue
	 */
	async changeStatus(file: TFile) {
		// Check if file is an issue
		const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
		if (!frontmatter || frontmatter.type !== 'issue') {
			new Notice('Current file is not an issue');
			return;
		}

		const issue = frontmatter as Issue;
		const currentStatus = issue.status;

		// Open status picker
		new StatusModal(
			this.app,
			file,
			this.frontmatterUtils,
			currentStatus,
			async (newStatus: IssueStatus) => {
				try {
					// Update frontmatter
					await this.frontmatterUtils.updateFrontmatter(file, {
						status: newStatus,
						modified: new Date().toISOString()
					});

					new Notice(`Status changed: ${currentStatus} → ${newStatus}`);
				} catch (error) {
					console.error('Error changing status:', error);
					new Notice('Failed to change status');
				}
			}
		).open();
	}

	/**
	 * Change priority of current issue
	 */
	async changePriority(file: TFile) {
		// Check if file is an issue
		const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
		if (!frontmatter || frontmatter.type !== 'issue') {
			new Notice('Current file is not an issue');
			return;
		}

		const issue = frontmatter as Issue;
		const currentPriority = issue.priority;

		// Open priority picker
		new PriorityModal(
			this.app,
			file,
			this.frontmatterUtils,
			currentPriority,
			async (newPriority: IssuePriority) => {
				try {
					// Update frontmatter
					await this.frontmatterUtils.updateFrontmatter(file, {
						priority: newPriority,
						modified: new Date().toISOString()
					});

					const oldPriority = currentPriority || 'None';
					new Notice(`Priority changed: ${oldPriority} → ${newPriority}`);
				} catch (error) {
					console.error('Error changing priority:', error);
					new Notice('Failed to change priority');
				}
			}
		).open();
	}

	/**
	 * Edit properties of current issue
	 */
	async editProperties(file: TFile) {
		// Check if file is an issue
		const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
		if (!frontmatter || frontmatter.type !== 'issue') {
			new Notice('Current file is not an issue');
			return;
		}

		const issue = frontmatter as Issue;

		// Open properties editor
		new PropertiesModal(
			this.app,
			this.plugin,
			file,
			issue,
			this.frontmatterUtils
		).open();
	}
}
