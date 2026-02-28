import { App, Modal, Notice, Setting, TFile, SuggestModal } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { Project } from '../types';
import ConvergentPlugin from '../main';

/**
 * Modal for starting an MSP session (Route phase of R³ Protocol).
 */
export class StartSessionModal extends Modal {
	objectives: string[] = [''];
	selectedProject: TFile | null = null;
	private projectProjects: TFile[] = [];
	private objectivesContainer: HTMLElement;

	onSubmit: (data: {
		objectives: string[];
		project: TFile | null;
	}) => void;

	constructor(
		app: App,
		private plugin: ConvergentPlugin,
		private frontmatterUtils: FrontmatterUtils,
		onSubmit: typeof StartSessionModal.prototype.onSubmit
	) {
		super(app);
		this.onSubmit = onSubmit;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Load projects
		this.projectProjects = await this.frontmatterUtils.getAllProjects();

		contentEl.createEl('h2', { text: 'Start Session' });
		contentEl.createEl('p', {
			text: 'Route: What do you want to accomplish today?',
			cls: 'convergent-modal-subtitle'
		});

		// Project link (optional)
		new Setting(contentEl)
			.setName('Project (optional)')
			.setDesc('Link this session to a project')
			.addButton(btn => {
				btn.setButtonText(this.selectedProject ? this.selectedProject.basename : 'Select project...')
					.onClick(() => {
						new ProjectSuggestForSession(this.app, this.projectProjects, (project) => {
							this.selectedProject = project;
							btn.setButtonText(project ? project.basename : 'Select project...');
						}).open();
					});
			});

		// Objectives
		contentEl.createEl('h3', { text: 'Objectives' });
		this.objectivesContainer = contentEl.createDiv('convergent-objectives-container');
		this.renderObjectives();

		const addBtn = contentEl.createEl('button', { text: '+ Add objective' });
		addBtn.addEventListener('click', () => {
			this.objectives.push('');
			this.renderObjectives();
		});

		// Buttons
		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');
		const startBtn = buttonContainer.createEl('button', { text: 'Start Session', cls: 'mod-cta' });
		startBtn.addEventListener('click', () => this.handleSubmit());
		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());
	}

	private renderObjectives() {
		this.objectivesContainer.empty();
		this.objectives.forEach((obj, idx) => {
			const row = this.objectivesContainer.createDiv('convergent-objective-row');
			const input = row.createEl('input', {
				type: 'text',
				placeholder: `Objective ${idx + 1}...`,
				cls: 'convergent-objective-input'
			});
			input.value = obj;
			input.addEventListener('input', (e) => {
				this.objectives[idx] = (e.target as HTMLInputElement).value;
			});

			if (this.objectives.length > 1) {
				const removeBtn = row.createEl('button', { text: '✕', cls: 'convergent-objective-remove' });
				removeBtn.addEventListener('click', () => {
					this.objectives.splice(idx, 1);
					this.renderObjectives();
				});
			}

			if (idx === 0) setTimeout(() => input.focus(), 10);
		});
	}

	handleSubmit() {
		const filledObjectives = this.objectives.filter(o => o.trim());
		if (filledObjectives.length === 0) {
			new Notice('Add at least one objective');
			return;
		}

		this.onSubmit({
			objectives: filledObjectives,
			project: this.selectedProject
		});
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal for ending an MSP session (Record phase of R³ Protocol).
 */
export class EndSessionModal extends Modal {
	progressNotes = '';
	private completedIssues: string[] = [];

	onSubmit: (data: {
		progressNotes: string;
		completedIssues: string[];
	}) => void;

	constructor(
		app: App,
		private plugin: ConvergentPlugin,
		private sessionSummary: { objectives: string[]; startTime: string; completedCount: number },
		onSubmit: typeof EndSessionModal.prototype.onSubmit
	) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'End Session' });

		// Session summary
		const duration = this.calculateDuration();
		contentEl.createEl('p', {
			text: `Session duration: ${duration} | Issues completed: ${this.sessionSummary.completedCount}`,
			cls: 'convergent-session-summary'
		});

		// Objectives recap
		if (this.sessionSummary.objectives.length > 0) {
			contentEl.createEl('h3', { text: 'Objectives' });
			const ul = contentEl.createEl('ul');
			this.sessionSummary.objectives.forEach(obj => {
				ul.createEl('li', { text: obj });
			});
		}

		// Progress notes
		new Setting(contentEl)
			.setName('Progress notes')
			.setDesc('What did you accomplish? What\'s next?')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text.inputEl.rows = 5;
				text.setPlaceholder('Summarize what you accomplished this session...')
					.onChange(value => {
						this.progressNotes = value;
					});
				setTimeout(() => text.inputEl.focus(), 10);
			});

		// Buttons
		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');
		const endBtn = buttonContainer.createEl('button', { text: 'End Session', cls: 'mod-cta' });
		endBtn.addEventListener('click', () => this.handleSubmit());
		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());
	}

	private calculateDuration(): string {
		try {
			const start = new Date(this.sessionSummary.startTime);
			const now = new Date();
			const diffMs = now.getTime() - start.getTime();
			const hours = Math.floor(diffMs / 3600000);
			const minutes = Math.floor((diffMs % 3600000) / 60000);
			if (hours > 0) return `${hours}h ${minutes}m`;
			return `${minutes}m`;
		} catch {
			return 'unknown';
		}
	}

	handleSubmit() {
		this.onSubmit({
			progressNotes: this.progressNotes,
			completedIssues: this.completedIssues
		});
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ProjectSuggestForSession extends SuggestModal<TFile | null> {
	constructor(
		app: App,
		private projects: TFile[],
		private onSelect: (project: TFile | null) => void
	) {
		super(app);
		this.setPlaceholder('Search projects... (type to filter)');
	}

	getSuggestions(query: string): (TFile | null)[] {
		const lower = query.toLowerCase();
		const filtered = lower
			? this.projects.filter(p => p.basename.toLowerCase().includes(lower))
			: this.projects;
		return [null, ...filtered];
	}

	renderSuggestion(item: TFile | null, el: HTMLElement) {
		if (item === null) {
			el.createEl('div', { text: '(No project)', cls: 'convergent-suggest-subtitle' });
		} else {
			el.createEl('div', { text: item.basename, cls: 'convergent-suggest-title' });
		}
	}

	onChooseSuggestion(item: TFile | null) {
		this.onSelect(item);
	}
}
