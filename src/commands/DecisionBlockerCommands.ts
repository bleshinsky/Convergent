import { App, Notice, TFile, normalizePath } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { ContextExport } from '../utils/contextExport';
import { MSPUtils } from '../utils/msp';
import { DecisionModal } from '../modals/DecisionModal';
import { BlockerModal } from '../modals/BlockerModal';
import { DecisionStatus, BlockerStatus } from '../types';
import ConvergentPlugin from '../main';

export class DecisionBlockerCommands {
	constructor(
		private app: App,
		private plugin: ConvergentPlugin,
		private frontmatterUtils: FrontmatterUtils
	) {}

	registerCommands() {
		// Log decision
		this.plugin.addCommand({
			id: 'log-decision',
			name: 'Log decision (ADR)',
			callback: () => this.logDecision()
		});

		// Log blocker
		this.plugin.addCommand({
			id: 'log-blocker',
			name: 'Log blocker',
			callback: () => this.logBlocker()
		});

		// Mark current file as memory
		this.plugin.addCommand({
			id: 'mark-as-memory',
			name: 'Toggle memory flag (MSP context export)',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) this.toggleMemory(activeFile);
					return true;
				}
				return false;
			}
		});
	}

	async logDecision() {
		new DecisionModal(this.app, this.plugin, async (data) => {
			try {
				const file = await this.createDecisionFile(data);
				new Notice(`Decision logged: ${data.title}`);
				await this.app.workspace.getLeaf().openFile(file);
			} catch (err) {
				console.error('Error logging decision:', err);
				new Notice('Failed to log decision');
			}
		}).open();
	}

	async logBlocker() {
		new BlockerModal(this.app, this.plugin, async (data) => {
			try {
				const file = await this.createBlockerFile(data);
				new Notice(`Blocker logged: ${data.title}`);
				await this.app.workspace.getLeaf().openFile(file);
			} catch (err) {
				console.error('Error logging blocker:', err);
				new Notice('Failed to log blocker');
			}
		}).open();
	}

	async toggleMemory(file: TFile) {
		const fm = await this.frontmatterUtils.getFrontmatter(file);
		if (!fm || fm.type !== 'issue') {
			new Notice('Memory flag only applies to issues');
			return;
		}
		const current = (fm as { memory?: boolean }).memory;
		await this.frontmatterUtils.updateFrontmatter(file, { memory: !current } as import('../types').Issue);
		new Notice(current ? 'Memory flag removed' : 'Memory flag set — this issue will always appear in context export');
	}

	private async createDecisionFile(data: {
		title: string;
		status: DecisionStatus;
		rationale: string;
		alternatives: string[];
		consequences: string[];
	}): Promise<TFile> {
		const folder = this.plugin.settings.decisionsFolder;
		await this.ensureFolderExists(folder);

		const now = new Date();
		const date = now.toISOString().split('T')[0];
		const id = `ADR-${Date.now().toString().slice(-6)}`;
		const sanitized = data.title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.substring(0, 50);

		const yaml = [
			`type: decision`,
			`id: ${id}`,
			`title: "${data.title.replace(/"/g, '\\"')}"`,
			`date: ${date}`,
			`status: ${data.status}`,
		].join('\n') + '\n';

		const altSection = data.alternatives.length > 0
			? data.alternatives.map(a => `- ${a}`).join('\n')
			: '- (none)';

		const consSection = data.consequences.length > 0
			? data.consequences.map(c => `- ${c}`).join('\n')
			: '- (none)';

		const content = `---\n${yaml}---\n\n# ${data.title}\n\n## Status\n\n${data.status}\n\n## Context\n\n${data.rationale || '(add context here)'}\n\n## Decision\n\n${data.rationale || '(describe the decision)'}\n\n## Alternatives Considered\n\n${altSection}\n\n## Consequences\n\n${consSection}\n`;

		const filePath = normalizePath(`${folder}/${date}-${sanitized}.md`);
		return await this.app.vault.create(filePath, content);
	}

	private async createBlockerFile(data: {
		title: string;
		status: BlockerStatus;
		impact: 'Low' | 'Medium' | 'High';
		description: string;
		workaround: string;
	}): Promise<TFile> {
		const folder = this.plugin.settings.blockersFolder;
		await this.ensureFolderExists(folder);

		const now = new Date();
		const date = now.toISOString().split('T')[0];
		const id = `BLK-${Date.now().toString().slice(-6)}`;
		const sanitized = data.title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.substring(0, 50);

		const yaml = [
			`type: blocker`,
			`id: ${id}`,
			`title: "${data.title.replace(/"/g, '\\"')}"`,
			`date: ${date}`,
			`status: ${data.status}`,
			`impact: ${data.impact}`,
		].join('\n') + '\n';

		const content = `---\n${yaml}---\n\n# ${data.title}\n\n## Impact\n\n${data.impact}\n\n## Description\n\n${data.description || '(describe the blocker)'}\n\n## Workaround\n\n${data.workaround || '(none)'}\n\n## Resolution\n\n(pending)\n`;

		const filePath = normalizePath(`${folder}/${date}-${sanitized}.md`);
		return await this.app.vault.create(filePath, content);
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}
}
