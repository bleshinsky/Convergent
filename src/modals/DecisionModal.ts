import { App, Modal, Notice, Setting, normalizePath } from 'obsidian';
import { DecisionStatus } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

/**
 * Modal for logging an Architecture Decision Record (ADR).
 */
export class DecisionModal extends Modal {
	title = '';
	status: DecisionStatus = 'Proposed';
	rationale = '';
	alternatives = '';
	consequences = '';

	onSubmit: (data: {
		title: string;
		status: DecisionStatus;
		rationale: string;
		alternatives: string[];
		consequences: string[];
	}) => void;

	constructor(
		app: App,
		private plugin: ConvergentPlugin,
		onSubmit: typeof DecisionModal.prototype.onSubmit
	) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Log Decision (ADR)' });
		contentEl.createEl('p', {
			text: 'Architecture Decision Record — document a significant technical or product decision.',
			cls: 'convergent-modal-subtitle'
		});

		new Setting(contentEl)
			.setName('Title')
			.setDesc('Decision title (required)')
			.addText(text => {
				text.inputEl.addClass('convergent-modal-input-wide');
				text.setPlaceholder('Use X instead of Y for Z')
					.onChange(v => { this.title = v; });
				setTimeout(() => text.inputEl.focus(), 10);
			});

		new Setting(contentEl)
			.setName('Status')
			.addDropdown(dropdown => {
				dropdown
					.addOption('Proposed', 'Proposed')
					.addOption('Accepted', 'Accepted')
					.addOption('Rejected', 'Rejected')
					.addOption('Superseded', 'Superseded')
					.setValue(this.status)
					.onChange(v => { this.status = v as DecisionStatus; });
			});

		new Setting(contentEl)
			.setName('Rationale')
			.setDesc('Why this decision was made')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text.inputEl.rows = 3;
				text.setPlaceholder('Explain the reasoning...')
					.onChange(v => { this.rationale = v; });
			});

		new Setting(contentEl)
			.setName('Alternatives considered')
			.setDesc('Other options that were considered (one per line)')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text.inputEl.rows = 3;
				text.setPlaceholder('Option A\nOption B')
					.onChange(v => { this.alternatives = v; });
			});

		new Setting(contentEl)
			.setName('Consequences')
			.setDesc('Expected outcomes and trade-offs (one per line)')
			.addTextArea(text => {
				text.inputEl.addClass('convergent-modal-textarea');
				text.inputEl.rows = 3;
				text.setPlaceholder('Pro: faster\nCon: more complex')
					.onChange(v => { this.consequences = v; });
			});

		const buttonContainer = contentEl.createDiv('convergent-modal-buttons');
		buttonContainer.createEl('button', { text: 'Log Decision', cls: 'mod-cta' })
			.addEventListener('click', () => this.handleSubmit());
		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => this.close());
	}

	handleSubmit() {
		if (!this.title.trim()) {
			new Notice('Title is required');
			return;
		}

		const alternatives = this.alternatives.split('\n').map(s => s.trim()).filter(Boolean);
		const consequences = this.consequences.split('\n').map(s => s.trim()).filter(Boolean);

		this.onSubmit({
			title: this.title,
			status: this.status,
			rationale: this.rationale,
			alternatives,
			consequences
		});
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
