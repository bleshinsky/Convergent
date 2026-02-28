import { App, Modal, Notice, Setting, TFile, SuggestModal } from 'obsidian';
import { ProjectStatus } from '../types';
import ConvergentPlugin from '../main';

export class ProjectCreateModal extends Modal {
	title = '';
	status: ProjectStatus = 'Planning';
	icon = '📁';
	description = '';
	start = '';
	target = '';

	onSubmit: (project: {
		title: string;
		status: ProjectStatus;
		icon: string;
		description: string;
		start: string;
		target: string;
	}) => void;

	constructor(app: App, private plugin: ConvergentPlugin, onSubmit: typeof ProjectCreateModal.prototype.onSubmit) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Create Project' });

		// Title
		new Setting(contentEl)
			.setName('Title')
			.setDesc('Project title (required)')
			.addText(text => {
				text.inputEl.addClass('convergent-modal-input-wide');
				text
					.setPlaceholder('Enter project title')
					.onChange(value => {
						this.title = value;
					});
				setTimeout(() => text.inputEl.focus(), 10);
			});

		// Status
		new Setting(contentEl)
			.setName('Status')
			.setDesc('Current project status')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Planning', 'Planning')
					.addOption('In Progress', 'In Progress')
					.addOption('On Hold', 'On Hold')
					.addOption('Completed', 'Completed')
					.addOption('Canceled', 'Canceled')
					.setValue(this.status)
					.onChange(value => {
						this.status = value as ProjectStatus;
					});
			});

		// Icon
		new Setting(contentEl)
			.setName('Icon')
			.setDesc('Emoji icon for the project')
			.addText(text => {
				text
					.setPlaceholder('📁')
					.setValue(this.icon)
					.onChange(value => {
						this.icon = value || '📁';
					});
			});

		// Start date
		new Setting(contentEl)
			.setName('Start date')
			.setDesc('Project start date (YYYY-MM-DD, optional)')
			.addText(text => {
				text
					.setPlaceholder('2025-01-01')
					.onChange(value => {
						this.start = value;
					});
			});

		// Target date
		new Setting(contentEl)
			.setName('Target date')
			.setDesc('Target completion date (YYYY-MM-DD, optional)')
			.addText(text => {
				text
					.setPlaceholder('2025-12-31')
					.onChange(value => {
						this.target = value;
					});
			});

		// Description
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Brief project description (optional)')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text
					.setPlaceholder('Enter project description...')
					.onChange(value => {
						this.description = value;
					});
				text.inputEl.rows = 3;
			});

		// Buttons
		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');

		const createBtn = buttonContainer.createEl('button', {
			text: 'Create Project',
			cls: 'mod-cta'
		});
		createBtn.addEventListener('click', () => this.handleSubmit());

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const target = e.target as HTMLElement;
				if (target.tagName === 'TEXTAREA') {
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault();
						this.handleSubmit();
					}
					return;
				}
				e.preventDefault();
				this.handleSubmit();
			}
		});
	}

	handleSubmit() {
		if (!this.title.trim()) {
			new Notice('Title is required');
			return;
		}

		// Validate dates
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (this.start && !dateRegex.test(this.start)) {
			new Notice('Start date must be in YYYY-MM-DD format');
			return;
		}
		if (this.target && !dateRegex.test(this.target)) {
			new Notice('Target date must be in YYYY-MM-DD format');
			return;
		}

		this.onSubmit({
			title: this.title,
			status: this.status,
			icon: this.icon,
			description: this.description,
			start: this.start,
			target: this.target
		});

		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Suggest modal for selecting an existing project to link to an issue
 */
export class ProjectSuggestModal extends SuggestModal<TFile> {
	constructor(
		app: App,
		private projects: TFile[],
		private onSelect: (project: TFile | null) => void
	) {
		super(app);
		this.setPlaceholder('Search projects... (Esc to clear)');
	}

	getSuggestions(query: string): TFile[] {
		const lower = query.toLowerCase();
		if (!lower) return this.projects;
		return this.projects.filter(p => p.basename.toLowerCase().includes(lower));
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.createEl('div', { text: file.basename, cls: 'convergent-suggest-title' });
	}

	onChooseSuggestion(file: TFile) {
		this.onSelect(file);
	}

	onClose() {
		// If closed without selection, call with null
	}
}
