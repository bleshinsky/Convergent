import { App, Modal, Notice, Setting } from 'obsidian';
import { BlockerStatus } from '../types';
import ConvergentPlugin from '../main';

/**
 * Modal for logging a blocker.
 */
export class BlockerModal extends Modal {
	title = '';
	status: BlockerStatus = 'Active';
	impact: 'Low' | 'Medium' | 'High' = 'Medium';
	description = '';
	workaround = '';

	onSubmit: (data: {
		title: string;
		status: BlockerStatus;
		impact: 'Low' | 'Medium' | 'High';
		description: string;
		workaround: string;
	}) => void;

	constructor(
		app: App,
		private plugin: ConvergentPlugin,
		onSubmit: typeof BlockerModal.prototype.onSubmit
	) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Log Blocker' });
		contentEl.createEl('p', {
			text: 'Document something that is blocking your progress.',
			cls: 'convergent-modal-subtitle'
		});

		new Setting(contentEl)
			.setName('Title')
			.setDesc('What is blocking you? (required)')
			.addText(text => {
				text.inputEl.addClass('convergent-modal-input-wide');
				text.setPlaceholder('Cannot access the API because...')
					.onChange(v => { this.title = v; });
				setTimeout(() => text.inputEl.focus(), 10);
			});

		new Setting(contentEl)
			.setName('Status')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Active', 'Active')
					.addOption('Resolved', 'Resolved')
					.addOption('Abandoned', 'Abandoned')
					.setValue(this.status)
					.onChange(v => { this.status = v as BlockerStatus; });
			});

		new Setting(contentEl)
			.setName('Impact')
			.setDesc('How severely does this block you?')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Low', 'Low')
					.addOption('Medium', 'Medium')
					.addOption('High', 'High')
					.setValue(this.impact)
					.onChange(v => { this.impact = v as 'Low' | 'Medium' | 'High'; });
			});

		new Setting(contentEl)
			.setName('Description')
			.setDesc('Detailed description of the problem')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text.inputEl.rows = 3;
				text.setPlaceholder('Describe what is blocking you...')
					.onChange(v => { this.description = v; });
			});

		new Setting(contentEl)
			.setName('Workaround')
			.setDesc('Is there a temporary workaround?')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text.inputEl.rows = 2;
				text.setPlaceholder('Describe any workaround...')
					.onChange(v => { this.workaround = v; });
			});

		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');
		buttonContainer.createEl('button', { text: 'Log Blocker', cls: 'mod-cta' })
			.addEventListener('click', () => this.handleSubmit());
		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => this.close());
	}

	handleSubmit() {
		if (!this.title.trim()) {
			new Notice('Title is required');
			return;
		}

		this.onSubmit({
			title: this.title,
			status: this.status,
			impact: this.impact,
			description: this.description,
			workaround: this.workaround
		});
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
