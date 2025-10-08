import { App, SuggestModal, TFile } from 'obsidian';
import { IssueStatus } from '../types';
import { FrontmatterUtils } from '../utils/frontmatter';

interface StatusOption {
	status: IssueStatus;
	label: string;
	icon: string;
}

export class StatusModal extends SuggestModal<StatusOption> {
	private file: TFile;
	private frontmatterUtils: FrontmatterUtils;
	private onSubmit: (status: IssueStatus) => void;
	private currentStatus: IssueStatus;

	private statuses: StatusOption[] = [
		{ status: 'Backlog', label: 'Backlog', icon: '○' },
		{ status: 'Todo', label: 'Todo', icon: '◯' },
		{ status: 'In Progress', label: 'In Progress', icon: '◐' },
		{ status: 'In Review', label: 'In Review', icon: '◑' },
		{ status: 'Done', label: 'Done', icon: '●' },
		{ status: 'Canceled', label: 'Canceled', icon: '✕' }
	];

	constructor(
		app: App,
		file: TFile,
		frontmatterUtils: FrontmatterUtils,
		currentStatus: IssueStatus,
		onSubmit: (status: IssueStatus) => void
	) {
		super(app);
		this.file = file;
		this.frontmatterUtils = frontmatterUtils;
		this.currentStatus = currentStatus;
		this.onSubmit = onSubmit;

		this.setPlaceholder('Select new status...');
	}

	getSuggestions(query: string): StatusOption[] {
		const lowerQuery = query.toLowerCase();
		return this.statuses.filter(option =>
			option.label.toLowerCase().includes(lowerQuery)
		);
	}

	renderSuggestion(option: StatusOption, el: HTMLElement) {
		const isCurrent = option.status === this.currentStatus;

		if (isCurrent) {
			el.addClass('status-current');
		}

		el.createDiv({ cls: 'status-suggestion' }, (div) => {
			div.createSpan({ text: option.icon, cls: 'status-icon' });
			div.createSpan({
				text: isCurrent ? `${option.label} (current)` : option.label,
				cls: 'status-label'
			});
		});
	}

	onChooseSuggestion(option: StatusOption) {
		// Don't allow selecting the current status
		if (option.status === this.currentStatus) {
			return;
		}
		this.onSubmit(option.status);
	}
}
