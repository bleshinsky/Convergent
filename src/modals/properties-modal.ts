import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { Issue } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

export class PropertiesModal extends Modal {
	private file: TFile;
	private issue: Issue;
	private frontmatterUtils: FrontmatterUtils;

	// Editable properties
	private labels: string = '';
	private due: string = '';
	private estimate: string = '';

	constructor(
		app: App,
		private plugin: ConvergentPlugin,
		file: TFile,
		issue: Issue,
		frontmatterUtils: FrontmatterUtils
	) {
		super(app);
		this.file = file;
		this.issue = issue;
		this.frontmatterUtils = frontmatterUtils;

		// Initialize with current values
		this.labels = issue.labels?.join(', ') || '';
		this.due = issue.due || '';
		this.estimate = issue.estimate?.toString() || '';
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Edit Properties' });
		contentEl.createDiv({ cls: 'convergent-properties-subtitle', text: this.issue.title });

		// Labels
		new Setting(contentEl)
			.setName('Labels')
			.setDesc('Comma-separated labels (e.g., bug, frontend, urgent)')
			.addText(text => {
				text.inputEl.addClass('convergent-modal-input-wide');
				text
					.setPlaceholder('bug, frontend, urgent')
					.setValue(this.labels)
					.onChange(value => {
						this.labels = value;
					});
			});

		// Due date
		new Setting(contentEl)
			.setName('Due date')
			.setDesc('Due date (YYYY-MM-DD format)')
			.addText(text => {
				text
					.setPlaceholder('2025-12-31')
					.setValue(this.due)
					.onChange(value => {
						this.due = value;
					});
				text.inputEl.type = 'date';
			});

		// Estimate
		new Setting(contentEl)
			.setName('Estimate')
			.setDesc('Estimated hours to complete')
			.addText(text => {
				text
					.setPlaceholder('4')
					.setValue(this.estimate)
					.onChange(value => {
						this.estimate = value;
					});
				text.inputEl.type = 'number';
				text.inputEl.min = '0';
				text.inputEl.step = '0.5';
			});

		// Buttons
		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');

		// Save button
		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => this.handleSave());

		// Cancel button
		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => this.close());

		// Enter key submits form
		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
				this.handleSave();
			}
		});
	}

	async handleSave() {
		try {
			// Parse labels
			const labelsArray = this.labels
				.split(',')
				.map(l => l.trim())
				.filter(l => l.length > 0);

			// Parse estimate
			const estimateNum = this.estimate ? parseFloat(this.estimate) : undefined;

			// Validate due date format
			let dueDate = this.due.trim();
			if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
				new Notice('Invalid due date format. Use YYYY-MM-DD');
				return;
			}

			// Update frontmatter
			const updates: any = {
				modified: new Date().toISOString()
			};

			// Only update changed fields
			if (labelsArray.length > 0) {
				updates.labels = labelsArray;
			} else if (this.issue.labels && labelsArray.length === 0) {
				// Clear labels if they were deleted
				updates.labels = [];
			}

			if (dueDate) {
				updates.due = dueDate;
			} else if (this.issue.due && !dueDate) {
				// Clear due date if it was deleted
				updates.due = null;
			}

			if (estimateNum !== undefined && estimateNum > 0) {
				updates.estimate = estimateNum;
			} else if (this.issue.estimate && !this.estimate) {
				// Clear estimate if it was deleted
				updates.estimate = null;
			}

			await this.frontmatterUtils.updateFrontmatter(this.file, updates);

			new Notice('Properties updated');
			this.close();
		} catch (error) {
			console.error('Error updating properties:', error);
			new Notice('Failed to update properties');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
