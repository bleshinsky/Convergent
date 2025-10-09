import { App, Notice, TFile, SuggestModal } from 'obsidian';
import { IssueStatus, IssuePriority } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';
import ConvergentPlugin from '../main';

export class BatchCommands {
	private frontmatterUtils: FrontmatterUtils;

	constructor(private app: App, private plugin: ConvergentPlugin) {
		this.frontmatterUtils = plugin.frontmatterUtils;
	}

	/**
	 * Batch change status for multiple issues
	 */
	async batchChangeStatus(files: TFile[]) {
		if (files.length === 0) {
			new Notice('No issues selected');
			return;
		}

		// Show status picker
		new BatchStatusModal(
			this.app,
			async (newStatus: IssueStatus) => {
				let successCount = 0;
				let errorCount = 0;

				// Update each file
				for (const file of files) {
					try {
						const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
						if (!frontmatter || frontmatter.type !== 'issue') {
							errorCount++;
							continue;
						}

						// Update status and modified timestamp
						await this.frontmatterUtils.updateFrontmatter(file, {
							status: newStatus,
							modified: new Date().toISOString()
						});

						successCount++;
					} catch (error) {
						console.error('Error updating status for', file.path, error);
						errorCount++;
					}
				}

				// Show result
				if (errorCount === 0) {
					new Notice(`Status changed for ${successCount} issue${successCount > 1 ? 's' : ''} → ${newStatus}`);
				} else {
					new Notice(`Status changed for ${successCount} issue${successCount > 1 ? 's' : ''} (${errorCount} failed)`);
				}
			}
		).open();
	}

	/**
	 * Batch change priority for multiple issues
	 */
	async batchChangePriority(files: TFile[]) {
		if (files.length === 0) {
			new Notice('No issues selected');
			return;
		}

		// Show priority picker
		new BatchPriorityModal(
			this.app,
			async (newPriority: IssuePriority) => {
				let successCount = 0;
				let errorCount = 0;

				// Update each file
				for (const file of files) {
					try {
						const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
						if (!frontmatter || frontmatter.type !== 'issue') {
							errorCount++;
							continue;
						}

						// Update priority and modified timestamp
						await this.frontmatterUtils.updateFrontmatter(file, {
							priority: newPriority,
							modified: new Date().toISOString()
						});

						successCount++;
					} catch (error) {
						console.error('Error updating priority for', file.path, error);
						errorCount++;
					}
				}

				// Show result
				if (errorCount === 0) {
					new Notice(`Priority changed for ${successCount} issue${successCount > 1 ? 's' : ''} → ${newPriority}`);
				} else {
					new Notice(`Priority changed for ${successCount} issue${successCount > 1 ? 's' : ''} (${errorCount} failed)`);
				}
			}
		).open();
	}

	/**
	 * Batch delete multiple issues
	 */
	async batchDelete(files: TFile[]) {
		if (files.length === 0) {
			new Notice('No issues selected');
			return;
		}

		// Show confirmation dialog
		const confirmed = await this.showDeleteConfirmation(files.length);
		if (!confirmed) return;

		let successCount = 0;
		let errorCount = 0;

		// Delete each file
		for (const file of files) {
			try {
				// Verify it's an issue before deleting
				const frontmatter = await this.frontmatterUtils.getFrontmatter(file);
				if (frontmatter && frontmatter.type === 'issue') {
					await this.app.vault.delete(file);
					successCount++;
				} else {
					errorCount++;
				}
			} catch (error) {
				console.error('Error deleting file', file.path, error);
				errorCount++;
			}
		}

		// Show result
		if (errorCount === 0) {
			new Notice(`Deleted ${successCount} issue${successCount > 1 ? 's' : ''}`);
		} else {
			new Notice(`Deleted ${successCount} issue${successCount > 1 ? 's' : ''} (${errorCount} failed)`);
		}
	}

	/**
	 * Show confirmation dialog for batch delete
	 */
	private async showDeleteConfirmation(count: number): Promise<boolean> {
		return new Promise((resolve) => {
			const Modal = require('obsidian').Modal;
			const modal = new (class extends Modal {
				constructor(app: App) {
					super(app);
				}

				onOpen() {
					const { contentEl } = this;
					contentEl.empty();
					contentEl.addClass('convergent-confirm-modal');

					contentEl.createEl('h2', { text: 'Delete Issues?' });
					contentEl.createEl('p', {
						text: `Are you sure you want to delete ${count} issue${count > 1 ? 's' : ''}? This action cannot be undone.`
					});

					const btnContainer = contentEl.createDiv('modal-button-container');

					const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
					cancelBtn.addEventListener('click', () => {
						resolve(false);
						this.close();
					});

					const confirmBtn = btnContainer.createEl('button', {
						text: 'Delete',
						cls: 'mod-warning'
					});
					confirmBtn.addEventListener('click', () => {
						resolve(true);
						this.close();
					});

					// Focus confirm button
					setTimeout(() => confirmBtn.focus(), 10);
				}
			})(this.app);

			modal.open();
		});
	}
}

/**
 * Simple status picker for batch operations
 */
class BatchStatusModal extends SuggestModal<IssueStatus> {
	private onSubmit: (status: IssueStatus) => void;
	private statuses: IssueStatus[] = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled'];

	constructor(app: App, onSubmit: (status: IssueStatus) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setPlaceholder('Select new status...');
	}

	getSuggestions(query: string): IssueStatus[] {
		const lowerQuery = query.toLowerCase();
		return this.statuses.filter(status => status.toLowerCase().includes(lowerQuery));
	}

	renderSuggestion(status: IssueStatus, el: HTMLElement) {
		const icons: Record<IssueStatus, string> = {
			'Backlog': '○',
			'Todo': '◯',
			'In Progress': '◐',
			'In Review': '◑',
			'Done': '●',
			'Canceled': '✕'
		};

		el.createDiv({ cls: 'status-suggestion' }, (div) => {
			div.createSpan({ text: icons[status], cls: 'status-icon' });
			div.createSpan({ text: status, cls: 'status-label' });
		});
	}

	onChooseSuggestion(status: IssueStatus) {
		this.onSubmit(status);
	}
}

/**
 * Simple priority picker for batch operations
 */
class BatchPriorityModal extends SuggestModal<IssuePriority> {
	private onSubmit: (priority: IssuePriority) => void;
	private priorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Urgent'];

	constructor(app: App, onSubmit: (priority: IssuePriority) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setPlaceholder('Select new priority...');
	}

	getSuggestions(query: string): IssuePriority[] {
		const lowerQuery = query.toLowerCase();
		return this.priorities.filter(priority => priority.toLowerCase().includes(lowerQuery));
	}

	renderSuggestion(priority: IssuePriority, el: HTMLElement) {
		const icons: Record<IssuePriority, string> = {
			'Low': '⬇',
			'Medium': '→',
			'High': '⬆',
			'Urgent': '🔥'
		};

		el.createDiv({ cls: 'priority-suggestion' }, (div) => {
			div.createSpan({ text: icons[priority], cls: 'priority-icon' });
			div.createSpan({ text: priority, cls: 'priority-label' });
		});
	}

	onChooseSuggestion(priority: IssuePriority) {
		this.onSubmit(priority);
	}
}
