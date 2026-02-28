import { App, Notice, TFile, normalizePath } from 'obsidian';
import { FrontmatterUtils } from '../utils/frontmatter';
import { MSPUtils } from '../utils/msp';
import { StartSessionModal, EndSessionModal } from '../modals/MSPSessionModal';
import { MSPSession } from '../types';
import ConvergentPlugin from '../main';

export class MSPCommands {
	private mspUtils: MSPUtils;
	private activeSession: { file: TFile; startTime: string; objectives: string[] } | null = null;
	private statusBarItem: HTMLElement | null = null;

	constructor(
		private app: App,
		private plugin: ConvergentPlugin,
		private frontmatterUtils: FrontmatterUtils
	) {
		this.mspUtils = new MSPUtils(app, frontmatterUtils);
	}

	setStatusBarItem(el: HTMLElement) {
		this.statusBarItem = el;
		this.updateStatusBar();
	}

	registerCommands() {
		this.plugin.addCommand({
			id: 'start-msp-session',
			name: 'Start session (MSP)',
			callback: () => this.startSession()
		});

		this.plugin.addCommand({
			id: 'end-msp-session',
			name: 'End session (MSP)',
			checkCallback: (checking: boolean) => {
				if (this.activeSession) {
					if (!checking) this.endSession();
					return true;
				}
				return false;
			}
		});

		this.plugin.addCommand({
			id: 'export-context',
			name: 'Export context to clipboard (MSP)',
			callback: () => this.exportContext()
		});
	}

	async startSession() {
		if (this.activeSession) {
			new Notice('A session is already active. End it first.');
			return;
		}

		const recallContext = await this.mspUtils.buildRecallContext();

		new StartSessionModal(this.app, this.plugin, this.frontmatterUtils, async (data) => {
			try {
				const now = new Date();
				const date = now.toISOString().split('T')[0];
				const startTime = now.toISOString();
				const id = `SESSION-${date}-${now.getTime().toString().slice(-4)}`;

				const projectWikilink = data.project ? `[[${data.project.basename}]]` : undefined;

				const content = this.mspUtils.buildSessionContent({
					id,
					date,
					startTime,
					objectives: data.objectives,
					projectWikilink,
					recallContext
				});

				const folder = this.plugin.settings.sessionsFolder;
				await this.ensureFolderExists(folder);
				const filePath = normalizePath(`${folder}/Session ${date}.md`);
				const file = await this.app.vault.create(filePath, content);

				this.activeSession = {
					file,
					startTime,
					objectives: data.objectives
				};

				this.updateStatusBar();
				new Notice(`Session started! ${data.objectives.length} objective(s) set.`);

				// Open session file
				await this.app.workspace.getLeaf().openFile(file);
			} catch (error) {
				console.error('Error starting session:', error);
				new Notice('Failed to start session');
			}
		}).open();
	}

	async endSession() {
		if (!this.activeSession) {
			new Notice('No active session');
			return;
		}

		const completedCount = await this.getCompletedSinceSession();

		new EndSessionModal(
			this.app,
			this.plugin,
			{
				objectives: this.activeSession.objectives,
				startTime: this.activeSession.startTime,
				completedCount
			},
			async (data) => {
				try {
					const now = new Date();
					const endTime = now.toISOString();
					const startDate = new Date(this.activeSession!.startTime);
					const durationMs = now.getTime() - startDate.getTime();
					const durationMinutes = Math.round(durationMs / 60000);

					// Update session file with end data
					const sessionFile = this.activeSession!.file;
					const content = await this.app.vault.read(sessionFile);

					// Append record section
					const recordSection = [
						``,
						`---`,
						`end-time: ${endTime}`,
						`duration: ${durationMinutes}`,
						`---`,
						``,
						`### Record`,
						``,
						`**Duration:** ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
						`**Issues completed this session:** ${completedCount}`,
						``,
						data.progressNotes ? `**Notes:**\n${data.progressNotes}` : '',
					].filter(l => l !== undefined).join('\n');

					await this.app.vault.modify(sessionFile, content + recordSection);
					await this.app.fileManager.processFrontMatter(sessionFile, (fm: Record<string, unknown>) => {
						fm['end-time'] = endTime;
						fm.duration = durationMinutes;
						fm.modified = new Date().toISOString();
					});

					this.activeSession = null;
					this.updateStatusBar();
					new Notice(`Session ended. Duration: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`);
				} catch (error) {
					console.error('Error ending session:', error);
					new Notice('Failed to end session');
				}
			}
		).open();
	}

	async exportContext() {
		const { ContextExport } = await import('../utils/contextExport');
		const exporter = new ContextExport(this.app, this.frontmatterUtils, this.mspUtils);
		const context = await exporter.generateContext(this.activeSession?.file || null);

		await navigator.clipboard.writeText(context);
		new Notice(`Context copied to clipboard (${this.estimateTokens(context)} tokens)`);
	}

	private updateStatusBar() {
		if (!this.statusBarItem) return;
		if (this.activeSession) {
			this.statusBarItem.setText('🔴 Session active');
			this.statusBarItem.setAttribute('title', `Session started: ${this.activeSession.objectives.join(', ')}`);
		} else {
			this.statusBarItem.setText('Convergent');
			this.statusBarItem.setAttribute('title', 'No active session');
		}
	}

	private estimateTokens(text: string): number {
		return Math.round(text.length / 4);
	}

	private async getCompletedSinceSession(): Promise<number> {
		if (!this.activeSession) return 0;
		const cutoff = this.activeSession.startTime;
		const issues = await this.frontmatterUtils.getAllIssues();
		let count = 0;
		for (const file of issues) {
			const fm = await this.frontmatterUtils.getFrontmatter(file);
			if (fm?.type === 'issue' && (fm as { status?: string; modified?: string }).status === 'Done') {
				const modified = (fm as { modified?: string }).modified || '';
				if (modified >= cutoff) count++;
			}
		}
		return count;
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	getActiveSession() {
		return this.activeSession;
	}
}
