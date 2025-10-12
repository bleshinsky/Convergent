import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { IssueStatus, IssuePriority } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

export class IssueModal extends Modal {
	title = '';
	status: IssueStatus = 'Todo';
	priority: IssuePriority = 'Medium';
	project?: TFile;
	description = '';

	onSubmit: (issue: {
		title: string;
		status: IssueStatus;
		priority: IssuePriority;
		project?: TFile;
		description: string;
	}) => void;

	constructor(app: App, private plugin: ConvergentPlugin, onSubmit: typeof IssueModal.prototype.onSubmit) {
		super(app);
		this.onSubmit = onSubmit;
		this.status = this.plugin.settings.defaultStatus as IssueStatus;
		this.priority = this.plugin.settings.defaultPriority as IssuePriority;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Create Issue' });

		// Title
		new Setting(contentEl)
			.setName('Title')
			.setDesc('Issue title (required)')
			.addText(text => {
				text.inputEl.addClass('convergent-modal-input-wide');
				text
					.setPlaceholder('Enter issue title')
					.onChange(value => {
						this.title = value;
					});
				// Auto-focus title field
				setTimeout(() => text.inputEl.focus(), 10);
			});

		// Status
		new Setting(contentEl)
			.setName('Status')
			.setDesc('Current status')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Backlog', 'Backlog')
					.addOption('Todo', 'Todo')
					.addOption('In Progress', 'In Progress')
					.addOption('In Review', 'In Review')
					.addOption('Done', 'Done')
					.addOption('Canceled', 'Canceled')
					.setValue(this.status)
					.onChange(value => {
						this.status = value as IssueStatus;
					});
			});

		// Priority
		new Setting(contentEl)
			.setName('Priority')
			.setDesc('Issue priority')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Low', 'Low')
					.addOption('Medium', 'Medium')
					.addOption('High', 'High')
					.addOption('Urgent', 'Urgent')
					.setValue(this.priority)
					.onChange(value => {
						this.priority = value as IssuePriority;
					});
			});

		// Description (optional)
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Brief description (optional)')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text
					.setPlaceholder('Enter description...')
					.onChange(value => {
						this.description = value;
					});
				text.inputEl.rows = 4;
			});

		// Buttons
		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');

		// Create button
		const createBtn = buttonContainer.createEl('button', {
			text: 'Create Issue',
			cls: 'mod-cta'
		});
		createBtn.addEventListener('click', () => this.handleSubmit());

		// Cancel button
		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => this.close());

		// Enter key submits form (except in textarea where it creates new lines)
		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const target = e.target as HTMLElement;
				// Allow Enter in textarea for new lines
				if (target.tagName === 'TEXTAREA') {
					// Ctrl+Enter submits even from textarea
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault();
						this.handleSubmit();
					}
					return;
				}
				// Enter submits from any other field
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

		this.onSubmit({
			title: this.title,
			status: this.status,
			priority: this.priority,
			project: this.project,
			description: this.description
		});

		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
